"use client";

import { useQuery } from "@tanstack/react-query";

export async function fetchTideJsonSnapshot<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load TIDE snapshot: ${url}`);
  }
  return res.json() as Promise<T>;
}

/** Cached JSON fetch for TIDE allocation / airdrop snapshots. Keyed by URL. */
export function useTideJsonSnapshot<T>(url: string) {
  return useQuery({
    queryKey: ["tideJsonSnapshot", url],
    queryFn: () => fetchTideJsonSnapshot<T>(url),
    staleTime: 60_000,
    enabled: Boolean(url),
  });
}
