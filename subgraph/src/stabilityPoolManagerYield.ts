import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  Harvested,
  StabilityPoolManager,
} from "../generated/StabilityPoolManager_ETH_fxUSD/StabilityPoolManager";
import { StabilityPoolManagerHarvest } from "../generated/schema";
import { accrueMaidenVoyageCollateralYieldUSD } from "./maidenVoyageYield";
import { valueCollateralUsd } from "./minterCollateralUsd";

const ZERO_BD = BigDecimal.fromString("0");
const ZERO_BI = BigInt.fromI32(0);

export function handleStabilityPoolManagerHarvested(event: Harvested): void {
  const bound = StabilityPoolManager.bind(event.address);
  const minterRes = bound.try_MINTER();
  if (minterRes.reverted) return;

  const minter = minterRes.value;
  const amount = event.params.amount;
  if (amount.equals(ZERO_BI)) return;

  const usd = valueCollateralUsd(minter, amount);
  if (usd.le(ZERO_BD)) return;

  accrueMaidenVoyageCollateralYieldUSD(minter, usd, event.block.timestamp);

  const id = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString());
  const h = new StabilityPoolManagerHarvest(id);
  h.manager = event.address;
  h.minter = minter;
  h.amount = amount;
  h.amountUsd = usd;
  h.timestamp = event.block.timestamp;
  h.blockNumber = event.block.number;
  h.transactionHash = event.transaction.hash;
  h.save();
}
