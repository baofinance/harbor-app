import {
  ArrowPathIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import {
  INDEX_HERO_INTRO_BODY_CLASS,
  INDEX_HERO_INTRO_CARD_CLASS,
  INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS,
  INDEX_HERO_INTRO_ICON_CLASS,
  INDEX_HERO_INTRO_TITLE_CLASS,
} from "@/components/shared/indexMarketsToolbarStyles";

/**
 * Four intro cards — Extended layout only (same surface as yield-share Genesis heroes).
 */
export function AnchorHeroIntroCards() {
  return (
    <div className="mt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-1">
      <div className={INDEX_HERO_INTRO_CARD_CLASS}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <BanknotesIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Mint</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Mint a pegged token with a supported asset
        </p>
      </div>

      <div
        className={`${INDEX_HERO_INTRO_CARD_CLASS} ${INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS}`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheckIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Secure</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Deposit into a stability pool to secure the protocol
        </p>
      </div>

      <div
        className={`${INDEX_HERO_INTRO_CARD_CLASS} ${INDEX_HERO_INTRO_CARD_RING_ACCENT_CLASS}`}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <CurrencyDollarIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Earn</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Earn real yield from collateral and trading fees for helping secure the
          protocol
        </p>
      </div>

      <div className={INDEX_HERO_INTRO_CARD_CLASS}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <ArrowPathIcon className={INDEX_HERO_INTRO_ICON_CLASS} />
          <h2 className={INDEX_HERO_INTRO_TITLE_CLASS}>Redeem</h2>
        </div>
        <p className={INDEX_HERO_INTRO_BODY_CLASS}>
          Redeem for collateral at any time
        </p>
      </div>
    </div>
  );
}
