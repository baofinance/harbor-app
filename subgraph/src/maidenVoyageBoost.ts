import { BigDecimal, BigInt, Bytes, Address } from "@graphprotocol/graph-ts";
import { HaTokenBalance, SailTokenBalance, UserHarborMarks } from "../generated/schema";
import {
  getGenesisForSailToken,
  HS_FXUSD_BTC,
  HS_FXUSD_ETH,
  HS_FXUSD_EUR,
  HS_FXUSD_GOLD,
  HS_FXUSD_SILVER,
  HS_STETH_BTC,
  HS_STETH_EUR,
  HS_STETH_GOLD,
  HS_STETH_SILVER,
  HA_ETH,
  HA_BTC,
  HA_EUR,
  HA_GOLD,
  HA_SILVER,
  GEN_BTC_FXUSD,
  GEN_BTC_STETH,
  GEN_BTC_FXUSD_T2,
  GEN_BTC_STETH_T2,
  GEN_ETH_FXUSD,
  GEN_ETH_FXUSD_ALT,
  GEN_ETH_FXUSD_T2,
  GEN_FXUSD_EUR,
  GEN_GOLD_FXUSD,
  GEN_GOLD_STETH,
  GEN_SILVER_FXUSD,
  GEN_SILVER_STETH,
  GEN_STETH_EUR,
} from "./maidenVoyageConfig";

const ZERO_ADDR = Address.fromString("0x0000000000000000000000000000000000000000");
const ZERO_BD = BigDecimal.fromString("0");
const ONE_BD = BigDecimal.fromString("1");

function haId(token: string, user: Bytes): string {
  return token.toLowerCase() + "-" + user.toHexString();
}

function loadHaUsd(tokenLower: string, user: Bytes): BigDecimal {
  const b = HaTokenBalance.load(haId(tokenLower, user));
  return b == null ? ZERO_BD : b.balanceUSD;
}

function loadSailUsd(tokenLower: string, user: Bytes): BigDecimal {
  const b = SailTokenBalance.load(haId(tokenLower, user));
  return b == null ? ZERO_BD : b.balanceUSD;
}

/** Sum ha + sail USD balances for tokens in this genesis market. */
export function sumMaidenVoyageClaimUSD(genesis: Address, user: Bytes): BigDecimal {
  const g = genesis.toHexString().toLowerCase();
  let sum = ZERO_BD;

  if (g == GEN_ETH_FXUSD.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_ETH.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_FXUSD_ETH.toHexString(), user));
    return sum;
  }
  if (g == GEN_BTC_FXUSD.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_BTC.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_FXUSD_BTC.toHexString(), user));
    return sum;
  }
  if (g == GEN_BTC_STETH.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_BTC.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_STETH_BTC.toHexString(), user));
    return sum;
  }
  if (g == GEN_STETH_EUR.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_EUR.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_STETH_EUR.toHexString(), user));
    return sum;
  }
  if (g == GEN_FXUSD_EUR.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_EUR.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_FXUSD_EUR.toHexString(), user));
    return sum;
  }
  if (g == GEN_GOLD_FXUSD.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_GOLD.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_FXUSD_GOLD.toHexString(), user));
    return sum;
  }
  if (g == GEN_GOLD_STETH.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_GOLD.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_STETH_GOLD.toHexString(), user));
    return sum;
  }
  if (g == GEN_SILVER_FXUSD.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_SILVER.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_FXUSD_SILVER.toHexString(), user));
    return sum;
  }
  if (g == GEN_SILVER_STETH.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_SILVER.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_STETH_SILVER.toHexString(), user));
    return sum;
  }

  // Test2 / alt launch genesis → same token sets as production launch
  if (g == GEN_ETH_FXUSD_T2.toHexString().toLowerCase() || g == GEN_ETH_FXUSD_ALT.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_ETH.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_FXUSD_ETH.toHexString(), user));
    return sum;
  }
  if (g == GEN_BTC_FXUSD_T2.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_BTC.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_FXUSD_BTC.toHexString(), user));
    return sum;
  }
  if (g == GEN_BTC_STETH_T2.toHexString().toLowerCase()) {
    sum = sum.plus(loadHaUsd(HA_BTC.toHexString(), user));
    sum = sum.plus(loadSailUsd(HS_STETH_BTC.toHexString(), user));
    return sum;
  }

  return sum;
}

