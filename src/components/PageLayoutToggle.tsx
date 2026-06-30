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
import {
  HARBOR_NAV_SEGMENT_ACTIVE_CLASS,
  HARBOR_NAV_SEGMENT_IDLE_CLASS,
  HARBOR_NAV_SEGMENT_SHELL_CLASS,
  HARBOR_NAV_THEME_TRIGGER_CLASS,
} from "@/components/shared/harborNavStyles";
import {
  HARBOR_FROSTED_DROPDOWN_SHELL,
} from "@/components/shared/harborFrostedSurfaceStyles";

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

  const segment = (active: boolean) =>
    `min-w-[2.75rem] tabular-nums tracking-tight transition-colors ${
      active ? HARBOR_NAV_SEGMENT_ACTIVE_CLASS : HARBOR_NAV_SEGMENT_IDLE_CLASS
    }`;
  return (
    <div className="flex items-center gap-2">
      <div className={`flex w-[6.75rem] shrink-0 items-center ${HARBOR_NAV_SEGMENT_SHELL_CLASS}`}>
        <Listbox
          as="div"
          className="relative w-full"
          value={selectedBackground}
          by={(a, b) => a.id === b.id}
          onChange={(next) => setBackgroundMode(next.id)}
        >
          <ListboxButton className={`${HARBOR_NAV_THEME_TRIGGER_CLASS} flex cursor-pointer items-center justify-between gap-1`}>
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
            className={`absolute right-0 top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-md outline-none backdrop-blur-lg backdrop-saturate-150 ${HARBOR_FROSTED_DROPDOWN_SHELL}`}
          >
            {backgroundOptions.map((option) => (
              <ListboxOption
                key={option.id}
                value={option}
                className="group flex cursor-pointer items-center gap-1.5 px-2 py-2 text-[#1E4775] data-[focus]:bg-[#1E4775]/5 data-[selected]:border-l-2 data-[selected]:border-[#1E4775]/40 data-[selected]:bg-[#1E4775]/10"
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
        className={`flex shrink-0 items-center gap-0.5 ${HARBOR_NAV_SEGMENT_SHELL_CLASS}`}
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
