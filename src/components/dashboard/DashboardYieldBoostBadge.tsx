"use client";

function formatBoostLabel(mult: number): string {
  const rounded = Math.round(mult * 100) / 100;
  const frac = rounded % 1;
  return `${frac === 0 ? String(rounded) : rounded.toFixed(2)}×`;
}

/** Maiden Voyage retention multiplier — genesis-green flair when above 1×. */
export function DashboardYieldBoostBadge({
  multiplier,
}: {
  multiplier: number | null;
}) {
  if (multiplier == null) {
    return <span className="text-sm font-medium text-white/40">—</span>;
  }

  const label = formatBoostLabel(multiplier);
  const isBoosted = multiplier > 1.001;

  if (!isBoosted) {
    return (
      <span className="inline-flex items-center rounded-md border border-white/[0.1] bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
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
