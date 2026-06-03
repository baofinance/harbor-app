"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import type { ActiveVoyageStatus } from "@/utils/activeVoyageStatus";
import { formatVoyageCountdown } from "@/utils/formatters";
import { GenesisVoyageBenefitsWithLayout } from "./GenesisVoyageBenefits";
import {
  MV_BODY_TEXT,
  MV_CARD_INNER_GRADIENT,
  MV_CARD_SHELL,
  MV_COUNTDOWN_PANEL,
} from "./maidenVoyageLayoutStyles";

export type GenesisVoyageRewardsCardProps = {
  endDate?: string;
  voyageStatus: ActiveVoyageStatus;
};

function formatCountdownDetailed(
  endDate: string,
  currentTime: Date = new Date(),
): string | null {
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - currentTime.getTime();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export function GenesisVoyageRewardsCard({
  endDate,
  voyageStatus,
}: GenesisVoyageRewardsCardProps) {
  const showCountdown =
    Boolean(endDate) &&
    (voyageStatus === "deposits_open" || voyageStatus === "almost_full");

  const [countdownLabel, setCountdownLabel] = useState<string | null>(() =>
    endDate && showCountdown ? formatCountdownDetailed(endDate) : null,
  );

  useEffect(() => {
    if (!endDate || !showCountdown) {
      setCountdownLabel(null);
      return;
    }

    const tick = () => {
      const detailed = formatCountdownDetailed(endDate);
      setCountdownLabel(
        detailed ?? formatVoyageCountdown(endDate) ?? null,
      );
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endDate, showCountdown]);

  return (
    <section
      className={`${MV_CARD_SHELL} ${MV_CARD_INNER_GRADIENT} overflow-hidden`}
      aria-label="What you receive"
    >
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <GenesisVoyageBenefitsWithLayout layout="listFlat" />
      </div>
      {showCountdown && countdownLabel ? (
        <div className={`${MV_COUNTDOWN_PANEL} mx-4 mb-4 flex items-center gap-2 px-3 py-2.5 sm:mx-5`}>
          <ClockIcon className="h-4 w-4 shrink-0 text-[#FF8A7A]" aria-hidden />
          <p className={`${MV_BODY_TEXT} font-semibold text-white/90`}>
            Voyage closes in{" "}
            <span className="font-mono tabular-nums text-[#FF8A7A]">
              {countdownLabel}
            </span>
          </p>
        </div>
      ) : null}
    </section>
  );
}
