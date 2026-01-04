import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  dataSource,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  MintLeveragedToken,
  RedeemLeveragedToken,
  Minter,
} from "../generated/Minter_ETH_fxUSD/Minter";
import { WrappedPriceOracle } from "../generated/Minter_ETH_fxUSD/WrappedPriceOracle";
import { ChainlinkAggregator } from "../generated/Minter_ETH_fxUSD/ChainlinkAggregator";
import { ERC20 } from "../generated/Minter_ETH_fxUSD/ERC20";
import {
  UserSailPosition,
  CostBasisLot,
  SailTokenMintEvent,
  SailTokenRedeemEvent,
  SailTokenPricePoint,
  HourlyPriceSnapshot,
  PriceTracker,
  MinterHourlyTracker,
  SailGenesisUser,
} from "../generated/schema";
import { Genesis } from "../generated/SailGenesis_ETH_fxUSD/Genesis";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const E18_BD = BigDecimal.fromString("1000000000000000000");
const ONE = BigDecimal.fromString("1");

// Chainlink (mainnet) - 8 decimals
const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");
const CHAINLINK_1E8 = BigDecimal.fromString("100000000");
const HOUR_SECONDS = BigInt.fromI32(3600);

function toE18(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(E18_BD);
}

function isFxUsdMinter(minter: Address): boolean {
  // Markets where wrapped collateral is fxSAVE and oracle uses getPrice() (fxSAVE price in ETH).
  // Production
  if (minter.equals(Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F"))) return true; // ETH/fxUSD
  if (minter.equals(Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888"))) return true; // BTC/fxUSD
  // Test2
  if (minter.equals(Address.fromString("0x565f90dc7c022e7857734352c7bf645852d8d4e7"))) return true; // ETH/fxUSD test2
  if (minter.equals(Address.fromString("0x7ffe3acb524fb40207709ba597d39c085d258f15"))) return true; // BTC/fxUSD test2
  return false;
}

function isEthPegged(minter: Address): boolean {
  // Production
  if (minter.equals(Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F"))) return true; // ETH/fxUSD
  // Test2
  if (minter.equals(Address.fromString("0x565f90dc7c022e7857734352c7bf645852d8d4e7"))) return true; // ETH/fxUSD test2
  return false;
}

function isBtcPegged(minter: Address): boolean {
  // Production
  if (minter.equals(Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888"))) return true; // BTC/fxUSD
  if (minter.equals(Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919"))) return true; // BTC/stETH
  // Test2
  if (minter.equals(Address.fromString("0x7ffe3acb524fb40207709ba597d39c085d258f15"))) return true; // BTC/fxUSD test2
  if (minter.equals(Address.fromString("0x042e7cb5b993312490ea07fb89f360a65b8a9056"))) return true; // BTC/stETH test2
  return false;
}

function peggedUsdPrice(): BigDecimal {
  // Default to $1 if unknown.
  return ONE;
}

function peggedUsdPriceFromChainlink(feed: Address): BigDecimal {
  const agg = ChainlinkAggregator.bind(feed);
  const ans = agg.try_latestAnswer();
  if (ans.reverted) return ONE;
  // latestAnswer is int256 but graph-ts exposes BigInt; assume positive.
  return ans.value.toBigDecimal().div(CHAINLINK_1E8);
}

function getPegUsdForMinter(minterAddress: Address): BigDecimal {
  if (isEthPegged(minterAddress)) return peggedUsdPriceFromChainlink(ETH_USD_FEED);
  if (isBtcPegged(minterAddress)) return peggedUsdPriceFromChainlink(BTC_USD_FEED);
  return peggedUsdPrice();
}

/**
 * Read oracle data and return:
 * - underlyingPriceUSD (maxUnderlyingPrice * pegUsd)
 * - wrappedRate (maxWrappedRate)
 * - wrappedCollateralUsd (underlyingPriceUSD * wrappedRate)
 */
function getOraclePricesForMinter(minterAddress: Address): BigDecimal[] {
  const minter = Minter.bind(minterAddress);
  const oracleAddrRes = minter.try_PRICE_ORACLE();
  if (oracleAddrRes.reverted) return [ZERO_BD, ZERO_BD, ZERO_BD];

  const oracle = WrappedPriceOracle.bind(oracleAddrRes.value);

  // fxUSD markets: oracle.getPrice() returns fxSAVE price in ETH (1e18).
  // Convert to USD using ETH/USD Chainlink, and treat wrappedRate as 1.
  if (isFxUsdMinter(minterAddress)) {
    const priceRes = oracle.try_getPrice();
    if (priceRes.reverted) return [ZERO_BD, ZERO_BD, ZERO_BD];
    const fxSavePriceEth = toE18(priceRes.value);
    if (fxSavePriceEth.equals(ZERO_BD)) return [ZERO_BD, ZERO_BD, ZERO_BD];
    const ethUsd = peggedUsdPriceFromChainlink(ETH_USD_FEED);
    const fxSavePriceUsd = fxSavePriceEth.times(ethUsd);
    return [fxSavePriceUsd, ONE, fxSavePriceUsd];
  }

  const ans = oracle.try_latestAnswer();
  if (ans.reverted) return [ZERO_BD, ZERO_BD, ZERO_BD];

  const maxUnderlyingPrice = toE18(ans.value.value1);
  const maxWrappedRate = toE18(ans.value.value3);
  if (maxUnderlyingPrice.equals(ZERO_BD)) return [ZERO_BD, ZERO_BD, ZERO_BD];
  if (maxWrappedRate.equals(ZERO_BD)) return [ZERO_BD, ZERO_BD, ZERO_BD];

  const pegUsd = getPegUsdForMinter(minterAddress);
  const underlyingPriceUSD = maxUnderlyingPrice.times(pegUsd);
  const wrappedCollateralUsd = underlyingPriceUSD.times(maxWrappedRate);
  return [underlyingPriceUSD, maxWrappedRate, wrappedCollateralUsd];
}

function getOrCreatePriceTracker(token: Address, minter: Address, oracle: Address): PriceTracker {
  const id = token.toHexString();
  let tracker = PriceTracker.load(id);
  if (tracker == null) {
    tracker = new PriceTracker(id);
    tracker.tokenAddress = token;
    tracker.minterAddress = minter;
    tracker.oracleAddress = oracle;
    tracker.lastPriceTimestamp = ZERO_BI;
    tracker.lastHourlySnapshot = ZERO_BI;
    tracker.lastBlockNumber = ZERO_BI;
    tracker.save();
  }
  return tracker;
}

function safeOracleAddress(minterAddress: Address): Address {
  const minter = Minter.bind(minterAddress);
  const oracleAddrRes = minter.try_PRICE_ORACLE();
  if (oracleAddrRes.reverted) return Address.zero();
  return oracleAddrRes.value;
}

function maybeWriteHourlySnapshot(
  token: Address,
  minterAddress: Address,
  timestamp: BigInt,
  blockNumber: BigInt,
  tokenPriceUSD: BigDecimal,
  collateralPriceUSD: BigDecimal,
  wrappedRate: BigDecimal
): void {
  const hourTs = timestamp.div(HOUR_SECONDS).times(HOUR_SECONDS);
  // IMPORTANT: Some minter deployments don't expose PRICE_ORACLE() (or it reverts).
  // Hourly snapshots should still be written using the already-computed prices.
  const tracker = getOrCreatePriceTracker(token, minterAddress, safeOracleAddress(minterAddress));
  if (!tracker.lastHourlySnapshot.lt(hourTs)) return;

  const snapshotId = token.toHexString() + "-" + hourTs.toString();
  let snapshot = HourlyPriceSnapshot.load(snapshotId);
  if (snapshot == null) {
    snapshot = new HourlyPriceSnapshot(snapshotId);
    snapshot.tokenAddress = token;
    snapshot.minterAddress = minterAddress;
    snapshot.hourTimestamp = hourTs;
    snapshot.blockNumber = blockNumber;
  }

  const minter = Minter.bind(minterAddress);
  const totalSupplyRes = ERC20.bind(token).try_totalSupply();
  const collateralBalRes = minter.try_collateralTokenBalance();
  const levRes = minter.try_leverageRatio();
  const crRes = minter.try_collateralRatio();

  snapshot.tokenPriceUSD = tokenPriceUSD;
  snapshot.collateralPriceUSD = collateralPriceUSD;
  snapshot.wrappedRate = wrappedRate;
  snapshot.totalSupply = totalSupplyRes.reverted ? ZERO_BI : totalSupplyRes.value;
  snapshot.collateralBalance = collateralBalRes.reverted ? ZERO_BI : collateralBalRes.value;
  snapshot.leverageRatio = levRes.reverted ? ZERO_BI : levRes.value;
  snapshot.collateralRatio = crRes.reverted ? ZERO_BI : crRes.value;
  snapshot.save();

  tracker.lastHourlySnapshot = hourTs;
  tracker.lastBlockNumber = blockNumber;
  tracker.save();
}

function getOrCreateMinterHourlyTracker(minterAddress: Address): MinterHourlyTracker {
  const id = minterAddress.toHexString();
  let t = MinterHourlyTracker.load(id);
  if (t == null) {
    const minter = Minter.bind(minterAddress);
    const tokenRes = minter.try_LEVERAGED_TOKEN();
    if (tokenRes.reverted) return null as MinterHourlyTracker;

    t = new MinterHourlyTracker(id);
    t.minterAddress = minterAddress;
    t.tokenAddress = tokenRes.value;
    t.lastHourTimestamp = ZERO_BI;
    t.save();
  }
  return t as MinterHourlyTracker;
}

function getGenesisAddressForMinter(minter: Address): Address {
  // Production
  if (minter.equals(Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F"))) {
    return Address.fromString("0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc"); // ETH/fxUSD
  }
  if (minter.equals(Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888"))) {
    return Address.fromString("0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c"); // BTC/fxUSD
  }
  if (minter.equals(Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919"))) {
    return Address.fromString("0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00"); // BTC/stETH
  }

  // Test2
  if (minter.equals(Address.fromString("0x565f90dc7c022e7857734352c7bf645852d8d4e7"))) {
    return Address.fromString("0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073"); // ETH/fxUSD test2
  }
  if (minter.equals(Address.fromString("0x7ffe3acb524fb40207709ba597d39c085d258f15"))) {
    return Address.fromString("0x288c61c3b3684ff21adf38d878c81457b19bd2fe"); // BTC/fxUSD test2
  }
  if (minter.equals(Address.fromString("0x042e7cb5b993312490ea07fb89f360a65b8a9056"))) {
    return Address.fromString("0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0"); // BTC/stETH test2
  }
  return Address.zero();
}

function hasGenesisLot(positionId: string): boolean {
  let i = 0;
  while (true) {
    const lotId = positionId + "-" + i.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot == null) break;
    if (lot.eventType.indexOf("genesis") == 0 && !lot.isFullyRedeemed) return true;
    i++;
    if (i > 4000) break;
  }
  return false;
}

function createGenesisLot(
  position: UserSailPosition,
  tokenAmount: BigInt,
  costUSD: BigDecimal,
  timestamp: BigInt,
  blockNumber: BigInt,
  txHash: Bytes
): void {
  const idx = countLots(position.id);
  const lotId = position.id + "-" + idx.toString();
  const lot = new CostBasisLot(lotId);
  lot.position = position.id;
  lot.lotIndex = idx;
  lot.tokenAmount = tokenAmount;
  lot.originalAmount = tokenAmount;
  lot.costUSD = costUSD;
  lot.originalCostUSD = costUSD;
  const tokenDec = toE18(tokenAmount);
  lot.pricePerToken = tokenDec.gt(ZERO_BD) ? costUSD.div(tokenDec) : ZERO_BD;
  lot.eventType = "genesis";
  lot.timestamp = timestamp;
  lot.blockNumber = blockNumber;
  lot.txHash = txHash;
  lot.isFullyRedeemed = false;
  lot.save();
}

function maybeApplyGenesisCostBasis(
  minterAddress: Address,
  token: Address,
  user: Address,
  timestamp: BigInt,
  blockNumber: BigInt,
  txHash: Bytes
): void {
  const genesisAddress = getGenesisAddressForMinter(minterAddress);
  if (genesisAddress.equals(Address.zero())) return;

  // Genesis deposit tracking is handled in genesisPnL.ts via Deposit/Withdraw events.
  const guId = genesisAddress.toHexString() + "-" + user.toHexString();
  const gu = SailGenesisUser.load(guId);
  if (gu == null) return;
  if (gu.netDepositUSD.le(ZERO_BD)) return;

  const position = getOrCreateUserPosition(token, user);
  if (hasGenesisLot(position.id)) return;

  // Read claimable leveraged amount once genesis has ended. If it's 0, just skip.
  const genesis = Genesis.bind(genesisAddress);
  const claimableRes = genesis.try_claimable(user);
  if (claimableRes.reverted) return;
  const leveragedAmount = claimableRes.value.getLeveragedAmount();
  if (leveragedAmount.le(ZERO_BI)) return;

  // Cost basis for hs tokens is 50% of genesis net deposit USD.
  const costUSD = gu.netDepositUSD.times(BigDecimal.fromString("0.5"));
  if (position.firstAcquiredAt.equals(ZERO_BI)) {
    position.firstAcquiredAt = timestamp;
  }
  createGenesisLot(position, leveragedAmount, costUSD, timestamp, blockNumber, txHash);
  position.totalTokensBought = position.totalTokensBought.plus(leveragedAmount);
  position.totalSpentUSD = position.totalSpentUSD.plus(costUSD);
  updateAggregates(position);
  position.lastUpdated = timestamp;
  position.save();
}

export function handleBlock(block: ethereum.Block): void {
  const minterAddress = dataSource.address();
  const hourTs = block.timestamp.div(HOUR_SECONDS).times(HOUR_SECONDS);

  let mt = MinterHourlyTracker.load(minterAddress.toHexString());
  if (mt != null && !mt.lastHourTimestamp.lt(hourTs)) {
    return;
  }

  mt = getOrCreateMinterHourlyTracker(minterAddress);
  if (mt == null) return;

  mt.lastHourTimestamp = hourTs;
  mt.save();

  const minter = Minter.bind(minterAddress);
  const token = Address.fromBytes(mt.tokenAddress);

  const oraclePrices = getOraclePricesForMinter(minterAddress);
  let collateralPriceUSD = oraclePrices[0];
  let wrappedRate = oraclePrices[1];
  let wrappedCollateralUsd = oraclePrices[2];

  const pegUsd = getPegUsdForMinter(minterAddress);
  const navRes = minter.try_leveragedTokenPrice();
  const tokenPriceUSD_fromPeg = navRes.reverted ? ZERO_BD : toE18(navRes.value).times(pegUsd);

  let tokenPriceUSD = navRes.reverted ? ZERO_BD : toE18(navRes.value).times(wrappedCollateralUsd);
  if (tokenPriceUSD.equals(ZERO_BD) && !tokenPriceUSD_fromPeg.equals(ZERO_BD)) {
    tokenPriceUSD = tokenPriceUSD_fromPeg;
  }

  if (collateralPriceUSD.equals(ZERO_BD)) collateralPriceUSD = pegUsd;
  if (wrappedRate.equals(ZERO_BD)) wrappedRate = ONE;

  // Only write if we have a non-zero token price.
  if (tokenPriceUSD.equals(ZERO_BD)) return;

  maybeWriteHourlySnapshot(
    token,
    minterAddress,
    block.timestamp,
    block.number,
    tokenPriceUSD,
    collateralPriceUSD,
    wrappedRate
  );
}

/**
 * Value a wrapped-collateral amount in USD using the market oracle.
 * Oracle.latestAnswer() returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate) in 1e18.
 *
 * We treat:
 * - maxUnderlyingPrice: price in peg units (ETH/BTC/USD depending on market)
 * - maxWrappedRate: conversion factor
 *
 * wrappedTokenUsd = maxUnderlyingPrice * maxWrappedRate * pegUsd
 */
function valueCollateralUsd(
  minterAddress: Address,
  collateralAmount: BigInt
): BigDecimal {
  if (collateralAmount.equals(ZERO_BI)) return ZERO_BD;

  const minter = Minter.bind(minterAddress);
  const oracleAddrRes = minter.try_PRICE_ORACLE();
  if (oracleAddrRes.reverted) return ZERO_BD;
  const oracle = WrappedPriceOracle.bind(oracleAddrRes.value);

  // fxUSD markets: value directly from getPrice() (fxSAVE price in ETH).
  if (isFxUsdMinter(minterAddress)) {
    const priceRes = oracle.try_getPrice();
    if (priceRes.reverted) return ZERO_BD;
    const fxSavePriceEth = toE18(priceRes.value);
    if (fxSavePriceEth.equals(ZERO_BD)) return ZERO_BD;
    const ethUsd = peggedUsdPriceFromChainlink(ETH_USD_FEED);
    const fxSavePriceUsd = fxSavePriceEth.times(ethUsd);
    const amountDec = toE18(collateralAmount);
    return amountDec.times(fxSavePriceUsd);
  }

  const ans = oracle.try_latestAnswer();
  if (ans.reverted) return ZERO_BD;

  const maxUnderlyingPrice = toE18(ans.value.value1);
  const maxWrappedRate = toE18(ans.value.value3);
  if (maxUnderlyingPrice.equals(ZERO_BD)) return ZERO_BD;
  if (maxWrappedRate.equals(ZERO_BD)) return ZERO_BD;

  const pegUsd = getPegUsdForMinter(minterAddress);
  // (amount * price * rate * pegUsd)
  const amountDec = toE18(collateralAmount);
  return amountDec.times(maxUnderlyingPrice).times(maxWrappedRate).times(pegUsd);
}

function getOrCreateUserPosition(token: Address, user: Address): UserSailPosition {
  const id = token.toHexString() + "-" + user.toHexString();
  let p = UserSailPosition.load(id);
  if (p == null) {
    p = new UserSailPosition(id);
    p.tokenAddress = token;
    p.user = user;
    p.balance = ZERO_BI;
    p.balanceUSD = ZERO_BD;
    p.totalCostBasisUSD = ZERO_BD;
    p.averageCostPerToken = ZERO_BD;
    p.realizedPnLUSD = ZERO_BD;
    p.totalTokensBought = ZERO_BI;
    p.totalTokensSold = ZERO_BI;
    p.totalSpentUSD = ZERO_BD;
    p.totalReceivedUSD = ZERO_BD;
    p.firstAcquiredAt = ZERO_BI;
    p.lastUpdated = ZERO_BI;
    p.save();
  }
  return p;
}

function countLots(positionId: string): i32 {
  let count = 0;
  while (true) {
    const lotId = positionId + "-" + count.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot == null) break;
    count++;
  }
  return count;
}

function createLot(
  position: UserSailPosition,
  tokenAmount: BigInt,
  costUSD: BigDecimal,
  timestamp: BigInt,
  blockNumber: BigInt,
  txHash: Bytes
): void {
  const idx = countLots(position.id);
  const lotId = position.id + "-" + idx.toString();

  const lot = new CostBasisLot(lotId);
  lot.position = position.id;
  lot.lotIndex = idx;
  lot.tokenAmount = tokenAmount;
  lot.originalAmount = tokenAmount;
  lot.costUSD = costUSD;
  lot.originalCostUSD = costUSD;

  const tokenDec = toE18(tokenAmount);
  lot.pricePerToken = tokenDec.gt(ZERO_BD) ? costUSD.div(tokenDec) : ZERO_BD;
  lot.eventType = "mint";
  lot.timestamp = timestamp;
  lot.blockNumber = blockNumber;
  lot.txHash = txHash;
  lot.isFullyRedeemed = false;
  lot.save();
}

function updateAggregates(position: UserSailPosition): void {
  let totalCost = ZERO_BD;
  let totalTokens = ZERO_BI;
  let i = 0;
  while (true) {
    const lotId = position.id + "-" + i.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot == null) break;
    if (!lot.isFullyRedeemed) {
      totalCost = totalCost.plus(lot.costUSD);
      totalTokens = totalTokens.plus(lot.tokenAmount);
    }
    i++;
  }

  position.balance = totalTokens;
  position.totalCostBasisUSD = totalCost;
  const tokenDec = toE18(totalTokens);
  position.averageCostPerToken = tokenDec.gt(ZERO_BD) ? totalCost.div(tokenDec) : ZERO_BD;
}

function processRedemptionFIFO(position: UserSailPosition, tokensToRedeem: BigInt): BigDecimal {
  let remaining = tokensToRedeem;
  let totalCost = ZERO_BD;
  let i = 0;

  while (remaining.gt(ZERO_BI)) {
    const lotId = position.id + "-" + i.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot == null) break;
    if (lot.isFullyRedeemed) {
      i++;
      continue;
    }

    if (lot.tokenAmount.le(remaining)) {
      totalCost = totalCost.plus(lot.costUSD);
      remaining = remaining.minus(lot.tokenAmount);
      lot.tokenAmount = ZERO_BI;
      lot.costUSD = ZERO_BD;
      lot.isFullyRedeemed = true;
      lot.save();
    } else {
      const fraction = remaining.toBigDecimal().div(lot.tokenAmount.toBigDecimal());
      const costUsed = lot.costUSD.times(fraction);
      totalCost = totalCost.plus(costUsed);
      lot.tokenAmount = lot.tokenAmount.minus(remaining);
      lot.costUSD = lot.costUSD.minus(costUsed);
      lot.save();
      remaining = ZERO_BI;
    }
    i++;
  }

  return totalCost;
}

export function handleMintLeveragedToken(event: MintLeveragedToken): void {
  const minterAddress = event.address;
  const minter = Minter.bind(minterAddress);

  const tokenRes = minter.try_LEVERAGED_TOKEN();
  if (tokenRes.reverted) return;
  const token = tokenRes.value;

  const receiver = event.params.receiver;
  const collateralIn = event.params.collateralIn;
  const leveragedOut = event.params.leveragedOut;

  // Primary: value collateral using oracle path (may be unavailable/zero on some markets).
  let collateralValueUSD = valueCollateralUsd(minterAddress, collateralIn);

  const oraclePrices = getOraclePricesForMinter(minterAddress);
  let collateralPriceUSD = oraclePrices[0];
  let wrappedRate = oraclePrices[1];
  let wrappedCollateralUsd = oraclePrices[2];

  // Fallback token price: minter.leveragedTokenPrice() is denominated in the peg target (ETH/BTC/USD).
  // Convert to USD using Chainlink peg price. This path is what the frontend uses and should be robust.
  const pegUsd = getPegUsdForMinter(minterAddress);
  const navRes = minter.try_leveragedTokenPrice();
  const tokenPriceUSD_fromPeg = navRes.reverted ? ZERO_BD : toE18(navRes.value).times(pegUsd);

  // Existing tokenPriceUSD (oracle-based) may be zero; prefer non-zero.
  let tokenPriceUSD = navRes.reverted ? ZERO_BD : toE18(navRes.value).times(wrappedCollateralUsd);
  if (tokenPriceUSD.equals(ZERO_BD) && !tokenPriceUSD_fromPeg.equals(ZERO_BD)) {
    tokenPriceUSD = tokenPriceUSD_fromPeg;
  }

  // If oracle-based collateral valuation failed, approximate collateralValueUSD from tokens minted * tokenPriceUSD.
  const outDec = toE18(leveragedOut);
  if (collateralValueUSD.equals(ZERO_BD) && !tokenPriceUSD.equals(ZERO_BD) && outDec.gt(ZERO_BD)) {
    collateralValueUSD = outDec.times(tokenPriceUSD);
  }

  // If oraclePrices are missing, fill reasonable defaults so charts/snapshots aren't blocked.
  if (collateralPriceUSD.equals(ZERO_BD)) collateralPriceUSD = pegUsd;
  if (wrappedRate.equals(ZERO_BD)) wrappedRate = ONE;
  if (wrappedCollateralUsd.equals(ZERO_BD)) wrappedCollateralUsd = collateralPriceUSD.times(wrappedRate);

  const mintId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const mint = new SailTokenMintEvent(mintId);
  mint.tokenAddress = token;
  mint.minterAddress = minterAddress;
  mint.user = receiver;
  mint.collateralIn = collateralIn;
  // Note: Some deployed Minter versions emit MintLeveragedToken(sender, receiver, collateralIn, leveragedOut)
  // without a feeIn parameter. We store feeIn as 0 in that case.
  mint.feeIn = ZERO_BI;
  mint.leveragedOut = leveragedOut;
  mint.collateralValueUSD = collateralValueUSD;
  // tokenValueUSD can be approximated as collateralValueUSD on mint; pricePerToken derived below.
  mint.tokenValueUSD = collateralValueUSD;
  mint.pricePerToken = outDec.gt(ZERO_BD) ? collateralValueUSD.div(outDec) : ZERO_BD;
  mint.timestamp = event.block.timestamp;
  mint.blockNumber = event.block.number;
  mint.txHash = event.transaction.hash;
  mint.save();

  // Write SailTokenPricePoint for charts
  const pricePointId =
    token.toHexString() + "-" + event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const pp = new SailTokenPricePoint(pricePointId);
  pp.tokenAddress = token;
  pp.minterAddress = minterAddress;
  pp.blockNumber = event.block.number;
  pp.timestamp = event.block.timestamp;
  pp.txHash = event.transaction.hash;
  pp.tokenPriceUSD = tokenPriceUSD;
  pp.collateralPriceUSD = collateralPriceUSD;
  pp.wrappedRate = wrappedRate;
  pp.eventType = "mint";
  pp.collateralAmount = collateralIn;
  pp.tokenAmount = leveragedOut;
  pp.impliedTokenPrice = mint.pricePerToken;
  pp.save();

  // Write hourly snapshot (best-effort) for continuous charts
  if (!tokenPriceUSD.equals(ZERO_BD) && !collateralPriceUSD.equals(ZERO_BD) && !wrappedRate.equals(ZERO_BD)) {
    maybeWriteHourlySnapshot(
      token,
      minterAddress,
      event.block.timestamp,
      event.block.number,
      tokenPriceUSD,
      collateralPriceUSD,
      wrappedRate
    );
  }

  // Apply genesis cost basis lazily (in case endGenesis event/call isn't indexed).
  maybeApplyGenesisCostBasis(
    minterAddress,
    token,
    receiver,
    event.block.timestamp,
    event.block.number,
    event.transaction.hash
  );

  const position = getOrCreateUserPosition(token, receiver);
  if (position.firstAcquiredAt.equals(ZERO_BI)) {
    position.firstAcquiredAt = event.block.timestamp;
  }

  createLot(position, leveragedOut, collateralValueUSD, event.block.timestamp, event.block.number, event.transaction.hash);
  position.totalTokensBought = position.totalTokensBought.plus(leveragedOut);
  position.totalSpentUSD = position.totalSpentUSD.plus(collateralValueUSD);
  updateAggregates(position);
  position.lastUpdated = event.block.timestamp;
  position.save();
}

export function handleRedeemLeveragedToken(event: RedeemLeveragedToken): void {
  const minterAddress = event.address;
  const minter = Minter.bind(minterAddress);

  const tokenRes = minter.try_LEVERAGED_TOKEN();
  if (tokenRes.reverted) return;
  const token = tokenRes.value;

  const sender = event.params.sender;
  const leveragedBurned = event.params.leveragedTokenBurned;
  const collateralOut = event.params.collateralOut;

  let collateralValueUSD = valueCollateralUsd(minterAddress, collateralOut);

  const oraclePrices = getOraclePricesForMinter(minterAddress);
  let collateralPriceUSD = oraclePrices[0];
  let wrappedRate = oraclePrices[1];
  let wrappedCollateralUsd = oraclePrices[2];

  const pegUsd = getPegUsdForMinter(minterAddress);
  const navRes = minter.try_leveragedTokenPrice();
  const tokenPriceUSD_fromPeg = navRes.reverted ? ZERO_BD : toE18(navRes.value).times(pegUsd);

  let tokenPriceUSD = navRes.reverted ? ZERO_BD : toE18(navRes.value).times(wrappedCollateralUsd);
  if (tokenPriceUSD.equals(ZERO_BD) && !tokenPriceUSD_fromPeg.equals(ZERO_BD)) {
    tokenPriceUSD = tokenPriceUSD_fromPeg;
  }

  const burnDec = toE18(leveragedBurned);
  if (collateralValueUSD.equals(ZERO_BD) && !tokenPriceUSD.equals(ZERO_BD) && burnDec.gt(ZERO_BD)) {
    collateralValueUSD = burnDec.times(tokenPriceUSD);
  }

  if (collateralPriceUSD.equals(ZERO_BD)) collateralPriceUSD = pegUsd;
  if (wrappedRate.equals(ZERO_BD)) wrappedRate = ONE;
  if (wrappedCollateralUsd.equals(ZERO_BD)) wrappedCollateralUsd = collateralPriceUSD.times(wrappedRate);

  const position = getOrCreateUserPosition(token, sender);
  const costBasis = processRedemptionFIFO(position, leveragedBurned);
  const realized = collateralValueUSD.minus(costBasis);

  const redeemId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const redeem = new SailTokenRedeemEvent(redeemId);
  redeem.tokenAddress = token;
  redeem.minterAddress = minterAddress;
  redeem.user = sender;
  redeem.leveragedBurned = leveragedBurned;
  redeem.collateralOut = collateralOut;
  redeem.collateralValueUSD = collateralValueUSD;
  redeem.tokenValueUSD = collateralValueUSD;
  redeem.pricePerToken = burnDec.gt(ZERO_BD) ? collateralValueUSD.div(burnDec) : ZERO_BD;
  redeem.costBasisUSD = costBasis;
  redeem.realizedPnLUSD = realized;
  redeem.timestamp = event.block.timestamp;
  redeem.blockNumber = event.block.number;
  redeem.txHash = event.transaction.hash;
  redeem.save();

  // Write SailTokenPricePoint for charts
  const pricePointId =
    token.toHexString() + "-" + event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const pp = new SailTokenPricePoint(pricePointId);
  pp.tokenAddress = token;
  pp.minterAddress = minterAddress;
  pp.blockNumber = event.block.number;
  pp.timestamp = event.block.timestamp;
  pp.txHash = event.transaction.hash;
  pp.tokenPriceUSD = tokenPriceUSD;
  pp.collateralPriceUSD = collateralPriceUSD;
  pp.wrappedRate = wrappedRate;
  pp.eventType = "redeem";
  pp.collateralAmount = collateralOut;
  pp.tokenAmount = leveragedBurned;
  pp.impliedTokenPrice = redeem.pricePerToken;
  pp.save();

  // Write hourly snapshot (best-effort) for continuous charts
  if (!tokenPriceUSD.equals(ZERO_BD) && !collateralPriceUSD.equals(ZERO_BD) && !wrappedRate.equals(ZERO_BD)) {
    maybeWriteHourlySnapshot(
      token,
      minterAddress,
      event.block.timestamp,
      event.block.number,
      tokenPriceUSD,
      collateralPriceUSD,
      wrappedRate
    );
  }

  // Apply genesis cost basis lazily (in case endGenesis event/call isn't indexed).
  maybeApplyGenesisCostBasis(
    minterAddress,
    token,
    sender,
    event.block.timestamp,
    event.block.number,
    event.transaction.hash
  );

  position.totalTokensSold = position.totalTokensSold.plus(leveragedBurned);
  position.totalReceivedUSD = position.totalReceivedUSD.plus(collateralValueUSD);
  position.realizedPnLUSD = position.realizedPnLUSD.plus(realized);
  updateAggregates(position);
  position.lastUpdated = event.block.timestamp;
  position.save();
}


