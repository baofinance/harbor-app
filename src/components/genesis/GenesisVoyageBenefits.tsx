"use client";

const BENEFITS = [
  {
    title: "Anchor Tokens",
    description: "Stable exposure to the market peg when it launches.",
  },
  {
    title: "Sail Tokens",
    description: "Leveraged exposure paired with your deposit share.",
  },
  {
    title: "Yield Share Eligibility",
    description: "Earn a slice of market revenue for as long as you hold.",
  },
  {
    title: "Founding Status",
    description: "Early depositor recognition on this maiden voyage.",
  },
] as const;

export function GenesisVoyageBenefits() {
  return (
    <div className="border-t border-[#1E4775]/12 pt-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1E4775]/80">
        What you&apos;ll receive
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {BENEFITS.map(({ title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-[#1E4775]/10 bg-white/60 px-3 py-2.5"
          >
            <p className="text-sm font-semibold text-[#1E4775]">{title}</p>
            <p className="mt-0.5 text-xs leading-snug text-[#1E4775]/65">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
