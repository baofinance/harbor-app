/**
 * Token balance tracking for Harbor Marks
 * Tracks ha tokens and sail tokens held in wallets
 * Uses Transfer events to track balance changes
 */

import {
  Transfer as TransferEvent,
} from "../generated/ERC20/ERC20";
import {
  TokenBalance,
  UserHarborMarks,
  UserTotalHarborMarks,
} from "../generated/schema";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  getOrCreateMarksRule,
  calculateMarksWithRule,
} from "./marksRules";

// Map token addresses to contract types
// This should be configured based on your token addresses
const TOKEN_TYPE_MAP: Map<string, string> = new Map();
// Example: TOKEN_TYPE_MAP.set("0x...", "haToken");
// Example: TOKEN_TYPE_MAP.set("0x...", "sailToken");

function getTokenType(tokenAddress: string): string | null {
  return TOKEN_TYPE_MAP.get(tokenAddress) || null;
}

function getOrCreateTokenBalance(
  tokenAddress: string,
  userAddress: string,
  contractType: string
): TokenBalance {
  const id = `${tokenAddress}-${userAddress}`;
  let balance = TokenBalance.load(id);
  if (balance == null) {
    balance = new TokenBalance(id);
    balance.tokenAddress = tokenAddress as string;
    balance.contractType = contractType;
    balance.user = userAddress as string;
    balance.balance = BigInt.fromI32(0);
    balance.balanceUSD = BigDecimal.fromString("0");
    balance.timestamp = BigInt.fromI32(0);
    balance.blockNumber = BigInt.fromI32(0);
    balance.marksPerDay = BigDecimal.fromString("0");
    balance.currentMarks = BigDecimal.fromString("0");
  }
  return balance;
}

function updateTokenBalanceMarks(
  tokenAddress: string,
  userAddress: string,
  contractType: string,
  balance: BigInt,
  balanceUSD: BigDecimal,
  timestamp: BigInt
): void {
  const tokenBalance = getOrCreateTokenBalance(tokenAddress, userAddress, contractType);
  const oldBalance = tokenBalance.balance;
  const oldBalanceUSD = tokenBalance.balanceUSD || BigDecimal.fromString("0");
  
  tokenBalance.balance = balance;
  tokenBalance.balanceUSD = balanceUSD;
  tokenBalance.timestamp = timestamp;
  tokenBalance.blockNumber = BigInt.fromI32(0); // Will be set from event
  
  const rule = getOrCreateMarksRule(tokenAddress, contractType);
  tokenBalance.marksPerDay = balanceUSD.times(rule.marksPerDollarPerDay);
  
  // Calculate marks based on balance change
  // If balance increased, calculate marks from new amount
  // If balance decreased, recalculate from remaining balance
  if (balance.gt(oldBalance)) {
    // Balance increased - calculate marks for new amount
    const currentMarks = calculateMarksWithRule(
      balanceUSD,
      timestamp,
      timestamp,
      rule
    );
    tokenBalance.currentMarks = currentMarks;
  } else {
    // Balance decreased or stayed same - recalculate from current balance
    const currentMarks = calculateMarksWithRule(
      balanceUSD,
      tokenBalance.timestamp, // Use original timestamp
      timestamp,
      rule
    );
    tokenBalance.currentMarks = currentMarks;
  }
  
  tokenBalance.save();
  
  // Update UserHarborMarks for this token
  const userMarks = getOrCreateUserMarksForToken(tokenAddress, userAddress, contractType);
  userMarks.currentDeposit = balance;
  userMarks.currentDepositUSD = balanceUSD;
  
  const totalMarks = calculateMarksWithRule(
    balanceUSD,
    userMarks.periodStartDate,
    timestamp,
    rule
  );
  userMarks.currentMarks = totalMarks;
  userMarks.marksPerDay = balanceUSD.times(rule.marksPerDollarPerDay);
  userMarks.lastUpdated = timestamp;
  userMarks.save();
}

function getOrCreateUserMarksForToken(
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

export function handleTransfer(event: TransferEvent): void {
  const tokenAddress = event.address.toHexString();
  const contractType = getTokenType(tokenAddress);
  
  // Only track if this is a token we care about (haToken or sailToken)
  if (contractType == null || (contractType != "haToken" && contractType != "sailToken")) {
    return;
  }
  
  const from = event.params.from.toHexString();
  const to = event.params.to.toHexString();
  const value = event.params.value;
  const timestamp = event.block.timestamp;
  
  // TODO: Get USD price for this token
  const valueUSD = value.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  
  // Update balance for sender (decrease)
  if (from != "0x0000000000000000000000000000000000000000") {
    // Get current balance (would need to track this or query contract)
    // For now, this is simplified - in production you'd track balances
    const fromBalance = BigInt.fromI32(0); // TODO: Track actual balance
    const fromBalanceUSD = BigDecimal.fromString("0"); // TODO: Calculate USD
    updateTokenBalanceMarks(tokenAddress, from, contractType, fromBalance, fromBalanceUSD, timestamp);
  }
  
  // Update balance for receiver (increase)
  if (to != "0x0000000000000000000000000000000000000000") {
    const toBalance = BigInt.fromI32(0); // TODO: Track actual balance
    const toBalanceUSD = BigDecimal.fromString("0"); // TODO: Calculate USD
    updateTokenBalanceMarks(tokenAddress, to, contractType, toBalance, toBalanceUSD, timestamp);
  }
}

