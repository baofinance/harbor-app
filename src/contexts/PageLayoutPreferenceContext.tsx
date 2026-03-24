"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PAGE_LAYOUT_INDEX_EXACT_PATHS } from "@/config/pageLayoutToggleRoutes";
import {
  PAGE_LAYOUT_BASIC_VALUE,
  PAGE_LAYOUT_QUERY_KEY,
  isBasicPageLayout,
  setStoredPageLayoutMode,
  getStoredPageLayoutMode,
  type PageLayoutMode,
} from "@/utils/pageLayoutView";

type PageLayoutPreferenceValue = {
  isBasic: boolean;
  setMode: (mode: PageLayoutMode) => void;
};

const PageLayoutPreferenceContext =
  createContext<PageLayoutPreferenceValue | null>(null);

function isLayoutIndexPath(pathname: string): boolean {
  return (PAGE_LAYOUT_INDEX_EXACT_PATHS as readonly string[]).includes(
    pathname
  );
}

function legacyKeysForPath(pathname: string): string[] {
  return pathname === "/genesis" ? ["genesisView"] : [];
}

export function PageLayoutPreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isBasic, setIsBasic] = useState(false);

  const onIndex = useMemo(() => isLayoutIndexPath(pathname), [pathname]);

  useLayoutEffect(() => {
    if (onIndex) {
      const hasExplicitView = searchParams.has(PAGE_LAYOUT_QUERY_KEY);
      const hasLegacyGenesis =
        pathname === "/genesis" && searchParams.has("genesisView");
      const hasExplicit = hasExplicitView || hasLegacyGenesis;

      if (hasExplicit) {
        const v = isBasicPageLayout(searchParams, legacyKeysForPath(pathname));
        setIsBasic(v);
        setStoredPageLayoutMode(v ? "basic" : "extended");
        return;
      }

      const wantBasic = getStoredPageLayoutMode() === "basic";
      setIsBasic(wantBasic);
      if (wantBasic) {
        const next = new URLSearchParams(searchParams.toString());
        next.set(PAGE_LAYOUT_QUERY_KEY, PAGE_LAYOUT_BASIC_VALUE);
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      }
      return;
    }

    setIsBasic(getStoredPageLayoutMode() === "basic");
  }, [onIndex, pathname, router, searchParams]);

  const setMode = useCallback(
    (mode: PageLayoutMode) => {
      const basic = mode === "basic";
      setIsBasic(basic);
      setStoredPageLayoutMode(mode);

      if (!isLayoutIndexPath(pathname)) {
        return;
      }

      const next = new URLSearchParams(searchParams.toString());
      if (basic) {
        next.set(PAGE_LAYOUT_QUERY_KEY, PAGE_LAYOUT_BASIC_VALUE);
      } else {
        next.delete(PAGE_LAYOUT_QUERY_KEY);
      }
      if (pathname === "/genesis") {
        next.delete("genesisView");
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const value = useMemo(
    () => ({ isBasic, setMode }),
    [isBasic, setMode]
  );

  return (
    <PageLayoutPreferenceContext.Provider value={value}>
      {children}
    </PageLayoutPreferenceContext.Provider>
  );
}

export function usePageLayoutPreference(): PageLayoutPreferenceValue {
  const ctx = useContext(PageLayoutPreferenceContext);
  if (!ctx) {
    throw new Error(
      "usePageLayoutPreference must be used within PageLayoutPreferenceProvider"
    );
  }
  return ctx;
}
