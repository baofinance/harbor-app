"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PAGE_LAYOUT_BASIC_VALUE,
  PAGE_LAYOUT_QUERY_KEY,
} from "@/utils/pageLayoutView";

export type PageLayoutToggleProps = {
  /** Index route only, e.g. `/genesis` — not detail routes like `/genesis/[id]`. */
  pathPrefix: string;
  /**
   * Query key for Basic mode (`?${paramKey}=basic`). Prefer shared {@link PAGE_LAYOUT_QUERY_KEY}.
   * @default PAGE_LAYOUT_QUERY_KEY (`view`)
   */
  paramKey?: string;
  /** Accessible name for the control. */
  ariaLabel?: string;
};

/**
 * **UI-** (compact) / **UI+** (full) toggle — updates the URL on the current index route.
 * Pair each route with {@link isBasicPageLayout} (and optional legacy keys) on that page.
 */
export function PageLayoutToggle({
  pathPrefix,
  paramKey = PAGE_LAYOUT_QUERY_KEY,
  ariaLabel = "Page density: compact or full",
}: PageLayoutToggleProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (pathname !== pathPrefix) {
    return null;
  }

  const isBasic =
    searchParams.get(paramKey) === PAGE_LAYOUT_BASIC_VALUE;

  const setMode = (mode: "basic" | "extended") => {
    const next = new URLSearchParams(searchParams.toString());
    if (mode === "basic") {
      next.set(paramKey, PAGE_LAYOUT_BASIC_VALUE);
    } else {
      next.delete(paramKey);
    }
    const qs = next.toString();
    const href = qs ? `${pathPrefix}?${qs}` : pathPrefix;
    router.replace(href, { scroll: false });
  };

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
        title="Compact layout: title + toolbar and tables"
      >
        UI-
      </button>
      <button
        type="button"
        className={segment(!isBasic)}
        onClick={() => setMode("extended")}
        aria-pressed={!isBasic}
        title="Full layout: intro cards, stats, and tables"
      >
        UI+
      </button>
    </div>
  );
}
