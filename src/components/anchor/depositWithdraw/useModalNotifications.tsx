"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatEther } from "viem";
import { AlertTriangle, Banknote, Info, RefreshCw } from "lucide-react";
import { ErrorBanner } from "@/components/anchor/ErrorBanner";
import { InfoCallout } from "@/components/InfoCallout";
import {
  useAppNotificationsOptional,
  useRegisterAppNotifications,
} from "@/contexts/AppNotificationsContext";
import type { useAnyTokenDeposit } from "@/hooks/useAnyTokenDeposit";
import type { MintValidation } from "@/utils/anchorMintValidation";
import type { AnchorModalMarket, AnchorModalMarketEntry } from "./modalHookTypes";
import type { AnchorDepositWithdrawTab } from "./types";

export type AnchorModalNotificationSeverity = "navy" | "green" | "amber" | "coral";

export type UseModalNotificationsParams = {
  activeTab: AnchorDepositWithdrawTab;
  embedded: boolean;
  isActive: boolean;
  transactionNotificationError: string | null;
  setShowNotifications: (value: boolean) => void;
  mintOnly: boolean;
  withdrawOnly: boolean;
  isDirectPeggedDeposit: boolean;
  isCollateralOnlyChain: boolean;
  needsSwap: ReturnType<typeof useAnyTokenDeposit>["needsSwap"];
  selectedDepositAsset: string;
  activeCollateralSymbol: string;
  activeWrappedCollateralSymbol: string;
  peggedTokenSymbol: string;
  marketsForToken: readonly AnchorModalMarketEntry[];
  selectedMarket: AnchorModalMarket;
  selectedMarketId: string;
  selectedRedeemMarket: AnchorModalMarketEntry | undefined;
  selectedRedeemMarketId: string;
  redeemCollateralSymbol: string;
  redeemInputAmount: bigint | undefined;
  redeemPreview: { isCapped: boolean; peggedRedeemed: bigint } | null;
  isCrossMarketRedeem: boolean;
  mintValidation: MintValidation;
};

/**
 * Builds the notification-tray payload (count, badge severities, body) for the modal and
 * registers it with the embedded Earn panel. Mint-cap warnings are merged on top of the
 * tab notices and, once the warning has persisted, auto-expand the tray.
 */
