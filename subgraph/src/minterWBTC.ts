import {
  BigInt,
  BigDecimal,
  Address,
  Bytes,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  MintLeveragedToken,
  RedeemLeveragedToken,
} from "../generated/Minter_WBTC/Minter";
import { Minter } from "../generated/Minter_WBTC/Minter";
import { WrappedPriceOracle } from "../generated/Minter_WBTC/WrappedPriceOracle";
import { ERC20 } from "../generated/Minter_WBTC/ERC20";
import {
  SailTokenPricePoint,
  HourlyPriceSnapshot,
  PriceTracker,
  UserSailPosition,
  CostBasisLot,
  SailTokenMintEvent,
  SailTokenRedeemEvent,
} from "../generated/schema";

// Constants for WBTC market
const MINTER_ADDRESS = Address.fromString("0xa9434313a4b9a4d624c6d67b1d61091b159f5a77");
const SAIL_TOKEN_ADDRESS = Address.fromString("0x03fd55f80277c13bb17739190b1e086b836c9f20");
const ORACLE_ADDRESS = Address.fromString("0x7df29f02e6baf23fbd77940d78b158a66f1bd33c");

const ZERO_BI = BigInt.fromI32(0);
const ONE_BI = BigInt.fromI32(1);
const ZERO_BD = BigDecimal.fromString("0");
const ONE_BD = BigDecimal.fromString("1");
const E18_BD = BigDecimal.fromString("1000000000000000000");
const E18_BI = BigInt.fromString("1000000000000000000");
const HOUR_SECONDS = BigInt.fromI32(3600);

// Helper to convert BigInt to BigDecimal with 18 decimals
function toDecimal(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(E18_BD);
}

// Get or create price tracker
function getOrCreatePriceTracker(): PriceTracker {
  let id = SAIL_TOKEN_ADDRESS.toHexString();
  let tracker = PriceTracker.load(id);
  
  if (!tracker) {
    tracker = new PriceTracker(id);
    tracker.tokenAddress = SAIL_TOKEN_ADDRESS;
    tracker.minterAddress = MINTER_ADDRESS;
    tracker.oracleAddress = ORACLE_ADDRESS;
    tracker.lastPriceTimestamp = ZERO_BI;
    tracker.lastHourlySnapshot = ZERO_BI;
    tracker.lastBlockNumber = ZERO_BI;
    tracker.save();
  }
  
  return tracker;
}

// Fetch oracle prices
function fetchOraclePrices(): BigDecimal[] {
  let oracle = WrappedPriceOracle.bind(ORACLE_ADDRESS);
  let result = oracle.try_latestAnswer();
  
  if (result.reverted) {
    return [ZERO_BD, ZERO_BD];
  }
  
  let maxUnderlyingPrice = toDecimal(result.value.value1);
  let maxWrappedRate = toDecimal(result.value.value3);
  
  return [maxUnderlyingPrice, maxWrappedRate];
}

// Fetch minter data for snapshots
function fetchMinterData(): BigInt[] {
  let minter = Minter.bind(MINTER_ADDRESS);
  
  let leveragedPrice = minter.try_leveragedTokenPrice();
  let collateralBalance = minter.try_collateralTokenBalance();
  let leverageRatio = minter.try_leverageRatio();
  let collateralRatio = minter.try_collateralRatio();
  
  return [
    leveragedPrice.reverted ? ZERO_BI : leveragedPrice.value,
    collateralBalance.reverted ? ZERO_BI : collateralBalance.value,
    leverageRatio.reverted ? E18_BI : leverageRatio.value,
    collateralRatio.reverted ? ZERO_BI : collateralRatio.value,
  ];
}

// Fetch sail token total supply
function fetchTotalSupply(): BigInt {
  let token = ERC20.bind(SAIL_TOKEN_ADDRESS);
  let result = token.try_totalSupply();
  return result.reverted ? ZERO_BI : result.value;
}

