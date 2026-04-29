import type { DefinedMarket } from "@/config/markets";

/** `[marketId, config]` — same shape as `Object.entries(markets)` for Sail-listed rows. */
export type SailMarketTuple = [string, DefinedMarket];

/**
 * One element from wagmi `useContractReads` batch (`allowFailure`); per-market fields use dynamic offsets.
 */
export type SailContractReadSlot =
  | { result?: unknown; status?: string; error?: unknown }
  | undefined;

export type SailContractReads = readonly SailContractReadSlot[] | undefined;