export function useModalNotifications({
  activeTab,
  embedded,
  isActive,
  transactionNotificationError,
  setShowNotifications,
  mintOnly,
  withdrawOnly,
  isDirectPeggedDeposit,
  isCollateralOnlyChain,
  needsSwap,
  selectedDepositAsset,
  activeCollateralSymbol,
  activeWrappedCollateralSymbol,
  peggedTokenSymbol,
  marketsForToken,
  selectedMarket,
  selectedMarketId,
  selectedRedeemMarket,
  selectedRedeemMarketId,
  redeemCollateralSymbol,
  redeemInputAmount,
  redeemPreview,
  isCrossMarketRedeem,
  mintValidation,
}: UseModalNotificationsParams) {
  const showWithdrawRedemptionCapNotice =
    !withdrawOnly &&
    !!redeemInputAmount &&
    redeemInputAmount > 0n &&
    !!redeemPreview?.isCapped;

  const showWithdrawCrossMarketNotice =
    !withdrawOnly &&
    marketsForToken.length > 1 &&
    isCrossMarketRedeem;

  const withdrawNotificationCount = useMemo(() => {
    let count = 1;
    if (showWithdrawRedemptionCapNotice) count += 1;
    if (showWithdrawCrossMarketNotice) count += 1;
    return count;
  }, [showWithdrawRedemptionCapNotice, showWithdrawCrossMarketNotice]);

  const depositNotificationCount = useMemo(() => {
    if (activeTab !== "deposit") return 0;
    let count = 1;
    if (mintOnly && !isDirectPeggedDeposit) count += 1;
    if (!isCollateralOnlyChain && !needsSwap) count += 1;
    if (
      selectedDepositAsset &&
      !needsSwap &&
      selectedDepositAsset !== activeCollateralSymbol &&
      selectedDepositAsset !== activeWrappedCollateralSymbol &&
      !isDirectPeggedDeposit
    ) {
      count += 1;
    }
    return count;
  }, [
    activeTab,
    mintOnly,
    isDirectPeggedDeposit,
    isCollateralOnlyChain,
    needsSwap,
    selectedDepositAsset,
    activeCollateralSymbol,
    activeWrappedCollateralSymbol,
  ]);

  const anchorModalNotificationCount = useMemo(() => {
    const base =
      activeTab === "withdraw"
        ? withdrawNotificationCount
        : depositNotificationCount;
    return transactionNotificationError ? base + 1 : base;
  }, [
    activeTab,
    withdrawNotificationCount,
    depositNotificationCount,
    transactionNotificationError,
  ]);

  const anchorModalNotificationSeverities =
    useMemo((): Array<AnchorModalNotificationSeverity> => {
      const severities: Array<AnchorModalNotificationSeverity> = [];
      if (transactionNotificationError) severities.push("coral");
      if (activeTab === "withdraw") {
        severities.push("navy");
        if (showWithdrawRedemptionCapNotice) severities.push("amber");
        if (showWithdrawCrossMarketNotice) severities.push("amber");
        return severities;
      }
      severities.push("navy");
      if (mintOnly && !isDirectPeggedDeposit) severities.push("navy");
      if (!isCollateralOnlyChain && !needsSwap) {
        severities.push("green");
      }
      if (
        selectedDepositAsset &&
        !needsSwap &&
        selectedDepositAsset !== activeCollateralSymbol &&
        selectedDepositAsset !== activeWrappedCollateralSymbol &&
        !isDirectPeggedDeposit
      ) {
        severities.push("coral");
      }
      return severities;
    }, [
      activeTab,
      transactionNotificationError,
      showWithdrawRedemptionCapNotice,
      showWithdrawCrossMarketNotice,
      isCollateralOnlyChain,
      needsSwap,
      selectedDepositAsset,
      activeCollateralSymbol,
      activeWrappedCollateralSymbol,
      isDirectPeggedDeposit,
    ]);

  const anchorModalNotificationsBody = useMemo(() => {
    const transactionErrorCallout = transactionNotificationError ? (
      <ErrorBanner message={transactionNotificationError} />
    ) : null;

    if (activeTab === "withdraw") {
      return (
        <>
          {transactionErrorCallout}
          <InfoCallout
            tone="info"
            title="Info:"
            icon={<Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />}
          >
            Select positions to withdraw. If you include wallet tokens and/or do
            immediate pool withdrawals, we will automatically redeem the resulting
            anchor tokens to collateral.
          </InfoCallout>
          {showWithdrawRedemptionCapNotice && redeemPreview && (
            <InfoCallout
              tone="warning"
              title="Warning:"
              icon={
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              }
            >
              Redemption is limited by the market collateral ratio. One transaction
              redeems about{" "}
              {Number(formatEther(redeemPreview.peggedRedeemed)).toFixed(6)}{" "}
              {peggedTokenSymbol} of your{" "}
              {Number(formatEther(redeemInputAmount || 0n)).toFixed(6)}{" "}
              {peggedTokenSymbol}. You may need multiple redeem transactions for the
              full amount.
            </InfoCallout>
          )}
          {showWithdrawCrossMarketNotice && (
            <InfoCallout
              tone="warning"
              title="Warning:"
              icon={
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              }
            >
              Cross-market: pool is {selectedMarket?.name || selectedMarketId},
              redeem via{" "}
              {selectedRedeemMarket?.market?.name || selectedRedeemMarketId}. You
              receive {redeemCollateralSymbol}, not{" "}
              {selectedMarket?.collateral?.symbol || "pool collateral"}.
            </InfoCallout>
          )}
        </>
      );
    }

    return (
      <>
        {transactionErrorCallout}
        {mintOnly && !isDirectPeggedDeposit && (
          <InfoCallout
            tone="info"
            title="Info:"
            icon={<Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />}
          >
            You&apos;ll receive anchor tokens directly to your wallet. No stability
            pool deposit required.
          </InfoCallout>
        )}
        {!isCollateralOnlyChain && !needsSwap && (
          <InfoCallout
            tone="success"
            title="Tip:"
            icon={<RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />}
          >
            You can deposit any ERC20 token! Non-collateral tokens will be
            automatically swapped via Velora.
          </InfoCallout>
        )}
        <InfoCallout
          title="Info:"
          icon={<Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />}
        >
          For large deposits, Harbor recommends using wstETH or fxSAVE instead of
          the built-in swap and zaps.
        </InfoCallout>
        {selectedDepositAsset &&
          !needsSwap &&
          selectedDepositAsset !== activeCollateralSymbol &&
          selectedDepositAsset !== activeWrappedCollateralSymbol &&
          !isDirectPeggedDeposit && (
            <InfoCallout
              tone="pearl"
              icon={<Banknote className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#D57A3D]" />}
            >
              <span className="font-semibold">Deposit:</span> Your tokens will be
              converted to {activeWrappedCollateralSymbol} on deposit. Withdrawals
              will be in {activeWrappedCollateralSymbol} only.
            </InfoCallout>
          )}
      </>
    );
  }, [
    activeTab,
    transactionNotificationError,
    showWithdrawRedemptionCapNotice,
    redeemPreview,
    peggedTokenSymbol,
    redeemInputAmount,
    showWithdrawCrossMarketNotice,
    selectedMarket,
    selectedMarketId,
    selectedRedeemMarket,
    selectedRedeemMarketId,
    redeemCollateralSymbol,
    isCollateralOnlyChain,
    needsSwap,
    selectedDepositAsset,
    activeCollateralSymbol,
    activeWrappedCollateralSymbol,
    isDirectPeggedDeposit,
  ]);

  const showMintCapNavNotice =
    activeTab === "deposit" &&
    !isDirectPeggedDeposit &&
    !!mintValidation.message &&
    (mintValidation.status === "capped" ||
      mintValidation.status === "blocked");

  const anchorModalNotificationCountWithMint = useMemo(
    () =>
      anchorModalNotificationCount + (showMintCapNavNotice ? 1 : 0),
    [anchorModalNotificationCount, showMintCapNavNotice],
  );

  const anchorModalNotificationSeveritiesWithMint =
    useMemo((): Array<AnchorModalNotificationSeverity> => {
      if (!showMintCapNavNotice) return anchorModalNotificationSeverities;
      return ["coral", ...anchorModalNotificationSeverities];
    }, [showMintCapNavNotice, anchorModalNotificationSeverities]);

  const anchorModalNotificationsBodyWithMint = useMemo(() => {
    if (!showMintCapNavNotice || !mintValidation.message) {
      return anchorModalNotificationsBody;
    }
    return (
      <>
        <ErrorBanner message={mintValidation.message} />
        {anchorModalNotificationsBody}
      </>
    );
  }, [
    showMintCapNavNotice,
    mintValidation.message,
    anchorModalNotificationsBody,
  ]);

  useRegisterAppNotifications(
    "anchor-embedded-deposit",
    {
      count: anchorModalNotificationCountWithMint,
      badgeSeverities: anchorModalNotificationSeveritiesWithMint,
      body: anchorModalNotificationsBodyWithMint,
    },
    embedded && isActive,
  );

  const appNotifications = useAppNotificationsOptional();
  const setAppNotificationsExpanded = appNotifications?.setExpanded;
  /** Only auto-open after the mint warning has persisted (avoids flash open/close). */
  const [persistedMintNavNotice, setPersistedMintNavNotice] = useState(false);
  useEffect(() => {
    if (!showMintCapNavNotice) {
      setPersistedMintNavNotice(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setPersistedMintNavNotice(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [showMintCapNavNotice, mintValidation.message]);

  useEffect(() => {
    if (!persistedMintNavNotice) return;
    if (embedded && isActive) {
      setAppNotificationsExpanded?.(true);
    }
    setShowNotifications(true);
  }, [
    persistedMintNavNotice,
    embedded,
    isActive,
    setAppNotificationsExpanded,
  ]);

  return {
    showWithdrawRedemptionCapNotice,
    showWithdrawCrossMarketNotice,
    withdrawNotificationCount,
    depositNotificationCount,
    anchorModalNotificationCount: anchorModalNotificationCountWithMint,
    anchorModalNotificationSeverities:
      anchorModalNotificationSeveritiesWithMint,
    anchorModalNotificationsBody: anchorModalNotificationsBodyWithMint,
  };
}
