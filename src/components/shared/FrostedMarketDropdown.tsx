"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  MARKET_SELECTOR_FIELD_LABEL_CLASS,
  MARKET_SELECTOR_TRIGGER_CLASS,
  SAIL_ADVANCED_FROSTED_LIGHT_PANEL,
} from "@/components/sail/advanced/sailAdvancedStyles";

export const FROSTED_MARKET_MENU_CLASS = `absolute left-0 top-[calc(100%+0.35rem)] z-[120] min-w-full w-max max-w-[min(100vw-2rem,26rem)] max-h-80 overflow-y-auto rounded-xl shadow-2xl ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} p-1.5`;

export const SECTIONED_MARKET_MENU_CLASS = `absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-72 overflow-y-auto rounded-xl shadow-xl ${SAIL_ADVANCED_FROSTED_LIGHT_PANEL} p-1`;

export const SECTIONED_MARKET_SECTION_LABEL_CLASS =
  "px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#1E4775]/45";

export function useCloseOnOutsideClick(
  open: boolean,
  onClose: () => void,
  rootRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, rootRef]);
}

type FrostedMarketDropdownProps = {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  menuClassName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Labeled market field shared by Earn, Sail, Genesis, and Harbor Yield. */
export function FrostedMarketDropdown({
  label,
  trigger,
  children,
  className = "",
  menuClassName = FROSTED_MARKET_MENU_CLASS,
  open,
  onOpenChange,
}: FrostedMarketDropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useCloseOnOutsideClick(open, () => onOpenChange(false), rootRef);

  return (
    <div
      ref={rootRef}
      className={`relative min-w-0 ${open ? "z-[110]" : ""} ${className}`.trim()}
    >
      <p className={MARKET_SELECTOR_FIELD_LABEL_CLASS}>{label}</p>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`${MARKET_SELECTOR_TRIGGER_CLASS} w-full`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {trigger}
        <ChevronDownIcon
          className={`ml-auto h-4 w-4 shrink-0 text-[#1E4775]/50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul role="listbox" className={menuClassName}>
          {children}
        </ul>
      ) : null}
    </div>
  );
}

export type MarketMenuSection<T> = {
  label?: string;
  items: readonly T[];
};

type SectionedMarketMenuProps<T> = {
  trigger: ReactNode;
  triggerClassName: string;
  chevronClassName?: string;
  sections: readonly MarketMenuSection<T>[];
  renderItem: (item: T, close: () => void) => ReactNode;
  itemKey: (item: T) => string;
};

/** Open/close shell for a market list split into labeled sections. */
export function SectionedMarketMenu<T>({
  trigger,
  triggerClassName,
  chevronClassName = "h-5 w-5 shrink-0 text-[#1E4775]/55 transition",
  sections,
  renderItem,
  itemKey,
}: SectionedMarketMenuProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useCloseOnOutsideClick(open, () => setOpen(false), rootRef);
  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${open ? "z-50" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={triggerClassName}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {trigger}
        <ChevronDownIcon
          className={`${chevronClassName} ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul role="listbox" className={SECTIONED_MARKET_MENU_CLASS}>
          {sections.flatMap((section, sectionIndex) => {
            if (section.items.length === 0) return [];
            const rows = section.items.map((item) => (
              <span key={itemKey(item)} className="contents">
                {renderItem(item, close)}
              </span>
            ));
            if (!section.label) return rows;
            return [
              <li
                key={`section-${sectionIndex}`}
                className={SECTIONED_MARKET_SECTION_LABEL_CLASS}
                role="presentation"
              >
                {section.label}
              </li>,
              ...rows,
            ];
          })}
        </ul>
      ) : null}
    </div>
  );
}
