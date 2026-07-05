"use client";

import { useAppBackground } from "@/contexts/AppBackgroundContext";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import NetworkIconClient from "@/components/NetworkIconClient";
import { HARBOR_NAV_SEGMENT_SHELL_CLASS, HARBOR_NAV_THEME_TRIGGER_CLASS } from "@/components/shared/harborNavStyles";
import { HARBOR_FROSTED_DROPDOWN_SHELL } from "@/components/shared/harborFrostedSurfaceStyles";

export type PageLayoutToggleProps = {
  /** Accessible name for the control. */
  ariaLabel?: string;
};

/** Nav theme selector (Ethereum / MegaETH background). */
export function PageLayoutToggle({
  ariaLabel = "App theme",
}: PageLayoutToggleProps) {
  const { mode: backgroundMode, setMode: setBackgroundMode } = useAppBackground();
  const backgroundOptions = [
    { id: "eth" as const, label: "Ethereum", icon: "ethereum" },
    { id: "megaeth" as const, label: "MegaETH", icon: "mega-eth" },
  ];
  const selectedBackground =
    backgroundOptions.find((option) => option.id === backgroundMode) ??
    backgroundOptions[0];

  return (
    <div
      className={`flex w-[6.75rem] shrink-0 items-center ${HARBOR_NAV_SEGMENT_SHELL_CLASS}`}
      aria-label={ariaLabel}
    >
      <Listbox
        as="div"
        className="relative w-full"
        value={selectedBackground}
        by={(a, b) => a.id === b.id}
        onChange={(next) => setBackgroundMode(next.id)}
      >
        <ListboxButton
          className={`${HARBOR_NAV_THEME_TRIGGER_CLASS} flex items-center justify-between gap-1`}
        >
          <span className="inline-flex min-w-0 items-center gap-1">
            <NetworkIconClient
              name={selectedBackground.icon}
              size={20}
              variant="branded"
            />
            <span className="truncate text-[11px] font-medium leading-none">
              Theme
            </span>
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-[#1E4775]/60 transition-transform data-[open]:rotate-180" />
        </ListboxButton>
        <ListboxOptions
          modal={false}
          className={`absolute right-0 top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-md outline-none ${HARBOR_FROSTED_DROPDOWN_SHELL}`}
        >
          {backgroundOptions.map((option) => (
            <ListboxOption
              key={option.id}
              value={option}
              className="group flex cursor-pointer items-center gap-1.5 px-2 py-2 text-[#1E4775] data-[focus]:bg-[#1E4775]/5 data-[selected]:border-l-2 data-[selected]:border-[#1E4775]/40 data-[selected]:bg-[#1E4775]/10"
            >
              <NetworkIconClient name={option.icon} size={20} variant="branded" />
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-none">
                Theme
              </span>
              <CheckIcon className="hidden h-3 w-3 shrink-0 text-[#1E4775] group-data-[selected]:block" />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
