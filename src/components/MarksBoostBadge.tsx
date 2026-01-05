"use client";

import React, { useMemo } from "react";
import { formatTimeRemaining } from "@/utils/formatters";

export function MarksBoostBadge({
  multiplier,
  endTimestamp,
  className = "",
}: {
  multiplier: number;
  endTimestamp?: number; // unix seconds
  className?: string;
}) {
  const timeText = useMemo(() => {
    if (!endTimestamp) return null;
    return formatTimeRemaining(new Date(endTimestamp * 1000).toISOString());
  }, [endTimestamp]);

  return (
    <div
      className={[
        "text-xs text-green-300 text-center bg-green-900/30 border border-green-500/30 px-2 py-0.5",
        className,
      ].join(" ")}
    >
      {multiplier}x marks boost {timeText ? `• ${timeText}` : ""}
    </div>
  );
}


