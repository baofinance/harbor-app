import { getGraphHeaders, getGraphUrl, retryGraphQLQuery } from "@/config/graph";
import { getReferralsStore } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";
import { getReferralMetaStore, getReferralSyncStore } from "@/lib/referralSyncStore";

type MarksEvent = {
  id: string;
  user: string;
  amount: string;
  eventType: string;
  timestamp: string;
};

type UserTotalMarks = {
  id: string;
  totalMarks: string;
};

type MarksBreakdown = {
  userHarborMarks_collection?: Array<{
    currentMarks: string;
    marksPerDay: string;
    lastUpdated: string;
    genesisEnded: boolean;
  }>;
  haTokenBalances?: Array<{
    accumulatedMarks: string;
    marksPerDay: string;
    lastUpdated: string;
  }>;
  stabilityPoolDeposits?: Array<{
    accumulatedMarks: string;
    marksPerDay: string;
    lastUpdated: string;
  }>;
  sailTokenBalances?: Array<{
    accumulatedMarks: string;
    marksPerDay: string;
    lastUpdated: string;
  }>;
};

const MARKS_QUERY = `
  query MarksEvents($first: Int!, $after: ID) {
    marksEvents(first: $first, orderBy: id, orderDirection: asc, where: { id_gt: $after }) {
      id
      user
      amount
      eventType
      timestamp
    }
  }
`;

const USER_TOTAL_MARKS_QUERY = `
  query UserTotalMarks($user: ID!) {
    userTotalMarks(id: $user) {
      id
      totalMarks
    }
  }
`;

const USER_MARKS_BREAKDOWN_QUERY = `
  query UserMarksBreakdown($user: Bytes!) {
    userHarborMarks_collection(where: { user: $user }) {
      currentMarks
      marksPerDay
      lastUpdated
      genesisEnded
    }
    haTokenBalances(where: { user: $user }) {
      accumulatedMarks
      marksPerDay
      lastUpdated
    }
    stabilityPoolDeposits(where: { user: $user }) {
      accumulatedMarks
      marksPerDay
      lastUpdated
    }
    sailTokenBalances(where: { user: $user }) {
      accumulatedMarks
      marksPerDay
      lastUpdated
    }
  }
`;

const META_TIMESTAMP_QUERY = `
  query MetaTimestamp {
    _meta {
      block {
        timestamp
      }
    }
  }
`;

async function fetchMarksEvents(
  after: string | null,
  graphUrlOverride?: string,
  first = 200
): Promise<MarksEvent[]> {
  const url = graphUrlOverride || getGraphUrl();
  const headers = getGraphHeaders(url);
  const body = JSON.stringify({
    query: MARKS_QUERY,
    variables: { first, after: after || "" },
  });

  const response = await retryGraphQLQuery(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`GraphQL error (${res.status})`);
    }
    return (await res.json()) as { data?: { marksEvents?: MarksEvent[] } };
  });

  return response.data?.marksEvents ?? [];
}

function parseBigDecimalToE18(value: string | null | undefined): bigint {
  if (!value) return 0n;
  const [whole, fraction = ""] = value.split(".");
  const wholePart = whole ? BigInt(whole) : 0n;
  const fracPadded = fraction.padEnd(18, "0").slice(0, 18);
  const fracPart = fracPadded ? BigInt(fracPadded) : 0n;
  return wholePart * 1000000000000000000n + fracPart;
}

function estimateMarksE18(options: {
  accumulated: string;
  marksPerDay: string;
  lastUpdated: string;
  nowSec: number;
}): bigint {
  const accumulatedE18 = parseBigDecimalToE18(options.accumulated);
  const marksPerDayE18 = parseBigDecimalToE18(options.marksPerDay);
  const lastUpdatedSec = Number(options.lastUpdated || "0");
  if (!Number.isFinite(lastUpdatedSec) || lastUpdatedSec <= 0) {
    return accumulatedE18;
  }
  const elapsedSec = Math.max(0, options.nowSec - lastUpdatedSec);
  if (elapsedSec === 0 || marksPerDayE18 === 0n) {
    return accumulatedE18;
  }
  const earnedE18 = (marksPerDayE18 * BigInt(elapsedSec)) / 86400n;
  return accumulatedE18 + earnedE18;
}

