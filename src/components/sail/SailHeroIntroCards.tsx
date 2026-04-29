import {
  ArrowPathIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

import {
  INDEX_HERO_INTRO_BODY_CLASS,
  INDEX_HERO_INTRO_CARD_CLASS,
  INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS,
  INDEX_HERO_INTRO_CARD_RING_ACCENT_STRONG_CLASS,
  INDEX_HERO_INTRO_ICON_CLASS,
  INDEX_HERO_INTRO_TITLE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";

/**
 * Five explainer cards below the Sail title — Extended layout only.
 */
export function SailHeroIntroCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-2">
      <div className={INDEX_HERO_INTRO_CARD_CLASS}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <BanknotesIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Mint</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Mint leveraged tokens with amplified exposure to price movements
        </p>
      </div>

      <div
        className={`${INDEX_HERO_INTRO_CARD_CLASS} ${INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS}`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <CurrencyDollarIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>No funding fees</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>Funding fee free leverage</p>
      </div>

      <div
        className={`${INDEX_HERO_INTRO_CARD_CLASS} ${INDEX_HERO_INTRO_CARD_RING_ACCENT_STRONG_CLASS}`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheckIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Auto rebalancing</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Positions automatically rebalance to protect you from liquidation
        </p>
      </div>

      <div
        className={`${INDEX_HERO_INTRO_CARD_CLASS} ${INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS}`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <StarIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Ledger Marks</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Earn Ledger marks for deposits: 10 per dollar per day
        </p>
      </div>

      <div className={INDEX_HERO_INTRO_CARD_CLASS}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <ArrowPathIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Redeem</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Redeem sail tokens for collateral at any time
        </p>
      </div>
    </div>
  );
}
