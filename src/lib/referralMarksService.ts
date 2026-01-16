import { getGraphHeaders, getGraphUrl, retryGraphQLQuery } from "@/config/graph";
import { getReferralsStore } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";
import { getReferralSyncStore } from "@/lib/referralSyncStore";

type MarksEvent = {
  id: string;
  user: string;
  amount: string;
  eventType: string;
  timestamp: string;
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

async function fetchMarksEvents(after: string | null): Promise<MarksEvent[]> {
  const url = getGraphUrl();
  const headers = getGraphHeaders(url);
  const body = JSON.stringify({
    query: MARKS_QUERY,
    variables: { first: 200, after },
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

export async function syncMarksShares(): Promise<{ processed: number }> {
  const cursorStore = getReferralSyncStore();
  const earningsStore = getReferralEarningsStore();
  const referralStore = getReferralsStore();
  const settings = await referralStore.getSettings();
  const shareBps = Math.round(settings.referrerMarksSharePercent * 10000);
  let cursor = await cursorStore.getCursor("marks:events");
  let processed = 0;

  while (true) {
    const events = await fetchMarksEvents(cursor);
    if (!events.length) break;

    for (const event of events) {
      cursor = event.id;
      if (event.eventType === "forfeit") continue;
      const binding = await referralStore.getBinding(event.user);
      if (!binding || binding.status !== "confirmed") {
        continue;
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

    if (events.length < 200) break;
  }

  if (cursor) await cursorStore.setCursor("marks:events", cursor);
  return { processed };
}
