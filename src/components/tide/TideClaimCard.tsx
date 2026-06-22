"use client";

import { HandCoins } from "lucide-react";
import { useTideClaimActions } from "@/hooks/useTideClaimActions";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideFeatureCard } from "./TideFeatureCard";
import { TideTransactionModal } from "./TideTransactionModal";
import {
  TIDE_AMOUNT_SM_CLASS,
  TIDE_LABEL_CLASS,
  TIDE_THEME,
} from "./tideCardStyles";

function ClaimBucket({
  label,
  methodLabel,
  amountTokens,
  isLoading,
  themeInset,
  blockReason,
  alreadyClaimed,
  canClaim,
  isClaiming,
  onClaim,
}: {
  label: string;
  methodLabel: string;
  amountTokens: number | null;
  isLoading: boolean;
  themeInset: string;
  blockReason: string | null;
  alreadyClaimed: boolean;
  canClaim: boolean;
  isClaiming: boolean;
  onClaim: () => void;
}) {
  const hasBalance = amountTokens !== null && amountTokens > 0;

  return (
    <div className={`w-full rounded-lg border px-4 py-3 ${themeInset}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`${TIDE_LABEL_CLASS} text-[#B8EBD5]/80`}>{label}</p>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-white/30">
          {methodLabel}
        </span>
      </div>

      {isLoading ? (
        <p className="mt-3 text-sm text-white/45">Loading snapshot…</p>
      ) : hasBalance ? (
        <>
          <p className={`mt-2 ${TIDE_AMOUNT_SM_CLASS}`}>
            {formatTideTokenAmount(amountTokens)}{" "}
            <span className="text-base text-white/60">TIDE</span>
          </p>
          {alreadyClaimed ? (
            <p className="mt-3 text-sm font-medium text-[#B8EBD5]">Claimed</p>
          ) : blockReason ? (
            <p className="mt-3 text-xs leading-snug text-white/45">{blockReason}</p>
          ) : null}
          {!alreadyClaimed ? (
            <button
              type="button"
              onClick={onClaim}
              disabled={!canClaim || isClaiming}
              className="mt-3 w-full rounded-lg bg-[#B8EBD5] px-3 py-2 text-sm font-semibold text-[#1E4775] transition hover:bg-[#a8e0c8] disabled:cursor-not-allowed disabled:opacity-40"
              title={
                methodLabel === "claimVeBao"
                  ? "Some wallets mislabel this tx due to a 4-byte selector collision — the contract call is still claimVeBao"
                  : undefined
              }
            >
              {isClaiming ? "Claiming…" : "Claim"}
            </button>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-white/45">
          No snapshot allocation for this wallet.
        </p>
      )}
    </div>
  );
}

export function TideClaimCard() {
  const claim = useTideClaimActions();
  const theme = TIDE_THEME.mint;
  const bucketLoading = claim.isSnapshotLoading || claim.isChainLoading;

  return (
    <>
      <TideFeatureCard
      icon={
        <HandCoins
          className={`h-5 w-5 ${theme.iconText}`}
          strokeWidth={1.75}
        />
      }
      iconBgClass={theme.iconBg}
      title="Claim"
      subtitle="Merkle snapshot"
      subtitleClass={theme.subtitle}
      badge="Snapshot"
      badgeClass={theme.badge}
      footer="veBao → claimVeBao · standard → claimStandard"
      isConnected={claim.isConnected}
      disconnectedMessage="Connect wallet to view snapshot claim balances"
    >
      <div className="flex w-full flex-col gap-3">
        {claim.claimWindowMessage ? (
          <p className="w-full text-center text-xs text-white/45">
            {claim.claimWindowMessage}
          </p>
        ) : null}
        {claim.claimError ? (
          <p className="w-full rounded-lg border border-[#FF8A7A]/30 bg-[#FF8A7A]/10 px-3 py-2 text-xs text-[#FF8A7A]">
            {claim.claimError}
          </p>
        ) : null}
        <ClaimBucket
          label="veBao"
          methodLabel="claimVeBao"
          amountTokens={claim.veBaoAllocation?.amountTokens ?? null}
          isLoading={bucketLoading}
          themeInset={theme.inset}
          blockReason={claim.veBaoBlockReason}
          alreadyClaimed={claim.hasClaimedVeBao}
          canClaim={claim.canClaimVeBao}
          isClaiming={claim.claimingPath === "veBao"}
          onClaim={claim.claimVeBao}
        />
        <ClaimBucket
          label="veFXN & liquid wrapper"
          methodLabel="claimStandard"
          amountTokens={claim.standardAllocation?.amountTokens ?? null}
          isLoading={bucketLoading}
          themeInset={theme.inset}
          blockReason={claim.standardBlockReason}
          alreadyClaimed={claim.hasClaimedStandard}
          canClaim={claim.canClaimStandard}
          isClaiming={claim.claimingPath === "standard"}
          onClaim={claim.claimStandard}
        />
      </div>
    </TideFeatureCard>

      <TideTransactionModal
        isOpen={claim.txModal.isOpen}
        status={claim.txModal.status}
        title={claim.txModal.title}
        message={claim.txModal.message}
        txHash={claim.txModal.txHash}
        onClose={claim.closeTxModal}
      />
    </>
  );
}
