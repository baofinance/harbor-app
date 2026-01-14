import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { MarketBoostWindow } from "../generated/schema";
import { ONE_BD, getBoostWindowId } from "./marksBoost";

const SECONDS_PER_DAY_BD = BigDecimal.fromString("86400");
const ZERO_BI = BigInt.fromI32(0);

/**
 * Accrue marks between lastUpdated and now, correctly accounting for boost windows.
 *
 * We treat `baseMarksPerDollarPerDay` as the non-boosted marks/$/day rate that already
 * includes product multipliers (e.g. sail base 5x, plus promo 2x) but NOT the market boost.
 *
 * If the interval spans a boost window, we split time:
 * - boosted portion gets multiplied by window.boostMultiplier
 * - the rest accrues at 1x
 */
export function accrueWithBoostWindow(
  sourceType: string,
  sourceAddress: Bytes,
  lastUpdated: BigInt,
  now: BigInt,
  balanceUSD: BigDecimal,
  baseMarksPerDollarPerDay: BigDecimal
): BigDecimal {
  if (lastUpdated.equals(ZERO_BI) || !now.gt(lastUpdated)) {
    return BigDecimal.fromString("0");
  }

  const totalSeconds = now.minus(lastUpdated);
  if (totalSeconds.le(ZERO_BI)) return BigDecimal.fromString("0");

  const windowId = getBoostWindowId(sourceType, sourceAddress);
  const w = MarketBoostWindow.load(windowId);

  // No window: simple linear accrual at base rate.
  if (w == null) {
    const days = totalSeconds.toBigDecimal().div(SECONDS_PER_DAY_BD);
    return balanceUSD.times(baseMarksPerDollarPerDay).times(days);
  }

  // Compute overlap of [lastUpdated, now) with [w.startTimestamp, w.endTimestamp)
  const start = w.startTimestamp;
  const end = w.endTimestamp;

  // boostedStart = max(lastUpdated, start)
  const boostedStart = lastUpdated.ge(start) ? lastUpdated : start;
  // boostedEnd = min(now, end)
  const boostedEnd = now.le(end) ? now : end;

  let boostedSeconds = BigInt.fromI32(0);
  if (boostedEnd.gt(boostedStart)) {
    boostedSeconds = boostedEnd.minus(boostedStart);
  }

  const unboostedSeconds = totalSeconds.minus(boostedSeconds);

  const boostedDays = boostedSeconds.toBigDecimal().div(SECONDS_PER_DAY_BD);
  const unboostedDays = unboostedSeconds.toBigDecimal().div(SECONDS_PER_DAY_BD);

  let boostedMult = ONE_BD;
  // AssemblyScript typing: store fields can be nullable at runtime.
  if (w.boostMultiplier != null) {
    boostedMult = w.boostMultiplier as BigDecimal;
  }

  const earnedUnboosted = balanceUSD
    .times(baseMarksPerDollarPerDay)
    .times(unboostedDays);
  const earnedBoosted = balanceUSD
    .times(baseMarksPerDollarPerDay)
    .times(boostedDays)
    .times(boostedMult);

  return earnedUnboosted.plus(earnedBoosted);
}

