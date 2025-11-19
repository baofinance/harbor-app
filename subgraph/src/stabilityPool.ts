/**
 * Stability Pool event handlers for Harbor Marks tracking
 * This file handles deposits and withdrawals from stability pools
 */

import {
  Deposit as StabilityPoolDepositEvent,
  Withdraw as StabilityPoolWithdrawEvent,
} from "../generated/StabilityPool/StabilityPool";
import {
  Deposit,
  Withdrawal,
  UserHarborMarks,
  UserTotalHarborMarks,
} from "../generated/schema";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  getOrCreateMarksRule,
  calculateMarksWithRule,
  calculateForfeitedMarksWithRule,
} from "./marksRules";

// Helper to get or create user marks (same as genesis.ts but for stability pools)
function getOrCreateUserMarks(
  contractAddress: string,
  userAddress: string,
  contractType: string
): UserHarborMarks {
  const id = `${contractAddress}-${userAddress}`;
  let userMarks = UserHarborMarks.load(id);
  if (userMarks == null) {
    userMarks = new UserHarborMarks(id);
    userMarks.contractAddress = contractAddress as string;
    userMarks.contractType = contractType;
    userMarks.user = userAddress as string;
    userMarks.currentMarks = BigDecimal.fromString("0");
    userMarks.marksPerDay = BigDecimal.fromString("0");
    userMarks.totalMarksEarned = BigDecimal.fromString("0");
    userMarks.totalMarksForfeited = BigDecimal.fromString("0");
    userMarks.totalDeposited = BigInt.fromI32(0);
    userMarks.totalDepositedUSD = BigDecimal.fromString("0");
    userMarks.currentDeposit = BigInt.fromI32(0);
    userMarks.currentDepositUSD = BigDecimal.fromString("0");
    
    const rule = getOrCreateMarksRule(contractAddress, contractType);
    userMarks.periodStartDate = rule.periodStartDate || BigInt.fromI32(0);
    userMarks.periodEndDate = rule.periodEndDate;
    userMarks.periodEnded = rule.periodEndDate != null && 
      (rule.periodEndDate as BigInt).gt(BigInt.fromI32(0));
    
    userMarks.lastUpdated = BigInt.fromI32(0);
  }
  return userMarks;
}

// Helper to update total marks across all contracts
function updateUserTotalMarks(userAddress: string, timestamp: BigInt): void {
  // This would aggregate marks from all contract types
  // Implementation would query all UserHarborMarks for this user
  // and update UserTotalHarborMarks
  // For now, this is a placeholder
}

export function handleStabilityPoolDeposit(event: StabilityPoolDepositEvent): void {
  const contractAddress = event.address.toHexString();
  // Determine contract type based on contract address or event data
  // For now, we'll need to determine if it's collateral or sail pool
  // This could be done via contract address mapping or event data
  const contractType = "stabilityPoolCollateral"; // or "stabilityPoolSail" - needs to be determined
  
  const userAddress = event.params.user.toHexString();
  const amount = event.params.amount;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  
  // Get marks rule
  const rule = getOrCreateMarksRule(contractAddress, contractType);
  
  // Create deposit entity
  const depositId = `${contractAddress}-${userAddress}-${txHash.toHexString()}-${event.logIndex.toString()}`;
  const deposit = new Deposit(depositId);
  deposit.contractAddress = contractAddress;
  deposit.contractType = contractType;
  deposit.user = userAddress;
  deposit.amount = amount;
  deposit.amountUSD = null; // TODO: Fetch USD price from oracle
  deposit.timestamp = timestamp;
  deposit.txHash = txHash;
  deposit.blockNumber = blockNumber;
  deposit.marksEarned = BigDecimal.fromString("0");
  deposit.marksPerDay = BigDecimal.fromString("0");
  deposit.isActive = true;
  deposit.withdrawnAmount = BigInt.fromI32(0);
  deposit.withdrawnAt = null;
  deposit.periodStartDate = rule.periodStartDate || timestamp;
  deposit.periodEndDate = rule.periodEndDate;
  deposit.periodEnded = rule.periodEndDate != null && 
    (rule.periodEndDate as BigInt).gt(BigInt.fromI32(0));
  deposit.metadata = "{}";
  
  // Calculate marks
  const amountUSD = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  deposit.amountUSD = amountUSD;
  deposit.marksPerDay = amountUSD.times(rule.marksPerDollarPerDay);
  
  const currentMarks = calculateMarksWithRule(
    amountUSD,
    timestamp,
    timestamp,
    rule
  );
  deposit.marksEarned = currentMarks;
  deposit.save();
  
  // Update user marks
  const userMarks = getOrCreateUserMarks(contractAddress, userAddress, contractType);
  userMarks.totalDeposited = userMarks.totalDeposited.plus(amount);
  if (userMarks.totalDepositedUSD == null) {
    userMarks.totalDepositedUSD = BigDecimal.fromString("0");
  }
  userMarks.totalDepositedUSD = userMarks.totalDepositedUSD.plus(amountUSD);
  userMarks.currentDeposit = userMarks.currentDeposit.plus(amount);
  if (userMarks.currentDepositUSD == null) {
    userMarks.currentDepositUSD = BigDecimal.fromString("0");
  }
  userMarks.currentDepositUSD = userMarks.currentDepositUSD.plus(amountUSD);
  
  const totalMarks = calculateMarksWithRule(
    userMarks.currentDepositUSD!,
    timestamp,
    timestamp,
    rule
  );
  userMarks.currentMarks = totalMarks;
  userMarks.marksPerDay = userMarks.currentDepositUSD!.times(rule.marksPerDollarPerDay);
  userMarks.totalMarksEarned = totalMarks;
  userMarks.lastUpdated = timestamp;
  userMarks.save();
  
  // Update total marks
  updateUserTotalMarks(userAddress, timestamp);
}

