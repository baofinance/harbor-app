import { calculateFeeFromDryRun, type FeeOperation } from "@/lib/referralFees";
import { getReferralsStore } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";
import { getWrappedTokenForMinter } from "@/lib/referralMarkets";
import { computeFeeUsdE18, usdE18ToEthWei } from "@/lib/referralFeeCalculator";
import { fetchEthUsdPrice } from "@/lib/referralRates";

export type ReferralFeeRecordResult = {
  fee: {
    wrappedFee: bigint;
    usdE18: bigint;
    ethWei: bigint;
    token: string;
  };
  rebate: {
    usdE18: bigint;
    ethWei: bigint;
    applied: boolean;
  };
  referrer: {
    address: string;
    feeUsdE18: bigint;
    feeEthWei: bigint;
  } | null;
  skipped: boolean;
  reason?: string;
};

export async function recordReferralFee(params: {
  user: string;
  txHash: string;
  minter: string;
  operation: FeeOperation;
  amount: bigint;
  blockNumber?: bigint;
}): Promise<ReferralFeeRecordResult> {
  const { user, txHash, minter, operation, amount, blockNumber } = params;

  const earningsStore = getReferralEarningsStore();
  const dedupeKey = `${txHash}:${operation}`;
  const fresh = await earningsStore.checkAndMarkFeeSeen(dedupeKey);
  if (!fresh) {
    return {
      fee: { wrappedFee: 0n, usdE18: 0n, ethWei: 0n, token: "" },
      rebate: { usdE18: 0n, ethWei: 0n, applied: false },
      referrer: null,
      skipped: true,
      reason: "duplicate",
    };
  }

  const token = getWrappedTokenForMinter(minter);
  if (!token) {
    return {
      fee: { wrappedFee: 0n, usdE18: 0n, ethWei: 0n, token: "" },
      rebate: { usdE18: 0n, ethWei: 0n, applied: false },
      referrer: null,
      skipped: true,
      reason: "unsupported-market",
    };
  }

  const feeResult = await calculateFeeFromDryRun({
    minter: minter as `0x${string}`,
    operation,
    amount,
    blockNumber,
  });

  const feeUsd = await computeFeeUsdE18({
    wrappedFee: feeResult.wrappedFee,
    token,
    blockNumber,
  });

  const ethUsd = await fetchEthUsdPrice(blockNumber);
  const ethUsdE18 = ethUsd.price * 10000000000n;
  const feeEthWei = usdE18ToEthWei({ usdE18: feeUsd.usdE18, ethUsdE18 });

  const referralStore = getReferralsStore();
  const settings = await referralStore.getSettings();
  let binding = await referralStore.getBinding(user as `0x${string}`);
  if (binding?.status === "pending_deposit") {
    binding = await referralStore.confirmBinding(user as `0x${string}`, txHash);
  }
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
      (await earningsStore.getRebateStatus(user as `0x${string}`)) || {
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

  return {
    fee: {
      wrappedFee: feeResult.wrappedFee,
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
  };
}
