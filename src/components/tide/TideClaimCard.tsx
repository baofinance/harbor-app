"use client";

import { HandCoins } from "lucide-react";
import { useTideClaimActions } from "@/hooks/useTideClaimActions";
import type { VeBaoClaimBlocker } from "@/utils/tideDistributor";
import { formatTideTokenAmount } from "@/utils/tideSnapshot";
import { TideFeatureCard } from "./TideFeatureCard";
import {
  TIDE_CARD_CONTENT_STACK,
  TIDE_FIELD_LABEL_CLASS,
  TIDE_FOOTER_EXTRA_MINT_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_SM_CLASS,
  TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS,
  TIDE_INSET_LIGHT_META_CLASS,
  TIDE_META_TEXT,
  TIDE_OVERVIEW_PANEL_SHELL,
  TIDE_PRIMARY_BUTTON_CLASS,
  TIDE_THEME,
} from "./tideCardStyles";

function ClaimBlockerMessage({
  blocker,
  canMaxLock,
  isMaxLocking,
  onMaxLock,
}: {
  blocker: VeBaoClaimBlocker;
  canMaxLock?: boolean;
  isMaxLocking?: boolean;
  onMaxLock?: () => void;
}) {
  if (blocker.kind === "extend_lock") {
    return (
      <div className="mt-3 space-y-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
        <p className="text-sm font-semibold text-[#1E4775]">{blocker.title}</p>
        <p className={`${TIDE_META_TEXT} text-[#1E4775]/75`}>{blocker.message}</p>
        {blocker.detail ? (
          <p className="text-[11px] leading-snug text-[#1E4775]/60">{blocker.detail}</p>
        ) : null}
        {canMaxLock && onMaxLock ? (
          <button
            type="button"
            onClick={onMaxLock}
            disabled={isMaxLocking}
            className={`mt-1 w-full ${TIDE_PRIMARY_BUTTON_CLASS}`}
          >
            {isMaxLocking ? "Max-locking…" : "Max-lock veBAO (4 years)"}
          </button>
        ) : null}
      </div>
    );
  }

  if (blocker.kind === "lock_expired") {
    return (
      <div className="mt-3 space-y-2 rounded-md border border-[#1E4775]/15 bg-[#1E4775]/[0.04] px-3 py-2.5">
        <p className="text-sm font-semibold text-[#1E4775]">{blocker.title}</p>
        <p className={`${TIDE_META_TEXT} text-[#1E4775]/75`}>{blocker.message}</p>
        {blocker.detail ? (
          <p className="text-[11px] leading-snug text-[#1E4775]/60">{blocker.detail}</p>
        ) : null}
        {blocker.ctaHref ? (
          <a
            href={blocker.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-xs font-semibold text-[#4A9784] underline underline-offset-2 hover:text-[#3f8576]"
          >
            {blocker.ctaLabel ?? "Withdraw on BAO Finance"}
          </a>
        ) : null}
      </div>
    );
  }

  return <p className={`mt-3 ${TIDE_META_TEXT}`}>{blocker.message}</p>;
}

function ClaimBucket({
  label,
  methodLabel,
  amountTokens,
  isLoading,
  blocker,
  blockReason,
  alreadyClaimed,
  canClaim,
  isClaiming,
  onClaim,
  canMaxLock,
  isMaxLocking,
  onMaxLock,
}: {
  label: string;
  methodLabel: string;
  amountTokens: number;
  isLoading: boolean;
  blocker?: VeBaoClaimBlocker | null;
  blockReason?: string | null;
  alreadyClaimed: boolean;
  canClaim: boolean;
  isClaiming: boolean;
  onClaim: () => void;
  canMaxLock?: boolean;
  isMaxLocking?: boolean;
  onMaxLock?: () => void;
}) {
  const hasBalance = amountTokens > 0;
  const showBlocker = hasBalance && !alreadyClaimed && blocker;
  const showPlainReason =
    hasBalance && !alreadyClaimed && !blocker && blockReason;

  return (
    <div className="flex w-full flex-col gap-2">
      <span className={TIDE_FIELD_LABEL_CLASS}>{label}</span>

      <div className={TIDE_OVERVIEW_PANEL_SHELL}>
        <div className="flex justify-end">
          <span
            className={`shrink-0 font-mono uppercase tracking-wide ${TIDE_INSET_LIGHT_META_CLASS}`}
          >
            {methodLabel}
          </span>
        </div>

        {isLoading ? (
          <p className={`mt-2 ${TIDE_META_TEXT}`}>Loading snapshot…</p>
        ) : (
          <>
            <p className={`mt-2 ${TIDE_INSET_LIGHT_AMOUNT_SM_CLASS}`}>
              {formatTideTokenAmount(amountTokens)}{" "}
              <span className={TIDE_INSET_LIGHT_AMOUNT_UNIT_CLASS}>TIDE</span>
            </p>
            {hasBalance && alreadyClaimed ? (
              <p className="mt-3 text-sm font-medium text-[#4A9784]">Claimed</p>
            ) : null}
            {showBlocker ? (
              <ClaimBlockerMessage
                blocker={blocker}
                canMaxLock={canMaxLock}
                isMaxLocking={isMaxLocking}
                onMaxLock={onMaxLock}
              />
            ) : null}
            {showPlainReason ? (
              <p className={`mt-3 ${TIDE_META_TEXT}`}>{blockReason}</p>
            ) : null}
            {!alreadyClaimed ? (
              <button
                type="button"
                onClick={onClaim}
                disabled={!canClaim || isClaiming || isMaxLocking || !hasBalance}
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
  const bucketLoading =
    claim.isConnected && (claim.isSnapshotLoading || claim.isChainLoading);

  return (
    <TideFeatureCard
      icon={<HandCoins className="h-4 w-4" strokeWidth={1.75} />}
      iconBadgeClass={theme.iconBadge}
      title="Claim"
      subtitle="Merkle snapshot"
      subtitleClass={theme.subtitle}
      badge="Snapshot"
      badgeVariant={theme.badgeVariant}
      footer="Eligibility from vebao_tide_allocation.json & vefxn_tide_allocation.json"
      footerExtra={claim.claimWindowFooter ?? undefined}
      footerExtraClassName={TIDE_FOOTER_EXTRA_MINT_CLASS}
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
            blocker={claim.veBaoBlocker}
            alreadyClaimed={claim.hasClaimedVeBao}
            canClaim={claim.canClaimVeBao}
            isClaiming={claim.claimingPath === "veBao"}
            onClaim={claim.claimVeBao}
            canMaxLock={claim.canMaxLockVeBao}
            isMaxLocking={claim.isMaxLocking}
            onMaxLock={claim.maxLockVeBao}
          />
          <ClaimBucket
            label="veFXN & liquid wrapper"
            methodLabel="claimStandard"
            amountTokens={claim.standardAllocation?.amountTokens ?? 0}
            isLoading={bucketLoading}
            blockReason={claim.standardBlockReason}
            alreadyClaimed={claim.hasClaimedStandard}
            canClaim={claim.canClaimStandard}
            isClaiming={claim.claimingPath === "standard"}
            onClaim={claim.claimStandard}
          />
        </div>
      </div>
    </TideFeatureCard>
  );
}
