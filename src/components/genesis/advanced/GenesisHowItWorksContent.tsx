"use client";

/**
 * Five-step copy aligned with the voyage stage rail.
 * Bodies reuse existing Maiden Voyage education wording (no new claims).
 */
export const GENESIS_HOW_IT_WORKS_STEPS = [
  {
    title: "Deposits open",
    body: "Add assets while voyage capacity is open.",
  },
  {
    title: "Capacity reached",
    body: "When the deposit cap is reached, the market prepares to launch.",
  },
  {
    title: "Market launch",
    body: "The market goes live with Anchor and Sail tokens for this voyage.",
  },
  {
    title: "Claim tokens",
    body: "Claim your Anchor and Sail tokens once the market is ready.",
  },
  {
    title: "Earn forever",
    body: "Eligible deposits earn an ongoing share of fees and collateral yield.",
  },
] as const;

export function GenesisHowItWorksContent({
  className = "",
}: {
  className?: string;
}) {
  return (
    <ol className={`space-y-3 ${className}`.trim()}>
      {GENESIS_HOW_IT_WORKS_STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1E4775]/10 text-[11px] font-bold tabular-nums text-[#1E4775]">
            {index + 1}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-[#1E4775]">{step.title}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-[#1E4775]/60">
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
