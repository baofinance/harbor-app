"use client";

import {
  DepositTradeFeeFooter,
  pctToDepositFeeRatio,
  type DepositTradeFeeItem,
} from "@/components/deposit/DepositTradeFeeFooter";

type FeeRange = {
  min: number;
  max: number;
  hasRange: boolean;
} | null | undefined;

type AnchorMintFeeFooterProps = {
  isDirectPeggedDeposit: boolean;
  selectedDepositAsset: string | null | undefined;
  amount: string;
  feePercentage: number | undefined;
  feeRange: FeeRange;
  marketsForTokenCount: number;
};

/** Earn mint fee row — delegates to shared `DepositTradeFeeFooter`. */
export function AnchorMintFeeFooter({
  isDirectPeggedDeposit,
  selectedDepositAsset,
  amount,
  feePercentage,
  feeRange,
  marketsForTokenCount,
}: AnchorMintFeeFooterProps) {
  if (isDirectPeggedDeposit || !selectedDepositAsset) return null;

  const displayFee =
    amount && parseFloat(amount) > 0 && feePercentage !== undefined
      ? feePercentage
      : undefined;
  const showRange =
    feeRange && feeRange.hasRange && marketsForTokenCount > 1;

  let displayValue = "—";
  if (showRange && !(amount && parseFloat(amount) > 0)) {
    displayValue = `${feeRange.min.toFixed(2)}% – ${feeRange.max.toFixed(2)}%`;
  } else if (displayFee !== undefined) {
    displayValue = `${displayFee.toFixed(2)}%`;
  } else if (feeRange) {
    displayValue = `${feeRange.min.toFixed(2)}%`;
  }

  const heading =
    amount && parseFloat(amount) > 0
      ? "Mint fee"
      : feeRange?.hasRange
        ? "Fee range"
        : "Mint fee";

  const items: DepositTradeFeeItem[] = [
    {
      label: "Mint",
      displayValue:
        showRange && !(amount && parseFloat(amount) > 0)
          ? displayValue
          : undefined,
      ratio:
        displayFee !== undefined
          ? pctToDepositFeeRatio(displayFee)
          : !showRange && feeRange
            ? pctToDepositFeeRatio(feeRange.min)
            : undefined,
      isMintSail: true,
      tooltip: (
        <div className="space-y-2">
          <p className="font-semibold">Dynamic Mint Fees</p>
          <p>
            Mint fees adjust in real time based on market health and your
            deposit size.
          </p>
        </div>
      ),
    },
  ];

  return <DepositTradeFeeFooter heading={heading} items={items} />;
}

type EarlyWithdrawFee = {
  percent: number;
} | null | undefined;

type AnchorWithdrawFeeFooterProps = {
  activeTab: string;
  simpleMode: boolean;
  flowPage: number;
  isRedeemRouteFlowPage: boolean;
  isRedeemConfirmFlowPage: boolean;
  isRedeemReviewFlowPage: boolean;
  withdrawOnly: boolean;
  selectedPoolEarlyWithdrawFee: EarlyWithdrawFee;
  earlyWithdraw1PctEnabled: boolean;
  redeemStepActionKind: string | undefined;
  redeemInputAmount: bigint | undefined;
  redeemFeePercentage: number | undefined;
  sellFeeRange: FeeRange;
  marketsForTokenCount: number;
};

