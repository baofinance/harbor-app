import { fetchEthUsdPrice, fetchFxSaveRate, fetchWstEthRate } from "@/lib/referralRates";
import { type WrappedCollateralToken } from "@/lib/referralMarkets";

const E18 = 1000000000000000000n;
const E10 = 10000000000n;

export async function computeFeeUsdE18(params: {
  wrappedFee: bigint;
  token: WrappedCollateralToken;
  blockNumber?: bigint;
}) {
  const { wrappedFee, token, blockNumber } = params;
  if (token === "fxSAVE") {
    const snapshot = await fetchFxSaveRate(blockNumber);
    const usdE18 = (wrappedFee * snapshot.rate) / E18;
    return { usdE18, rateSnapshot: snapshot };
  }

  const rateSnapshot = await fetchWstEthRate(blockNumber);
  const ethPrice = await fetchEthUsdPrice(blockNumber);
  const ethUsdE18 = ethPrice.price * E10;
  const stEthAmount = (wrappedFee * rateSnapshot.rate) / E18;
  const usdE18 = (stEthAmount * ethUsdE18) / E18;
  return { usdE18, rateSnapshot, ethPrice };
}

export function usdE18ToEthWei(params: { usdE18: bigint; ethUsdE18: bigint }) {
  const { usdE18, ethUsdE18 } = params;
  if (ethUsdE18 <= 0n) return 0n;
  return (usdE18 * E18) / ethUsdE18;
}
