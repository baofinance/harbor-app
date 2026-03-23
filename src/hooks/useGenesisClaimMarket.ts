"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { GENESIS_ABI } from "@/abis/shared";

export type UseGenesisClaimMarketParams = {
  setClaimingMarket: (marketId: string | null) => void;
  setClaimModal: Dispatch<
    SetStateAction<{
      open: boolean;
      status: "pending" | "success" | "error";
      marketId?: string | null;
      errorMessage?: string;
    }>
  >;
  setShareModal: Dispatch<
    SetStateAction<{
      open: boolean;
      marketName?: string;
      peggedSymbol?: string;
    }>
  >;
  refetchReads: () => Promise<unknown>;
  refetchTotalDeposits: () => Promise<unknown>;
};

/**
 * Single claim flow for Genesis index rows (active + completed): tx → receipt → refetch → marks invalidate → modals.
 */
export function useGenesisClaimMarket({
  setClaimingMarket,
  setClaimModal,
  setShareModal,
  refetchReads,
  refetchTotalDeposits,
}: UseGenesisClaimMarketParams) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const claimMarket = useCallback(
    async (args: {
      marketId: string;
      genesisAddress: string | undefined;
      displayMarketName: string;
      peggedSymbolForShare: string;
    }) => {
      const {
        marketId,
        genesisAddress,
        displayMarketName,
        peggedSymbolForShare,
      } = args;
      if (!genesisAddress || !address) return;
      try {
        setClaimingMarket(marketId);
        setClaimModal({
          open: true,
          status: "pending",
          marketId,
        });
        const tx = await writeContractAsync({
          address: genesisAddress as `0x${string}`,
          abi: GENESIS_ABI,
          functionName: "claim",
          args: [address as `0x${string}`],
        });
        await publicClient?.waitForTransactionReceipt({ hash: tx });
        await refetchReads();
        await refetchTotalDeposits();
        await queryClient.invalidateQueries({ queryKey: ["allHarborMarks"] });
        setClaimModal((prev) => ({ ...prev, status: "success" }));
        setShareModal({
          open: true,
          marketName: displayMarketName,
          peggedSymbol: peggedSymbolForShare,
        });
      } catch (error) {
        const err = error as { shortMessage?: string; message?: string };
        setClaimModal({
          open: true,
          status: "error",
          marketId,
          errorMessage:
            err?.shortMessage || err?.message || "Claim failed",
        });
      } finally {
        setClaimingMarket(null);
      }
    },
    [
      address,
      publicClient,
      queryClient,
      refetchReads,
      refetchTotalDeposits,
      setClaimModal,
      setClaimingMarket,
      setShareModal,
      writeContractAsync,
    ]
  );

  return { claimMarket };
}