// Calculate token price in USD
function calculateTokenPriceUSD(
  collateralPriceUSD: BigDecimal,
  wrappedRate: BigDecimal
): BigDecimal {
  let minterData = fetchMinterData();
  let leveragedPrice = toDecimal(minterData[0]);
  
  if (leveragedPrice.equals(ZERO_BD)) {
    return ZERO_BD;
  }
  
  return leveragedPrice.times(wrappedRate).times(collateralPriceUSD);
}

// Get or create user position
function getOrCreateUserPosition(user: Address): UserSailPosition {
  let id = SAIL_TOKEN_ADDRESS.toHexString() + "-" + user.toHexString();
  let position = UserSailPosition.load(id);
  
  if (!position) {
    position = new UserSailPosition(id);
    position.tokenAddress = SAIL_TOKEN_ADDRESS;
    position.user = user;
    position.balance = ZERO_BI;
    position.balanceUSD = ZERO_BD;
    position.totalCostBasisUSD = ZERO_BD;
    position.averageCostPerToken = ZERO_BD;
    position.realizedPnLUSD = ZERO_BD;
    position.totalTokensBought = ZERO_BI;
    position.totalTokensSold = ZERO_BI;
    position.totalSpentUSD = ZERO_BD;
    position.totalReceivedUSD = ZERO_BD;
    position.firstAcquiredAt = ZERO_BI;
    position.lastUpdated = ZERO_BI;
    position.save();
  }
  
  return position;
}

// Count existing lots for a position
function countLots(positionId: string): i32 {
  let count = 0;
  while (true) {
    let lotId = positionId + "-" + count.toString();
    let lot = CostBasisLot.load(lotId);
    if (!lot) break;
    count++;
  }
  return count;
}

// Create a new cost basis lot
function createLot(
  position: UserSailPosition,
  tokenAmount: BigInt,
  costUSD: BigDecimal,
  eventType: string,
  timestamp: BigInt,
  blockNumber: BigInt,
  txHash: Bytes
): void {
  let lotIndex = countLots(position.id);
  let lotId = position.id + "-" + lotIndex.toString();
  
  let lot = new CostBasisLot(lotId);
  lot.position = position.id;
  lot.lotIndex = lotIndex;
  lot.tokenAmount = tokenAmount;
  lot.originalAmount = tokenAmount;
  lot.costUSD = costUSD;
  lot.originalCostUSD = costUSD;
  
  let tokenAmountDecimal = toDecimal(tokenAmount);
  lot.pricePerToken = tokenAmountDecimal.gt(ZERO_BD) 
    ? costUSD.div(tokenAmountDecimal) 
    : ZERO_BD;
  
  lot.eventType = eventType;
  lot.timestamp = timestamp;
  lot.blockNumber = blockNumber;
  lot.txHash = txHash;
  lot.isFullyRedeemed = false;
  lot.save();
}

// Process redemption with FIFO
function processRedemption(
  position: UserSailPosition,
  tokensToRedeem: BigInt
): BigDecimal {
  let remainingTokens = tokensToRedeem;
  let totalCostBasis = ZERO_BD;
  let lotIndex = 0;
  
  while (remainingTokens.gt(ZERO_BI)) {
    let lotId = position.id + "-" + lotIndex.toString();
    let lot = CostBasisLot.load(lotId);
    
    if (!lot || lot.isFullyRedeemed) {
      lotIndex++;
      if (lotIndex > 1000) break;
      continue;
    }
    
    if (lot.tokenAmount.le(remainingTokens)) {
      totalCostBasis = totalCostBasis.plus(lot.costUSD);
      remainingTokens = remainingTokens.minus(lot.tokenAmount);
      lot.tokenAmount = ZERO_BI;
      lot.costUSD = ZERO_BD;
      lot.isFullyRedeemed = true;
      lot.save();
    } else {
      let fraction = remainingTokens.toBigDecimal().div(lot.tokenAmount.toBigDecimal());
      let costUsed = lot.costUSD.times(fraction);
      totalCostBasis = totalCostBasis.plus(costUsed);
      
      lot.tokenAmount = lot.tokenAmount.minus(remainingTokens);
      lot.costUSD = lot.costUSD.minus(costUsed);
      lot.save();
      
      remainingTokens = ZERO_BI;
    }
    
    lotIndex++;
  }
  
  return totalCostBasis;
}

