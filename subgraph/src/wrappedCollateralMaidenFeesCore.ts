import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  ethereum,
  store,
} from "@graphprotocol/graph-ts";
import { Minter } from "../generated/Minter_ETH_fxUSD/Minter";
import {
  BlockMaidenWrappedFeeDeferredRollup,
  MaidenWrappedFeeDeferred,
  RedeemPrincipalOutContext,
  TxMaidenWrappedFeeDeferredQueue,
} from "../generated/schema";
import { valueCollateralUsd } from "./minterCollateralUsd";
import { accrueMaidenVoyageMinterWrappedFeeUSD } from "./maidenVoyageYield";
import {
  consumePrincipalOutRemainder,
  redeemPrincipalContextId,
} from "./redeemPrincipalContext";
import {
  MINT_BTC_FXUSD,
  MINT_BTC_STETH,
  MINT_ETH_FXUSD,
  MINT_FXUSD_EUR,
  MINT_STETH_EUR,
} from "./maidenVoyageConfig";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
/** Sentinel for `processNextDeferredHead`: skip redeem log index filter (block-end flush). */
const DEFERRED_FEE_NO_LOG_CAP = BigInt.fromI32(-1);

/**
 * Wrapped `Transfer(minter -> feeReceiver())` often appears *before* `RedeemLeveragedToken` in the same
 * tx. Without redeem principal reservation, consumePrincipalOutRemainder treats the full transfer as a fee
 * (false positives when the fee receiver is an EOA that also receives full principal outflows).
 * Defer accrual until the redeem handler runs (same tx), or finalize at block end for mint-only txs.
 */

function queueKey(minter: Address, txHash: Bytes): string {
  return minter.toHexString().concat("::").concat(txHash.toHexString());
}

function deferredId(txHash: Bytes, logIndex: BigInt, minter: Address): string {
  return txHash.toHexString().concat("-").concat(logIndex.toString()).concat("-").concat(minter.toHexString());
}

function rollupId(blockNumber: BigInt): string {
  return blockNumber.toString();
}

function appendRollup(blockNumber: BigInt, queueKey: string, timestamp: BigInt): void {
  const id = rollupId(blockNumber);
  let rollup = BlockMaidenWrappedFeeDeferredRollup.load(id);
  if (rollup == null) {
    rollup = new BlockMaidenWrappedFeeDeferredRollup(id);
    rollup.queueIds = [];
    rollup.lastUpdated = timestamp;
  }
  const existing = rollup.queueIds;
  let found = false;
  for (let i = 0; i < existing.length; i++) {
    if (existing[i] == queueKey) {
      found = true;
      break;
    }
  }
  if (!found) {
    const next = new Array<string>(existing.length + 1);
    for (let j = 0; j < existing.length; j++) {
      next[j] = existing[j];
    }
    next[existing.length] = queueKey;
    rollup.queueIds = next;
  }
  rollup.lastUpdated = timestamp;
  rollup.save();
}

function deferMaidenWrappedFeeTransfer(
  minter: Address,
  feeReceiver: Address,
  txHash: Bytes,
  logIndex: BigInt,
  amount: BigInt,
  blockNumber: BigInt,
  timestamp: BigInt
): void {
  const qid = queueKey(minter, txHash);
  const did = deferredId(txHash, logIndex, minter);

  const d = new MaidenWrappedFeeDeferred(did);
  d.minter = minter;
  d.feeReceiver = feeReceiver;
  d.txHash = txHash;
  d.logIndex = logIndex;
  d.amount = amount;
  d.blockNumber = blockNumber;
  d.lastUpdated = timestamp;
  d.nextId = "";
  d.save();

  let q = TxMaidenWrappedFeeDeferredQueue.load(qid);
  if (q == null) {
    q = new TxMaidenWrappedFeeDeferredQueue(qid);
    q.headId = did;
    q.tailId = did;
  } else {
    const tail = MaidenWrappedFeeDeferred.load(q.tailId);
    if (tail != null) {
      tail.nextId = did;
      tail.save();
    }
    q.tailId = did;
  }
  q.lastUpdated = timestamp;
  q.save();

  appendRollup(blockNumber, qid, timestamp);
}

function accrueFeeWei(
  minter: Address,
  feeReceiver: Address,
  txHash: Bytes,
  feeWei: BigInt,
  timestamp: BigInt
): void {
  if (feeWei.equals(ZERO_BI)) return;
  const usd = valueCollateralUsd(minter, feeWei);
  if (usd.le(ZERO_BD)) return;
  accrueMaidenVoyageMinterWrappedFeeUSD(minter, usd, timestamp);
}

