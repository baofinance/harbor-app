import { IndexPageTitleSection } from "@/components/shared/IndexPageTitleSection";

/**
 * Maiden Voyage heading + subtitle — shown in both Basic and Extended layouts.
 */
export function GenesisPageTitleSection() {
  return (
    <IndexPageTitleSection
      title="Maiden voyage"
      titleAccentSuffix="2.0"
      subtitle={
        <span className="flex flex-col items-center gap-2">
          <span
            className="inline-block max-w-2xl rounded-2xl border border-[#FF8A7A]/40 bg-gradient-to-b from-[#FF8A7A]/24 to-[#FF8A7A]/10 px-4 py-3 text-center text-base font-semibold leading-snug text-white shadow-[0_0_0_1px_rgba(255,138,122,0.18),0_0_28px_-8px_rgba(255,138,122,0.45),0_18px_48px_-28px_rgba(255,138,122,0.55)] sm:px-6 sm:py-3.5 sm:text-lg sm:leading-snug"
          >
            Depositors own{" "}
            <span className="font-semibold text-[#FFE8E2]">
              5% of market revenue
            </span>{" "}
            <strong className="font-semibold">forever</strong>.
          </span>
          <span className="text-white/80 text-sm sm:text-base font-medium tracking-tight">
            Stable yield and liquidation-free leverage.
          </span>
        </span>
      }
    />
  );
}
