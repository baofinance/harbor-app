"use client";

import {
  MV_EXPLORER_COL_ACTION_CLASSNAME,
  MV_EXPLORER_COL_CAPACITY_CLASSNAME,
  MV_EXPLORER_COL_LAUNCH_CLASSNAME,
  MV_EXPLORER_COL_LIFECYCLE_CLASSNAME,
  MV_EXPLORER_COL_NETWORK_CLASSNAME,
  MV_EXPLORER_COL_PHASE_CLASSNAME,
  MV_EXPLORER_COL_TYPE_CLASSNAME,
  MV_EXPLORER_COL_VOYAGE_CLASSNAME,
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
          <div className={`${MV_EXPLORER_COL_LIFECYCLE_CLASSNAME} truncate`}>
            Lifecycle
          </div>
          <div className={`${MV_EXPLORER_COL_VOYAGE_CLASSNAME} truncate`}>
            Voyage
          </div>
          <div className={`${MV_EXPLORER_COL_TYPE_CLASSNAME} truncate`}>Type</div>
          <div className={`${MV_EXPLORER_COL_PHASE_CLASSNAME} truncate`}>Phase</div>
          <div className={`${MV_EXPLORER_COL_CAPACITY_CLASSNAME} truncate`}>
            Est. capacity
          </div>
          <div className={`${MV_EXPLORER_COL_LAUNCH_CLASSNAME} truncate`}>
            Launch window
          </div>
          <div className={`${MV_EXPLORER_COL_ACTION_CLASSNAME} truncate`}>
            Action
          </div>
        </div>
      </div>
    </div>
  );
}