function processNextDeferredHead(
  queueId: string,
  timestamp: BigInt,
  maxExclusiveLogIndex: BigInt
): boolean {
  const q = TxMaidenWrappedFeeDeferredQueue.load(queueId);
  if (q == null || q.headId == "") return false;

  const d = MaidenWrappedFeeDeferred.load(q.headId);
  if (d == null) {
    store.remove("TxMaidenWrappedFeeDeferredQueue", queueId);
    return false;
  }
  if (
    !maxExclusiveLogIndex.equals(DEFERRED_FEE_NO_LOG_CAP) &&
    !d.logIndex.lt(maxExclusiveLogIndex)
  ) {
    return false;
  }

  const minter = changetype<Address>(d.minter);
  const feeRecv = changetype<Address>(d.feeReceiver);
  const txHash = d.txHash;
  const feeWei = consumePrincipalOutRemainder(
    minter,
    feeRecv,
    txHash,
    d.amount,
    timestamp
  );
  accrueFeeWei(minter, feeRecv, txHash, feeWei, timestamp);

  const nextId = d.nextId;
  store.remove("MaidenWrappedFeeDeferred", d.id);

  q.headId = nextId;
  if (nextId == "") {
    q.tailId = "";
  }
  q.lastUpdated = timestamp;
  q.save();

  if (q.headId == "") {
    store.remove("TxMaidenWrappedFeeDeferredQueue", queueId);
  }
  return true;
}

export function flushMaidenWrappedFeeDeferredQueueFully(
  queueId: string,
  timestamp: BigInt
): void {
  while (processNextDeferredHead(queueId, timestamp, DEFERRED_FEE_NO_LOG_CAP)) {}
}

export function handleMaidenWrappedFeeDeferredBlockEnd(block: ethereum.Block): void {
  const rid = rollupId(block.number);
  const rollup = BlockMaidenWrappedFeeDeferredRollup.load(rid);
  if (rollup == null) return;

  const ids = rollup.queueIds;
  for (let i = 0; i < ids.length; i++) {
    flushMaidenWrappedFeeDeferredQueueFully(ids[i], block.timestamp);
  }
  store.remove("BlockMaidenWrappedFeeDeferredRollup", rid);
}

function tryAccrueForMinter(
  minter: Address,
  from: Address,
  to: Address,
  amount: BigInt,
  txHash: Bytes,
  timestamp: BigInt,
  logIndex: BigInt,
  blockNumber: BigInt
): void {
  if (!from.equals(minter)) return;
  if (amount.equals(ZERO_BI)) return;
  const rec = Minter.bind(minter).try_feeReceiver();
  if (rec.reverted) return;
  if (!to.equals(rec.value)) return;

  const ctxKey = redeemPrincipalContextId(minter, to, txHash);
  const ctx = RedeemPrincipalOutContext.load(ctxKey);
  if (ctx == null) {
    deferMaidenWrappedFeeTransfer(minter, to, txHash, logIndex, amount, blockNumber, timestamp);
    return;
  }

  const feeAmount = consumePrincipalOutRemainder(minter, to, txHash, amount, timestamp);
  accrueFeeWei(minter, to, txHash, feeAmount, timestamp);
}

/** fxSAVE: ETH/fxUSD and BTC/fxUSD minters share this wrapped collateral token. */
export function accrueFromFxSaveTransfer(
  from: Address,
  to: Address,
  amount: BigInt,
  txHash: Bytes,
  timestamp: BigInt,
  logIndex: BigInt,
  blockNumber: BigInt
): void {
  tryAccrueForMinter(MINT_ETH_FXUSD, from, to, amount, txHash, timestamp, logIndex, blockNumber);
  tryAccrueForMinter(MINT_BTC_FXUSD, from, to, amount, txHash, timestamp, logIndex, blockNumber);
  tryAccrueForMinter(MINT_FXUSD_EUR, from, to, amount, txHash, timestamp, logIndex, blockNumber);
}

/** wstETH: BTC/stETH and EUR/stETH minters share this wrapped token. */
export function accrueFromWstEthTransfer(
  from: Address,
  to: Address,
  amount: BigInt,
  txHash: Bytes,
  timestamp: BigInt,
  logIndex: BigInt,
  blockNumber: BigInt
): void {
  tryAccrueForMinter(MINT_BTC_STETH, from, to, amount, txHash, timestamp, logIndex, blockNumber);
  tryAccrueForMinter(MINT_STETH_EUR, from, to, amount, txHash, timestamp, logIndex, blockNumber);
}
