/**
 * Sail Token balance tracking for Harbor Marks - WBTC Market
 * Tracks ERC20 Transfer events to calculate user balances and marks
 * Sail tokens (leveraged tokens, hs) have a 5x marks multiplier by default
 */

import { Transfer as TransferEvent } from "../generated/SailToken_hsWBTC/ERC20";
import { ERC20 } from "../generated/SailToken_hsWBTC/ERC20";
import { Minter } from "../generated/SailToken_hsWBTC/Minter";
import { WrappedPriceOracle } from "../generated/SailToken_hsWBTC/WrappedPriceOracle";
import {
  updateSailTokenMarksInTotal,
} from "./marksAggregation";
import {
  SailTokenBalance,
  MarksMultiplier,
  UserSailPosition,
  CostBasisLot,
  SailTokenPricePoint,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address, ethereum } from "@graphprotocol/graph-ts";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const DEFAULT_MULTIPLIER = BigDecimal.fromString("5.0");
const DEFAULT_MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");
const ONE_ETHER = BigDecimal.fromString("1000000000000000000");
const ONE_ETHER_BI = BigInt.fromString("1000000000000000000");
const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const ZERO_ADDRESS = Address.fromHexString("0x0000000000000000000000000000000000000000");

// WBTC Market addresses
const WBTC_SAIL_TOKEN = Address.fromString("0x03fd55f80277c13bb17739190b1e086b836c9f20");
const WBTC_MINTER = Address.fromString("0xa9434313a4b9a4d624c6d67b1d61091b159f5a77");
const WBTC_ORACLE = Address.fromString("0x7df29f02e6baf23fbd77940d78b158a66f1bd33c");
const WBTC_GENESIS = Address.fromString("0x0569ebf818902e448235592f86e63255bbe64fd3");

function toDecimal(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(ONE_ETHER);
}

function isGenesisContract(address: Address): boolean {
  return address.equals(WBTC_GENESIS);
}

function fetchSailTokenPrice(): BigDecimal {
  const minter = Minter.bind(WBTC_MINTER);
  const priceResult = minter.try_leveragedTokenPrice();
  
  if (priceResult.reverted) {
    return BigDecimal.fromString("1.0");
  }
  
  return priceResult.value.toBigDecimal().div(ONE_ETHER);
}

function fetchOraclePrices(): BigDecimal[] {
  const oracle = WrappedPriceOracle.bind(WBTC_ORACLE);
  const result = oracle.try_latestAnswer();
  
  if (result.reverted) {
    return [ZERO_BD, BigDecimal.fromString("1.0")];
  }
  
  const maxUnderlyingPrice = toDecimal(result.value.value1);
  const maxWrappedRate = toDecimal(result.value.value3);
  
  return [maxUnderlyingPrice, maxWrappedRate];
}

function calculateBalanceUSD(balance: BigInt): BigDecimal {
  const price = fetchSailTokenPrice();
  const balanceDecimal = balance.toBigDecimal().div(ONE_ETHER);
  return balanceDecimal.times(price);
}

function getOrCreateSailTokenBalance(
  tokenAddress: Bytes,
  userAddress: Bytes
): SailTokenBalance {
  const id = `${tokenAddress.toHexString()}-${userAddress.toHexString()}`;
  let balance = SailTokenBalance.load(id);

  if (balance == null) {
    balance = new SailTokenBalance(id);
    balance.tokenAddress = tokenAddress;
    balance.user = userAddress;
    balance.balance = ZERO_BI;
    balance.balanceUSD = ZERO_BD;
    balance.marksPerDay = ZERO_BD;
    balance.accumulatedMarks = ZERO_BD;
    balance.totalMarksEarned = ZERO_BD;
    balance.firstSeenAt = ZERO_BI;
    balance.lastUpdated = ZERO_BI;
    balance.marketId = "usd-wbtc";
    balance.save();
  }
  return balance;
}

