"use client";

import type { ReactNode } from "react";
import { useAppBackground } from "@/contexts/AppBackgroundContext";

export type IndexToolbarMetric = {
  label: ReactNode;
  value: ReactNode;
};

type IndexToolbarMetricsGroupProps = {
  metrics: IndexToolbarMetric[];
  action?: ReactNode;
  className?: string;
};

/**
 * Reusable segmented metrics strip for index-page toolbars (Genesis / Sail / Anchor Basic).
 */
export default function IndexToolbarMetricsGroup({
  metrics,
  action,
  className = "",
}: IndexToolbarMetricsGroupProps) {
  const { mode: backgroundMode } = useAppBackground();
  const surfaceClass =
    backgroundMode === "megaeth" ? "bg-[#10141A]" : "bg-[#17395F]";
  if (metrics.length === 0 && !action) return null;

  return (
    <div
      className={`app-index-metrics-strip flex items-stretch shrink-0 overflow-x-auto rounded-md border border-white/15 ${surfaceClass} ${className}`.trim()}
    >
      {metrics.map((metric, index) => (
        <div key={index} className="flex items-stretch">
          <div className="flex flex-col items-center text-center justify-center px-3 py-1.5 min-w-[110px]">
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider leading-tight">
              {metric.label}
            </span>
            <span className="text-sm font-semibold text-white font-mono tabular-nums mt-0.5">
              {metric.value}
            </span>
          </div>
          {(index < metrics.length - 1 || !!action) && (
            <div aria-hidden className="my-2 w-px bg-white/20" />
          )}
        </div>
      ))}
      {action ? <div className="flex items-center px-3 py-1.5">{action}</div> : null}
    </div>
  );
}
