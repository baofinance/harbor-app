"use client";

import { HandCoins } from "lucide-react";
import { useTideClaimActions } from "@/hooks/useTideClaimActions";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideFeatureCard } from "./TideFeatureCard";
import { TideTransactionModal } from "./TideTransactionModal";
import {
  TIDE_AMOUNT_SM_CLASS,
  TIDE_CARD_CONTENT_STACK,
  TIDE_FOOTER_EXTRA_MINT_CLASS,
  TIDE_INSET_LABEL_CLASS,
  TIDE_META_TEXT,
  TIDE_PRIMARY_BUTTON_CLASS,
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
  amountTokens: number;
  isLoading: boolean;
  themeInset: string;
  blockReason: string | null;
  alreadyClaimed: boolean;
  canClaim: boolean;
  isClaiming: boolean;
  onClaim: () => void;
}) {
  const displayTokens = amountTokens;
  const hasBalance = displayTokens > 0;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <p className={`${TIDE_INSET_LABEL_CLASS} text-[#B8EBD5]/85`}>{label}</p>

      <div className={`w-full px-4 py-3 ${themeInset}`}>
        <div className="flex justify-end">
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-white/35">
            {methodLabel}
          </span>
        </div>

        {isLoading ? (
          <p className={`mt-2 ${TIDE_META_TEXT}`}>Loading snapshot…</p>
        ) : (
          <>
            <p className={`mt-2 ${TIDE_AMOUNT_SM_CLASS}`}>
              {formatTideTokenAmount(displayTokens)}{" "}
              <span className="text-base text-white/55">TIDE</span>
            </p>
            {hasBalance && alreadyClaimed ? (
              <p className="mt-3 text-sm font-medium text-[#B8EBD5]">Claimed</p>
            ) : hasBalance && blockReason ? (
              <p className={`mt-3 ${TIDE_META_TEXT}`}>{blockReason}</p>
            ) : null}
            {!alreadyClaimed ? (
              <button
                type="button"
                onClick={onClaim}
                disabled={!canClaim || isClaiming || !hasBalance}
                className={`mt-3 ${TIDE_PRIMARY_BUTTON_CLASS}`}
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
        )}
      </div>
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
        icon={<HandCoins className="h-4 w-4" strokeWidth={1.75} />}
        accentBarClass={theme.accentBar}
        iconBadgeClass={theme.iconBadge}
        title="Claim"
        subtitle="Merkle snapshot"
        subtitleClass={theme.subtitle}
        badge="Snapshot"
        badgeVariant={theme.badgeVariant}
        footer="Eligibility from vebao/standard_tide_allocation.json"
        footerExtra={claim.claimWindowFooter ?? undefined}
        footerExtraClassName={TIDE_FOOTER_EXTRA_MINT_CLASS}
        isConnected={claim.isConnected}
        disconnectedMessage="Connect wallet to view snapshot claim balances"
      >
        <div className={TIDE_CARD_CONTENT_STACK}>
          {claim.claimError ? (
            <p className="w-full rounded-lg border border-[#FF8A7A]/30 bg-[#FF8A7A]/10 px-3 py-2 text-xs text-[#FF8A7A]">
              {claim.claimError}
            </p>
          ) : null}
          <div className="flex w-full flex-col gap-4">
            <ClaimBucket
              label="veBao"
              methodLabel="claimVeBao"
              amountTokens={claim.veBaoAllocation?.amountTokens ?? 0}
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
              amountTokens={claim.standardAllocation?.amountTokens ?? 0}
              isLoading={bucketLoading}
              themeInset={theme.inset}
              blockReason={claim.standardBlockReason}
              alreadyClaimed={claim.hasClaimedStandard}
              canClaim={claim.canClaimStandard}
              isClaiming={claim.claimingPath === "standard"}
              onClaim={claim.claimStandard}
            />
          </div>
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
