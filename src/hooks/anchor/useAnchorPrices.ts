import { useMemo } from "react";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useContractRead } from "wagmi";
import { CHAINLINK_ORACLE_ABI } from "@/abis/shared";

// Harbor wrapped price oracle ABI (returns tuple)
const WRAPPED_PRICE_ORACLE_ABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { type: "uint256", name: "minUnderlyingPrice" },
      { type: "uint256", name: "maxUnderlyingPrice" },
      { type: "uint256", name: "minWrappedRate" },
      { type: "uint256", name: "maxWrappedRate" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Chainlink ETH/USD Oracle on Mainnet
const CHAINLINK_ETH_USD_ORACLE = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as `0x${string}`;

/**
 * Hook to calculate USD prices for pegged tokens and collateral
 * 
 * @param anchorMarkets - Array of [marketId, market] tuples
 * @param reads - Contract read results
 * @param peggedPriceMap - Map of marketId -> peggedTokenPrice (from usePeggedTokenPrices)
 * @returns Object containing peggedPriceUSDMap and mergedPeggedPriceMap
 */
export function useAnchorPrices(
  anchorMarkets: Array<[string, any]>,
  reads: any,
  peggedPriceMap: Record<string, bigint | undefined>
) {
  const isDebug = process.env.NODE_ENV === "development";
  // Fetch CoinGecko prices
  const { price: fxUSDPrice } = useCoinGeckoPrice("f-x-protocol-fxusd");
  const { price: fxSAVEPrice } = useCoinGeckoPrice("fx-usd-saving");
  const { price: usdcPrice } = useCoinGeckoPrice("usd-coin");
  const { price: ethPriceCoinGecko } = useCoinGeckoPrice("ethereum");
  const { price: btcPriceCoinGecko } = useCoinGeckoPrice("bitcoin", 120000);
  
  // Get EUR/USD rate from fxUSD/EUR market oracle (read from batched reads array)
  // Find the fxUSD/EUR market and extract its oracle data from the batched reads
  const eurPriceFromOracle = useMemo(() => {
    if (!reads || !Array.isArray(reads) || reads.length === 0) {
      if (isDebug) {
        console.log("[useAnchorPrices] No reads available for EUR oracle", { reads: reads ? `array(${reads.length})` : 'null/undefined' });
      }
      return null;
    }

    if (!anchorMarkets || anchorMarkets.length === 0) {
      if (isDebug) {
        console.log("[useAnchorPrices] No anchorMarkets available");
      }
      return null;
    }

    // Find the EUR market index
    const eurMarketIndex = anchorMarkets.findIndex(([id, m]) => {
      const pegTarget = (m as any)?.pegTarget?.toLowerCase();
      const collateralSymbol = m.collateral?.symbol?.toLowerCase() || "";
      const matches = (pegTarget === "eur" || pegTarget === "euro") && 
             (collateralSymbol === "fxusd" || collateralSymbol === "fxsave");
      if (isDebug && matches) {
        console.log(`[useAnchorPrices] Found EUR market: ${id}, pegTarget: ${pegTarget}, collateralSymbol: ${collateralSymbol}`);
      }
      return matches;
    });

    if (eurMarketIndex === -1) {
      if (isDebug) {
        console.log("[useAnchorPrices] EUR market not found in anchorMarkets", {
          marketCount: anchorMarkets.length,
          marketIds: anchorMarkets.map(([id]) => id),
          pegTargets: anchorMarkets.map(([_, m]) => (m as any)?.pegTarget),
          collateralSymbols: anchorMarkets.map(([_, m]) => m.collateral?.symbol),
        });
      }
      return null;
    }

    const eurMarket = anchorMarkets[eurMarketIndex];
    const eurMarketId = eurMarket[0];
    const eurMarketConfig = eurMarket[1];
    const oracleAddress = (eurMarketConfig as any).addresses?.collateralPrice;
    const hasPriceOracle = !!oracleAddress;
    
    if (!hasPriceOracle) {
      if (isDebug) {
        console.log("[useAnchorPrices] EUR market has no price oracle", { marketId: eurMarketId });
      }
      return null;
    }

    if (isDebug) {
      console.log(`[useAnchorPrices] EUR market found: ${eurMarketId}, oracle: ${oracleAddress}, index: ${eurMarketIndex}`);
    }

    // Calculate offset to oracle reads (same logic as in peggedPriceUSDMap)
    let priceOracleOffset = 0;
    if (isDebug) {
      console.log(`[useAnchorPrices] Calculating offset for EUR market at index ${eurMarketIndex}, total markets: ${anchorMarkets.length}, total reads: ${reads.length}`);
    }
    
    for (let i = 0; i <= eurMarketIndex; i++) {
      const market = anchorMarkets[i][1];
      const marketId = anchorMarkets[i][0];
      const prevHasStabilityPoolManager = !!(market as any).addresses?.stabilityPoolManager;
      const prevHasCollateral = !!(market as any).addresses?.stabilityPoolCollateral;
      const prevHasSail = !!(market as any).addresses?.stabilityPoolLeveraged;
      const prevPeggedTokenAddress = (market as any)?.addresses?.peggedToken;
      const prevHasPriceOracle = !!(market as any).addresses?.collateralPrice;
      const prevCollateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
      const prevIsFxUSDMarket = prevCollateralSymbol === "fxusd" || prevCollateralSymbol === "fxsave";
      
      let marketReads = 0;
      
      if (i < eurMarketIndex) {
        // For previous markets, count all their reads
        marketReads += 5; // minter reads
        if (prevHasStabilityPoolManager) marketReads += 1;
        if (prevHasCollateral) {
          marketReads += 4;
          if (prevPeggedTokenAddress) marketReads += 1;
        }
        if (prevHasSail) {
          marketReads += 4;
          if (prevPeggedTokenAddress) marketReads += 1;
        }
        if (prevHasPriceOracle) {
          marketReads += 1; // latestAnswer
          if (prevIsFxUSDMarket) marketReads += 1; // getPrice
        }
        priceOracleOffset += marketReads;
        if (isDebug) {
          console.log(`[useAnchorPrices] Market ${i} (${marketId}): +${marketReads} reads, offset now: ${priceOracleOffset}`);
        }
      } else {
        // For current market, count up to oracle
        marketReads += 5; // minter reads
        if (prevHasStabilityPoolManager) marketReads += 1;
        if (prevHasCollateral) {
          marketReads += 4;
          if (prevPeggedTokenAddress) marketReads += 1;
        }
        if (prevHasSail) {
          marketReads += 4;
          if (prevPeggedTokenAddress) marketReads += 1;
        }
        priceOracleOffset += marketReads;
        if (isDebug) {
          console.log(`[useAnchorPrices] EUR market ${i} (${marketId}): +${marketReads} reads up to oracle, final offset: ${priceOracleOffset}`);
        }
        // Now we're at the oracle position
        break;
      }
    }

    if (priceOracleOffset >= reads.length) {
      if (isDebug) {
        console.warn(`[useAnchorPrices] Calculated offset ${priceOracleOffset} exceeds reads array length ${reads.length}`);
      }
      return null;
    }

    const latestAnswerResult = reads?.[priceOracleOffset]?.result;
    const readStatus = reads?.[priceOracleOffset]?.status;
    
    if (isDebug) {
      console.log(`[useAnchorPrices] EUR oracle read from batched reads - offset: ${priceOracleOffset}/${reads.length}, status: ${readStatus}, result: ${latestAnswerResult ? (Array.isArray(latestAnswerResult) ? `tuple[${latestAnswerResult.length}]` : latestAnswerResult.toString()) : 'null'}`);
      if (latestAnswerResult && Array.isArray(latestAnswerResult)) {
        console.log(`[useAnchorPrices] EUR oracle tuple values:`, latestAnswerResult.map((v, i) => `[${i}]: ${v.toString()}`));
      }
    }

    if (!latestAnswerResult) {
      if (isDebug) {
        console.log("[useAnchorPrices] EUR oracle data not available in reads array");
      }
      return null;
    }

    // Process the oracle data
    if (Array.isArray(latestAnswerResult)) {
      // Harbor oracle returns tuple [minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate]
      // For fxUSD/EUR market, maxUnderlyingPrice is fxUSD price in EUR terms (18 decimals)
      // To get EUR/USD: if 1 fxUSD = X EUR and 1 fxUSD = $1, then 1 EUR = $1/X
      const price = latestAnswerResult[1] as bigint; // maxUnderlyingPrice (fxUSD in EUR)
      if (price && price > 0n) {
        const fxUsdInEur = Number(price) / 1e18;
        if (isDebug) {
          console.log(`[useAnchorPrices] EUR oracle returned tuple, fxUSD in EUR (18dec): ${fxUsdInEur}`);
        }
        // If fxUSD is pegged to USD (~$1), then fxUSD_in_EUR should be ~0.92-0.93 (1/EUR_USD)
        // To get EUR/USD: if 1 fxUSD = X EUR and 1 fxUSD = $1, then 1 EUR = $1/X
        if (fxUsdInEur > 0 && fxUsdInEur < 2.0) {
          const eurUsd = 1 / fxUsdInEur; // Invert to get EUR/USD
          if (isDebug) {
            console.log(`[useAnchorPrices] Calculated EUR/USD from fxUSD_in_EUR: ${eurUsd}`);
          }
          // EUR/USD should be around 1.0-1.2
          if (eurUsd > 0.5 && eurUsd < 2.0) {
            return eurUsd;
          }
        }
      }
    } else if (typeof latestAnswerResult === "bigint") {
      // Chainlink oracle - typically 8 decimals for EUR/USD
      // Try 8 decimals first (standard Chainlink format)
      let priceNum = Number(latestAnswerResult) / 1e8;
      
      if (isDebug) {
        console.log(`[useAnchorPrices] EUR oracle raw: ${latestAnswerResult.toString()}, trying 8 decimals: ${priceNum}`);
      }
      
      // Chainlink EUR/USD should be around 1.0-1.2 USD per EUR
      if (priceNum > 0.5 && priceNum < 2.0) {
        if (isDebug) {
          console.log(`[useAnchorPrices] Using EUR/USD from Chainlink (8dec): ${priceNum}`);
        }
        return priceNum;
      }
      
      // Try 18 decimals in case it's a different format
      priceNum = Number(latestAnswerResult) / 1e18;
      if (isDebug) {
        console.log(`[useAnchorPrices] Trying 18 decimals: ${priceNum}`);
      }
      
      if (priceNum > 0.5 && priceNum < 2.0) {
        if (isDebug) {
          console.log(`[useAnchorPrices] Using EUR/USD from Chainlink (18dec): ${priceNum}`);
        }
        return priceNum;
      }
      
      // If the price is very small (< 0.5), it might be inverted (EUR in USD terms)
      // Try inverting it
      if (priceNum > 0 && priceNum <= 0.5) {
        const inverted = 1 / priceNum;
        if (isDebug) {
          console.log(`[useAnchorPrices] Price seems inverted, trying inverted value: ${inverted}`);
        }
        if (inverted > 0.5 && inverted < 2.0) {
          return inverted;
        }
      }
      
      if (isDebug) {
        console.warn(`[useAnchorPrices] EUR oracle price out of range: ${priceNum} (tried 8 and 18 decimals)`);
      }
    }
    
    return null;
  }, [reads, anchorMarkets, isDebug]);
  
  // Use oracle price if available, otherwise fall back to CoinGecko
  const { price: eurPriceCoinGecko } = useCoinGeckoPrice("stasis-euro");
  const eurPrice = eurPriceFromOracle ?? eurPriceCoinGecko;
  
  if (isDebug) {
    console.log(`[useAnchorPrices] EUR price - oracle: ${eurPriceFromOracle}, CoinGecko: ${eurPriceCoinGecko}, final: ${eurPrice}`);
  }

  // Fetch Chainlink ETH/USD as fallback
  const { data: chainlinkEthPriceData } = useContractRead({
    address: CHAINLINK_ETH_USD_ORACLE,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    query: {
      enabled: true,
      staleTime: 60_000, // 1 minute - Chainlink updates less frequently
      gcTime: 300_000, // 5 minutes
    },
  });

  // Chainlink BTC/USD Oracle on Mainnet
  const CHAINLINK_BTC_USD_ORACLE = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c" as `0x${string}`;

  // Fetch Chainlink BTC/USD as fallback
  const { data: chainlinkBtcPriceData } = useContractRead({
    address: CHAINLINK_BTC_USD_ORACLE,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    query: {
      enabled: true,
      staleTime: 60_000, // 1 minute - Chainlink updates less frequently
      gcTime: 300_000, // 5 minutes
    },
  });

  // Calculate Chainlink ETH price in USD (8 decimals)
  const chainlinkEthPrice = useMemo(() => {
    if (!chainlinkEthPriceData) return null;
    // Chainlink ETH/USD uses 8 decimals
    const price = Number(chainlinkEthPriceData as bigint) / 1e8;
    return price > 0 ? price : null;
  }, [chainlinkEthPriceData]);

  // Calculate Chainlink BTC price in USD (8 decimals)
  const chainlinkBtcPrice = useMemo(() => {
    if (!chainlinkBtcPriceData) return null;
    // Chainlink BTC/USD uses 8 decimals
    const price = Number(chainlinkBtcPriceData as bigint) / 1e8;
    return price > 0 ? price : null;
  }, [chainlinkBtcPriceData]);

  // Use Chainlink as fallback if CoinGecko fails or returns 0
  // This ensures position USD values are calculated even when CoinGecko is down
  const ethPrice = useMemo(() => {
    if (ethPriceCoinGecko && ethPriceCoinGecko > 0) {
      return ethPriceCoinGecko;
    }
    if (chainlinkEthPrice && chainlinkEthPrice > 0) {
      if (isDebug) {
        console.log(
          `[useAnchorPrices] CoinGecko ETH price unavailable (${ethPriceCoinGecko}), using Chainlink fallback: $${chainlinkEthPrice}`
        );
      }
      return chainlinkEthPrice;
    }
    if (isDebug) {
    console.warn(`[useAnchorPrices] Both CoinGecko and Chainlink ETH prices unavailable`);
    }
    return null;
  }, [ethPriceCoinGecko, chainlinkEthPrice, isDebug]);

  // Use Chainlink as fallback if CoinGecko fails or returns 0
  const btcPrice = useMemo(() => {
    if (btcPriceCoinGecko && btcPriceCoinGecko > 0) {
      return btcPriceCoinGecko;
    }
    if (chainlinkBtcPrice && chainlinkBtcPrice > 0) {
      if (isDebug) {
        console.log(
          `[useAnchorPrices] CoinGecko BTC price unavailable (${btcPriceCoinGecko}), using Chainlink fallback: $${chainlinkBtcPrice}`
        );
      }
      return chainlinkBtcPrice;
    }
    if (isDebug) {
    console.warn(`[useAnchorPrices] Both CoinGecko and Chainlink BTC prices unavailable`);
    }
    return null;
  }, [btcPriceCoinGecko, chainlinkBtcPrice, isDebug]);

  // Build USD price map for useMarketPositions (peggedTokenPrice * collateralPriceUSD)
  const peggedPriceUSDMap = useMemo(() => {
    const map: Record<string, bigint | undefined> = {};
    if (!reads) {
      if (isDebug) {
      console.log("[peggedPriceUSDMap] No reads available");
      }
      return map;
    }
    
    if (isDebug) {
      console.log(
        "[peggedPriceUSDMap] ETH price:",
        ethPrice,
        "Available markets:",
        anchorMarkets.length
      );
    }
    
    anchorMarkets.forEach(([id, m], mi) => {
      // Get peggedTokenPrice from peggedPriceMap (already calculated correctly)
      const peggedTokenPrice = peggedPriceMap[id];
      
      // Get collateral price
      const collateralSymbol = m.collateral?.symbol?.toLowerCase() || "";
      const isFxUSDMarket = collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
      const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
      
      let collateralPriceUSD = 0;
      if (hasPriceOracle) {
        // Calculate offset to oracle reads (same logic as in contract building)
        let priceOracleOffset = 0;
        for (let i = 0; i <= mi; i++) {
          const market = anchorMarkets[i][1];
          const prevHasStabilityPoolManager = !!(market as any).addresses?.stabilityPoolManager;
          const prevHasCollateral = !!(market as any).addresses?.stabilityPoolCollateral;
          const prevHasSail = !!(market as any).addresses?.stabilityPoolLeveraged;
          const prevPeggedTokenAddress = (market as any)?.addresses?.peggedToken;
          const prevHasPriceOracle = !!(market as any).addresses?.collateralPrice;
          const prevCollateralSymbol = market.collateral?.symbol?.toLowerCase() || "";
          const prevIsFxUSDMarket = prevCollateralSymbol === "fxusd" || prevCollateralSymbol === "fxsave";
          
          if (i < mi) {
            // For previous markets, count all their reads
            priceOracleOffset += 5; // minter reads
            if (prevHasStabilityPoolManager) priceOracleOffset += 1;
            if (prevHasCollateral) {
              priceOracleOffset += 4;
              if (prevPeggedTokenAddress) priceOracleOffset += 1;
            }
            if (prevHasSail) {
              priceOracleOffset += 4;
              if (prevPeggedTokenAddress) priceOracleOffset += 1;
            }
            if (prevHasPriceOracle) {
              priceOracleOffset += 1; // latestAnswer
              if (prevIsFxUSDMarket) priceOracleOffset += 1; // getPrice
            }
          } else {
            // For current market, count up to oracle
            priceOracleOffset += 5; // minter reads
            if (prevHasStabilityPoolManager) priceOracleOffset += 1;
            if (prevHasCollateral) {
              priceOracleOffset += 4;
              if (prevPeggedTokenAddress) priceOracleOffset += 1;
            }
            if (prevHasSail) {
              priceOracleOffset += 4;
              if (prevPeggedTokenAddress) priceOracleOffset += 1;
            }
            // Now we're at the oracle position
            break;
          }
        }
        
        const latestAnswerResult = reads?.[priceOracleOffset]?.result;
        let maxWrappedRate: bigint | undefined;
        let fxSAVEPriceInETH: bigint | undefined;
        
        if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
          if (Array.isArray(latestAnswerResult)) {
            // latestAnswer returns [minPrice, maxPrice, minRate, maxRate]
            maxWrappedRate = latestAnswerResult[3] as bigint; // maxWrappedRate is fxSAVE/fxUSD rate
          } else if (typeof latestAnswerResult === "object") {
            const obj = latestAnswerResult as { maxWrappedRate?: bigint };
            maxWrappedRate = obj.maxWrappedRate;
          }
        }
        
        // For fxUSD markets, get fxSAVE price in ETH from getPrice()
        if (isFxUSDMarket) {
          const getPriceResult = reads?.[priceOracleOffset + 1]?.result;
          if (getPriceResult !== undefined && getPriceResult !== null) {
            fxSAVEPriceInETH = getPriceResult as bigint;
          }
        }
        
        // For fxUSD markets, calculate fxUSD price using getPrice() and ETH price
        if (isFxUSDMarket && fxSAVEPriceInETH && maxWrappedRate && ethPrice) {
          // fxSAVE price in ETH (from getPrice())
          const fxSAVEPriceInETHNum = Number(fxSAVEPriceInETH) / 1e18;
          // ETH price in USD (from CoinGecko)
          const ethPriceUSD = ethPrice;
          // fxSAVE price in USD
          const fxSAVEPriceUSD = fxSAVEPriceInETHNum * ethPriceUSD;
          // fxSAVE/fxUSD rate (from latestAnswer maxWrappedRate)
          const rate = Number(maxWrappedRate) / 1e18;
          // fxUSD price in USD = fxSAVE price in USD / rate
          collateralPriceUSD = fxSAVEPriceUSD / rate;
        } else if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
          // For non-fxUSD markets, use maxUnderlyingPrice as before
          let collateralPrice: bigint | undefined;
          if (Array.isArray(latestAnswerResult)) {
            collateralPrice = latestAnswerResult[1] as bigint; // maxUnderlyingPrice
          } else if (typeof latestAnswerResult === "object") {
            const obj = latestAnswerResult as { maxUnderlyingPrice?: bigint };
            collateralPrice = obj.maxUnderlyingPrice;
          } else if (typeof latestAnswerResult === "bigint") {
            collateralPrice = latestAnswerResult;
          }
          
          if (collateralPrice) {
            collateralPriceUSD = Number(collateralPrice) / 1e18;
          }
        }
      }
      
      // Use CoinGecko fallback for fxUSD markets if oracle price calculation failed
      if (isFxUSDMarket && collateralPriceUSD === 0) {
        if (collateralSymbol === "fxusd") {
          collateralPriceUSD = fxUSDPrice || usdcPrice || 1.0;
        } else if (collateralSymbol === "fxsave") {
          collateralPriceUSD = fxSAVEPrice || usdcPrice || 1.0;
        } else {
          collateralPriceUSD = usdcPrice || 1.0;
        }
      }
      
      // For ETH-pegged tokens (e.g., haETH), use ETH price directly
      // For BTC-pegged tokens (e.g., haBTC), use BTC price directly
      // For EUR-pegged tokens (e.g., haEUR), use EUR/USD exchange rate
      const peggedTokenSymbol = m.peggedToken?.symbol?.toLowerCase() || "";
      const pegTarget = (m as any)?.pegTarget?.toLowerCase() || "";
      const isETHPegged = pegTarget === "eth" || pegTarget === "ethereum" || peggedTokenSymbol.includes("eth") || peggedTokenSymbol === "haeth";
      const isBTCPegged = pegTarget === "btc" || pegTarget === "bitcoin" || peggedTokenSymbol.includes("btc") || peggedTokenSymbol === "habtc";
      const isEURPegged = pegTarget === "eur" || pegTarget === "euro" || peggedTokenSymbol.includes("eur") || peggedTokenSymbol === "haeur";
      
      if (isDebug) {
        console.log(
          `[peggedPriceUSDMap] Market ${id}: symbol="${peggedTokenSymbol}", pegTarget="${pegTarget}", isETHPegged=${isETHPegged}, isBTCPegged=${isBTCPegged}, isEURPegged=${isEURPegged}, ethPrice=${ethPrice}, btcPrice=${btcPrice}, eurPrice=${eurPrice}`
        );
      }
      
      if (isETHPegged && ethPrice) {
        // haETH is pegged to ETH, so price = ETH price in USD
        const ethPriceInWei = BigInt(Math.floor(ethPrice * 1e18));
        map[id] = ethPriceInWei;
        if (isDebug) {
          console.log(
            `[peggedPriceUSDMap] Market ${id} (${peggedTokenSymbol}): Using ETH price directly: $${ethPrice} = ${ethPriceInWei.toString()}`
          );
        }
      } else if (isBTCPegged && btcPrice) {
        // haBTC is pegged to BTC, so price = BTC price in USD
        const btcPriceInWei = BigInt(Math.floor(btcPrice * 1e18));
        map[id] = btcPriceInWei;
        if (isDebug) {
          console.log(
            `[peggedPriceUSDMap] Market ${id} (${peggedTokenSymbol}): Using BTC price directly: $${btcPrice} = ${btcPriceInWei.toString()}`
          );
        }
      } else if (isEURPegged && eurPrice) {
        // haEUR is pegged to EUR, so price = EUR/USD exchange rate
        const eurPriceInWei = BigInt(Math.floor(eurPrice * 1e18));
        map[id] = eurPriceInWei;
        if (isDebug) {
          console.log(
            `[peggedPriceUSDMap] Market ${id} (${peggedTokenSymbol}): Using EUR/USD exchange rate: $${eurPrice} = ${eurPriceInWei.toString()}`
          );
        }
      } else if (isEURPegged) {
        // EUR-pegged but price not loaded - log for debugging
        if (isDebug) {
          console.warn(
            `[peggedPriceUSDMap] Market ${id} (${peggedTokenSymbol}): EUR price not available (eurPrice=${eurPrice}), will use fallback`
          );
        }
      } else if (isBTCPegged && !btcPrice) {
        // BTC-pegged token but BTC price not loaded yet - don't use collateral price calculation
        if (isDebug) {
          console.warn(
            `[peggedPriceUSDMap] Market ${id} (${peggedTokenSymbol}): BTC price not available yet (btcPrice=${btcPrice}), skipping price calculation`
          );
        }
        // Don't set a price - let it fall through to the fallback
      } else if (isEURPegged && !eurPrice) {
        // EUR-pegged token but EUR price not loaded yet - don't use collateral price calculation
        if (isDebug) {
          console.warn(
            `[peggedPriceUSDMap] Market ${id} (${peggedTokenSymbol}): EUR/USD exchange rate not available yet (eurPrice=${eurPrice}), skipping price calculation`
          );
        }
        // Don't set a price - let it fall through to the fallback
      } else if (peggedTokenPrice && collateralPriceUSD > 0) {
        // For other tokens, calculate USD price: peggedTokenPrice (in collateral units) * collateralPriceUSD
        const peggedPriceInCollateral = Number(peggedTokenPrice) / 1e18;
        const peggedPriceInUSD = peggedPriceInCollateral * collateralPriceUSD;
        // Convert back to 18 decimals bigint for consistency
        map[id] = BigInt(Math.floor(peggedPriceInUSD * 1e18));
      } else if (isETHPegged && !ethPrice) {
        // ETH-pegged token but ETH price not loaded yet - log warning
        if (isDebug) {
          console.warn(
            `[peggedPriceUSDMap] Market ${id} (${peggedTokenSymbol}): ETH price not available yet`
          );
        }
      } else if (peggedTokenPrice) {
        // Fallback: if collateral price unavailable, assume $1 peg
        map[id] = peggedTokenPrice;
      } else {
        if (isDebug) {
        console.warn(`[peggedPriceUSDMap] Market ${id}: No price calculated`);
        }
      }
    });
    
    return map;
  }, [
    anchorMarkets,
    reads,
    peggedPriceMap,
    fxUSDPrice,
    fxSAVEPrice,
    usdcPrice,
    ethPrice,
    btcPrice,
    eurPrice,
    isDebug,
  ]);

  const mergedPeggedPriceMap = useMemo(() => {
    // Use USD prices (peggedPriceUSDMap) instead of raw collateral prices
    // This ensures positions show correct USD values even when collateral oracle is missing
    const out: Record<string, bigint | undefined> = {
      ...peggedPriceUSDMap,
    };
    // Only overwrite when we have a defined price from the shared hook (if it's already in USD)
    Object.entries(peggedPriceMap).forEach(([id, price]) => {
      if (price !== undefined) {
        // Check if this price is already in USD or needs conversion
        // For now, prefer our calculated USD prices
        if (!out[id]) {
          out[id] = price;
        }
      }
    });
    if (isDebug) {
      console.log(
        "[mergedPeggedPriceMap] Final price map:",
        Object.entries(out).map(([id, price]) => ({
      marketId: id,
          price: price ? Number(price) / 1e18 : undefined,
        }))
      );
    }
    return out;
  }, [peggedPriceUSDMap, peggedPriceMap, isDebug]);

  return {
    peggedPriceUSDMap,
    mergedPeggedPriceMap,
    ethPrice,
    btcPrice,
    eurPrice,
    fxUSDPrice,
    fxSAVEPrice,
    usdcPrice,
  };
}



