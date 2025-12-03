/**
 * Marks aggregation utility
 * Aggregates marks from all sources (Genesis, ha tokens, stability pools) into UserTotalMarks
 */

import {
  UserTotalMarks,
  UserHarborMarks,
  HaTokenBalance,
  StabilityPoolDeposit,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";

/**
 * Aggregate all marks for a user across all sources
 * This should be called whenever marks change for a user
 */
export function aggregateUserMarks(userAddress: Bytes, timestamp: BigInt): void {
  const id = userAddress.toHexString();
  let totalMarks = UserTotalMarks.load(id);
  
  if (totalMarks == null) {
    totalMarks = new UserTotalMarks(id);
    totalMarks.user = userAddress;
    totalMarks.genesisMarks = BigDecimal.fromString("0");
    totalMarks.haTokenMarks = BigDecimal.fromString("0");
    totalMarks.stabilityPoolMarks = BigDecimal.fromString("0");
    totalMarks.totalMarks = BigDecimal.fromString("0");
    totalMarks.totalMarksPerDay = BigDecimal.fromString("0");
    totalMarks.lastUpdated = timestamp;
  }
  
  // Aggregate Genesis marks
  // Note: Genesis marks are stored per contract, so we'd need to query all UserHarborMarks
  // where contractType is "genesis" or contractAddress is a Genesis contract
  // For now, this is a placeholder - you'd query all relevant UserHarborMarks entities
  let genesisMarksTotal = BigDecimal.fromString("0");
  // TODO: Query all UserHarborMarks for Genesis contracts for this user
  
  // Aggregate ha token marks
  // Query all HaTokenBalance entities for this user
  let haTokenMarksTotal = BigDecimal.fromString("0");
  let haTokenMarksPerDayTotal = BigDecimal.fromString("0");
  // Note: In AssemblyScript, we can't easily query all entities
  // This would typically be done via GraphQL queries or by maintaining a list
  // For now, we'll update this when individual balances change
  
  // Aggregate stability pool marks
  // Query all StabilityPoolDeposit entities for this user
  let stabilityPoolMarksTotal = BigDecimal.fromString("0");
  let stabilityPoolMarksPerDayTotal = BigDecimal.fromString("0");
  // Same limitation - would need to query or maintain a list
  
  // Calculate totals
  const totalMarksValue = genesisMarksTotal.plus(haTokenMarksTotal).plus(stabilityPoolMarksTotal);
  const totalMarksPerDayValue = haTokenMarksPerDayTotal.plus(stabilityPoolMarksPerDayTotal);
  
  totalMarks.genesisMarks = genesisMarksTotal;
  totalMarks.haTokenMarks = haTokenMarksTotal;
  totalMarks.stabilityPoolMarks = stabilityPoolMarksTotal;
  totalMarks.totalMarks = totalMarksValue;
  totalMarks.totalMarksPerDay = totalMarksPerDayValue;
  totalMarks.lastUpdated = timestamp;
  totalMarks.save();
}

/**
 * Update ha token marks in UserTotalMarks
 * Called when a ha token balance changes
 */
export function updateHaTokenMarksInTotal(
  userAddress: Bytes,
  tokenBalance: HaTokenBalance,
  timestamp: BigInt
): void {
  const id = userAddress.toHexString();
  let totalMarks = UserTotalMarks.load(id);
  
  if (totalMarks == null) {
    totalMarks = new UserTotalMarks(id);
    totalMarks.user = userAddress;
    totalMarks.genesisMarks = BigDecimal.fromString("0");
    totalMarks.haTokenMarks = BigDecimal.fromString("0");
    totalMarks.stabilityPoolMarks = BigDecimal.fromString("0");
    totalMarks.totalMarks = BigDecimal.fromString("0");
    totalMarks.totalMarksPerDay = BigDecimal.fromString("0");
    totalMarks.lastUpdated = timestamp;
  }
  
  // Add this token's marks to the total
  // Note: This is simplified - in reality you'd need to sum all ha token balances
  // For now, we'll just update when this specific balance changes
  // A more complete solution would maintain a list or query all balances
  
  totalMarks.haTokenMarks = tokenBalance.accumulatedMarks;
  totalMarks.totalMarks = totalMarks.genesisMarks
    .plus(tokenBalance.accumulatedMarks)
    .plus(totalMarks.stabilityPoolMarks);
  totalMarks.totalMarksPerDay = totalMarks.totalMarksPerDay.plus(tokenBalance.marksPerDay);
  totalMarks.lastUpdated = timestamp;
  totalMarks.save();
}

/**
 * Update stability pool marks in UserTotalMarks
 * Called when a stability pool deposit changes
 */
export function updateStabilityPoolMarksInTotal(
  userAddress: Bytes,
  poolDeposit: StabilityPoolDeposit,
  timestamp: BigInt
): void {
  const id = userAddress.toHexString();
  let totalMarks = UserTotalMarks.load(id);
  
  if (totalMarks == null) {
    totalMarks = new UserTotalMarks(id);
    totalMarks.user = userAddress;
    totalMarks.genesisMarks = BigDecimal.fromString("0");
    totalMarks.haTokenMarks = BigDecimal.fromString("0");
    totalMarks.stabilityPoolMarks = BigDecimal.fromString("0");
    totalMarks.totalMarks = BigDecimal.fromString("0");
    totalMarks.totalMarksPerDay = BigDecimal.fromString("0");
    totalMarks.lastUpdated = timestamp;
  }
  
  // Add this pool's marks to the total
  // Note: This is simplified - in reality you'd need to sum all pool deposits
  totalMarks.stabilityPoolMarks = poolDeposit.accumulatedMarks;
  totalMarks.totalMarks = totalMarks.genesisMarks
    .plus(totalMarks.haTokenMarks)
    .plus(poolDeposit.accumulatedMarks);
  totalMarks.totalMarksPerDay = totalMarks.totalMarksPerDay.plus(poolDeposit.marksPerDay);
  totalMarks.lastUpdated = timestamp;
  totalMarks.save();
}


 * Marks aggregation utility
 * Aggregates marks from all sources (Genesis, ha tokens, stability pools) into UserTotalMarks
 */

import {
  UserTotalMarks,
  UserHarborMarks,
  HaTokenBalance,
  StabilityPoolDeposit,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";

/**
 * Aggregate all marks for a user across all sources
 * This should be called whenever marks change for a user
 */
export function aggregateUserMarks(userAddress: Bytes, timestamp: BigInt): void {
  const id = userAddress.toHexString();
  let totalMarks = UserTotalMarks.load(id);
  
  if (totalMarks == null) {
    totalMarks = new UserTotalMarks(id);
    totalMarks.user = userAddress;
    totalMarks.genesisMarks = BigDecimal.fromString("0");
    totalMarks.haTokenMarks = BigDecimal.fromString("0");
    totalMarks.stabilityPoolMarks = BigDecimal.fromString("0");
    totalMarks.totalMarks = BigDecimal.fromString("0");
    totalMarks.totalMarksPerDay = BigDecimal.fromString("0");
    totalMarks.lastUpdated = timestamp;
  }
  
  // Aggregate Genesis marks
  // Note: Genesis marks are stored per contract, so we'd need to query all UserHarborMarks
  // where contractType is "genesis" or contractAddress is a Genesis contract
  // For now, this is a placeholder - you'd query all relevant UserHarborMarks entities
  let genesisMarksTotal = BigDecimal.fromString("0");
  // TODO: Query all UserHarborMarks for Genesis contracts for this user
  
  // Aggregate ha token marks
  // Query all HaTokenBalance entities for this user
  let haTokenMarksTotal = BigDecimal.fromString("0");
  let haTokenMarksPerDayTotal = BigDecimal.fromString("0");
  // Note: In AssemblyScript, we can't easily query all entities
  // This would typically be done via GraphQL queries or by maintaining a list
  // For now, we'll update this when individual balances change
  
  // Aggregate stability pool marks
  // Query all StabilityPoolDeposit entities for this user
  let stabilityPoolMarksTotal = BigDecimal.fromString("0");
  let stabilityPoolMarksPerDayTotal = BigDecimal.fromString("0");
  // Same limitation - would need to query or maintain a list
  
  // Calculate totals
  const totalMarksValue = genesisMarksTotal.plus(haTokenMarksTotal).plus(stabilityPoolMarksTotal);
  const totalMarksPerDayValue = haTokenMarksPerDayTotal.plus(stabilityPoolMarksPerDayTotal);
  
  totalMarks.genesisMarks = genesisMarksTotal;
  totalMarks.haTokenMarks = haTokenMarksTotal;
  totalMarks.stabilityPoolMarks = stabilityPoolMarksTotal;
  totalMarks.totalMarks = totalMarksValue;
  totalMarks.totalMarksPerDay = totalMarksPerDayValue;
  totalMarks.lastUpdated = timestamp;
  totalMarks.save();
}

/**
 * Update ha token marks in UserTotalMarks
 * Called when a ha token balance changes
 */
export function updateHaTokenMarksInTotal(
  userAddress: Bytes,
  tokenBalance: HaTokenBalance,
  timestamp: BigInt
): void {
  const id = userAddress.toHexString();
  let totalMarks = UserTotalMarks.load(id);
  
  if (totalMarks == null) {
    totalMarks = new UserTotalMarks(id);
    totalMarks.user = userAddress;
    totalMarks.genesisMarks = BigDecimal.fromString("0");
    totalMarks.haTokenMarks = BigDecimal.fromString("0");
    totalMarks.stabilityPoolMarks = BigDecimal.fromString("0");
    totalMarks.totalMarks = BigDecimal.fromString("0");
    totalMarks.totalMarksPerDay = BigDecimal.fromString("0");
    totalMarks.lastUpdated = timestamp;
  }
  
  // Add this token's marks to the total
  // Note: This is simplified - in reality you'd need to sum all ha token balances
  // For now, we'll just update when this specific balance changes
  // A more complete solution would maintain a list or query all balances
  
  totalMarks.haTokenMarks = tokenBalance.accumulatedMarks;
  totalMarks.totalMarks = totalMarks.genesisMarks
    .plus(tokenBalance.accumulatedMarks)
    .plus(totalMarks.stabilityPoolMarks);
  totalMarks.totalMarksPerDay = totalMarks.totalMarksPerDay.plus(tokenBalance.marksPerDay);
  totalMarks.lastUpdated = timestamp;
  totalMarks.save();
}

/**
 * Update stability pool marks in UserTotalMarks
 * Called when a stability pool deposit changes
 */
export function updateStabilityPoolMarksInTotal(
  userAddress: Bytes,
  poolDeposit: StabilityPoolDeposit,
  timestamp: BigInt
): void {
  const id = userAddress.toHexString();
  let totalMarks = UserTotalMarks.load(id);
  
  if (totalMarks == null) {
    totalMarks = new UserTotalMarks(id);
    totalMarks.user = userAddress;
    totalMarks.genesisMarks = BigDecimal.fromString("0");
    totalMarks.haTokenMarks = BigDecimal.fromString("0");
    totalMarks.stabilityPoolMarks = BigDecimal.fromString("0");
    totalMarks.totalMarks = BigDecimal.fromString("0");
    totalMarks.totalMarksPerDay = BigDecimal.fromString("0");
    totalMarks.lastUpdated = timestamp;
  }
  
  // Add this pool's marks to the total
  // Note: This is simplified - in reality you'd need to sum all pool deposits
  totalMarks.stabilityPoolMarks = poolDeposit.accumulatedMarks;
  totalMarks.totalMarks = totalMarks.genesisMarks
    .plus(totalMarks.haTokenMarks)
    .plus(poolDeposit.accumulatedMarks);
  totalMarks.totalMarksPerDay = totalMarks.totalMarksPerDay.plus(poolDeposit.marksPerDay);
  totalMarks.lastUpdated = timestamp;
  totalMarks.save();
}

