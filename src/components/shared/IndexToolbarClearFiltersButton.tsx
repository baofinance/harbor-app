"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import SimpleTooltip from "@/components/SimpleTooltip";

type IndexToolbarClearFiltersButtonProps = {
  onClick: () => void;
  ariaLabel?: string;
  tooltipLabel?: string;
};

export default function IndexToolbarClearFiltersButton({
  onClick,
  ariaLabel = "clear filters",
  tooltipLabel = "clear filters",
}: IndexToolbarClearFiltersButtonProps) {
  return (
    <SimpleTooltip label={tooltipLabel}>
      <button
        type="button"
        onClick={onClick}
        className="p-1.5 text-[#E67A6B] hover:text-[#D66A5B] hover:bg-white/10 rounded transition-colors"
        aria-label={ariaLabel}
      >
        <XMarkIcon className="w-5 h-5 stroke-[2.5]" />
      </button>
    </SimpleTooltip>
  );
}

