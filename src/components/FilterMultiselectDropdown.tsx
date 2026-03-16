"use client";

/**
 * Uses Headless UI Listbox. If the dropdown disappears when moving mouse to panel,
 * we can try portal={false} + no anchor for inline panel, or revert to the
 * custom implementation (see git history: wrapper ref + useState open + click-outside only).
 */
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import {
  ChevronDownIcon,
  CheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import NetworkIconClient from "@/components/NetworkIconClient";

export type FilterOption = {
  id: string;
  label: string;
  /** Path for option icon (e.g. token logo). Prepended with / if not already. Ignored when networkId is set. */
  iconUrl?: string;
  /** @web3icons network id (e.g. ethereum, mega-eth, arbitrum-one, base, monad). When set, renders NetworkIcon from @web3icons/core. */
  networkId?: string;
  /** Optional prefix icon for long/short filters */
  prefix?: "long" | "short";
};

/** Sail page long/short colors (match LONG / SHORT table) */
const SAIL_LONG_GREEN = "#6ED6B5";
const SAIL_SHORT_RED = "#E67A6B";

/** Sentinel value for "none selected"; filter pages should show no results when value includes this */
export const FILTER_NONE_SENTINEL = "__none__";

interface FilterMultiselectDropdownProps {
  /** Label for the filter (e.g. "Network", "Long", "Short") */
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (selectedIds: string[]) => void;
  /** Placeholder when none selected or all selected (e.g. "All chains") */
  allLabel?: string;
  className?: string;
  /** Optional group heading inside the dropdown (e.g. "NETWORKS") */
  groupLabel?: string;
  /** Minimum width for trigger and panel (e.g. "min-w-[240px]") */
  minWidthClass?: string;
  /** Max height of options panel (e.g. "max-h-60" or "max-h-[75rem]") */
  maxHeightClass?: string;
}

export function FilterMultiselectDropdown({
  label,
  options,
  value,
  onChange,
  allLabel = "All",
  className = "",
  groupLabel,
  minWidthClass = "min-w-[200px]",
  maxHeightClass = "max-h-60",
}: FilterMultiselectDropdownProps) {
  const isNoneSelected = value.includes(FILTER_NONE_SENTINEL);
  const allSelected =
    !isNoneSelected && (value.length === 0 || value.length === options.length);

  const selectedOptions = isNoneSelected
    ? []
    : value.length === 0
      ? options
      : options.filter((o) => value.includes(o.id));

  const handleListboxChange = (newSelected: FilterOption[]) => {
    if (newSelected.length === 0) {
      onChange([FILTER_NONE_SENTINEL]);
    } else if (newSelected.length === options.length) {
      onChange([]);
    } else {
      onChange(newSelected.map((o) => o.id));
    }
  };

  const displayText = allSelected
    ? allLabel
    : isNoneSelected
      ? "0 selected"
      : value.length === 1
        ? options.find((o) => o.id === value[0])?.label ?? `${value.length} selected`
        : `${value.length} selected`;

  return (
    <div className={`${minWidthClass} ${className}`}>
      <Listbox
        value={selectedOptions}
        onChange={handleListboxChange}
        multiple
        by={(a, b) => a.id === b.id}
      >
        <ListboxButton
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white text-[#1E4775] border border-[#1E4775]/20 focus:border-[#1E4775]/40 focus:ring-1 focus:ring-[#1E4775]/20 focus:outline-none text-sm cursor-pointer data-[disabled]:opacity-50"
        >
          <span className="text-[#1E4775]/70 text-xs shrink-0">{label}:</span>
          <span className="font-medium truncate">{displayText}</span>
          <ChevronDownIcon className="w-5 h-5 text-[#1E4775]/60 shrink-0 data-[open]:rotate-180 transition-transform" />
        </ListboxButton>

        <ListboxOptions
          anchor={{ to: "bottom start", gap: 2 }}
          className={`z-50 w-full ${minWidthClass} min-w-0 bg-white border border-[#1E4775]/20 rounded-none shadow-lg overflow-hidden overflow-y-auto outline-none [width:var(--button-width)] ${maxHeightClass}`}
        >
          {groupLabel && (
            <div className="px-4 py-2 bg-[#1E4775]/5 text-xs font-semibold text-[#1E4775]/70 uppercase tracking-wider">
              {groupLabel}
            </div>
          )}
          <div className="grid grid-cols-2 border-b border-[#1E4775]/10 text-xs">
            <div className="flex justify-center py-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }}
                className="text-[#1E4775] font-medium"
              >
                Select all
              </button>
            </div>
            <div className="flex justify-center py-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([FILTER_NONE_SENTINEL]);
                }}
                className="text-[#1E4775] font-medium"
              >
                Deselect all
              </button>
            </div>
          </div>
          {options.map((opt) => {
            const src = opt.iconUrl
              ? opt.iconUrl.startsWith("/")
                ? opt.iconUrl
                : `/${opt.iconUrl}`
              : null;
            return (
              <ListboxOption
                key={opt.id}
                value={opt}
                className="group flex cursor-pointer items-center gap-2 px-4 py-2 text-left data-[focus]:bg-[#1E4775]/5 data-[selected]:bg-[#1E4775]/10"
              >
                {opt.prefix === "long" && (
                  <ArrowTrendingUpIcon
                    className="w-5 h-5 shrink-0"
                    style={{ color: SAIL_LONG_GREEN, strokeWidth: 2.5 }}
                  />
                )}
                {opt.prefix === "short" && (
                  <ArrowTrendingDownIcon
                    className="w-5 h-5 shrink-0"
                    style={{ color: SAIL_SHORT_RED, strokeWidth: 2.5 }}
                  />
                )}
                {opt.networkId ? (
                  <span className="w-5 h-5 flex shrink-0 items-center justify-center">
                    <NetworkIconClient
                      name={opt.networkId}
                      size={20}
                      variant="branded"
                    />
                  </span>
                ) : src ? (
                  <Image
                    src={src}
                    alt=""
                    width={22}
                    height={22}
                    className="shrink-0 rounded-full object-contain"
                  />
                ) : (
                  <span className="w-5 h-5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 font-medium text-[#1E4775]">
                  {opt.label}
                </span>
                <CheckIcon className="hidden w-4 h-4 shrink-0 text-[#1E4775] group-data-[selected]:block" />
              </ListboxOption>
            );
          })}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
