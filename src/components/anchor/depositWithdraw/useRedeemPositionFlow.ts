"use client";

import { useEffect, useMemo, useState } from "react";
import { useContractReads } from "wagmi";
import { STABILITY_POOL_ABI } from "@/abis";
import {
  anchorSimpleRedeemPositionFlowParts,
  anchorSimpleSellFlowParts,
  anchorSimpleWithdrawFlowParts,
} from "@/components/depositModalFlowSteps";
import {
  buildAnchorRedeemPositions,
  deriveRedeemRequestStatus,
  type AnchorRedeemRequestStatus,
} from "@/utils/anchorRedeemPositions";
import type {
  AnchorModalFlowPage,
  AnchorModalMarketEntry,
  AnchorModalPoolPositionRow,
  AnchorModalWithdrawalMethods,
} from "./modalHookTypes";
import type { AnchorDepositWithdrawTab } from "./types";

export type UseRedeemPositionFlowParams = {
  simpleMode: boolean;
  isActive: boolean;
  activeTab: AnchorDepositWithdrawTab;
  address: `0x${string}` | undefined;
  /** Pool rows across the ha-token market group (both collateral and sail sides). */
  groupedPoolPositions: readonly AnchorModalPoolPositionRow[];
  peggedBalance: bigint;
  selectedRedeemPositionKey: string | null;
  marketsForToken: readonly AnchorModalMarketEntry[];
  withdrawOnly: boolean;
  mintOnly: boolean;
  earlyWithdraw1PctEnabled: boolean;
  withdrawalMethods: AnchorModalWithdrawalMethods;
  flowPage: AnchorModalFlowPage;
  setFlowPage: (page: AnchorModalFlowPage) => void;
};

/**
 * Position-first redeem flow: reads each pool's withdrawal-request window, builds the
 * selectable redeem positions, and derives which flow page the modal is on (confirm /
 * route / review) including whether the extra route step is needed at all.
 */