/** Earn redeem/withdraw fee row — delegates to shared `DepositTradeFeeFooter`. */
export function AnchorWithdrawFeeFooter({
  activeTab,
  simpleMode,
  flowPage,
  isRedeemRouteFlowPage,
  isRedeemConfirmFlowPage,
  isRedeemReviewFlowPage,
  withdrawOnly,
  selectedPoolEarlyWithdrawFee,
  earlyWithdraw1PctEnabled,
  redeemStepActionKind,
  redeemInputAmount,
  redeemFeePercentage,
  sellFeeRange,
  marketsForTokenCount,
}: AnchorWithdrawFeeFooterProps) {
  if ((activeTab !== "withdraw" && activeTab !== "sell") || !simpleMode) {
    return null;
  }
  if (flowPage === 1) return null;

  const isMultiMarket = marketsForTokenCount > 1;

  const showEarlyFee =
    !!selectedPoolEarlyWithdrawFee &&
    selectedPoolEarlyWithdrawFee.percent > 0 &&
    earlyWithdraw1PctEnabled &&
    (isRedeemConfirmFlowPage ||
      isRedeemRouteFlowPage ||
      isRedeemReviewFlowPage);

  const willRedeemOnConfirm =
    !withdrawOnly &&
    (redeemStepActionKind === "withdrawAndRedeem" ||
      redeemStepActionKind === "redeem" ||
      earlyWithdraw1PctEnabled);

  const showSellFee =
    !withdrawOnly &&
    (isRedeemRouteFlowPage ||
      isRedeemReviewFlowPage ||
      (isRedeemConfirmFlowPage && !isMultiMarket && willRedeemOnConfirm) ||
      (activeTab === "sell" && !isRedeemConfirmFlowPage));

  if (!showSellFee && !showEarlyFee) return null;

  const sellFeeLabel =
    redeemInputAmount &&
    redeemInputAmount > 0n &&
    redeemFeePercentage !== undefined
      ? "Redeem fee"
      : sellFeeRange?.hasRange && isMultiMarket
        ? "Fee range"
        : "Redeem fee";

  const sellFeeValue = (() => {
    if (!showSellFee) return null;
    if (
      redeemInputAmount &&
      redeemInputAmount > 0n &&
      redeemFeePercentage !== undefined
    ) {
      return `${redeemFeePercentage.toFixed(2)}%`;
    }
    if (
      sellFeeRange?.hasRange &&
      isMultiMarket &&
      !(redeemInputAmount && redeemInputAmount > 0n)
    ) {
      return `${sellFeeRange.min.toFixed(2)}% – ${sellFeeRange.max.toFixed(2)}%`;
    }
    if (sellFeeRange) {
      return `${sellFeeRange.min.toFixed(2)}%`;
    }
    if (redeemFeePercentage !== undefined) {
      return `${redeemFeePercentage.toFixed(2)}%`;
    }
    return "—";
  })();

  const items: DepositTradeFeeItem[] = [];

  if (showSellFee && sellFeeValue !== null) {
    const hasAmount =
      redeemInputAmount &&
      redeemInputAmount > 0n &&
      redeemFeePercentage !== undefined;
    items.push({
      label: "Redeem",
      displayValue:
        !hasAmount && sellFeeValue.includes("–") ? sellFeeValue : undefined,
      ratio: hasAmount
        ? pctToDepositFeeRatio(redeemFeePercentage!)
        : sellFeeRange && !sellFeeRange.hasRange
          ? pctToDepositFeeRatio(sellFeeRange.min)
          : undefined,
      isMintSail: false,
      tooltip: (
        <div className="space-y-2">
          <p className="font-semibold">Dynamic Redeem Fees</p>
          <p>
            Redeem fees adjust in real time based on market health and your
            withdraw size when redeeming to collateral.
          </p>
        </div>
      ),
    });
  }

  if (showEarlyFee) {
    items.push({
      label: "Withdraw",
      ratio: pctToDepositFeeRatio(selectedPoolEarlyWithdrawFee!.percent),
      isMintSail: false,
      tooltip: (
        <div className="space-y-2">
          <p className="font-semibold">Withdraw Fee</p>
          <p>
            Charged when exiting a stability pool. Free during an open request
            window; 1% for fast withdrawal outside the window.
          </p>
        </div>
      ),
    });
  }

  const heading =
    items.length > 1 ? "Fees" : showSellFee ? sellFeeLabel : "Withdraw fee";

  return <DepositTradeFeeFooter heading={heading} items={items} />;
}
