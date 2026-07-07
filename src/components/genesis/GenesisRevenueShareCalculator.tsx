"use client";

import { useEffect, useMemo, useState } from "react";
import { MAIDEN_VOYAGE_UPSIDE_COPY } from "@/config/maidenVoyageEducation";
import {
  estimateMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import { computeUpsideBenchmarks } from "@/utils/maidenVoyageUpsideBenchmarks";
import { GenesisUpsideBenchmarkCards } from "./GenesisUpsideBenchmarkCards";
import { GenesisUpsideBenchmarkExplainer } from "./GenesisUpsideBenchmarkExplainer";
import { GenesisUpsideHeroMetric } from "./GenesisUpsideHeroMetric";
import {
  MV_CAPTION_TEXT,
  MV_CARD_SHELL,
  MV_SECTION_LABEL,
} from "./maidenVoyageLayoutStyles";

export type GenesisRevenueShareCalculatorProps = {
  capUsd: number | null;
  yieldRevSharePct: number | null;
  initialDepositUsd: number;
  className?: string;
};

function clampDeposit(value: number, capUsd: number | null): number {
  const max = capUsd ?? 10_000_000;
  return Math.min(max, Math.max(0, value));
}

export function GenesisRevenueShareCalculator({
  capUsd,
  yieldRevSharePct,
  initialDepositUsd,
  className = "",
}: GenesisRevenueShareCalculatorProps) {
  const [depositUsd, setDepositUsd] = useState(initialDepositUsd);

  useEffect(() => {
    setDepositUsd(clampDeposit(initialDepositUsd, capUsd));
  }, [initialDepositUsd, capUsd]);

  const revenueSharePct = useMemo(
    () =>
      estimateMaidenVoyageYieldSharePct({
        depositUsd,
        capUsd,
        yieldRevSharePct,
      }),
    [depositUsd, capUsd, yieldRevSharePct],
  );

  const benchmarks = useMemo(
    () => computeUpsideBenchmarks(revenueSharePct),
    [revenueSharePct],
  );

  return (
    <section
      className={`${MV_CARD_SHELL} w-full px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}
      aria-label="Explore the upside"
    >
      <div>
        <div className="min-w-0 border-l-2 border-[#FF8A7A]/50 pl-2.5 text-center sm:text-left">
          <h2 className="text-sm font-semibold text-white/90">
            {MAIDEN_VOYAGE_UPSIDE_COPY.sectionTitle}
          </h2>
          {yieldRevSharePct != null && yieldRevSharePct > 0 ? (
            <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>
              {MAIDEN_VOYAGE_UPSIDE_COPY.sectionCaption}
            </p>
          ) : null}
        </div>

        <div className="mt-3 space-y-2.5">
          <GenesisUpsideHeroMetric
            revenueSharePct={revenueSharePct}
            depositUsd={depositUsd}
            capUsd={capUsd}
            onDepositChange={(v) => setDepositUsd(clampDeposit(v, capUsd))}
          />

          <div className="space-y-1.5">
            <p className={MV_SECTION_LABEL}>
              {MAIDEN_VOYAGE_UPSIDE_COPY.benchmarkIntro}
            </p>
            <GenesisUpsideBenchmarkCards
              benchmarks={benchmarks}
              depositUsd={depositUsd}
            />
          </div>

          <GenesisUpsideBenchmarkExplainer />
        </div>
      </div>
    </section>
  );
}
