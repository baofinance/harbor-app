"use client";

type SegmentedOption = {
  id: string;
  label: string;
};

type IndexToolbarSegmentedToggleProps = {
  label: string;
  value: string;
  options: SegmentedOption[];
  onChange: (id: string) => void;
  ariaLabel?: string;
  /** toolbar = label + gray bar (index pages); inline = pills only (legacy dashboard white panel) */
  variant?: "toolbar" | "inline";
  /** Omit the label column (e.g. dashboard product tabs on dark section). */
  hideLabel?: boolean;
};

/**
 * Shared compact segmented toggle used in index toolbars (Genesis / Transparency).
 * Keeps styling consistent across pages while behavior remains page-specific.
 */
export default function IndexToolbarSegmentedToggle({
  label,
  value,
  options,
  onChange,
  ariaLabel,
  variant = "toolbar",
  hideLabel = false,
}: IndexToolbarSegmentedToggleProps) {
  const group = (
    <div
      className="inline-flex rounded-md bg-[#1E4775]/20 p-0.5"
      role="group"
      aria-label={ariaLabel || label || "Options"}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`px-2 py-1 text-[10px] font-semibold rounded sm:text-xs sm:px-3 ${
              active
                ? variant === "inline"
                  ? "bg-[#1E4775] text-white"
                  : "bg-white text-[#1E4775]"
                : variant === "inline"
                  ? "text-[#1E4775]/60 hover:text-[#1E4775]"
                  : "text-white/70 hover:text-white"
            }`}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  if (variant === "inline") {
    return group;
  }

  if (hideLabel) {
    return (
      <div className="flex items-center rounded-lg bg-white/10 px-2 py-1.5">
        {group}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5">
      <span className="text-[10px] font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      {group}
    </div>
  );
}