/**
 * Recompute ve-style maiden voyage boost from retention: claim USD vs baseline at genesis end.
 * Linear in retention: 0% -> 1x, 50% -> midpoint, 100% -> maxBoost (e.g. 1x / 3x / 5x for max 5).
 * Boost only ever moves down (sticky high-water): if you withdraw and later add liquidity back,
 * you do not regain a higher multiplier — yield attribution (off-chain / UI) uses min(previous, rawBoost).
 * Maiden voyage boost is not applied to marks; only market boost windows (marksBoost) affect marks.
 * Only applies when user has positive final ownership share and genesis ended.
 */
export function refreshMaidenVoyageBoost(
  userMarks: UserHarborMarks,
  genesis: Address,
  timestamp: BigInt
): void {
  if (!userMarks.genesisEnded) return;
  if (userMarks.finalMaidenVoyageOwnershipShare.le(ZERO_BD)) return;

  const maxB = userMarks.maidenVoyageMaxBoost;
  const baseline = userMarks.baselineClaimUSDForBoost;
  const claim = userMarks.currentDepositUSD.plus(sumMaidenVoyageClaimUSD(genesis, userMarks.user));
  userMarks.lastMaidenVoyageClaimUSD = claim;

  if (baseline.le(ZERO_BD)) {
    userMarks.maidenVoyageBoostMultiplier = ONE_BD;
    userMarks.lastUpdated = timestamp;
    return;
  }

  let ratio = claim.div(baseline);
  if (ratio.gt(ONE_BD)) ratio = ONE_BD;

  // rawBoost = 1 + (maxBoost - 1) * retention
  const rawBoost = ONE_BD.plus(maxB.minus(ONE_BD).times(ratio));
  let prev = userMarks.maidenVoyageBoostMultiplier;
  if (prev.lt(ONE_BD) || prev.equals(ZERO_BD)) prev = maxB;

  let next = rawBoost;
  if (next.gt(prev)) next = prev;
  if (next.lt(ONE_BD)) next = ONE_BD;
  if (next.gt(maxB)) next = maxB;

  userMarks.maidenVoyageBoostMultiplier = next;
  userMarks.lastUpdated = timestamp;
}

function refreshIfParticipant(genesis: Address, user: Bytes, timestamp: BigInt): void {
  if (genesis.equals(ZERO_ADDR)) return;
  const id = genesis.toHexString() + "-" + user.toHexString();
  const um = UserHarborMarks.load(id);
  if (um == null || !um.genesisEnded) return;
  if (um.finalMaidenVoyageOwnershipShare.le(ZERO_BD)) return;
  refreshMaidenVoyageBoost(um, genesis, timestamp);
  um.save();
}

/** Call from ha token transfer handler after balance update. */
export function onHaTokenBalanceChanged(haToken: Address, user: Bytes, timestamp: BigInt): void {
  const t = haToken.toHexString().toLowerCase();
  if (t == HA_ETH.toHexString().toLowerCase()) {
    refreshIfParticipant(GEN_ETH_FXUSD, user, timestamp);
  } else if (t == HA_BTC.toHexString().toLowerCase()) {
    refreshIfParticipant(GEN_BTC_FXUSD, user, timestamp);
    refreshIfParticipant(GEN_BTC_STETH, user, timestamp);
  } else if (t == HA_EUR.toHexString().toLowerCase()) {
    refreshIfParticipant(GEN_STETH_EUR, user, timestamp);
    refreshIfParticipant(GEN_FXUSD_EUR, user, timestamp);
  } else if (t == HA_GOLD.toHexString().toLowerCase()) {
    refreshIfParticipant(GEN_GOLD_FXUSD, user, timestamp);
    refreshIfParticipant(GEN_GOLD_STETH, user, timestamp);
  } else if (t == HA_SILVER.toHexString().toLowerCase()) {
    refreshIfParticipant(GEN_SILVER_FXUSD, user, timestamp);
    refreshIfParticipant(GEN_SILVER_STETH, user, timestamp);
  }
}

/** Call from sail token transfer handler after balance update. */
export function onSailTokenBalanceChanged(sailToken: Address, user: Bytes, timestamp: BigInt): void {
  const g = getGenesisForSailToken(sailToken);
  refreshIfParticipant(g, user, timestamp);
}

