"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

export type FilterSingleSelectOption = {
  id: string;
  label: string;
  /** Secondary line in the panel (e.g. incentive subtitle) */
  hint?: string;
};

type FilterSingleSelectDropdownProps = {
  label: string;
  options: FilterSingleSelectOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  minWidthClass?: string;
  groupLabel?: string;
};

/**
 * Single-select filter using the same trigger/panel styling as
 * {@link FilterMultiselectDropdown} (Genesis / Sail index toolbars).
 */
export function FilterSingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  disabled = false,
  minWidthClass = "min-w-[235px]",
  groupLabel,
}: FilterSingleSelectDropdownProps) {
  const selected = options.find((o) => o.id === value) ?? options[0];

  if (!options.length) {
    return null;
  }

  return (
    <div className={minWidthClass}>
      <Listbox
        value={selected}
        by={(a, b) => a.id === b.id}
        onChange={(opt: FilterSingleSelectOption | null) => {
          if (opt) onChange(opt.id);
        }}
        disabled={disabled}
      >
        <ListboxButton
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white text-[#1E4775] border border-[#1E4775]/20 rounded-md focus:border-[#1E4775]/40 focus:ring-1 focus:ring-[#1E4775]/20 focus:outline-none text-sm cursor-pointer data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
        >
          <span className="text-[#1E4775]/70 text-xs shrink-0">{label}:</span>
          <span className="font-medium truncate text-left min-w-0 flex-1">
            {selected?.label ?? "—"}
          </span>
          <ChevronDownIcon className="w-5 h-5 text-[#1E4775]/60 shrink-0 data-[open]:rotate-180 transition-transform" />
        </ListboxButton>

        <ListboxOptions
          anchor={{ to: "bottom start", gap: 2 }}
          className={`z-50 w-full ${minWidthClass} min-w-0 bg-white border border-[#1E4775]/20 rounded-md shadow-lg overflow-hidden overflow-y-auto outline-none [width:var(--button-width)] max-h-60`}
        >
          {groupLabel && (
            <div className="px-4 py-2 bg-[#1E4775]/5 text-xs font-semibold text-[#1E4775]/70 uppercase tracking-wider">
              {groupLabel}
            </div>
          )}
          {options.map((opt) => (
            <ListboxOption
              key={opt.id}
              value={opt}
              className="group flex cursor-pointer flex-col gap-0.5 px-4 py-2.5 text-left data-[focus]:bg-[#1E4775]/5 data-[selected]:bg-[#1E4775]/10"
            >
              <div className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 font-medium text-[#1E4775]">
                  {opt.label}
                </span>
                <CheckIcon className="hidden h-4 w-4 shrink-0 text-[#1E4775] group-data-[selected]:block" />
              </div>
              {opt.hint && (
                <span className="text-xs text-[#1E4775]/60">{opt.hint}</span>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Listbox>
    </div>
  );
}
