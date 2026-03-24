/**
 * Index routes where **Basic / Extended** changes the page (exact pathname match).
 * Other routes still show the toggle; choice persists but layout is unchanged.
 * Add `/anchor` when that index implements the split (see playbook).
 */
export const PAGE_LAYOUT_INDEX_EXACT_PATHS: readonly string[] = [
  "/genesis",
  "/sail",
];

/** @deprecated Use {@link PAGE_LAYOUT_INDEX_EXACT_PATHS} — kept for any legacy imports */
export const PAGE_LAYOUT_TOGGLE_PATH_PREFIXES = PAGE_LAYOUT_INDEX_EXACT_PATHS;
