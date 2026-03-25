import type { DefinedMarket } from "@/config/markets";

/** `[marketId, config]` — same shape as filtered `Object.entries(markets)` for Anchor-listed rows. */
export type AnchorMarketTuple = [string, DefinedMarket];

/**
 * Optional contract addresses on a market: keys not present on every `addresses` union
 * are read safely (same pattern as Sail `addressByName`).
 */
export type AnchorAddressByName = Record<string, `0x${string}` | undefined>;

export function anchorAddressByName(
  m: DefinedMarket | undefined | null
): AnchorAddressByName | undefined {
  return m ? (m.addresses as AnchorAddressByName) : undefined;
}

/**
 * One element from wagmi `useContractReads` batch (`allowFailure`); per-market fields use dynamic offsets.
 */
export type AnchorContractReadSlot =
  | { result?: unknown; status?: string; error?: unknown }
  | undefined;

export type AnchorContractReads = readonly AnchorContractReadSlot[] | undefined;
