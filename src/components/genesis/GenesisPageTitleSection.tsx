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
        <>
          Depositors own{" "}
          <span className="rounded-md bg-[#FF8A7A]/25 px-2 py-0.5 font-semibold text-white">
            5% of market revenue
          </span>{" "}
          <strong>forever</strong>.
        </>
      }
    />
  );
}