function getOrCreateUserSailPosition(
  tokenAddress: Bytes,
  userAddress: Bytes
): UserSailPosition {
  const id = tokenAddress.toHexString() + "-" + userAddress.toHexString();
  let position = UserSailPosition.load(id);
  
  if (position === null) {
    position = new UserSailPosition(id);
    position.tokenAddress = tokenAddress;
    position.user = userAddress;
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

function countLots(positionId: string): i32 {
  let count = 0;
  while (true) {
    const lotId = positionId + "-" + count.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot === null) break;
    count++;
  }
  return count;
}

function createCostBasisLot(
  position: UserSailPosition,
  tokenAmount: BigInt,
  costUSD: BigDecimal,
  eventType: string,
  timestamp: BigInt,
  blockNumber: BigInt,
  txHash: Bytes
): void {
  const lotIndex = countLots(position.id);
  const lotId = position.id + "-" + lotIndex.toString();
  
  const lot = new CostBasisLot(lotId);
  lot.position = position.id;
  lot.lotIndex = lotIndex;
  lot.tokenAmount = tokenAmount;
  lot.originalAmount = tokenAmount;
  lot.costUSD = costUSD;
  lot.originalCostUSD = costUSD;
  
  const tokenAmountDecimal = toDecimal(tokenAmount);
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

function updatePositionAggregates(position: UserSailPosition): void {
  let totalCost = ZERO_BD;
  let totalTokens = ZERO_BI;
  let lotIndex = 0;
  
  while (true) {
    const lotId = position.id + "-" + lotIndex.toString();
    const lot = CostBasisLot.load(lotId);
    if (lot === null) break;
    
    if (!lot.isFullyRedeemed) {
      totalCost = totalCost.plus(lot.costUSD);
      totalTokens = totalTokens.plus(lot.tokenAmount);
    }
    lotIndex++;
  }
  
  position.balance = totalTokens;
  position.totalCostBasisUSD = totalCost;
  
  const tokenAmountDecimal = toDecimal(totalTokens);
  position.averageCostPerToken = tokenAmountDecimal.gt(ZERO_BD)
    ? totalCost.div(tokenAmountDecimal)
    : ZERO_BD;
}

function queryTokenBalance(tokenAddress: Address, userAddress: Address): BigInt {
  const token = ERC20.bind(tokenAddress);
  const balanceResult = token.try_balanceOf(userAddress);
  if (balanceResult.reverted) {
    return ZERO_BI;
  }
  return balanceResult.value;
}

function getSailTokenMultiplier(tokenAddress: Bytes, timestamp: BigInt): BigDecimal {
  const sourceType = "sailToken";
  const id = `${sourceType}-${tokenAddress.toHexString()}`;
  let multiplier = MarksMultiplier.load(id);

  if (multiplier == null) {
    multiplier = new MarksMultiplier(id);
    multiplier.sourceType = sourceType;
    multiplier.sourceAddress = tokenAddress;
    multiplier.multiplier = DEFAULT_MULTIPLIER;
    multiplier.effectiveFrom = timestamp;
    multiplier.updatedAt = timestamp;
    multiplier.updatedBy = null;
    multiplier.save();
  }
  return multiplier.multiplier;
}

function accumulateMarks(balance: SailTokenBalance, block: ethereum.Block): void {
  const currentTimestamp = block.timestamp;
  if (balance.balance.equals(ZERO_BI)) {
    balance.accumulatedMarks = ZERO_BD;
    balance.marksPerDay = ZERO_BD;
    balance.lastUpdated = currentTimestamp;
    balance.save();
    return;
  }

  const multiplier = getSailTokenMultiplier(balance.tokenAddress, currentTimestamp);
  const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);

  const lastUpdate = balance.lastUpdated.gt(ZERO_BI)
    ? balance.lastUpdated
    : balance.firstSeenAt;

  if (lastUpdate.equals(ZERO_BI)) {
    balance.firstSeenAt = currentTimestamp;
    balance.lastUpdated = currentTimestamp;
    balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
    balance.accumulatedMarks = ZERO_BD;
    balance.save();
    return;
  }

  if (currentTimestamp.gt(lastUpdate)) {
    const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
    const daysSinceLastUpdate = timeSinceLastUpdate.toBigDecimal().div(SECONDS_PER_DAY);

    if (daysSinceLastUpdate.gt(ZERO_BD)) {
      const marksAccumulated = balance.balanceUSD.times(marksPerDollarPerDay).times(daysSinceLastUpdate);
      balance.accumulatedMarks = balance.accumulatedMarks.plus(marksAccumulated);
      balance.totalMarksEarned = balance.totalMarksEarned.plus(marksAccumulated);
      balance.lastUpdated = currentTimestamp;
    }
  }
  balance.marksPerDay = balance.balanceUSD.times(marksPerDollarPerDay);
  balance.save();
}

export function handleSailTokenTransfer(event: TransferEvent): void {
  const tokenAddress = event.address;
  const fromAddress = event.params.from;
  const toAddress = event.params.to;
  const amount = event.params.value;
  const timestamp = event.block.timestamp;
  const blockNumber = event.block.number;
  const txHash = event.transaction.hash;

  const isGenesisMint = fromAddress.equals(ZERO_ADDRESS) || isGenesisContract(fromAddress);

  // Handle sender
  if (!fromAddress.equals(ZERO_ADDRESS)) {
    const senderBalance = getOrCreateSailTokenBalance(tokenAddress, fromAddress);
    accumulateMarks(senderBalance, event.block);
    
    const actualBalance = queryTokenBalance(Address.fromBytes(tokenAddress), fromAddress);
    senderBalance.balance = actualBalance;
    senderBalance.balanceUSD = calculateBalanceUSD(actualBalance);
    
    const multiplier = getSailTokenMultiplier(tokenAddress, timestamp);
    const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
    senderBalance.marksPerDay = senderBalance.balanceUSD.times(marksPerDollarPerDay);
    
    if (senderBalance.firstSeenAt.equals(ZERO_BI) && actualBalance.gt(ZERO_BI)) {
      senderBalance.firstSeenAt = timestamp;
    }
    
    if (actualBalance.equals(ZERO_BI)) {
      senderBalance.accumulatedMarks = ZERO_BD;
      senderBalance.firstSeenAt = ZERO_BI;
      senderBalance.marksPerDay = ZERO_BD;
    }
    
    senderBalance.lastUpdated = timestamp;
    senderBalance.save();
    updateSailTokenMarksInTotal(fromAddress, senderBalance, timestamp);
  }

  // Handle receiver
  if (!toAddress.equals(ZERO_ADDRESS)) {
    const receiverBalance = getOrCreateSailTokenBalance(tokenAddress, toAddress);
    accumulateMarks(receiverBalance, event.block);
    
    const actualBalance = queryTokenBalance(Address.fromBytes(tokenAddress), toAddress);
    receiverBalance.balance = actualBalance;
    receiverBalance.balanceUSD = calculateBalanceUSD(actualBalance);
    
    const multiplier = getSailTokenMultiplier(tokenAddress, timestamp);
    const marksPerDollarPerDay = DEFAULT_MARKS_PER_DOLLAR_PER_DAY.times(multiplier);
    receiverBalance.marksPerDay = receiverBalance.balanceUSD.times(marksPerDollarPerDay);
    
    if (receiverBalance.firstSeenAt.equals(ZERO_BI) && actualBalance.gt(ZERO_BI)) {
      receiverBalance.firstSeenAt = timestamp;
    }
    
    receiverBalance.lastUpdated = timestamp;
    receiverBalance.save();
    updateSailTokenMarksInTotal(toAddress, receiverBalance, timestamp);
    
    // Cost basis tracking for genesis mints
    if (isGenesisMint && amount.gt(ZERO_BI)) {
      const position = getOrCreateUserSailPosition(tokenAddress, toAddress);
      
      const tokenPrice = fetchSailTokenPrice();
      const tokenAmountDecimal = toDecimal(amount);
      const costUSD = tokenAmountDecimal.times(tokenPrice);
      
      createCostBasisLot(
        position,
        amount,
        costUSD,
        "genesis",
        timestamp,
        blockNumber,
        txHash
      );
      
      if (position.firstAcquiredAt.equals(ZERO_BI)) {
        position.firstAcquiredAt = timestamp;
      }
      position.totalTokensBought = position.totalTokensBought.plus(amount);
      position.totalSpentUSD = position.totalSpentUSD.plus(costUSD);
      updatePositionAggregates(position);
      position.balanceUSD = toDecimal(position.balance).times(tokenPrice);
      position.lastUpdated = timestamp;
      position.save();
      
      // Create price point
      const prices = fetchOraclePrices();
      const pricePointId = tokenAddress.toHexString() + "-" + 
        txHash.toHexString() + "-" + 
        event.logIndex.toString();
      
      const pricePoint = new SailTokenPricePoint(pricePointId);
      pricePoint.tokenAddress = tokenAddress;
      pricePoint.minterAddress = WBTC_MINTER;
      pricePoint.blockNumber = blockNumber;
      pricePoint.timestamp = timestamp;
      pricePoint.txHash = txHash;
      pricePoint.tokenPriceUSD = tokenPrice;
      pricePoint.collateralPriceUSD = prices[0];
      pricePoint.wrappedRate = prices[1];
      pricePoint.eventType = "genesis";
      pricePoint.collateralAmount = ZERO_BI;
      pricePoint.tokenAmount = amount;
      pricePoint.impliedTokenPrice = tokenPrice;
      pricePoint.save();
    }
  }
}