async function fetchUserTotalMarks(
  user: string,
  graphUrlOverride?: string
): Promise<UserTotalMarks | null> {
  const url = graphUrlOverride || getGraphUrl();
  const headers = getGraphHeaders(url);
  const body = JSON.stringify({
    query: USER_TOTAL_MARKS_QUERY,
    variables: { user: user.toLowerCase() },
  });

  const response = await retryGraphQLQuery(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`GraphQL error (${res.status})`);
    }
    return (await res.json()) as { data?: { userTotalMarks?: UserTotalMarks } };
  });

  return response.data?.userTotalMarks ?? null;
}

async function fetchUserMarksBreakdown(
  user: string,
  graphUrlOverride?: string
): Promise<MarksBreakdown | null> {
  const url = graphUrlOverride || getGraphUrl();
  const headers = getGraphHeaders(url);
  const body = JSON.stringify({
    query: USER_MARKS_BREAKDOWN_QUERY,
    variables: { user: user.toLowerCase() },
  });

  const response = await retryGraphQLQuery(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`GraphQL error (${res.status})`);
    }
    return (await res.json()) as { data?: MarksBreakdown };
  });

  return response.data ?? null;
}

async function fetchMetaTimestamp(
  graphUrlOverride?: string
): Promise<number | null> {
  const url = graphUrlOverride || getGraphUrl();
  const headers = getGraphHeaders(url);
  const body = JSON.stringify({
    query: META_TIMESTAMP_QUERY,
  });

  const response = await retryGraphQLQuery(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`GraphQL error (${res.status})`);
    }
    return (await res.json()) as {
      data?: { _meta?: { block?: { timestamp?: string } } };
    };
  });

  const raw = response.data?._meta?.block?.timestamp;
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function buildCursorKey(base: string, graphUrlOverride?: string) {
  if (!graphUrlOverride) return base;
  const slug = graphUrlOverride.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 64);
  return `${base}:${slug}`;
}

export async function syncMarksShares(options?: {
  graphUrlOverride?: string;
  first?: number;
  maxBatches?: number;
  resetCursor?: boolean;
}): Promise<{ fetched: number; processed: number; graphUrlUsed: string }> {
  const cursorStore = getReferralSyncStore();
  const earningsStore = getReferralEarningsStore();
  const referralStore = getReferralsStore();
  const settings = await referralStore.getSettings();
  const shareBps = Math.round(settings.referrerMarksSharePercent * 10000);
  const graphUrlOverride = options?.graphUrlOverride;
  const cursorKey = buildCursorKey("marks:events", graphUrlOverride);
  let cursor = options?.resetCursor ? null : await cursorStore.getCursor(cursorKey);
  let fetched = 0;
  let processed = 0;
  const graphUrlUsed = graphUrlOverride || getGraphUrl();
  const first = options?.first ?? 200;
  const maxBatches = options?.maxBatches ?? 10;
  let batches = 0;

  while (true) {
    const events = await fetchMarksEvents(cursor, graphUrlOverride, first);
    if (!events.length) break;
    fetched += events.length;
    batches += 1;

    for (const event of events) {
      cursor = event.id;
      if (event.eventType === "forfeit") continue;
      const binding = await referralStore.getBinding(event.user);
      if (!binding || binding.status !== "confirmed") {
        continue;
      }
      const fresh = await earningsStore.checkAndMarkMarksSeen(event.id);
      if (!fresh) continue;
      const existing =
        (await earningsStore.getReferrerTotals(binding.referrer)) || {
          referrer: binding.referrer,
          feeUsdE18: 0n,
          feeEthWei: 0n,
          yieldUsdE18: 0n,
          yieldEthWei: 0n,
          marksPoints: 0n,
          lastUpdatedAt: 0,
        };

      const delta = BigInt(event.amount);
      if (delta <= 0n) continue;
      const share = (delta * BigInt(shareBps)) / 10000n;
      const next = {
        ...existing,
        marksPoints: existing.marksPoints + share,
        lastUpdatedAt: Date.now(),
      };
      await earningsStore.setReferrerTotals(next);
      processed += 1;
    }

    if (events.length < first) break;
    if (batches >= maxBatches) break;
  }

  if (cursor) await cursorStore.setCursor(cursorKey, cursor);
  return { fetched, processed, graphUrlUsed };
}

