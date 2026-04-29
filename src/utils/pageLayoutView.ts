/**
 * Shared Basic / Extended layout for index routes (Genesis, and later Anchor / Sail).
 * Canonical query: `?view=basic`. Extended is default (param omitted or any other value).
 * User choice persists in `localStorage` and syncs to the URL on index routes.
 */

export const PAGE_LAYOUT_QUERY_KEY = "view";
export const PAGE_LAYOUT_BASIC_VALUE = "basic";

const PAGE_LAYOUT_STORAGE_KEY = "harbor.pageLayoutView";

export type PageLayoutMode = "basic" | "extended";

export function getStoredPageLayoutMode(): PageLayoutMode {
  if (typeof window === "undefined") return "extended";
  try {
    const v = localStorage.getItem(PAGE_LAYOUT_STORAGE_KEY);
    return v === PAGE_LAYOUT_BASIC_VALUE ? "basic" : "extended";
  } catch {
    return "extended";
  }
}

export function setStoredPageLayoutMode(mode: PageLayoutMode): void {
  if (typeof window === "undefined") return;
  try {
    if (mode === "basic") {
      localStorage.setItem(PAGE_LAYOUT_STORAGE_KEY, PAGE_LAYOUT_BASIC_VALUE);
    } else {
      localStorage.removeItem(PAGE_LAYOUT_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Whether the user chose Basic layout for this page.
 * @param legacyParamKeys — e.g. `["genesisView"]` for backwards-compatible URLs until old links expire.
 */
export function isBasicPageLayout(
  searchParams: { get: (key: string) => string | null },
  legacyParamKeys: string[] = []
): boolean {
  if (searchParams.get(PAGE_LAYOUT_QUERY_KEY) === PAGE_LAYOUT_BASIC_VALUE) {
    return true;
  }
  return legacyParamKeys.some(
    (k) => searchParams.get(k) === PAGE_LAYOUT_BASIC_VALUE
  );
}
