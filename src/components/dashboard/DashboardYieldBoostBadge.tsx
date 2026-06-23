"use client";

function formatBoostLabel(mult: number): string {
  const rounded = Math.round(mult * 100) / 100;
  const frac = rounded % 1;
  const num = frac === 0 ? String(rounded) : rounded.toFixed(2);
  return `${num}x`;
}

export type DashboardYieldBoostBadgeProps = {
  multiplier: number | null;
  surface?: "light" | "dark";
};

/** Maiden Voyage retention multiplier — grey at 1x, green when boosted. */
export function DashboardYieldBoostBadge({
  multiplier,
  surface = "light",
}: DashboardYieldBoostBadgeProps) {
  if (multiplier == null) {
    const mutedClass =
      surface === "dark" ? "text-sm text-white/40" : "text-sm font-medium text-[#1E4775]/40";
    return <span className={mutedClass}>—</span>;
  }

  const label = formatBoostLabel(multiplier);
  const isBoosted = multiplier > 1.001;

  if (surface === "dark") {
    if (!isBoosted) {
      return (
        <span className="inline-flex items-center rounded-md border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
          {label}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-md border border-[#B8EBD5]/35 bg-[#B8EBD5]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B8EBD5]">
        {label}
      </span>
    );
  }

  if (!isBoosted) {
    return (
      <span className="inline-flex items-center rounded-md border border-[#1E4775]/12 bg-[#1E4775]/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/55">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md border border-[#3d8f7a]/45 bg-gradient-to-r from-[#B8EBD5]/30 to-[#B8EBD5]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2d7a66] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35)]">
      {label}
    </span>
  );
}
