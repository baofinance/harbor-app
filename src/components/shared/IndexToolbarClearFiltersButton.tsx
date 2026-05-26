"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";

type IndexToolbarClearFiltersButtonProps = {
  onClick: () => void;
  /** When false, keeps layout space but hides the control (avoids toolbar shift). */
  visible?: boolean;
  ariaLabel?: string;
  tooltipLabel?: string;
};

export default function IndexToolbarClearFiltersButton({
  onClick,
  visible = true,
  ariaLabel = "clear filters",
  tooltipLabel = "clear filters",
}: IndexToolbarClearFiltersButtonProps) {
  return (
    <SimpleTooltip label={tooltipLabel}>
      <button
        type="button"
        onClick={onClick}
        tabIndex={visible ? 0 : -1}
        className={`p-1.5 text-[#E67A6B] hover:text-[#D66A5B] hover:bg-white/10 rounded transition-colors shrink-0 ${
          visible ? "" : "invisible pointer-events-none"
        }`}
        aria-label={ariaLabel}
        aria-hidden={!visible}
      >
        <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
      </button>
    </SimpleTooltip>
  );
}

