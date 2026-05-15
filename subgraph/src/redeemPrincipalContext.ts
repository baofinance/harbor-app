import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { RedeemPrincipalOutContext } from "../generated/schema";

const ZERO_BI = BigInt.fromI32(0);

/** Public so wrapped-collateral fee handlers can align with redeem principal reservation. */
export function redeemPrincipalContextId(
  minter: Address,
  receiver: Address,
  txHash: Bytes
): string {
  return (
    minter.toHexString() + "-" + receiver.toHexString() + "-" + txHash.toHexString()
  );
}

export function addRedeemPrincipalOut(
  minter: Address,
  receiver: Address,
  txHash: Bytes,
  collateralOut: BigInt,
  timestamp: BigInt
): void {
  if (collateralOut.le(ZERO_BI)) return;
  const id = redeemPrincipalContextId(minter, receiver, txHash);
  let c = RedeemPrincipalOutContext.load(id);
  if (c == null) {
    c = new RedeemPrincipalOutContext(id);
    c.minter = minter;
    c.receiver = receiver;
    c.txHash = txHash;
    c.remainingCollateralOut = ZERO_BI;
    c.lastUpdated = timestamp;
  }
  c.remainingCollateralOut = c.remainingCollateralOut.plus(collateralOut);
  c.lastUpdated = timestamp;
  c.save();
}

/**
 * Consume known redeem principal amount for this tx/minter/receiver and return
 * the residual transfer amount that should be treated as fee.
 */
export function consumePrincipalOutRemainder(
  minter: Address,
  receiver: Address,
  txHash: Bytes,
  transferAmount: BigInt,
  timestamp: BigInt
): BigInt {
  if (transferAmount.le(ZERO_BI)) return ZERO_BI;
  const id = redeemPrincipalContextId(minter, receiver, txHash);
  const c = RedeemPrincipalOutContext.load(id);
  if (c == null || c.remainingCollateralOut.le(ZERO_BI)) return transferAmount;

  const principal = c.remainingCollateralOut;
  if (principal.ge(transferAmount)) {
    c.remainingCollateralOut = principal.minus(transferAmount);
    c.lastUpdated = timestamp;
    c.save();
    return ZERO_BI;
  }

  c.remainingCollateralOut = ZERO_BI;
  c.lastUpdated = timestamp;
  c.save();
  return transferAmount.minus(principal);
}
