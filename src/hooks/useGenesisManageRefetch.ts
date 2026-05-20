"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useGenesisManageRefetch({
  refetchCollateralTokens,
  refetchReads,
  refetchTotalDeposits,
  refetchMarks,
}: {
  refetchCollateralTokens: () => Promise<unknown>;
  refetchReads: () => Promise<unknown>;
  refetchTotalDeposits: () => Promise<unknown>;
  refetchMarks: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    queryClient.invalidateQueries({
      queryKey: ["anvil-contract-reads"],
    });

    await refetchCollateralTokens();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await Promise.all([refetchReads(), refetchTotalDeposits()]);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await Promise.all([
      refetchCollateralTokens(),
      refetchReads(),
      refetchTotalDeposits(),
    ]);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    queryClient.invalidateQueries({ queryKey: ["allHarborMarks"] });
    queryClient.invalidateQueries({ queryKey: ["harborMarks"] });

    await refetchMarks();

    let attempts = 0;
    const maxAttempts = 6;
    const pollInterval = 5000;

    const pollForMarks = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      await refetchMarks();
      if (attempts < maxAttempts) {
        await pollForMarks();
      }
    };

    void pollForMarks();
  }, [
    queryClient,
    refetchCollateralTokens,
    refetchReads,
    refetchTotalDeposits,
    refetchMarks,
  ]);
}
