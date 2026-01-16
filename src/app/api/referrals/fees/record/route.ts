export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { calculateFeeFromDryRun, type FeeOperation } from "@/lib/referralFees";
import { getReferralsStore } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";
import { getWrappedTokenForMinter } from "@/lib/referralMarkets";
import { computeFeeUsdE18, usdE18ToEthWei } from "@/lib/referralFeeCalculator";
import { fetchEthUsdPrice } from "@/lib/referralRates";

const E18 = 1000000000000000000n;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const allowedOperations: FeeOperation[] = [
  "MINT_PEGGED",
  "MINT_LEVERAGED",
  "REDEEM_PEGGED",
  "REDEEM_LEVERAGED",
];

export async function POST(req: Request) {
  const adminKey = process.env.REFERRAL_ADMIN_KEY || "";
  const auth = req.headers.get("authorization") || "";
  if (!adminKey || auth !== `Bearer ${adminKey}`) {
    return jsonError("Unauthorized", 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const user = (body?.user || "").trim();
  const txHash = String(body?.txHash || "");
  const minter = (body?.minter || "").trim();
  const operation = body?.operation as FeeOperation;
  const amount = body?.amount;
  const blockNumber = body?.blockNumber ? BigInt(body.blockNumber) : undefined;

  if (!isAddress(user)) return jsonError("Invalid user address");
  if (!isAddress(minter)) return jsonError("Invalid minter address");
  if (!txHash) return jsonError("Missing txHash");
  if (!allowedOperations.includes(operation)) return jsonError("Invalid operation");
  if (amount === undefined || amount === null) {
    return jsonError("Missing amount");
  }

  let amountValue: bigint;
  try {
    amountValue = BigInt(amount);
  } catch {
    return jsonError("Invalid amount");
  }

  try {
    const earningsStore = getReferralEarningsStore();
    const dedupeKey = `${txHash}:${operation}`;
    const fresh = await earningsStore.checkAndMarkFeeSeen(dedupeKey);
    if (!fresh) {
      return NextResponse.json({ skipped: true, reason: "duplicate" });
    }

    const token = getWrappedTokenForMinter(minter);
    if (!token) {
      return jsonError("Unsupported market", 400);
    }

    const feeResult = await calculateFeeFromDryRun({
      minter,
      operation,
      amount: amountValue,
      blockNumber,
    });

    const wrappedFee = feeResult.wrappedFee;
    const feeUsd = await computeFeeUsdE18({
      wrappedFee,
      token,
      blockNumber,
    });

    const ethUsd = await fetchEthUsdPrice(blockNumber);
    const ethUsdE18 = ethUsd.price * 10000000000n;
    const feeEthWei = usdE18ToEthWei({ usdE18: feeUsd.usdE18, ethUsdE18 });

    const referralStore = getReferralsStore();
    const settings = await referralStore.getSettings();
    const binding = await referralStore.getBinding(user);
    const isReferred = !!binding && binding.status === "confirmed";

    const rebateMinUsdE18 = BigInt(Math.round(settings.rebateMinFeeUsd * 1e18));
    const rebateBps = Math.round(settings.rebatePercent * 10000);
    const referrerBps = Math.round(settings.referrerFeeSharePercent * 10000);

    let rebateUsdE18 = 0n;
    let rebateEthWei = 0n;
    let referrerUsdE18 = 0n;
    let referrerEthWei = 0n;
    let referrer: string | null = null;

    if (isReferred && binding) {
      referrer = binding.referrer;

      const existingRebate =
        (await earningsStore.getRebateStatus(user)) || {
          user,
          usedCount: 0,
          totalUsdE18: 0n,
          totalEthWei: 0n,
          lastUpdatedAt: 0,
        };

      const eligibleForRebate =
        feeUsd.usdE18 >= rebateMinUsdE18 &&
        existingRebate.usedCount < settings.rebateMaxFees;

      if (eligibleForRebate) {
        rebateUsdE18 = (feeUsd.usdE18 * BigInt(rebateBps)) / 10000n;
        rebateEthWei = usdE18ToEthWei({ usdE18: rebateUsdE18, ethUsdE18 });
        const nextRebate = {
          ...existingRebate,
          usedCount: existingRebate.usedCount + 1,
          totalUsdE18: existingRebate.totalUsdE18 + rebateUsdE18,
          totalEthWei: existingRebate.totalEthWei + rebateEthWei,
          lastUpdatedAt: Date.now(),
        };
        await earningsStore.setRebateStatus(nextRebate);
      }

      referrerUsdE18 = (feeUsd.usdE18 * BigInt(referrerBps)) / 10000n;
      referrerEthWei = usdE18ToEthWei({ usdE18: referrerUsdE18, ethUsdE18 });

      const existingReferrer =
        (await earningsStore.getReferrerTotals(binding.referrer)) || {
          referrer: binding.referrer,
          feeUsdE18: 0n,
          feeEthWei: 0n,
          yieldUsdE18: 0n,
          yieldEthWei: 0n,
          marksPoints: 0n,
          lastUpdatedAt: 0,
        };
      const nextReferrer = {
        ...existingReferrer,
        feeUsdE18: existingReferrer.feeUsdE18 + referrerUsdE18,
        feeEthWei: existingReferrer.feeEthWei + referrerEthWei,
        lastUpdatedAt: Date.now(),
      };
      await earningsStore.setReferrerTotals(nextReferrer);
    }

    return NextResponse.json({
      fee: {
        wrappedFee,
        usdE18: feeUsd.usdE18,
        ethWei: feeEthWei,
        token,
      },
      rebate: {
        usdE18: rebateUsdE18,
        ethWei: rebateEthWei,
        applied: rebateUsdE18 > 0n,
      },
      referrer: referrer
        ? {
            address: referrer,
            feeUsdE18: referrerUsdE18,
            feeEthWei: referrerEthWei,
          }
        : null,
      skipped: false,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to record referral fee" },
      { status: 500 }
    );
  }
}
