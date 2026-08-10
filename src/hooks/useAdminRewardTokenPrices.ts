"use client";

import { useMemo } from "react";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import { useFxSAVEOnChainPrice } from "@/hooks/useFxSAVEOnChainPrice";
import { usePegTargetPrices } from "@/hooks/usePegTargetPrices";
import {
  buildPeggedTokenAddressMap,
  buildSuggestedAdminTokenPrices,
} from "@/utils/adminRewardTokenPrices";

export type AdminTokenPriceMap = Record<string, string>;

export type UseAdminRewardTokenPricesInput = {
  depositTokenAddresses: string[];
  rewardTokenAddresses: string[];
  tokenSymbolByAddress: Record<string, string>;
  enabled?: boolean;
};

export function useAdminRewardTokenPrices({
  depositTokenAddresses,
  rewardTokenAddresses,
  tokenSymbolByAddress,
  enabled = true,
}: UseAdminRewardTokenPricesInput) {
  const pegPrices = usePegTargetPrices();
  const { price: fxSAVEPrice, isLoading: isFxSaveLoading } =
    useFxSAVEOnChainPrice(enabled);
  const { price: wstETHPrice, isLoading: isWstEthLoading } =
    useCoinGeckoPrice("wrapped-steth", 120_000);

  const peggedTokenAddressMap = useMemo(() => buildPeggedTokenAddressMap(), []);

  const { suggestedDepositPrices, suggestedRewardPrices } = useMemo(() => {
    if (!enabled) {
      return {
        suggestedDepositPrices: {} as AdminTokenPriceMap,
        suggestedRewardPrices: {} as AdminTokenPriceMap,
      };
    }

    return buildSuggestedAdminTokenPrices({
      depositTokenAddresses,
      rewardTokenAddresses,
      tokenSymbolByAddress,
      peggedTokenAddressMap,
      pegPrices: {
        ethPrice: pegPrices.ethPrice,
        btcPrice: pegPrices.btcPrice,
        eurPrice: pegPrices.eurPrice,
        goldPrice: pegPrices.goldPrice,
        silverPrice: pegPrices.silverPrice,
      },
      cgPrices: {
        fxSAVEPrice,
        wstETHPrice,
      },
    });
  }, [
    enabled,
    depositTokenAddresses,
    rewardTokenAddresses,
    tokenSymbolByAddress,
    peggedTokenAddressMap,
    pegPrices.ethPrice,
    pegPrices.btcPrice,
    pegPrices.eurPrice,
    pegPrices.goldPrice,
    pegPrices.silverPrice,
    fxSAVEPrice,
    wstETHPrice,
  ]);

  const isLoading =
    enabled &&
    (isFxSaveLoading ||
      isWstEthLoading ||
      (pegPrices.ethPrice == null && pegPrices.btcPrice == null));

  return {
    suggestedDepositPrices,
    suggestedRewardPrices,
    isLoading,
    peggedTokenAddressMap,
  };
}
