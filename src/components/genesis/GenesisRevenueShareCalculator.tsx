"use client";

import { useEffect, useMemo, useState } from "react";
import {
  estimateMaidenVoyageYieldSharePct,
} from "@/utils/maidenVoyageYieldShareEstimate";
import { computeUpsideBenchmarks } from "@/utils/maidenVoyageUpsideBenchmarks";
import { GenesisUpsideBenchmarkCards } from "./GenesisUpsideBenchmarkCards";
import { GenesisUpsideBenchmarkExplainer } from "./GenesisUpsideBenchmarkExplainer";
import { GenesisUpsideHeroMetric } from "./GenesisUpsideHeroMetric";
import {
  MV_CAPTION_TEXT,
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
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
    setDepositUsd(initialDepositUsd);
  }, [initialDepositUsd]);

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
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} w-full px-4 py-3 sm:px-5 sm:py-4 ${className}`.trim()}
      aria-label="Explore the upside"
    >
      <div className="min-w-0 text-center sm:text-left">
        <h2 className="text-sm font-semibold text-white/90">
          Explore the Upside
        </h2>
        {yieldRevSharePct != null && yieldRevSharePct > 0 ? (
          <p className={`mt-0.5 ${MV_CAPTION_TEXT}`}>
            Every Maiden Voyage allocates {yieldRevSharePct}% of future market
            revenue to founding participants.
          </p>
        ) : null}
      </div>

      <div className="mt-3 space-y-2.5">
        <GenesisUpsideHeroMetric
          revenueSharePct={revenueSharePct}
          depositUsd={depositUsd}
          onDepositChange={(v) => setDepositUsd(clampDeposit(v, capUsd))}
        />

        <GenesisUpsideBenchmarkCards benchmarks={benchmarks} />

        <GenesisUpsideBenchmarkExplainer />
      </div>
    </section>
  );
}
