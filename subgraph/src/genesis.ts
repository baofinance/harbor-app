import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  GenesisEnds as GenesisEndsEvent,
} from "../generated/Genesis/Genesis";
import {
  Deposit,
  Withdrawal,
  GenesisEnd,
  UserHarborMarks,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";

// Constants
const MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("10");
const BONUS_MARKS_PER_DOLLAR = BigDecimal.fromString("100"); // 100 marks per dollar bonus at genesis end
const SECONDS_PER_DAY = BigDecimal.fromString("86400");

// Helper to get or create user marks
function getOrCreateUserMarks(
  contractAddress: Bytes,
  userAddress: Bytes
): UserHarborMarks {
  const id = `${contractAddress.toHexString()}-${userAddress.toHexString()}`;
  let userMarks = UserHarborMarks.load(id);
  if (userMarks == null) {
    userMarks = new UserHarborMarks(id);
    userMarks.contractAddress = contractAddress;
    userMarks.user = userAddress;
    userMarks.currentMarks = BigDecimal.fromString("0");
    userMarks.marksPerDay = BigDecimal.fromString("0");
    userMarks.totalMarksEarned = BigDecimal.fromString("0");
    userMarks.totalMarksForfeited = BigDecimal.fromString("0");
    userMarks.bonusMarks = BigDecimal.fromString("0");
    userMarks.totalDeposited = BigInt.fromI32(0);
    userMarks.totalDepositedUSD = BigDecimal.fromString("0");
    userMarks.currentDeposit = BigInt.fromI32(0);
    userMarks.currentDepositUSD = BigDecimal.fromString("0");
    userMarks.genesisStartDate = BigInt.fromI32(0);
    userMarks.genesisEndDate = null;
    userMarks.genesisEnded = false;
    userMarks.lastUpdated = BigInt.fromI32(0);
  }
  return userMarks;
}

export function handleDeposit(event: DepositEvent): void {
  const contractAddress = event.address;
  const userAddress = event.params.receiver;
  const amount = event.params.collateralIn;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  
  // Create deposit entity
  const depositId = `${contractAddress.toHexString()}-${userAddress.toHexString()}-${txHash.toHexString()}-${event.logIndex.toString()}`;
  const deposit = new Deposit(depositId);
  deposit.contractAddress = contractAddress;
  deposit.user = userAddress;
  deposit.amount = amount;
  deposit.amountUSD = null;
  deposit.timestamp = timestamp;
  deposit.txHash = txHash;
  deposit.blockNumber = blockNumber;
  
  // Calculate amount in USD (simplified - 1:1 for now)
  const amountUSD = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  deposit.amountUSD = amountUSD;
  deposit.marksPerDay = amountUSD.times(MARKS_PER_DOLLAR_PER_DAY);
  deposit.isActive = true;
  deposit.withdrawnAmount = BigInt.fromI32(0);
  deposit.withdrawnAt = null;
  deposit.save();
  
  // Update user marks
  let userMarks = getOrCreateUserMarks(contractAddress, userAddress);
  
  // Check if genesis has ended - if so, process marks for genesis end first
  const genesisEnd = GenesisEnd.load(contractAddress.toHexString());
  if (genesisEnd != null && !userMarks.genesisEnded) {
    updateUserMarksForGenesisEnd(userMarks, genesisEnd.timestamp);
    // Reload to get updated values
    userMarks = getOrCreateUserMarks(contractAddress, userAddress);
  }
  
  // Set genesis start date if this is the first deposit (genesis start date is 0)
  if (userMarks.genesisStartDate.equals(BigInt.fromI32(0))) {
    userMarks.genesisStartDate = timestamp;
  }
  
  // If genesis has ended, new deposits don't earn marks
  if (userMarks.genesisEnded) {
    userMarks.totalDeposited = userMarks.totalDeposited.plus(amount);
    userMarks.totalDepositedUSD = userMarks.totalDepositedUSD.plus(amountUSD);
    userMarks.currentDeposit = userMarks.currentDeposit.plus(amount);
    userMarks.currentDepositUSD = userMarks.currentDepositUSD.plus(amountUSD);
    // No marks per day after genesis ends
    userMarks.marksPerDay = BigDecimal.fromString("0");
  } else {
    // During genesis: accumulate marks based on time elapsed
    // First, calculate marks accumulated since last update
    if (userMarks.genesisStartDate.gt(BigInt.fromI32(0)) && userMarks.currentDepositUSD.gt(BigDecimal.fromString("0"))) {
      const timeSinceLastUpdate = timestamp.minus(userMarks.lastUpdated);
      const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
      const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
      
      // Accumulate marks for existing deposit
      const marksAccumulated = userMarks.currentDepositUSD.times(MARKS_PER_DOLLAR_PER_DAY).times(daysSinceLastUpdate);
      userMarks.currentMarks = userMarks.currentMarks.plus(marksAccumulated);
      userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(marksAccumulated);
    }
    
    userMarks.totalDeposited = userMarks.totalDeposited.plus(amount);
    userMarks.totalDepositedUSD = userMarks.totalDepositedUSD.plus(amountUSD);
    userMarks.currentDeposit = userMarks.currentDeposit.plus(amount);
    userMarks.currentDepositUSD = userMarks.currentDepositUSD.plus(amountUSD);
    
    // Calculate marks per day
    userMarks.marksPerDay = userMarks.currentDepositUSD.times(MARKS_PER_DOLLAR_PER_DAY);
  }
  
  userMarks.lastUpdated = timestamp;
  userMarks.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
  const contractAddress = event.address;
  const userAddress = event.params.receiver;
  const amount = event.params.amount;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  
  // Create withdrawal entity
  const withdrawalId = `${contractAddress.toHexString()}-${userAddress.toHexString()}-${txHash.toHexString()}-${event.logIndex.toString()}`;
  const withdrawal = new Withdrawal(withdrawalId);
  withdrawal.contractAddress = contractAddress;
  withdrawal.user = userAddress;
  withdrawal.amount = amount;
  withdrawal.amountUSD = null;
  withdrawal.timestamp = timestamp;
  withdrawal.txHash = txHash;
  withdrawal.blockNumber = blockNumber;
  
  // Calculate amount in USD
  const amountUSD = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  withdrawal.amountUSD = amountUSD;
  
  // Update user marks
  let userMarks = getOrCreateUserMarks(contractAddress, userAddress);
  
  // Check if genesis has ended - if so, process marks for genesis end first
  const genesisEnd = GenesisEnd.load(contractAddress.toHexString());
  if (genesisEnd != null && !userMarks.genesisEnded) {
    updateUserMarksForGenesisEnd(userMarks, genesisEnd.timestamp);
    // Reload to get updated values
    userMarks = getOrCreateUserMarks(contractAddress, userAddress);
  }
  
  // If genesis hasn't ended, accumulate marks up to this point
  if (!userMarks.genesisEnded && userMarks.genesisStartDate.gt(BigInt.fromI32(0)) && userMarks.currentDepositUSD.gt(BigDecimal.fromString("0"))) {
    const timeSinceLastUpdate = timestamp.minus(userMarks.lastUpdated);
    const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
    const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
    
    // Accumulate marks for existing deposit
    const marksAccumulated = userMarks.currentDepositUSD.times(MARKS_PER_DOLLAR_PER_DAY).times(daysSinceLastUpdate);
    userMarks.currentMarks = userMarks.currentMarks.plus(marksAccumulated);
    userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(marksAccumulated);
  }
  
  // Calculate forfeited marks proportionally
  // If user withdraws 50% of their deposit, they lose 50% of their accumulated marks
  let marksForfeited = BigDecimal.fromString("0");
  
  // Only calculate forfeiture if user has marks and deposits
  if (userMarks.currentDeposit.gt(BigInt.fromI32(0)) && userMarks.currentMarks.gt(BigDecimal.fromString("0"))) {
    // Calculate withdrawal percentage
    const currentDepositBD = userMarks.currentDeposit.toBigDecimal();
    const withdrawalPercentage = amount.toBigDecimal().div(currentDepositBD);
    
    // Forfeit marks proportional to withdrawal
    marksForfeited = userMarks.currentMarks.times(withdrawalPercentage);
    
    // Update user marks
    userMarks.currentMarks = userMarks.currentMarks.minus(marksForfeited);
    userMarks.totalMarksForfeited = userMarks.totalMarksForfeited.plus(marksForfeited);
    
    // Ensure non-negative
    if (userMarks.currentMarks.lt(BigDecimal.fromString("0"))) {
      userMarks.currentMarks = BigDecimal.fromString("0");
    }
  }
  
  withdrawal.marksForfeited = marksForfeited;
  withdrawal.save();
  
  // Update deposit amounts
  userMarks.currentDeposit = userMarks.currentDeposit.minus(amount);
  userMarks.currentDepositUSD = userMarks.currentDepositUSD.minus(amountUSD);
  
  // Ensure non-negative
  if (userMarks.currentDepositUSD.lt(BigDecimal.fromString("0"))) {
    userMarks.currentDepositUSD = BigDecimal.fromString("0");
  }
  if (userMarks.currentDeposit.lt(BigInt.fromI32(0))) {
    userMarks.currentDeposit = BigInt.fromI32(0);
  }
  
  // Recalculate marks per day (only if genesis hasn't ended)
  if (!userMarks.genesisEnded) {
    userMarks.marksPerDay = userMarks.currentDepositUSD.times(MARKS_PER_DOLLAR_PER_DAY);
  } else {
    userMarks.marksPerDay = BigDecimal.fromString("0");
  }
  
  userMarks.lastUpdated = timestamp;
  userMarks.save();
}

export function handleGenesisEnd(event: GenesisEndsEvent): void {
  const contractAddress = event.address;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  
  // Create genesis end entity
  const contractAddressString = contractAddress.toHexString();
  let genesisEnd = GenesisEnd.load(contractAddressString);
  if (genesisEnd == null) {
    genesisEnd = new GenesisEnd(contractAddressString);
  }
  genesisEnd.contractAddress = contractAddress;
  genesisEnd.timestamp = timestamp;
  genesisEnd.txHash = txHash;
  genesisEnd.blockNumber = blockNumber;
  genesisEnd.save();
  
  // Update all users with active deposits to calculate accumulated marks and add bonus
  // We need to load all UserHarborMarks for this contract
  // Note: In a real scenario, you might want to use a different approach to iterate all users
  // For now, we'll update users as they interact, but we can also query all deposits
  
  // Load all deposits for this contract to find all users
  // Since we can't easily iterate all entities, we'll update users when they next interact
  // But we can mark genesis as ended for all users by updating the GenesisEnd entity
  // Individual user updates will happen when they interact next, or we can batch update
  
  // For now, we'll handle user updates in a helper function that can be called
  // when users interact, or we can add a separate handler that processes all users
  // This is a limitation of The Graph - we can't easily iterate all entities
  // So we'll update users as they interact, checking if genesis has ended
}

// Helper function to update user marks when genesis ends
// This should be called when processing deposits/withdrawals after genesis ends
function updateUserMarksForGenesisEnd(
  userMarks: UserHarborMarks,
  genesisEndTimestamp: BigInt
): void {
  // Only update if genesis hasn't been processed for this user yet
  if (userMarks.genesisEnded) {
    return;
  }
  
  // First, accumulate any marks since last update up to genesis end
  if (userMarks.genesisStartDate.gt(BigInt.fromI32(0)) && userMarks.currentDepositUSD.gt(BigDecimal.fromString("0"))) {
    const timeSinceLastUpdate = genesisEndTimestamp.minus(userMarks.lastUpdated);
    const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
    const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
    
    // Accumulate marks for existing deposit up to genesis end
    const marksAccumulated = userMarks.currentDepositUSD.times(MARKS_PER_DOLLAR_PER_DAY).times(daysSinceLastUpdate);
    userMarks.currentMarks = userMarks.currentMarks.plus(marksAccumulated);
    userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(marksAccumulated);
  }
  
  // Mark genesis as ended
  userMarks.genesisEnded = true;
  userMarks.genesisEndDate = genesisEndTimestamp;
  
  // Calculate bonus marks (100 marks per dollar for remaining deposit at genesis end)
  if (userMarks.currentDepositUSD.gt(BigDecimal.fromString("0"))) {
    const bonusMarks = userMarks.currentDepositUSD.times(BONUS_MARKS_PER_DOLLAR);
    
    // Add bonus marks
    userMarks.currentMarks = userMarks.currentMarks.plus(bonusMarks);
    userMarks.bonusMarks = bonusMarks;
    userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(bonusMarks);
  }
  
  // No more marks per day after genesis ends
  userMarks.marksPerDay = BigDecimal.fromString("0");
  userMarks.lastUpdated = genesisEndTimestamp;
  userMarks.save();
}
