"use client";

import {
  BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS,
} from "@/components/market-cards/harborBasicMarketTokens";
import { MV_EXPLORER_OPEN_STATUS_CLASSNAME } from "@/components/genesis/genesisMaidenVoyageTableGrid";
import type { DashboardStatusTone } from "./dashboardRowPresentation";
import {
  DASHBOARD_STATUS_PILL_ACTIVE_LIGHT,
  DASHBOARD_STATUS_PILL_ENDED_LIGHT,
  DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT,
} from "./dashboardStyles";

export function DashboardStatusPill({
  label,
  tone,
  surface = "index",
}: {
  label: string;
  tone: DashboardStatusTone;
  /** `index` = white Anchor/Genesis rows; `glass` = dark dashboard inset rows. */
  surface?: "glass" | "index";
}) {
  if (surface === "glass") {
    const className =
      tone === "ended"
        ? DASHBOARD_STATUS_PILL_ENDED_LIGHT
        : tone === "active"
          ? DASHBOARD_STATUS_PILL_ACTIVE_LIGHT
          : DASHBOARD_STATUS_PILL_NEUTRAL_LIGHT;

    return <span className={className}>{label}</span>;
  }

  if (tone === "ended") {
    return (
      <span
        className={`inline-flex items-center rounded-xl px-2 py-0.5 text-[10px] font-black uppercase leading-none tracking-[0.03em] ${BASIC_MARKET_DIRECTION_LONG_CHIP_CLASS}`}
      >
        {label}
      </span>
    );
  }

  if (tone === "active") {
    return <span className={MV_EXPLORER_OPEN_STATUS_CLASSNAME}>{label}</span>;
  }

  return (
    <span className="inline-flex items-center rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap bg-[#1E4775]/8 text-[#1E4775]">
      {label}
    </span>
  );
}
