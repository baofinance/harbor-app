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
          Maiden voyage depositors own 5% of market revenue <strong>forever</strong>.
        </>
      }
    />
  );
}
