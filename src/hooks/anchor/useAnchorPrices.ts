import { useMemo } from "react";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useContractRead } from "wagmi";
import { CHAINLINK_ORACLE_ABI } from "@/abis/shared";
import { calculatePriceOracleOffset } from "@/utils/anchor/calculateReadOffset";
import { CHAINLINK_FEEDS } from "@/config/priceFeeds";

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
  
  // Get EUR/USD rate from the fxUSD/EUR price feed oracle (same one used on map room)
  // CHAINLINK_FEEDS.EUR_USD is a Chainlink aggregator that returns EUR/USD directly.
  
  // Read EUR/USD directly from the Chainlink feed (same as map room)
  // Try Chainlink ABI first, then Harbor ABI if it fails
  const { data: eurUsdChainlinkData, error: chainlinkError } = useContractRead({
    address: CHAINLINK_FEEDS.EUR_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    query: {
      enabled: true,
      staleTime: 60_000, // 1 minute - Chainlink updates less frequently
      gcTime: 300_000, // 5 minutes
    },
  });
  
  // Try Harbor oracle ABI as fallback (in case it's a Harbor wrapped oracle)
  const { data: eurUsdHarborData, error: harborError } = useContractRead({
    address: CHAINLINK_FEEDS.EUR_USD,
    abi: WRAPPED_PRICE_ORACLE_ABI,
    functionName: "latestAnswer",
    query: {
      enabled: !eurUsdChainlinkData && !chainlinkError, // Only try if Chainlink failed
      staleTime: 60_000,
      gcTime: 300_000,
    },
  });
  
  // Calculate EUR/USD from Chainlink (8 decimals) or Harbor oracle
  const eurPriceFromChainlink = useMemo(() => {
    // Try Chainlink format first
    if (eurUsdChainlinkData) {
      const price = Number(eurUsdChainlinkData as bigint) / 1e8;
      if (price > 0.5 && price < 2.0) {
        console.log(`[useAnchorPrices] ✓ Using EUR/USD from Chainlink feed (${CHAINLINK_FEEDS.EUR_USD}): ${price}`);
        return price;
      }
      console.warn(`[useAnchorPrices] Chainlink EUR/USD price out of range: ${price}`);
    }
    
    // Try Harbor oracle format (tuple)
    if (eurUsdHarborData && Array.isArray(eurUsdHarborData)) {
      const maxUnderlyingPrice = eurUsdHarborData[1] as bigint;
      if (maxUnderlyingPrice && maxUnderlyingPrice > 0n) {
        // Try 8 decimals (Chainlink format)
        let price = Number(maxUnderlyingPrice) / 1e8;
        if (price > 0.5 && price < 2.0) {
          console.log(`[useAnchorPrices] ✓ Using EUR/USD from Harbor oracle (8dec): ${price}`);
          return price;
        }
        // Try 18 decimals
        price = Number(maxUnderlyingPrice) / 1e18;
        if (price > 0.5 && price < 2.0) {
          console.log(`[useAnchorPrices] ✓ Using EUR/USD from Harbor oracle (18dec): ${price}`);
          return price;
        }
      }
    }
    
    if (chainlinkError || harborError) {
      console.warn(`[useAnchorPrices] Failed to read EUR/USD from ${CHAINLINK_FEEDS.EUR_USD}:`, {
        chainlinkError: chainlinkError?.message,
        harborError: harborError?.message,
      });
    }
    
    return null;
  }, [eurUsdChainlinkData, eurUsdHarborData, chainlinkError, harborError]);
  
  // Fallback: Get EUR/USD rate from fxUSD/EUR market oracle (read from batched reads array)
  // Find the fxUSD/EUR market and extract its oracle data from the batched reads
  const eurPriceFromOracle = useMemo(() => {
    // Always log when this useMemo runs, even if reads is not available yet
    console.log("[useAnchorPrices] EUR price calculation useMemo triggered", {
      readsAvailable: reads ? `array(${reads.length})` : 'null/undefined',
      readsType: reads ? (Array.isArray(reads) ? 'array' : typeof reads) : 'null/undefined',
      anchorMarketsCount: anchorMarkets?.length || 0,
      marketIds: anchorMarkets?.map(([id]) => id) || [],
      timestamp: new Date().toISOString(),
    });

    if (!reads || !Array.isArray(reads) || reads.length === 0) {
      // Don't log as warning if reads is just not loaded yet - this is expected during initial render
      if (reads === null || reads === undefined) {
        console.log("[useAnchorPrices] Reads not yet available (expected during initial render)");
      } else {
        console.warn("[useAnchorPrices] Reads is not an array or is empty", { 
          reads: reads ? `type: ${typeof reads}, length: ${Array.isArray(reads) ? reads.length : 'N/A'}` : 'null/undefined' 
        });
      }
      return null;
    }

    if (!anchorMarkets || anchorMarkets.length === 0) {
      console.warn("[useAnchorPrices] No anchorMarkets available");
      return null;
    }

    // Log all markets for debugging - this will help us see if the EUR market is in the list
    console.log(`[useAnchorPrices] Searching for EUR market in ${anchorMarkets.length} markets:`, 
      anchorMarkets.map(([id, m]) => ({
        id,
        pegTarget: (m as any)?.pegTarget,
        collateralSymbol: m.collateral?.symbol,
        hasCollateralPrice: !!(m as any).addresses?.collateralPrice,
        collateralPriceAddress: (m as any).addresses?.collateralPrice,
      }))
    );

    // Find the EUR market index
    console.log(`[useAnchorPrices] Starting EUR market search...`);
    const eurMarketIndex = anchorMarkets.findIndex(([id, m]) => {
      const pegTarget = (m as any)?.pegTarget?.toLowerCase();
      const collateralSymbol = m.collateral?.symbol?.toLowerCase() || "";
      const matches = (pegTarget === "eur" || pegTarget === "euro") && 
             (collateralSymbol === "fxusd" || collateralSymbol === "fxsave");
      if (matches) {
        console.log(`[useAnchorPrices] ✓ Found EUR market: ${id}, pegTarget: ${pegTarget}, collateralSymbol: ${collateralSymbol}, index: ${anchorMarkets.findIndex(([i]) => i === id)}`);
      }
      return matches;
    });
    
    console.log(`[useAnchorPrices] EUR market search result: index=${eurMarketIndex}, found=${eurMarketIndex !== -1}`);

    if (eurMarketIndex === -1) {
      // Try fallback: search by market ID containing "eur"
      const eurMarketById = anchorMarkets.findIndex(([id]) => id.toLowerCase().includes("eur"));
      if (eurMarketById !== -1) {
        console.log(`[useAnchorPrices] Found EUR market by ID fallback: ${anchorMarkets[eurMarketById][0]}`);
        const fallbackIndex = eurMarketById;
        const eurMarket = anchorMarkets[fallbackIndex];
        const eurMarketId = eurMarket[0];
        const eurMarketConfig = eurMarket[1];
        const oracleAddress = (eurMarketConfig as any).addresses?.collateralPrice;
        const hasPriceOracle = !!oracleAddress;
        
        if (hasPriceOracle) {
          console.log(`[useAnchorPrices] Using EUR market found by ID: ${eurMarketId}, oracle: ${oracleAddress}`);
          // Use the fallback market
          const priceOracleOffset = calculatePriceOracleOffset(anchorMarkets, fallbackIndex);
          
          if (priceOracleOffset >= reads.length) {
            console.warn(`[useAnchorPrices] Calculated offset ${priceOracleOffset} exceeds reads array length ${reads.length}`);
            return null;
          }

          const latestAnswerResult = reads?.[priceOracleOffset]?.result;
          const readStatus = reads?.[priceOracleOffset]?.status;
          
          console.log(`[useAnchorPrices] EUR oracle read from batched reads (fallback) - offset: ${priceOracleOffset}/${reads.length}, status: ${readStatus}, result: ${latestAnswerResult ? (Array.isArray(latestAnswerResult) ? `tuple[${latestAnswerResult.length}]` : latestAnswerResult.toString()) : 'null'}`);
          
          if (readStatus === "success" && latestAnswerResult) {
            // Process the oracle data (same logic as below)
            if (Array.isArray(latestAnswerResult)) {
              const allZeros = latestAnswerResult.every(v => v === 0n || v === BigInt(0));
              if (!allZeros) {
                const price = latestAnswerResult[1] as bigint;
                if (price && price > 0n) {
                  const fxUsdInEur = Number(price) / 1e18;
                  if (fxUsdInEur > 0 && fxUsdInEur < 2.0) {
                    const eurUsd = 1 / fxUsdInEur;
                    if (eurUsd > 0.5 && eurUsd < 2.0) {
                      console.log(`[useAnchorPrices] Calculated EUR/USD from fallback market: ${eurUsd}`);
                      return eurUsd;
                    }
                  }
                }
              }
            } else if (typeof latestAnswerResult === "bigint" && latestAnswerResult !== 0n) {
              let priceNum = Number(latestAnswerResult) / 1e8;
              if (priceNum > 0.5 && priceNum < 2.0) {
                console.log(`[useAnchorPrices] Using EUR/USD from Chainlink (fallback): ${priceNum}`);
                return priceNum;
              }
              priceNum = Number(latestAnswerResult) / 1e18;
              if (priceNum > 0.5 && priceNum < 2.0) {
                console.log(`[useAnchorPrices] Using EUR/USD from Chainlink 18dec (fallback): ${priceNum}`);
                return priceNum;
              }
            }
          }
        }
      }
      
      console.warn("[useAnchorPrices] EUR market not found in anchorMarkets", {
        marketCount: anchorMarkets.length,
        marketIds: anchorMarkets.map(([id]) => id),
        pegTargets: anchorMarkets.map(([_, m]) => (m as any)?.pegTarget),
        collateralSymbols: anchorMarkets.map(([_, m]) => m.collateral?.symbol),
        searchedFor: "pegTarget='eur'/'euro' AND collateralSymbol='fxusd'/'fxsave'",
      });
      return null;
    }

    const eurMarket = anchorMarkets[eurMarketIndex];
    const eurMarketId = eurMarket[0];
    const eurMarketConfig = eurMarket[1];
    const oracleAddress = (eurMarketConfig as any).addresses?.collateralPrice;
    const hasPriceOracle = !!oracleAddress;
    
    if (!hasPriceOracle) {
      console.warn("[useAnchorPrices] EUR market has no price oracle", { marketId: eurMarketId });
      return null;
    }

    console.log(`[useAnchorPrices] ✓ EUR market found: ${eurMarketId}, oracle: ${oracleAddress}, index: ${eurMarketIndex}`);

    // Calculate offset to oracle reads using utility function
    console.log(`[useAnchorPrices] Calculating price oracle offset for market index ${eurMarketIndex}...`);
    const priceOracleOffset = calculatePriceOracleOffset(anchorMarkets, eurMarketIndex);
    
    console.log(`[useAnchorPrices] ✓ Calculated offset for EUR market at index ${eurMarketIndex}: ${priceOracleOffset}, total markets: ${anchorMarkets.length}, total reads: ${reads.length}, offset within bounds: ${priceOracleOffset < reads.length}`);

    if (priceOracleOffset >= reads.length) {
      console.warn(`[useAnchorPrices] Calculated offset ${priceOracleOffset} exceeds reads array length ${reads.length}`);
      return null;
    }

    console.log(`[useAnchorPrices] Reading from reads array at offset ${priceOracleOffset}...`);
    const readResult = reads?.[priceOracleOffset];
    const latestAnswerResult = readResult?.result;
    const readStatus = readResult?.status;
    const readError = readResult?.error;
    
    console.log(`[useAnchorPrices] EUR oracle read result:`, {
      offset: `${priceOracleOffset}/${reads.length}`,
      status: readStatus,
      hasResult: !!latestAnswerResult,
      resultType: latestAnswerResult ? (Array.isArray(latestAnswerResult) ? `tuple[${latestAnswerResult.length}]` : typeof latestAnswerResult) : 'null',
      resultValue: latestAnswerResult ? (Array.isArray(latestAnswerResult) ? latestAnswerResult.map((v, i) => `[${i}]: ${v.toString()}`).join(', ') : latestAnswerResult.toString()) : 'null',
      error: readError ? JSON.stringify(readError).substring(0, 200) : 'none',
    });
    
    if (latestAnswerResult && Array.isArray(latestAnswerResult)) {
      console.log(`[useAnchorPrices] EUR oracle tuple breakdown:`, latestAnswerResult.map((v, i) => ({
        index: i,
        value: v.toString(),
        valueNum: Number(v) / 1e18,
        label: i === 0 ? 'minUnderlyingPrice' : i === 1 ? 'maxUnderlyingPrice' : i === 2 ? 'minWrappedRate' : 'maxWrappedRate',
      })));
    } else if (typeof latestAnswerResult === "bigint") {
      console.log(`[useAnchorPrices] EUR oracle bigint value:`, {
        raw: latestAnswerResult.toString(),
        as8dec: Number(latestAnswerResult) / 1e8,
        as18dec: Number(latestAnswerResult) / 1e18,
      });
    }

    if (readStatus !== "success") {
      console.warn(`[useAnchorPrices] EUR oracle read failed with status: ${readStatus}`, {
        error: readError,
        offset: priceOracleOffset,
        totalReads: reads.length,
        oracleAddress,
        marketId: eurMarketId,
      });
      return null;
    }

    if (!latestAnswerResult) {
      console.warn("[useAnchorPrices] EUR oracle data not available in reads array");
      return null;
    }
    
    // Check if result is all zeros (which indicates the oracle might not be initialized or the read failed)
    if (Array.isArray(latestAnswerResult)) {
      const allZeros = latestAnswerResult.every(v => v === 0n || v === BigInt(0));
      if (allZeros) {
        if (isDebug) {
          console.warn(`[useAnchorPrices] EUR oracle returned all zeros - oracle may not be initialized or contract read failed`);
        }
        return null;
      }
    } else if (typeof latestAnswerResult === "bigint" && latestAnswerResult === 0n) {
      if (isDebug) {
        console.warn(`[useAnchorPrices] EUR oracle returned zero - oracle may not be initialized or contract read failed`);
      }
      return null;
    }

    // Process the oracle data
    if (Array.isArray(latestAnswerResult)) {
      // Harbor oracle returns tuple [minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate]
      // For fxUSD/EUR market's collateralPrice oracle, we need to check what it actually returns
      // The oracle at 0x71437C90F1E0785dd691FD02f7bE0B90cd14c097 might be a Chainlink EUR/USD oracle
      // wrapped in a Harbor oracle interface, or it might return fxUSD in EUR terms
      
      // Try all tuple values to see which one makes sense as EUR/USD
      const minUnderlyingPrice = latestAnswerResult[0] as bigint;
      const maxUnderlyingPrice = latestAnswerResult[1] as bigint;
      const minWrappedRate = latestAnswerResult[2] as bigint;
      const maxWrappedRate = latestAnswerResult[3] as bigint;
      
      // Log all interpretations to help identify the correct one
      const interpretations = {
        minUnderlyingPrice: {
          raw: minUnderlyingPrice.toString(),
          as8dec: Number(minUnderlyingPrice) / 1e8,
          as18dec: Number(minUnderlyingPrice) / 1e18,
        },
        maxUnderlyingPrice: {
          raw: maxUnderlyingPrice.toString(),
          as8dec: Number(maxUnderlyingPrice) / 1e8,
          as18dec: Number(maxUnderlyingPrice) / 1e18,
          inverted18dec: Number(maxUnderlyingPrice) / 1e18 > 0 ? 1 / (Number(maxUnderlyingPrice) / 1e18) : null,
        },
        minWrappedRate: {
          raw: minWrappedRate.toString(),
          as18dec: Number(minWrappedRate) / 1e18,
        },
        maxWrappedRate: {
          raw: maxWrappedRate.toString(),
          as18dec: Number(maxWrappedRate) / 1e18,
        },
      };
      
      console.log(`[useAnchorPrices] EUR oracle tuple interpretations:`, JSON.stringify(interpretations, null, 2));
      
      // The raw value is 345432475881310 (15 digits)
      // This doesn't match standard Chainlink 8-decimal format (should be ~108000000 for 1.08)
      // The map room successfully interprets this, so there must be a correct way to read it
      // Let's try all possible interpretations
      
      if (maxUnderlyingPrice && maxUnderlyingPrice > 0n) {
        const rawNum = Number(maxUnderlyingPrice);
        
        // Try different decimal interpretations
        const interpretations = [
          { decimals: 8, value: rawNum / 1e8, label: "8dec (Chainlink standard)" },
          { decimals: 15, value: rawNum / 1e15, label: "15dec" },
          { decimals: 18, value: rawNum / 1e18, label: "18dec" },
          { decimals: 6, value: rawNum / 1e6, label: "6dec" },
          { decimals: 10, value: rawNum / 1e10, label: "10dec" },
        ];
        
        // Also try inverted interpretations (for cases where it might be EUR in USD or fxUSD in EUR)
        const invertedInterpretations = interpretations.map(i => ({
          ...i,
          value: i.value > 0 ? 1 / i.value : null,
          label: `${i.label} (inverted)`,
        }));
        
        // Check all interpretations
        for (const interp of [...interpretations, ...invertedInterpretations]) {
          if (interp.value !== null && interp.value > 0.5 && interp.value < 2.0) {
            console.log(`[useAnchorPrices] ✓ Using maxUnderlyingPrice as EUR/USD (${interp.label}): ${interp.value}`);
            return interp.value;
          }
        }
        
        // If none of the standard interpretations work, maybe it's stored in a scaled format
        // Try dividing by powers of 10 to find a reasonable value
        for (let decimals = 5; decimals <= 20; decimals++) {
          const value = rawNum / (10 ** decimals);
          if (value > 0.5 && value < 2.0) {
            console.log(`[useAnchorPrices] ✓ Using maxUnderlyingPrice as EUR/USD (${decimals}dec): ${value}`);
            return value;
          }
          // Also try inverted
          if (value > 0 && value < 1.0) {
            const inverted = 1 / value;
            if (inverted > 0.5 && inverted < 2.0) {
              console.log(`[useAnchorPrices] ✓ Using maxUnderlyingPrice as inverted (${decimals}dec): ${inverted}`);
              return inverted;
            }
          }
        }
      }
      
      // Try minUnderlyingPrice as EUR/USD (8 decimals)
      if (minUnderlyingPrice && minUnderlyingPrice > 0n) {
        let eurUsd = Number(minUnderlyingPrice) / 1e8;
        if (eurUsd > 0.5 && eurUsd < 2.0) {
          console.log(`[useAnchorPrices] ✓ Using minUnderlyingPrice as EUR/USD (8dec): ${eurUsd}`);
          return eurUsd;
        }
      }
      
      // Try maxWrappedRate as EUR/USD (18 decimals) - this is often the correct value for Harbor oracles
      if (maxWrappedRate && maxWrappedRate > 0n) {
        const eurUsd = Number(maxWrappedRate) / 1e18;
        if (eurUsd > 0.5 && eurUsd < 2.0) {
          console.log(`[useAnchorPrices] ✓ Using maxWrappedRate as EUR/USD (18dec): ${eurUsd}`);
          return eurUsd;
        }
      }
      
      // Try minWrappedRate as EUR/USD (18 decimals)
      if (minWrappedRate && minWrappedRate > 0n) {
        const eurUsd = Number(minWrappedRate) / 1e18;
        if (eurUsd > 0.5 && eurUsd < 2.0) {
          console.log(`[useAnchorPrices] ✓ Using minWrappedRate as EUR/USD (18dec): ${eurUsd}`);
          return eurUsd;
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
  
  // Use Chainlink feed first (same as map room), then Harbor oracle, then CoinGecko
  const { price: eurPriceCoinGecko } = useCoinGeckoPrice("stasis-euro");
  const eurPrice = eurPriceFromChainlink ?? eurPriceFromOracle ?? eurPriceCoinGecko;
  
  // Always log EUR price calculation (not just in debug mode) to help diagnose issues
  console.log(`[useAnchorPrices] EUR price calculation:`, {
    chainlink: eurPriceFromChainlink,
    harborOracle: eurPriceFromOracle,
    coinGecko: eurPriceCoinGecko,
    final: eurPrice,
    source: eurPriceFromChainlink ? 'Chainlink feed (map room)' : eurPriceFromOracle ? 'Harbor oracle' : eurPriceCoinGecko ? 'CoinGecko' : 'none',
    note: eurPrice ? `1 EUR = $${eurPrice} USD` : 'EUR price unavailable',
    readsAvailable: reads ? `array(${reads.length})` : 'null/undefined',
    anchorMarketsCount: anchorMarkets?.length || 0
  });

  // Fetch Chainlink ETH/USD as fallback
  const { data: chainlinkEthPriceData } = useContractRead({
    address: CHAINLINK_FEEDS.ETH_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    query: {
      enabled: true,
      staleTime: 60_000, // 1 minute - Chainlink updates less frequently
      gcTime: 300_000, // 5 minutes
    },
  });

  // Fetch Chainlink BTC/USD as fallback
  const { data: chainlinkBtcPriceData } = useContractRead({
    address: CHAINLINK_FEEDS.BTC_USD,
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
        // Calculate offset to oracle reads using utility function
        const priceOracleOffset = calculatePriceOracleOffset(anchorMarkets, mi);
        
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