export async function reconcileMarksShareForUser(options: {
  referred: string;
  graphUrlOverride?: string;
  resetShare?: boolean;
}): Promise<{ updated: boolean; shareE18: string; graphUrlUsed: string }> {
  const referralStore = getReferralsStore();
  const earningsStore = getReferralEarningsStore();
  const metaStore = getReferralMetaStore();
  const settings = await referralStore.getSettings();
  const shareBps = Math.round(settings.referrerMarksSharePercent * 10000);

  const graphUrlUsed = options.graphUrlOverride || getGraphUrl();
  const total = await fetchUserTotalMarks(options.referred, options.graphUrlOverride);
  let totalE18 = total ? parseBigDecimalToE18(total.totalMarks) : 0n;
  if (totalE18 === 0n) {
    const breakdown = await fetchUserMarksBreakdown(
      options.referred,
      options.graphUrlOverride
    );
    if (breakdown) {
      const genesis = breakdown.userHarborMarks_collection || [];
      const ha = breakdown.haTokenBalances || [];
      const pools = breakdown.stabilityPoolDeposits || [];
      const sail = breakdown.sailTokenBalances || [];
      const metaTimestamp = await fetchMetaTimestamp(options.graphUrlOverride);
      const nowSec = metaTimestamp ?? Math.floor(Date.now() / 1000);
      let sum = 0n;
      for (const item of genesis) {
        if (item.genesisEnded) {
          sum += parseBigDecimalToE18(item.currentMarks);
        } else {
          sum += estimateMarksE18({
            accumulated: item.currentMarks,
            marksPerDay: item.marksPerDay,
            lastUpdated: item.lastUpdated,
            nowSec,
          });
        }
      }
      for (const item of ha) {
        sum += estimateMarksE18({
          accumulated: item.accumulatedMarks,
          marksPerDay: item.marksPerDay,
          lastUpdated: item.lastUpdated,
          nowSec,
        });
      }
      for (const item of pools) {
        sum += estimateMarksE18({
          accumulated: item.accumulatedMarks,
          marksPerDay: item.marksPerDay,
          lastUpdated: item.lastUpdated,
          nowSec,
        });
      }
      for (const item of sail) {
        sum += estimateMarksE18({
          accumulated: item.accumulatedMarks,
          marksPerDay: item.marksPerDay,
          lastUpdated: item.lastUpdated,
          nowSec,
        });
      }
      totalE18 = sum;
    }
  }
  if (totalE18 === 0n) {
    return { updated: false, shareE18: "0", graphUrlUsed };
  }

  const binding = await referralStore.getBinding(options.referred as any);
  if (!binding || binding.status !== "confirmed") {
    return { updated: false, shareE18: "0", graphUrlUsed };
  }

  const shareE18 = (totalE18 * BigInt(shareBps)) / 10000n;
  const metaKey = `marks:share:${options.referred.toLowerCase()}`;
  const previousRaw = await metaStore.getMeta(metaKey);
  const previous = previousRaw ? BigInt(previousRaw) : 0n;
  if (!options.resetShare && shareE18 <= previous) {
    return { updated: false, shareE18: shareE18.toString(), graphUrlUsed };
  }

  const existing =
    (await earningsStore.getReferrerTotals(binding.referrer)) || {
      referrer: binding.referrer,
      feeUsdE18: 0n,
      feeEthWei: 0n,
      yieldUsdE18: 0n,
      yieldEthWei: 0n,
      marksPoints: 0n,
      lastUpdatedAt: 0,
    };

  const nextMarks = options.resetShare
    ? shareE18
    : existing.marksPoints + (shareE18 - previous);
  const next = {
    ...existing,
    marksPoints: nextMarks < 0n ? 0n : nextMarks,
    lastUpdatedAt: Date.now(),
  };
  await earningsStore.setReferrerTotals(next);
  await metaStore.setMeta(metaKey, shareE18.toString());
  return { updated: true, shareE18: shareE18.toString(), graphUrlUsed };
}
