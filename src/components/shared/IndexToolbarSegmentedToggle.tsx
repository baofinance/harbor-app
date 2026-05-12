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
}: IndexToolbarSegmentedToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1.5">
      <span className="text-[10px] font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <div
        className="inline-flex rounded-md bg-[#1E4775]/20 p-0.5"
        role="group"
        aria-label={ariaLabel || label}
      >
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`px-2 py-1 text-[10px] font-semibold rounded ${
                active
                  ? "bg-white text-[#1E4775]"
                  : "text-white/70 hover:text-white"
              }`}
              aria-pressed={active}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

