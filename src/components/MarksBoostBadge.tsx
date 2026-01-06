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
        // Responsive "bar" sizing:
        // - full width on mobile so it doesn't overflow narrow layouts
        // - consumers can optionally shrink-to-fit on larger screens (e.g. leaderboard)
        // - allow wrapping instead of pushing layout wider
        "w-full max-w-full min-w-0",
        "text-xs sm:text-sm font-bold text-green-300 text-center",
        "bg-green-900/30 border border-green-500/30",
        "px-3 py-1.5 leading-tight",
        "whitespace-normal break-words",
        className,
      ].join(" ")}
    >
      {multiplier}x marks boost {timeText ? `• ${timeText}` : ""}
    </div>
  );
}


