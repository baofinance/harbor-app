import { applyBalanceChange, applyRateToPosition, computeBaseValue } from "@/lib/referralYield";
import { fetchEthUsdPrice, fetchFxSaveRate, fetchWstEthRate } from "@/lib/referralRates";
import { getReferralYieldStore } from "@/lib/referralYieldStore";
import { type YieldToken } from "@/lib/referralYield";
import { getReferralsStore } from "@/lib/referralsStore";
import { getReferralEarningsStore } from "@/lib/referralEarningsStore";

const E18 = 1000000000000000000n;
const E10 = 10000000000n;

export async function updateYieldPosition(params: {
  address: `0x${string}`;
  token: YieldToken;
  deltaWrapped: bigint;
  blockNumber?: bigint;
}) {
  const { address, token, deltaWrapped, blockNumber } = params;
  const store = getReferralYieldStore();
  const existing =
    (await store.getPosition(address, token)) ||
    ({
      user: address,
      token,
      wrappedBalance: 0n,
      lastRate: 0n,
      lastBaseValue: 0n,
      lastUpdatedBlock: 0n,
      lastUpdatedAt: 0,
    } as const);

  const snapshot =
    token === "fxSAVE"
      ? await fetchFxSaveRate(blockNumber)
      : await fetchWstEthRate(blockNumber);

  const blockNumberFinal = snapshot.blockNumber;
  const timestamp = snapshot.timestamp;

  const baseUpdated =
    existing.lastRate === 0n
      ? {
          position: {
            ...existing,
            lastRate: snapshot.rate,
            lastBaseValue: computeBaseValue(existing.wrappedBalance, snapshot.rate),
            lastUpdatedBlock: blockNumberFinal,
            lastUpdatedAt: timestamp,
          },
          accrual: null,
        }
      : applyRateToPosition(existing, snapshot.rate, blockNumberFinal, timestamp);

  const update = applyBalanceChange(
    baseUpdated.position,
    deltaWrapped,
    snapshot.rate,
    blockNumberFinal,
    timestamp
  );

  await store.setPosition(update.position);
  if (update.accrual) {
    await store.addAccrual(update.accrual);

    const referralStore = getReferralsStore();
    const binding = await referralStore.getBinding(address);
    if (binding && binding.status === "confirmed") {
      const settings = await referralStore.getSettings();
      const shareBps = Math.round(settings.referrerYieldSharePercent * 10000);
      const ethUsd = await fetchEthUsdPrice(blockNumber);
      const ethUsdE18 = ethUsd.price * E10;
      const usdE18 =
        update.accrual.token === "fxSAVE"
          ? update.accrual.deltaBase
          : (update.accrual.deltaBase * ethUsdE18) / E18;

      const shareUsdE18 = (usdE18 * BigInt(shareBps)) / 10000n;
      const shareEthWei = ethUsdE18 > 0n ? (shareUsdE18 * E18) / ethUsdE18 : 0n;

      const earnings = getReferralEarningsStore();
      const existing =
        (await earnings.getReferrerTotals(binding.referrer)) || {
          referrer: binding.referrer,
          feeUsdE18: 0n,
          feeEthWei: 0n,
          yieldUsdE18: 0n,
          yieldEthWei: 0n,
          marksPoints: 0n,
          lastUpdatedAt: 0,
        };
      const next = {
        ...existing,
        yieldUsdE18: existing.yieldUsdE18 + shareUsdE18,
        yieldEthWei: existing.yieldEthWei + shareEthWei,
        lastUpdatedAt: Date.now(),
      };
      await earnings.setReferrerTotals(next);
    }
  }

  return {
    position: update.position,
    accrual: update.accrual,
    snapshot,
  };
}
