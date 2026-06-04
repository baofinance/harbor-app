"use client";

import type { MaidenVoyageConfidenceStats } from "@/utils/maidenVoyageConfidenceStats";

export type GenesisVoyageConfidenceSignalsProps = {
  stats: MaidenVoyageConfidenceStats;
};

export function GenesisVoyageConfidenceSignals({
  stats,
}: GenesisVoyageConfidenceSignalsProps) {
  const chips: string[] = [];

  if (stats.completedLaunchesCount > 0) {
    chips.push(
      `${stats.completedLaunchesCount} market${stats.completedLaunchesCount === 1 ? "" : "s"} launched`,
    );
  }

  chips.push(`Maiden Voyage #${stats.voyageNumber} in progress`);

  if (stats.completedDepositsLabel) {
    chips.push(
      `${stats.completedDepositsLabel} deposited across completed voyages`,
    );
  }

  return (
    <section
      className="mb-8"
      aria-label="Maiden Voyage track record"
    >
      <div className="flex flex-wrap gap-2">
        {chips.map((label) => (
          <span
            key={label}
            className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/55"
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
