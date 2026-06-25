import {
  CurrencyDollarIcon,
  EyeIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { HarborStatTile } from "@/components/shared/HarborStatTile";
import {
  HARBOR_STAT_TILE_INTRO_BODY_CLASS,
  HARBOR_STAT_TILE_INTRO_ICON_CLASS,
  HARBOR_STAT_TILE_INTRO_TITLE_CLASS,
} from "@/components/shared/harborStatTileStyles";

/** Three intro cards — Transparency extended layout only. */
export function TransparencyHeroIntroCards() {
  return (
    <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
      <HarborStatTile variant="intro">
        <div className="mb-1 flex items-center justify-center gap-2">
          <EyeIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Fully On-Chain</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          All data fetched directly from smart contracts
        </p>
      </HarborStatTile>

      <HarborStatTile variant="intro" accent="ring">
        <div className="mb-1 flex items-center justify-center gap-2">
          <CurrencyDollarIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Real-Time</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Click refresh to update data
        </p>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="mb-1 flex items-center justify-center gap-2">
          <Squares2X2Icon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>All Markets</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          View metrics for all Harbor markets
        </p>
      </HarborStatTile>
    </div>
  );
}
