/**
 * Shared Basic / Extended layout for index routes (Genesis, and later Anchor / Sail).
 * Canonical query: `?view=basic`. Extended is default (param omitted or any other value).
 */

export const PAGE_LAYOUT_QUERY_KEY = "view";
export const PAGE_LAYOUT_BASIC_VALUE = "basic";

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
