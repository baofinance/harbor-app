import {
  ArrowPathIcon,
  BanknotesIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

import { HarborStatTile } from "@/components/shared/HarborStatTile";
import {
  HARBOR_STAT_TILE_INTRO_BODY_CLASS,
  HARBOR_STAT_TILE_INTRO_ICON_CLASS,
  HARBOR_STAT_TILE_INTRO_TITLE_CLASS,
} from "@/components/shared/harborStatTileStyles";

/**
 * Three intro cards below the Maiden Voyage title — Extended layout only.
 */
export function GenesisHeroIntroCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2 relative">
      <HarborStatTile variant="intro">
        <div className="flex items-center justify-center gap-2 mb-1">
          <BanknotesIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Deposit</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Help fill a market&apos;s launch liquidity &amp; in return own a share
          of all mint/redeem fees and collateral yield.
        </p>
      </HarborStatTile>

      <HarborStatTile variant="intro" accent="ring">
        <div className="flex items-center justify-center gap-2 mb-1">
          <SparklesIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>Launch</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Markets launch once their deposit cap is filled
        </p>
      </HarborStatTile>

      <HarborStatTile variant="intro">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ArrowPathIcon className={HARBOR_STAT_TILE_INTRO_ICON_CLASS} />
          <h2 className={HARBOR_STAT_TILE_INTRO_TITLE_CLASS}>After genesis</h2>
        </div>
        <p className={HARBOR_STAT_TILE_INTRO_BODY_CLASS}>
          Claim Anchor + Sail. Stay deposited to maximize share of revenue.{" "}
          <a
            href="https://docs.harborfinance.io/maiden-voyage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-harbor-coral hover:text-[#ffb4a8] underline decoration-white/30 underline-offset-2 font-semibold whitespace-nowrap"
          >
            Find out more
          </a>
        </p>
      </HarborStatTile>
    </div>
  );
}
