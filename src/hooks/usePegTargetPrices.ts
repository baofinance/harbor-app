"use client";

import { useMemo } from "react";
import { useContractRead } from "wagmi";
import { parseUnits } from "viem";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { CHAINLINK_FEEDS } from "@/config/chainlink";
import { CHAINLINK_ORACLE_ABI } from "@/abis/shared";

/**
 * Central hook for peg target USD prices (ETH, BTC, EUR, gold, silver).
 * Use this everywhere: Anchor page, Sail page, Transparency, AnchorDepositWithdrawModal.
 *
 * Single source of truth - no duplicate Chainlink/CoinGecko logic.
 */
export function usePegTargetPrices() {
  const { price: ethPriceCoinGecko } = useCoinGeckoPrice("ethereum", 120_000);
  const { price: btcPriceCoinGecko } = useCoinGeckoPrice("bitcoin", 120_000);
  const { price: eurPriceCoinGecko } = useCoinGeckoPrice("stasis-euro", 120_000);

  const { data: chainlinkEthData } = useContractRead({
    address: CHAINLINK_FEEDS.ETH_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    chainId: 1,
    query: { staleTime: 60_000, gcTime: 300_000 },
  });

  const { data: chainlinkBtcData } = useContractRead({
    address: CHAINLINK_FEEDS.BTC_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    chainId: 1,
    query: { staleTime: 60_000, gcTime: 300_000 },
  });

  const { data: chainlinkEurData } = useContractRead({
    address: CHAINLINK_FEEDS.EUR_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    chainId: 1,
    query: { staleTime: 60_000, gcTime: 300_000 },
  });

  const { data: chainlinkGoldData } = useContractRead({
    address: CHAINLINK_FEEDS.XAU_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    chainId: 1,
    query: { staleTime: 60_000, gcTime: 300_000 },
  });

  const { data: chainlinkSilverData } = useContractRead({
    address: CHAINLINK_FEEDS.XAG_USD,
    abi: CHAINLINK_ORACLE_ABI,
    functionName: "latestAnswer",
    chainId: 1,
    query: { staleTime: 60_000, gcTime: 300_000 },
  });

  return useMemo(() => {
    const chainlinkEth =
      chainlinkEthData != null ? Number(chainlinkEthData) / 1e8 : null;
    const chainlinkBtc =
      chainlinkBtcData != null ? Number(chainlinkBtcData) / 1e8 : null;
    const chainlinkEur =
      chainlinkEurData != null ? Number(chainlinkEurData) / 1e8 : null;
    const chainlinkGold =
      chainlinkGoldData != null ? Number(chainlinkGoldData) / 1e8 : null;
    const chainlinkSilver =
      chainlinkSilverData != null ? Number(chainlinkSilverData) / 1e8 : null;

    const ethPrice =
      ethPriceCoinGecko && ethPriceCoinGecko > 0
        ? ethPriceCoinGecko
        : chainlinkEth && chainlinkEth > 0
          ? chainlinkEth
          : null;

    const btcPrice =
      btcPriceCoinGecko && btcPriceCoinGecko > 0
        ? btcPriceCoinGecko
        : chainlinkBtc && chainlinkBtc > 0
          ? chainlinkBtc
          : null;

    const eurPrice =
      chainlinkEur && chainlinkEur > 0.9 && chainlinkEur < 2.0
        ? chainlinkEur
        : eurPriceCoinGecko && eurPriceCoinGecko > 0
          ? eurPriceCoinGecko
          : null;

    const goldPrice =
      chainlinkGold && chainlinkGold > 100 && chainlinkGold < 100_000
        ? chainlinkGold
        : null;

    const silverPrice =
      chainlinkSilver && chainlinkSilver > 1 && chainlinkSilver < 500
        ? chainlinkSilver
        : null;

    const toWei = (n: number | null): bigint =>
      n != null && n > 0 ? parseUnits(n.toFixed(8), 18) : 0n;

    return {
      ethPrice,
      btcPrice,
      eurPrice,
      goldPrice,
      silverPrice,
      /** Raw EUR/USD from CoinGecko (stasis-euro); for fallbacks when composite `eurPrice` is null. */
      eurPriceCoinGecko,
      ethPriceWei: toWei(ethPrice),
      btcPriceWei: toWei(btcPrice),
      eurPriceWei: toWei(eurPrice),
      goldPriceWei: toWei(goldPrice),
      silverPriceWei: toWei(silverPrice),
    };
  }, [
    ethPriceCoinGecko,
    btcPriceCoinGecko,
    eurPriceCoinGecko,
    chainlinkEthData,
    chainlinkBtcData,
    chainlinkEurData,
    chainlinkGoldData,
    chainlinkSilverData,
  ]);
}
