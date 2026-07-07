"use client";

import {
  MV_EXPLORER_COL_NETWORK_CLASSNAME,
  MV_EXPLORER_HEADER_CELL_CLASSNAME,
  MV_EXPLORER_TABLE_HEADER_GRID_CLASSNAME,
  MV_EXPLORER_TABLE_HEADER_WRAP_CLASSNAME,
  MV_EXPLORER_TABLE_MIN_WIDTH_CLASSNAME,
} from "./genesisMaidenVoyageTableGrid";

/**
 * Column headers for the Maiden Voyage explorer — grid tracks match Anchor table rows.
 */
export function GenesisMaidenVoyageTableHeader() {
  return (
    <div className={MV_EXPLORER_TABLE_HEADER_WRAP_CLASSNAME}>
      <div className={MV_EXPLORER_TABLE_MIN_WIDTH_CLASSNAME}>
        <div className={MV_EXPLORER_TABLE_HEADER_GRID_CLASSNAME}>
          <div className={MV_EXPLORER_COL_NETWORK_CLASSNAME} aria-label="Network" />
          <div className={MV_EXPLORER_HEADER_CELL_CLASSNAME}>Lifecycle</div>
          <div className={MV_EXPLORER_HEADER_CELL_CLASSNAME}>Voyage</div>
          <div className={MV_EXPLORER_HEADER_CELL_CLASSNAME}>Type</div>
          <div className={MV_EXPLORER_HEADER_CELL_CLASSNAME}>Phase</div>
          <div className={MV_EXPLORER_HEADER_CELL_CLASSNAME}>Est. capacity</div>
          <div className={MV_EXPLORER_HEADER_CELL_CLASSNAME}>Launch window</div>
          <div className={MV_EXPLORER_HEADER_CELL_CLASSNAME}>Action</div>
        </div>
      </div>
    </div>
  );
}
