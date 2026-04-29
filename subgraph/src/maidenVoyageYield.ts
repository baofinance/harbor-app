import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { GenesisEnd, MaidenVoyageYieldGlobal } from "../generated/schema";
import {
  getGenesisForMinter,
  getMaidenVoyageYieldOwnerShareBps,
  isKnownMaidenVoyageGenesis,
} from "./maidenVoyageConfig";

const ZERO_BD = BigDecimal.fromString("0");
const BD_10000 = BigDecimal.fromString("10000");
const ZERO_ADDR = Address.fromString("0x0000000000000000000000000000000000000000");

/** Apply configurable owner share (bps) to USD before crediting the yield pool. */
function scaleUsdToYieldPool(genesis: Address, usd: BigDecimal): BigDecimal {
  if (usd.le(ZERO_BD)) return ZERO_BD;
  const bps = getMaidenVoyageYieldOwnerShareBps(genesis);
  if (bps.le(BigInt.fromI32(0))) return ZERO_BD;
  if (bps.equals(BigInt.fromI32(10000))) return usd;
  return usd.times(bps.toBigDecimal()).div(BD_10000);
}

function getOrCreateYieldGlobal(genesis: Address, timestamp: BigInt): MaidenVoyageYieldGlobal {
  const id = genesis.toHexString();
  let y = MaidenVoyageYieldGlobal.load(id);
  if (y == null) {
    y = new MaidenVoyageYieldGlobal(id);
    y.genesisAddress = genesis;
    y.cumulativeYieldUSD = ZERO_BD;
    y.cumulativeYieldFromCollateralUSD = ZERO_BD;
    y.cumulativeYieldFromMintFeesUSD = ZERO_BD;
    y.cumulativeYieldFromRedeemFeesUSD = ZERO_BD;
    y.cumulativeYieldFromMinterFeeTransfersUSD = ZERO_BD;
    y.lastUpdated = timestamp;
    y.save();
  }
  return y as MaidenVoyageYieldGlobal;
}

/**
 * Credit collateral yield USD (contract-native) into maiden voyage owner pool.
 * Source: `StabilityPoolManager.Harvested` (v1 ETH/BTC fxUSD + BTC/stETH) or hourly
 * `Minter.harvestable()` deltas in `minterPnL` for other minters.
 */
export function accrueMaidenVoyageCollateralYieldUSD(
  minterAddress: Address,
  collateralYieldUSD: BigDecimal,
  now: BigInt
): void {
  if (collateralYieldUSD.le(ZERO_BD)) return;
  const genesis = getGenesisForMinter(minterAddress);
  if (genesis.equals(ZERO_ADDR)) return;
  if (!isKnownMaidenVoyageGenesis(genesis)) return;

  const geId = genesis.toHexString();
  if (GenesisEnd.load(geId) == null) return;

  const allocated = scaleUsdToYieldPool(genesis, collateralYieldUSD);
  if (allocated.le(ZERO_BD)) return;

  const y = getOrCreateYieldGlobal(genesis, now);
  y.cumulativeYieldFromCollateralUSD = y.cumulativeYieldFromCollateralUSD.plus(allocated);
  y.cumulativeYieldUSD = y.cumulativeYieldUSD.plus(allocated);
  y.lastUpdated = now;
  y.save();
}

/**
 * Realized mint/redeem fees: wrapped collateral ERC20 Transfer(minter -> feeReceiver()).
 * Same pool counter regardless of mint vs redeem (distinguish via tx logs off-chain if needed).
 */
export function accrueMaidenVoyageMinterWrappedFeeUSD(
  minterAddress: Address,
  feeUSD: BigDecimal,
  now: BigInt
): void {
  if (feeUSD.le(ZERO_BD)) return;
  const genesis = getGenesisForMinter(minterAddress);
  if (genesis.equals(ZERO_ADDR)) return;
  if (!isKnownMaidenVoyageGenesis(genesis)) return;
  if (GenesisEnd.load(genesis.toHexString()) == null) return;

  const allocated = scaleUsdToYieldPool(genesis, feeUSD);
  if (allocated.le(ZERO_BD)) return;

  const y = getOrCreateYieldGlobal(genesis, now);
  y.cumulativeYieldFromMinterFeeTransfersUSD = y.cumulativeYieldFromMinterFeeTransfersUSD.plus(
    allocated
  );
  y.cumulativeYieldUSD = y.cumulativeYieldUSD.plus(allocated);
  y.lastUpdated = now;
  y.save();
}
