"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Read/write `?market=` without `useSearchParams()`.
 * Subscribing via App Router search params has wedged soft navigation after
 * revisiting Sail/Earn; window URL + pathname is enough for this param.
 */
export function useMarketQueryParam(): {
  marketParam: string | null;
  setMarketParam: (marketId: string) => void;
  pathname: string;
} {
  const pathname = usePathname() ?? "";
  const [marketParam, setMarketParamState] = useState<string | null>(null);

  const readFromWindow = useCallback(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("market");
  }, []);

  useEffect(() => {
    setMarketParamState(readFromWindow());
  }, [pathname, readFromWindow]);

  useEffect(() => {
    const onPopState = () => setMarketParamState(readFromWindow());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [readFromWindow]);

  const setMarketParam = useCallback(
    (marketId: string) => {
      setMarketParamState(marketId);
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      params.set("market", marketId);
      const qs = params.toString();
      const hash = window.location.hash;
      const nextUrl = `${qs ? `${pathname}?${qs}` : pathname}${hash}`;
      // Keep Next's history.state intact; avoid router.replace races.
      window.history.replaceState(window.history.state, "", nextUrl);
    },
    [pathname],
  );

  return { marketParam, setMarketParam, pathname };
}
