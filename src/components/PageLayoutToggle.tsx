"use client";

import { usePageLayoutPreference } from "@/contexts/PageLayoutPreferenceContext";
import { useAppBackground } from "@/contexts/AppBackgroundContext";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import NetworkIconClient from "@/components/NetworkIconClient";

export type PageLayoutToggleProps = {
  /** Accessible name for the control. */
  ariaLabel?: string;
};

/**
 * **UI** (compact) / **UI+** (full) — persists across routes; on index routes with a layout
 * split (`PAGE_LAYOUT_INDEX_EXACT_PATHS`), updates `?view=basic` and page chrome.
 */
export function PageLayoutToggle({
  ariaLabel = "Page density: compact or full",
}: PageLayoutToggleProps) {
  const { isBasic, setMode } = usePageLayoutPreference();
  const { mode: backgroundMode, setMode: setBackgroundMode } = useAppBackground();
  const backgroundOptions = [
    { id: "eth" as const, label: "Ethereum", icon: "ethereum" },
    { id: "megaeth" as const, label: "MegaETH", icon: "mega-eth" },
  ];
  const selectedBackground =
    backgroundOptions.find((option) => option.id === backgroundMode) ??
    backgroundOptions[0];

  /** Match active nav link: `rounded-md` + white pill for selected segment */
  const segment = (active: boolean) =>
    `min-w-[2.75rem] rounded px-2 py-2 text-sm font-medium tabular-nums tracking-tight transition-colors ${
      active
        ? "bg-white text-[#1E4775] shadow-sm"
        : "text-white hover:bg-white/20"
    }`;
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-[6.75rem] shrink-0 items-center rounded-md bg-white/10 p-0.5">
        <Listbox
          as="div"
          className="relative w-full"
          value={selectedBackground}
          by={(a, b) => a.id === b.id}
          onChange={(next) => setBackgroundMode(next.id)}
        >
          <ListboxButton className="h-9 w-full flex items-center justify-between gap-1 rounded bg-white px-1.5 py-0 text-sm font-medium text-[#1E4775] focus:ring-1 focus:ring-[#1E4775]/20 focus:outline-none cursor-pointer">
            <span className="inline-flex items-center gap-1 min-w-0">
              <NetworkIconClient
                name={selectedBackground.icon}
                size={20}
                variant="branded"
              />
              <span className="text-[11px] leading-none font-medium truncate">
                Theme
              </span>
            </span>
            <ChevronDownIcon className="w-4 h-4 text-[#1E4775]/60 shrink-0 data-[open]:rotate-180 transition-transform" />
          </ListboxButton>
          <ListboxOptions
            modal={false}
            className="absolute right-0 top-[calc(100%+4px)] z-50 w-full bg-white border border-[#1E4775]/20 rounded-md shadow-lg overflow-hidden outline-none"
          >
            {backgroundOptions.map((option) => (
              <ListboxOption
                key={option.id}
                value={option}
                className="group flex items-center gap-1.5 px-2 py-2 text-[#1E4775] cursor-pointer data-[focus]:bg-[#1E4775]/5 data-[selected]:bg-[#1E4775]/10"
              >
                <NetworkIconClient name={option.icon} size={20} variant="branded" />
                <span className="min-w-0 flex-1 truncate text-[11px] leading-none font-medium">
                  Theme
                </span>
                <CheckIcon className="hidden h-3 w-3 shrink-0 text-[#1E4775] group-data-[selected]:block" />
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </div>
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
          UI
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
    </div>
  );
}
