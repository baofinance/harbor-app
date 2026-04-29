"use client";

import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";

export type PageLayoutToggleProps = {
  /** Accessible name for the control. */
  ariaLabel?: string;
};

/**
 * **UI-** (compact) / **UI+** (full) — persists across routes; on index routes with a
 * layout split (`PAGE_LAYOUT_INDEX_EXACT_PATHS`), updates `?view=basic` and page chrome.
 */
export function PageLayoutToggle({
  ariaLabel = "Page density: compact or full",
}: PageLayoutToggleProps) {
  const { isBasic, setMode } = usePageLayoutPreference();

  /** Match active nav link: `rounded-md` + white pill for selected segment */
  const segment = (active: boolean) =>
    `min-w-[2.75rem] rounded px-2 py-2 text-sm font-medium tabular-nums tracking-tight transition-colors ${
      active
        ? "bg-white text-[#1E4775] shadow-sm"
        : "text-white hover:bg-white/20"
    }`;

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-md bg-white/10 p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={segment(isBasic)}
        onClick={() => setMode("basic")}
        aria-pressed={isBasic}
        title="Compact layout where available: title + toolbar and tables"
      >
        UI-
      </button>
      <button
        type="button"
        className={segment(!isBasic)}
        onClick={() => setMode("extended")}
        aria-pressed={!isBasic}
        title="Full layout where available: intro cards, stats, and tables"
      >
        UI+
      </button>
    </div>
  );
}
