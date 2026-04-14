import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Minter } from "../generated/Minter_ETH_fxUSD/Minter";
import { valueCollateralUsd } from "./minterPnL";
import { accrueMaidenVoyageMinterWrappedFeeUSD } from "./maidenVoyageYield";
import {
  MINT_BTC_FXUSD,
  MINT_BTC_STETH,
  MINT_ETH_FXUSD,
  MINT_FXUSD_EUR,
  MINT_STETH_EUR,
} from "./maidenVoyageConfig";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");

function tryAccrueForMinter(
  minter: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  timestamp: BigInt
): void {
  if (!from.equals(minter)) return;
  if (amount.equals(ZERO_BI)) return;
  const rec = Minter.bind(minter).try_feeReceiver();
  if (rec.reverted) return;
  if (!to.equals(rec.value)) return;
  const usd = valueCollateralUsd(minter, amount);
  if (usd.le(ZERO_BD)) return;
  accrueMaidenVoyageMinterWrappedFeeUSD(minter, usd, timestamp);
}

/** fxSAVE: ETH/fxUSD and BTC/fxUSD minters share this wrapped collateral token. */
export function accrueFromFxSaveTransfer(
  from: Address,
  to: Address,
  amount: BigInt,
  timestamp: BigInt
): void {
  tryAccrueForMinter(MINT_ETH_FXUSD, from, to, amount, timestamp);
  tryAccrueForMinter(MINT_BTC_FXUSD, from, to, amount, timestamp);
  tryAccrueForMinter(MINT_FXUSD_EUR, from, to, amount, timestamp);
}

/** wstETH: BTC/stETH and EUR/stETH minters share this wrapped token. */
export function accrueFromWstEthTransfer(
  from: Address,
  to: Address,
  amount: BigInt,
  timestamp: BigInt
): void {
  tryAccrueForMinter(MINT_BTC_STETH, from, to, amount, timestamp);
  tryAccrueForMinter(MINT_STETH_EUR, from, to, amount, timestamp);
}
