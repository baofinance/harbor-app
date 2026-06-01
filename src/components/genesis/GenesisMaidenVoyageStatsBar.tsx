"use client";

import { useCallback, useState } from "react";
import IndexToolbarSegmentedToggle from "@/components/shared/IndexToolbarSegmentedToggle";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";

export type GenesisMaidenVoyageStatsBarProps = {
  stats: MaidenVoyageStatsBarData;
};

export function GenesisMaidenVoyageStatsBar({
  stats,
}: GenesisMaidenVoyageStatsBarProps) {
  const [view, setView] = useState("active");

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const handleViewChange = (id: string) => {
    setView(id);
    scrollToSection(
      id === "completed" ? "maiden-voyage-completed" : "maiden-voyage-active",
    );
  };

  return (
    <section
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Maiden Voyage overview"
    >
      <IndexToolbarSegmentedToggle
        label="View"
        value={view}
        options={[
          { id: "active", label: "Active" },
          { id: "completed", label: "Completed" },
        ]}
        onChange={handleViewChange}
        variant="inline"
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {stats.featuredTvlLabel ? (
          <div>
            <span className="text-white/45">Featured TVL </span>
            <span className="font-mono font-semibold tabular-nums text-white/90">
              {stats.featuredTvlLabel}
            </span>
          </div>
        ) : null}
        <div>
          <span className="text-white/45">Maiden Voyages </span>
          <span className="font-mono font-semibold tabular-nums text-white/90">
            {stats.voyageNumber}
          </span>
        </div>
        {stats.completedLaunchesCount > 0 ? (
          <div>
            <span className="text-white/45">Markets launched </span>
            <span className="font-mono font-semibold tabular-nums text-white/90">
              {stats.completedLaunchesCount}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
