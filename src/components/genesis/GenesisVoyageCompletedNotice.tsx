"use client";

import { LockClosedIcon } from "@heroicons/react/24/outline";
import { MAIDEN_VOYAGE_DOCS_URL } from "@/config/maidenVoyageFeatured";
import { MV_CARD_SHELL, MV_ICON_BADGE_NEUTRAL } from "./maidenVoyageLayoutStyles";

type GenesisVoyageCompletedNoticeProps = {
  /** Compact inset for the active voyage card under capacity. */
  compact?: boolean;
  className?: string;
};

/** Lock notice — voyage complete / deposits locked until claim. */
export function GenesisVoyageCompletedNotice({
  compact = false,
  className = "",
}: GenesisVoyageCompletedNoticeProps) {
  if (compact) {
    return (
      <div className={`flex items-start gap-2 ${className}`.trim()}>
        <LockClosedIcon
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 text-[11px] leading-snug text-white/65">
          <p>
            Once a voyage is completed, deposits are locked and cannot be
            withdrawn.
          </p>
          <p className="mt-1">
            You will be able to claim your Anchor + Sail tokens after market
            launch.{" "}
            <a
              href={MAIDEN_VOYAGE_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${MV_CARD_SHELL} flex gap-3 px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}
    >
      <span className={`mt-0.5 ${MV_ICON_BADGE_NEUTRAL}`} aria-hidden>
        <LockClosedIcon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-white/65">
          Once a voyage is completed, deposits are locked and cannot be
          withdrawn.
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/65">
          You will be able to claim your Anchor + Sail tokens after market
          launch.{" "}
          <a
            href={MAIDEN_VOYAGE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#FF8A7A]/90 hover:text-[#ffb4a8]"
          >
            Learn more
          </a>
        </p>
      </div>
    </div>
  );
}
