export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { markets } from "@/config/contracts";
import { getGraphHeaders, getGraphUrl, retryGraphQLQuery } from "@/config/graph";
import { getReferralSyncStore } from "@/lib/referralSyncStore";
import { updateYieldPosition } from "@/lib/referralYieldService";

type DepositEvent = {
  id: string;
  user: string;
  amount: string;
  contractAddress: string;
  blockNumber: string;
  timestamp: string;
  txHash: string;
};

const FX_SAVE_ADDRESS = "0x7743e50f534a7f9f1791dde7dcd89f7783eefc39";
const WSTETH_ADDRESS = "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0";

const DEPOSIT_QUERY = `
  query Deposits($first: Int!, $after: ID) {
    deposits(first: $first, orderBy: id, orderDirection: asc, where: { id_gt: $after }) {
      id
      user
      amount
      contractAddress
      blockNumber
      timestamp
      txHash
    }
  }
`;

const WITHDRAW_QUERY = `
  query Withdrawals($first: Int!, $after: ID) {
    withdrawals(first: $first, orderBy: id, orderDirection: asc, where: { id_gt: $after }) {
      id
      user
      amount
      contractAddress
      blockNumber
      timestamp
      txHash
    }
  }
`;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getTokenForGenesisAddress(address: string) {
  const addr = address.toLowerCase();
  const values = Object.values(markets);
  for (const market of values) {
    const genesis = market.addresses.genesis.toLowerCase();
    if (genesis !== addr) continue;
    const wrapped = market.addresses.wrappedCollateralToken.toLowerCase();
    if (wrapped === FX_SAVE_ADDRESS) return "fxSAVE";
    if (wrapped === WSTETH_ADDRESS) return "wstETH";
    return null;
  }
  return null;
}

async function fetchEvents(
  query: string,
  after: string | null
): Promise<DepositEvent[]> {
  const url = getGraphUrl();
  const headers = getGraphHeaders(url);
  const body = JSON.stringify({
    query,
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
    return (await res.json()) as { data?: { deposits?: DepositEvent[]; withdrawals?: DepositEvent[] } };
  });

  return (response.data?.deposits || response.data?.withdrawals || []) as DepositEvent[];
}

async function syncEvents(options: {
  cursorKey: string;
  query: string;
  deltaSign: 1 | -1;
}) {
  const store = getReferralSyncStore();
  let cursor = await store.getCursor(options.cursorKey);
  let processed = 0;

  while (true) {
    const events = await fetchEvents(options.query, cursor);
    if (!events.length) break;

    for (const event of events) {
      cursor = event.id;
      const token = getTokenForGenesisAddress(event.contractAddress);
      if (!token) continue;
      const amount = BigInt(event.amount);
      const delta = options.deltaSign === 1 ? amount : -amount;
      await updateYieldPosition({
        address: event.user as `0x${string}`,
        token,
        deltaWrapped: delta,
        blockNumber: BigInt(event.blockNumber),
      });
      processed += 1;
    }

    if (events.length < 200) break;
  }

  if (cursor) await store.setCursor(options.cursorKey, cursor);
  return processed;
}

export async function POST(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const deposits = await syncEvents({
      cursorKey: "yield:genesis:deposits",
      query: DEPOSIT_QUERY,
      deltaSign: 1,
    });
    const withdrawals = await syncEvents({
      cursorKey: "yield:genesis:withdrawals",
      query: WITHDRAW_QUERY,
      deltaSign: -1,
    });
    return NextResponse.json({ deposits, withdrawals });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to sync yield positions" },
      { status: 500 }
    );
  }
}