export function handleStabilityPoolWithdraw(event: StabilityPoolWithdrawEvent): void {
  const contractAddress = event.address.toHexString();
  const contractType = "stabilityPoolCollateral"; // or "stabilityPoolSail"
  const userAddress = event.params.user.toHexString();
  const amount = event.params.amount;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  
  const rule = getOrCreateMarksRule(contractAddress, contractType);
  
  // Create withdrawal entity
  const withdrawalId = `${contractAddress}-${userAddress}-${txHash.toHexString()}-${event.logIndex.toString()}`;
  const withdrawal = new Withdrawal(withdrawalId);
  withdrawal.contractAddress = contractAddress;
  withdrawal.contractType = contractType;
  withdrawal.user = userAddress;
  withdrawal.amount = amount;
  withdrawal.amountUSD = null;
  withdrawal.timestamp = timestamp;
  withdrawal.txHash = txHash;
  withdrawal.blockNumber = blockNumber;
  
  const amountUSD = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  withdrawal.amountUSD = amountUSD;
  
  const userMarks = getOrCreateUserMarks(contractAddress, userAddress, contractType);
  
  const marksEarned = calculateMarksWithRule(
    amountUSD,
    userMarks.periodStartDate,
    timestamp,
    rule
  );
  const forfeitedMarks = calculateForfeitedMarksWithRule(
    amountUSD,
    marksEarned,
    rule
  );
  withdrawal.marksForfeited = forfeitedMarks;
  withdrawal.save();
  
  // Update user marks
  userMarks.currentDeposit = userMarks.currentDeposit.minus(amount);
  if (userMarks.currentDepositUSD == null) {
    userMarks.currentDepositUSD = BigDecimal.fromString("0");
  }
  userMarks.currentDepositUSD = userMarks.currentDepositUSD.minus(amountUSD);
  if (userMarks.currentDepositUSD.lt(BigDecimal.fromString("0"))) {
    userMarks.currentDepositUSD = BigDecimal.fromString("0");
  }
  
  const currentMarks = calculateMarksWithRule(
    userMarks.currentDepositUSD,
    timestamp,
    timestamp,
    rule
  );
  userMarks.currentMarks = currentMarks;
  userMarks.marksPerDay = userMarks.currentDepositUSD.times(rule.marksPerDollarPerDay);
  userMarks.totalMarksForfeited = userMarks.totalMarksForfeited.plus(forfeitedMarks);
  userMarks.lastUpdated = timestamp;
  userMarks.save();
  
  updateUserTotalMarks(userAddress, timestamp);
}