// Update position aggregates
function updatePositionAggregates(position: UserSailPosition): void {
  let totalCost = ZERO_BD;
  let totalTokens = ZERO_BI;
  let lotIndex = 0;
  
  while (true) {
    let lotId = position.id + "-" + lotIndex.toString();
    let lot = CostBasisLot.load(lotId);
    if (!lot) break;
    
    if (!lot.isFullyRedeemed) {
      totalCost = totalCost.plus(lot.costUSD);
      totalTokens = totalTokens.plus(lot.tokenAmount);
    }
    lotIndex++;
  }
  
  position.balance = totalTokens;
  position.totalCostBasisUSD = totalCost;
  
  let tokenAmountDecimal = toDecimal(totalTokens);
  position.averageCostPerToken = tokenAmountDecimal.gt(ZERO_BD)
    ? totalCost.div(tokenAmountDecimal)
    : ZERO_BD;
}

// Handle MintLeveragedToken event
export function handleMintLeveragedToken(event: MintLeveragedToken): void {
  let prices = fetchOraclePrices();
  let collateralPriceUSD = prices[0];
  let wrappedRate = prices[1];
  let tokenPriceUSD = calculateTokenPriceUSD(collateralPriceUSD, wrappedRate);
  
  let receiver = event.params.receiver;
  let collateralIn = event.params.collateralIn;
  let feeIn = event.params.feeIn;
  let leveragedOut = event.params.leveragedOut;
  
  let collateralValueUSD = toDecimal(collateralIn).times(wrappedRate).times(collateralPriceUSD);
  let tokenValueUSD = toDecimal(leveragedOut).times(tokenPriceUSD);
  let impliedPrice = leveragedOut.gt(ZERO_BI) 
    ? collateralValueUSD.div(toDecimal(leveragedOut))
    : ZERO_BD;
  
  // Create price point
  let pricePointId = SAIL_TOKEN_ADDRESS.toHexString() + "-" + 
    event.transaction.hash.toHexString() + "-" + 
    event.logIndex.toString();
  
  let pricePoint = new SailTokenPricePoint(pricePointId);
  pricePoint.tokenAddress = SAIL_TOKEN_ADDRESS;
  pricePoint.minterAddress = MINTER_ADDRESS;
  pricePoint.blockNumber = event.block.number;
  pricePoint.timestamp = event.block.timestamp;
  pricePoint.txHash = event.transaction.hash;
  pricePoint.tokenPriceUSD = tokenPriceUSD;
  pricePoint.collateralPriceUSD = collateralPriceUSD;
  pricePoint.wrappedRate = wrappedRate;
  pricePoint.eventType = "mint";
  pricePoint.collateralAmount = collateralIn;
  pricePoint.tokenAmount = leveragedOut;
  pricePoint.impliedTokenPrice = impliedPrice;
  pricePoint.save();
  
  // Create mint event record
  let mintEventId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let mintEvent = new SailTokenMintEvent(mintEventId);
  mintEvent.tokenAddress = SAIL_TOKEN_ADDRESS;
  mintEvent.minterAddress = MINTER_ADDRESS;
  mintEvent.user = receiver;
  mintEvent.collateralIn = collateralIn;
  mintEvent.feeIn = feeIn;
  mintEvent.leveragedOut = leveragedOut;
  mintEvent.collateralValueUSD = collateralValueUSD;
  mintEvent.tokenValueUSD = tokenValueUSD;
  mintEvent.pricePerToken = impliedPrice;
  mintEvent.timestamp = event.block.timestamp;
  mintEvent.blockNumber = event.block.number;
  mintEvent.txHash = event.transaction.hash;
  mintEvent.save();
  
  // Update user position
  let position = getOrCreateUserPosition(receiver);
  
  if (position.firstAcquiredAt.equals(ZERO_BI)) {
    position.firstAcquiredAt = event.block.timestamp;
  }
  
  createLot(
    position,
    leveragedOut,
    collateralValueUSD,
    "mint",
    event.block.timestamp,
    event.block.number,
    event.transaction.hash
  );
  
  position.totalTokensBought = position.totalTokensBought.plus(leveragedOut);
  position.totalSpentUSD = position.totalSpentUSD.plus(collateralValueUSD);
  updatePositionAggregates(position);
  
  position.balanceUSD = toDecimal(position.balance).times(tokenPriceUSD);
  position.lastUpdated = event.block.timestamp;
  position.save();
  
  let tracker = getOrCreatePriceTracker();
  tracker.lastPriceTimestamp = event.block.timestamp;
  tracker.lastBlockNumber = event.block.number;
  tracker.save();
}

