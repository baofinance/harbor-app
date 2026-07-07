import {
  ArrowPathIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

import { HarborStatTile } from "@/components/shared/HarborStatTile";
import {
  HARBOR_STAT_TILE_INTRO_BODY_CLASS,
  HARBOR_STAT_TILE_INTRO_ICON_CLASS,
  HARBOR_STAT_TILE_INTRO_TITLE_CLASS,
} from "@/components/shared/harborStatTileStyles";

/**
 * Five explainer cards below the Sail title — Extended layout only.
 */
export function SailHeroIntroCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-2">
      <HarborStatTile variant="intro">
        <div className="flex items-center justify-center gap-2 mb-1">
          <BanknotesIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Mint</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Mint leveraged tokens with amplified exposure to price movements
        </p>
      </HarborStatTile>

      <HarborStatTile variant="intro" accent="ring">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CurrencyDollarIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>No funding fees</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>Funding fee free leverage</p>
      </HarborStatTile>

      <HarborStatTile variant="intro" accent="ringStrong">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheckIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Auto rebalancing</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Positions automatically rebalance to protect you from liquidation
        </p>
      </HarborStatTile>

      <HarborStatTile variant="intro" accent="ring">
        <div className="flex items-center justify-center gap-2 mb-1">
          <StarIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Ledger Marks</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Earn Ledger marks for deposits: 10 per dollar per day
        </p>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ArrowPathIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Redeem</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Redeem sail tokens for collateral at any time
        </p>
      </HarborStatTile>
    </div>
  );
}
