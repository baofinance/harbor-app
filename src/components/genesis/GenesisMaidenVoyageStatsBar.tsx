"use client";

import { useCallback, useState } from "react";
import type { MaidenVoyageStatsBarData } from "@/utils/maidenVoyageStatsBar";

export type GenesisMaidenVoyageStatsBarProps = {
  stats: MaidenVoyageStatsBarData;
};

const VIEW_OPTIONS = [
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
] as const;

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
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:hidden"
      aria-label="Maiden Voyage overview"
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
          View
        </span>
        <div
          className="inline-flex rounded-md bg-white/10 p-0.5"
          role="group"
          aria-label="View"
        >
          {VIEW_OPTIONS.map((option) => {
            const active = option.id === view;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleViewChange(option.id)}
                className={`rounded px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-[#FF8A7A] text-[#1a0f0d]"
                    : "text-white/60 hover:text-white/80"
                }`}
                aria-pressed={active}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
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
