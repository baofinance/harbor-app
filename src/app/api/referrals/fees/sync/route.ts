export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getGraphHeaders, getGraphUrl, retryGraphQLQuery } from "@/config/graph";
import { getReferralSyncStore } from "@/lib/referralSyncStore";
import { recordReferralFee } from "@/lib/referralFeeRecorder";

type FeeEvent = {
  id: string;
  user: string;
  minterAddress: string;
  collateralIn?: string;
  peggedOut?: string;
  peggedIn?: string;
  leveragedOut?: string;
  leveragedBurned?: string;
  blockNumber: string;
  txHash: string;
};

const PEGGED_MINT_QUERY = `
  query AnchorMints($first: Int!, $after: ID) {
    anchorTokenMintEvents(first: $first, orderBy: id, orderDirection: asc, where: { id_gt: $after }) {
      id
      user
      minterAddress
      collateralIn
      peggedOut
      blockNumber
      txHash
    }
  }
`;

const PEGGED_REDEEM_QUERY = `
  query AnchorRedeems($first: Int!, $after: ID) {
    anchorTokenRedeemEvents(first: $first, orderBy: id, orderDirection: asc, where: { id_gt: $after }) {
      id
      user
      minterAddress
      peggedIn
      collateralOut
      blockNumber
      txHash
    }
  }
`;

const LEVERAGED_MINT_QUERY = `
  query SailMints($first: Int!, $after: ID) {
    sailTokenMintEvents(first: $first, orderBy: id, orderDirection: asc, where: { id_gt: $after }) {
      id
      user
      minterAddress
      collateralIn
      leveragedOut
      blockNumber
      txHash
    }
  }
`;

const LEVERAGED_REDEEM_QUERY = `
  query SailRedeems($first: Int!, $after: ID) {
    sailTokenRedeemEvents(first: $first, orderBy: id, orderDirection: asc, where: { id_gt: $after }) {
      id
      user
      minterAddress
      leveragedBurned
      collateralOut
      blockNumber
      txHash
    }
  }
`;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isCronRequest(req: Request) {
  return req.headers.get("x-vercel-cron") === "1";
}

async function fetchEvents(
  query: string,
  after: string | null,
  graphUrlOverride?: string
): Promise<FeeEvent[]> {
  const url = graphUrlOverride || getGraphUrl();
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
    return (await res.json()) as {
      data?: {
        anchorTokenMintEvents?: FeeEvent[];
        anchorTokenRedeemEvents?: FeeEvent[];
        sailTokenMintEvents?: FeeEvent[];
        sailTokenRedeemEvents?: FeeEvent[];
      };
    };
  });

  return (
    response.data?.anchorTokenMintEvents ||
    response.data?.anchorTokenRedeemEvents ||
    response.data?.sailTokenMintEvents ||
    response.data?.sailTokenRedeemEvents ||
    []
  );
}

async function syncEvents(options: {
  cursorKey: string;
  query: string;
  operation: "MINT_PEGGED" | "REDEEM_PEGGED" | "MINT_LEVERAGED" | "REDEEM_LEVERAGED";
  amountField: keyof FeeEvent;
  graphUrlOverride?: string;
}) {
  const store = getReferralSyncStore();
  let cursor = await store.getCursor(options.cursorKey);
  let processed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ id: string; message: string }> = [];

  while (true) {
    const events = await fetchEvents(options.query, cursor, options.graphUrlOverride);
    if (!events.length) break;

    for (const event of events) {
      cursor = event.id;
      const rawAmount = event[options.amountField];
      if (!rawAmount) {
        skipped += 1;
        continue;
      }
      try {
        const result = await recordReferralFee({
          user: event.user,
          txHash: event.txHash,
          minter: event.minterAddress,
          operation: options.operation,
          amount: BigInt(rawAmount),
          blockNumber: BigInt(event.blockNumber),
        });
        if (result.skipped) skipped += 1;
        else processed += 1;
      } catch (err: any) {
        failed += 1;
        if (errors.length < 10) {
          errors.push({
            id: event.id,
            message: err?.message || "Failed to record fee",
          });
        }
      }
    }

    if (events.length < 200) break;
  }

  if (cursor) await store.setCursor(options.cursorKey, cursor);
  return { processed, skipped, failed, errors };
}

export async function POST(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!isCronRequest(req) && (!adminKey || auth !== `Bearer ${adminKey}`)) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(req.url);
    const graphUrlOverride = (searchParams.get("graphUrl") || "").trim() || undefined;

    const peggedMints = await syncEvents({
      cursorKey: "fees:pegged:mints",
      query: PEGGED_MINT_QUERY,
      operation: "MINT_PEGGED",
      amountField: "collateralIn",
      graphUrlOverride,
    });
    const peggedRedeems = await syncEvents({
      cursorKey: "fees:pegged:redeems",
      query: PEGGED_REDEEM_QUERY,
      operation: "REDEEM_PEGGED",
      amountField: "peggedIn",
      graphUrlOverride,
    });
    const leveragedMints = await syncEvents({
      cursorKey: "fees:leveraged:mints",
      query: LEVERAGED_MINT_QUERY,
      operation: "MINT_LEVERAGED",
      amountField: "collateralIn",
      graphUrlOverride,
    });
    const leveragedRedeems = await syncEvents({
      cursorKey: "fees:leveraged:redeems",
      query: LEVERAGED_REDEEM_QUERY,
      operation: "REDEEM_LEVERAGED",
      amountField: "leveragedBurned",
      graphUrlOverride,
    });
    return NextResponse.json({
      peggedMints,
      peggedRedeems,
      leveragedMints,
      leveragedRedeems,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to sync referral fees" },
      { status: 500 }
    );
  }
}
