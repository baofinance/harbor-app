import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { MarketBoostWindow } from "../generated/schema";

// 8 days
export const BOOST_DURATION_SECONDS = BigInt.fromI32(8 * 24 * 60 * 60);

export const ONE_BD = BigDecimal.fromString("1.0");

export const ANCHOR_BOOST_MULTIPLIER = BigDecimal.fromString("10.0");
export const SAIL_BOOST_MULTIPLIER = BigDecimal.fromString("2.0");

export function getBoostWindowId(sourceType: string, sourceAddress: Bytes): string {
  return `${sourceType}-${sourceAddress.toHexString()}`;
}

export function setMarketBoostWindow(
  sourceType: string,
  sourceAddress: Bytes,
  startTimestamp: BigInt,
  endTimestamp: BigInt,
  boostMultiplier: BigDecimal
): MarketBoostWindow {
  const id = getBoostWindowId(sourceType, sourceAddress);
  let w = MarketBoostWindow.load(id);
  if (w == null) {
    w = new MarketBoostWindow(id);
    w.sourceType = sourceType;
    w.sourceAddress = sourceAddress;
  }
  w.startTimestamp = startTimestamp;
  w.endTimestamp = endTimestamp;
  w.boostMultiplier = boostMultiplier;
  w.save();
  return w;
}

/**
 * Get or create a per-market boost window, setting start/end on first activity.
 *
 * IMPORTANT: This is market-level (token/pool), not per-user.
 */
export function getOrCreateMarketBoostWindow(
  sourceType: string,
  sourceAddress: Bytes,
  currentTimestamp: BigInt,
  boostMultiplier: BigDecimal
): MarketBoostWindow {
  const id = getBoostWindowId(sourceType, sourceAddress);
  let w = MarketBoostWindow.load(id);

  if (w == null) {
    w = new MarketBoostWindow(id);
    w.sourceType = sourceType;
    w.sourceAddress = sourceAddress;
    w.startTimestamp = currentTimestamp;
    w.endTimestamp = currentTimestamp.plus(BOOST_DURATION_SECONDS);
    w.boostMultiplier = boostMultiplier;
    w.save();
    return w;
  }

  // Backfill safety: if start/end are unset (shouldn't happen), set them.
  if (w.startTimestamp.equals(BigInt.fromI32(0))) {
    w.startTimestamp = currentTimestamp;
    w.endTimestamp = currentTimestamp.plus(BOOST_DURATION_SECONDS);
    w.save();
  }
  return w;
}

export function isBoostActive(window: MarketBoostWindow, currentTimestamp: BigInt): boolean {
  return currentTimestamp.ge(window.startTimestamp) && currentTimestamp.lt(window.endTimestamp);
}

/**
 * Returns the active boost multiplier (e.g. 10.0, 2.0) or 1.0 if not active / missing.
 */
export function getActiveBoostMultiplier(
  sourceType: string,
  sourceAddress: Bytes,
  currentTimestamp: BigInt
): BigDecimal {
  const id = getBoostWindowId(sourceType, sourceAddress);
  const w = MarketBoostWindow.load(id);
  if (w == null) return ONE_BD;
  return isBoostActive(w, currentTimestamp) ? w.boostMultiplier : ONE_BD;
}


