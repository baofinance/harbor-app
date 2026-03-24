import { MarksBoostBadge } from "@/components/MarksBoostBadge";
import { SailHeroIntroCards } from "./SailHeroIntroCards";

export type SailExtendedHeroProps = {
  /** When set, shows 2x boost banner until this Unix timestamp. */
  boostEndTimestamp: number | null;
};

/**
 * Boost strip (if active) + intro cards — Extended layout only.
 */
export function SailExtendedHero({ boostEndTimestamp }: SailExtendedHeroProps) {
  return (
    <>
      {boostEndTimestamp != null && (
        <div className="mb-3">
          <MarksBoostBadge multiplier={2} endTimestamp={boostEndTimestamp} />
        </div>
      )}
      <SailHeroIntroCards />
    </>
  );
}
