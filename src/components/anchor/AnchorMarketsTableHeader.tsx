"use client";

import {
  ANCHOR_MARKETS_TABLE_HEADER_LG_GRID_CLASSNAME,
  ANCHOR_MARKETS_TABLE_HEADER_LG_WRAP_CLASSNAME,
  ANCHOR_MARKETS_TABLE_HEADER_MD_GRID_CLASSNAME,
  ANCHOR_MARKETS_TABLE_HEADER_MD_WRAP_CLASSNAME,
} from "./anchorMarketsTableGrid";

/**
 * Column headers for the Anchor grouped stability-pool table — must stay in sync with
 * {@link ANCHOR_MARKETS_TABLE_ROW_LG_CLASSNAME} / MD row grids.
 */
export function AnchorMarketsTableHeader() {
  return (
    <>
      <div className={ANCHOR_MARKETS_TABLE_HEADER_LG_WRAP_CLASSNAME}>
        <div className={ANCHOR_MARKETS_TABLE_HEADER_LG_GRID_CLASSNAME}>
          <div className="min-w-0" aria-label="Network" />
          <div className="min-w-0 text-center truncate">Token</div>
          <div className="text-center min-w-0 truncate">Deposit Assets</div>
          <div className="text-center min-w-0 truncate">APR</div>
          <div className="text-center min-w-0 truncate">Earnings</div>
          <div className="text-center min-w-0 truncate">Reward Assets</div>
          <div className="text-center min-w-0 truncate">Position</div>
          <div className="text-center min-w-0 truncate">Actions</div>
        </div>
      </div>

      <div className={ANCHOR_MARKETS_TABLE_HEADER_MD_WRAP_CLASSNAME}>
        <div className={ANCHOR_MARKETS_TABLE_HEADER_MD_GRID_CLASSNAME}>
          <div className="min-w-0" aria-label="Network" />
          <div className="min-w-0 text-center truncate">Token</div>
          <div className="text-center min-w-0 truncate">APR</div>
          <div className="text-center min-w-0 truncate">
            Position / Earnings / Rewards
          </div>
          <div className="text-center min-w-0 truncate">Actions</div>
        </div>
      </div>
    </>
  );
}