// Handle RedeemLeveragedToken event
export function handleRedeemLeveragedToken(event: RedeemLeveragedToken): void {
  let prices = fetchOraclePrices();
  let collateralPriceUSD = prices[0];
  let wrappedRate = prices[1];
  let tokenPriceUSD = calculateTokenPriceUSD(collateralPriceUSD, wrappedRate);
  
  let sender = event.params.sender;
  let leveragedBurned = event.params.leveragedTokenBurned;
  let collateralOut = event.params.collateralOut;
  
  let collateralValueUSD = toDecimal(collateralOut).times(wrappedRate).times(collateralPriceUSD);
  let tokenValueUSD = toDecimal(leveragedBurned).times(tokenPriceUSD);
  let impliedPrice = leveragedBurned.gt(ZERO_BI)
    ? collateralValueUSD.div(toDecimal(leveragedBurned))
    : ZERO_BD;
  
  // Create price point
  let pricePointId = SAIL_TOKEN_ADDRESS.toHexString() + "-" +
    event.transaction.hash.toHexString() + "-" +
    event.logIndex.toString();
  
  let pricePoint = new SailTokenPricePoint(pricePointId);
  pricePoint.tokenAddress = SAIL_TOKEN_ADDRESS;
  pricePoint.minterAddress = MINTER_ADDRESS;
  pricePoint.blockNumber = event.block.number;
  pricePoint.timestamp = event.block.timestamp;
  pricePoint.txHash = event.transaction.hash;
  pricePoint.tokenPriceUSD = tokenPriceUSD;
  pricePoint.collateralPriceUSD = collateralPriceUSD;
  pricePoint.wrappedRate = wrappedRate;
  pricePoint.eventType = "redeem";
  pricePoint.collateralAmount = collateralOut;
  pricePoint.tokenAmount = leveragedBurned;
  pricePoint.impliedTokenPrice = impliedPrice;
  pricePoint.save();
  
  // Process FIFO redemption
  let position = getOrCreateUserPosition(sender);
  let costBasis = processRedemption(position, leveragedBurned);
  let realizedPnL = collateralValueUSD.minus(costBasis);
  
  // Create redeem event record
  let redeemEventId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let redeemEvent = new SailTokenRedeemEvent(redeemEventId);
  redeemEvent.tokenAddress = SAIL_TOKEN_ADDRESS;
  redeemEvent.minterAddress = MINTER_ADDRESS;
  redeemEvent.user = sender;
  redeemEvent.leveragedBurned = leveragedBurned;
  redeemEvent.collateralOut = collateralOut;
  redeemEvent.collateralValueUSD = collateralValueUSD;
  redeemEvent.tokenValueUSD = tokenValueUSD;
  redeemEvent.pricePerToken = impliedPrice;
  redeemEvent.costBasisUSD = costBasis;
  redeemEvent.realizedPnLUSD = realizedPnL;
  redeemEvent.timestamp = event.block.timestamp;
  redeemEvent.blockNumber = event.block.number;
  redeemEvent.txHash = event.transaction.hash;
  redeemEvent.save();
  
  // Update position
  position.totalTokensSold = position.totalTokensSold.plus(leveragedBurned);
  position.totalReceivedUSD = position.totalReceivedUSD.plus(collateralValueUSD);
  position.realizedPnLUSD = position.realizedPnLUSD.plus(realizedPnL);
  updatePositionAggregates(position);
  
  position.balanceUSD = toDecimal(position.balance).times(tokenPriceUSD);
  position.lastUpdated = event.block.timestamp;
  position.save();
  
  let tracker = getOrCreatePriceTracker();
  tracker.lastPriceTimestamp = event.block.timestamp;
  tracker.lastBlockNumber = event.block.number;
  tracker.save();
}

