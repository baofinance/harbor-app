/**
 * Routes that show the header **Basic / Extended** toggle (index pages only).
 * `/sail` follows the Genesis pattern (Basic = title + list; Extended = hero + stats + marks).
 * Add `/anchor` when that index matches the same split.
 */
export const PAGE_LAYOUT_TOGGLE_PATH_PREFIXES: readonly string[] = [
  "/genesis",
  // "/anchor",
  "/sail",
];