export function useRedeemPositionFlow({
  simpleMode,
  isActive,
  activeTab,
  address,
  groupedPoolPositions,
  peggedBalance,
  selectedRedeemPositionKey,
  marketsForToken,
  withdrawOnly,
  mintOnly,
  earlyWithdraw1PctEnabled,
  withdrawalMethods,
  flowPage,
  setFlowPage,
}: UseRedeemPositionFlowParams) {
  const redeemWindowContracts = useMemo(() => {
    if (!simpleMode) return [];
    return groupedPoolPositions
      .filter((row) => row.balance > 0n && row.poolAddress)
      .map((row) => ({
        address: row.poolAddress as `0x${string}`,
        abi: STABILITY_POOL_ABI,
        functionName: "getWithdrawalRequest" as const,
        args: address
          ? ([address] as const)
          : (["0x0000000000000000000000000000000000000000"] as const),
      }));
  }, [simpleMode, groupedPoolPositions, address]);

  const { data: redeemWindowReads } = useContractReads({
    contracts: redeemWindowContracts,
    query: {
      enabled:
        simpleMode &&
        isActive &&
        (activeTab === "withdraw" || activeTab === "sell") &&
        redeemWindowContracts.length > 0 &&
        !!address,
      refetchInterval: 30_000,
    },
  });

  // Keep countdown badges fresh between chain refetches.
  const [redeemCountdownNowSec, setRedeemCountdownNowSec] = useState(() =>
    Math.floor(Date.now() / 1000),
  );
  useEffect(() => {
    if (!simpleMode || (activeTab !== "withdraw" && activeTab !== "sell")) {
      return;
    }
    const id = window.setInterval(() => {
      setRedeemCountdownNowSec(Math.floor(Date.now() / 1000));
    }, 15_000);
    return () => window.clearInterval(id);
  }, [simpleMode, activeTab]);

  const redeemWindowOpenByPoolAddress = useMemo(() => {
    const map = new Map<string, boolean>();
    redeemWindowContracts.forEach((c, i) => {
      const result = redeemWindowReads?.[i]?.result as
        | readonly [bigint, bigint]
        | undefined;
      if (!result) {
        map.set(c.address.toLowerCase(), false);
        return;
      }
      const [start, end] = result;
      if (start === 0n && end === 0n) {
        map.set(c.address.toLowerCase(), false);
        return;
      }
      const now = BigInt(redeemCountdownNowSec);
      map.set(c.address.toLowerCase(), now >= start && now <= end);
    });
    return map;
  }, [redeemWindowContracts, redeemWindowReads, redeemCountdownNowSec]);

  const redeemRequestStatusByPoolAddress = useMemo(() => {
    const map = new Map<string, AnchorRedeemRequestStatus | undefined>();
    redeemWindowContracts.forEach((c, i) => {
      const result = redeemWindowReads?.[i]?.result as
        | readonly [bigint, bigint]
        | undefined;
      map.set(
        c.address.toLowerCase(),
        deriveRedeemRequestStatus(result, redeemCountdownNowSec),
      );
    });
    return map;
  }, [redeemWindowContracts, redeemWindowReads, redeemCountdownNowSec]);

  const redeemPositionsBase = useMemo(
    () =>
      buildAnchorRedeemPositions({
        peggedBalance,
        poolRows: groupedPoolPositions,
        windowOpenByPoolAddress: redeemWindowOpenByPoolAddress,
        requestStatusByPoolAddress: redeemRequestStatusByPoolAddress,
      }),
    [
      peggedBalance,
      groupedPoolPositions,
      redeemWindowOpenByPoolAddress,
      redeemRequestStatusByPoolAddress,
    ],
  );

  const selectedRedeemPosition = useMemo(
    () =>
      redeemPositionsBase.find((p) => p.key === selectedRedeemPositionKey) ??
      null,
    [redeemPositionsBase, selectedRedeemPositionKey],
  );

  const needsRedeemRouteStep = useMemo(() => {
    if (!simpleMode || marketsForToken.length <= 1 || withdrawOnly) {
      return false;
    }
    if (!selectedRedeemPosition) return false;
    if (selectedRedeemPosition.kind === "wallet") return true;
    if (earlyWithdraw1PctEnabled) return true;
    if (selectedRedeemPosition.windowOpen) return true;
    const method =
      selectedRedeemPosition.poolType === "collateral"
        ? withdrawalMethods.collateralPool
        : withdrawalMethods.sailPool;
    return method === "immediate";
  }, [
    simpleMode,
    marketsForToken.length,
    withdrawOnly,
    selectedRedeemPosition,
    earlyWithdraw1PctEnabled,
    withdrawalMethods.collateralPool,
    withdrawalMethods.sailPool,
  ]);

  const isRedeemConfirmFlowPage =
    simpleMode && !!selectedRedeemPosition && flowPage === 2;
  const isRedeemRouteFlowPage =
    simpleMode && needsRedeemRouteStep && flowPage === 3;
  const isRedeemReviewFlowPage =
    simpleMode &&
    !!selectedRedeemPosition &&
    (needsRedeemRouteStep ? flowPage === 4 : flowPage === 3);

  const isMintReviewFlowPage =
    simpleMode &&
    activeTab === "deposit" &&
    (mintOnly ? flowPage === 2 : flowPage === 3);

  // Drop the route/review pages when route is no longer needed.
  useEffect(() => {
    if (!needsRedeemRouteStep && flowPage === 4) {
      setFlowPage(3);
    }
  }, [needsRedeemRouteStep, flowPage]);

  // Mint-only collapses deposit page; clamp review to page 2.
  useEffect(() => {
    if (!simpleMode || activeTab !== "deposit") return;
    if (mintOnly && flowPage > 2) {
      setFlowPage(2);
    }
  }, [simpleMode, activeTab, mintOnly, flowPage]);

  const simpleWithdrawFlowParts = useMemo(() => {
    if (!simpleMode) return anchorSimpleWithdrawFlowParts(withdrawOnly);
    const confirmLabel =
      selectedRedeemPositionKey === "wallet"
        ? ("Redeem" as const)
        : selectedRedeemPositionKey &&
            ((selectedRedeemPositionKey.endsWith("-collateral") &&
              withdrawalMethods.collateralPool === "request") ||
              (selectedRedeemPositionKey.endsWith("-sail") &&
                withdrawalMethods.sailPool === "request")) &&
            !earlyWithdraw1PctEnabled
          ? ("Request" as const)
          : ("Confirm" as const);
    return anchorSimpleRedeemPositionFlowParts(flowPage, {
      confirmLabel,
      includeRouteStep: needsRedeemRouteStep,
    });
  }, [
    simpleMode,
    withdrawOnly,
    flowPage,
    selectedRedeemPositionKey,
    withdrawalMethods.collateralPool,
    withdrawalMethods.sailPool,
    earlyWithdraw1PctEnabled,
    needsRedeemRouteStep,
  ]);

  const simpleSellFlowParts = useMemo(() => {
    if (simpleMode) {
      return anchorSimpleRedeemPositionFlowParts(flowPage, {
        confirmLabel: "Redeem",
        includeRouteStep: needsRedeemRouteStep,
      });
    }
    return anchorSimpleSellFlowParts();
  }, [simpleMode, flowPage, needsRedeemRouteStep]);

  return {
    redeemPositionsBase,
    selectedRedeemPosition,
    needsRedeemRouteStep,
    isRedeemConfirmFlowPage,
    isRedeemRouteFlowPage,
    isRedeemReviewFlowPage,
    isMintReviewFlowPage,
    simpleWithdrawFlowParts,
    simpleSellFlowParts,
  };
}