// Block handler for hourly price snapshots
export function handleBlock(block: ethereum.Block): void {
  let tracker = getOrCreatePriceTracker();
  
  let currentHour = block.timestamp.div(HOUR_SECONDS).times(HOUR_SECONDS);
  
  if (tracker.lastHourlySnapshot.ge(currentHour)) {
    return;
  }
  
  let lastPriceHour = tracker.lastPriceTimestamp.div(HOUR_SECONDS).times(HOUR_SECONDS);
  if (lastPriceHour.ge(currentHour)) {
    tracker.lastHourlySnapshot = currentHour;
    tracker.save();
    return;
  }
  
  let prices = fetchOraclePrices();
  let collateralPriceUSD = prices[0];
  let wrappedRate = prices[1];
  let tokenPriceUSD = calculateTokenPriceUSD(collateralPriceUSD, wrappedRate);
  
  let minterData = fetchMinterData();
  let totalSupply = fetchTotalSupply();
  
  let snapshotId = SAIL_TOKEN_ADDRESS.toHexString() + "-" + currentHour.toString();
  let snapshot = new HourlyPriceSnapshot(snapshotId);
  snapshot.tokenAddress = SAIL_TOKEN_ADDRESS;
  snapshot.minterAddress = MINTER_ADDRESS;
  snapshot.hourTimestamp = currentHour;
  snapshot.blockNumber = block.number;
  snapshot.tokenPriceUSD = tokenPriceUSD;
  snapshot.collateralPriceUSD = collateralPriceUSD;
  snapshot.wrappedRate = wrappedRate;
  snapshot.totalSupply = totalSupply;
  snapshot.collateralBalance = minterData[1];
  snapshot.leverageRatio = minterData[2];
  snapshot.collateralRatio = minterData[3];
  snapshot.save();
  
  let pricePointId = SAIL_TOKEN_ADDRESS.toHexString() + "-hourly-" + currentHour.toString();
  let pricePoint = new SailTokenPricePoint(pricePointId);
  pricePoint.tokenAddress = SAIL_TOKEN_ADDRESS;
  pricePoint.minterAddress = MINTER_ADDRESS;
  pricePoint.blockNumber = block.number;
  pricePoint.timestamp = block.timestamp;
  pricePoint.txHash = Bytes.empty();
  pricePoint.tokenPriceUSD = tokenPriceUSD;
  pricePoint.collateralPriceUSD = collateralPriceUSD;
  pricePoint.wrappedRate = wrappedRate;
  pricePoint.eventType = "hourly";
  pricePoint.collateralAmount = ZERO_BI;
  pricePoint.tokenAmount = ZERO_BI;
  pricePoint.impliedTokenPrice = tokenPriceUSD;
  pricePoint.save();
  
  tracker.lastHourlySnapshot = currentHour;
  tracker.lastPriceTimestamp = block.timestamp;
  tracker.lastBlockNumber = block.number;
  tracker.save();
}

