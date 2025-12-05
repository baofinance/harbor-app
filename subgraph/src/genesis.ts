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
  UserList,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

// Constants
const MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("10");
const BONUS_MARKS_PER_DOLLAR = BigDecimal.fromString("100"); // 100 marks per dollar bonus at genesis end
const SECONDS_PER_DAY = BigDecimal.fromString("86400");

// Oracle address for wstETH/USD (Chainlink Aggregator)
const WSTETH_USD_ORACLE = "0x202CCe504e04bEd6fC0521238dDf04Bc9E8E15aB";
// Mock oracle price: $2000 per wstETH (200000000000 with 8 decimals = 2000 * 10^8)
const WSTETH_PRICE_USD = BigDecimal.fromString("2000");

// Helper function to get wstETH price from Chainlink oracle
// For now, using fixed price. Can be enhanced to fetch from oracle dynamically
function getWstETHPrice(block: ethereum.Block): BigDecimal {
  // TODO: Implement dynamic oracle price fetching
  // For now, return fixed price from mock oracle ($2000)
  return WSTETH_PRICE_USD;
}

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
  
  // Calculate amount in USD using oracle price
  const wstETHPrice = getWstETHPrice(event.block);
  // amount is in wei (18 decimals), price is in USD with 8 decimals from Chainlink
  // amountUSD = (amount * price) / (10^18 * 10^8) * 10^8 = (amount * price) / 10^18
  const amountInTokens = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  const amountUSD = amountInTokens.times(wstETHPrice);
  deposit.amountUSD = amountUSD;
  deposit.marksPerDay = amountUSD.times(MARKS_PER_DOLLAR_PER_DAY);
  deposit.isActive = true;
  deposit.withdrawnAmount = BigInt.fromI32(0);
  deposit.withdrawnAt = null;
  deposit.save();
  
  // Update user marks
  let userMarks = getOrCreateUserMarks(contractAddress, userAddress);
  
  // Add user to UserList for processing when genesis ends
  const contractAddressString = contractAddress.toHexString();
  let userList = UserList.load(contractAddressString);
  if (userList == null) {
    userList = new UserList(contractAddressString);
    userList.contractAddress = contractAddress;
    userList.users = [];
  }
  // Check if user is already in the list
  let userExists = false;
  for (let i = 0; i < userList.users.length; i++) {
    if (userList.users[i].equals(userAddress)) {
      userExists = true;
      break;
    }
  }
  if (!userExists) {
    // Add user to array (AssemblyScript array operations)
    const newUsers = new Array<Bytes>(userList.users.length + 1);
    for (let i = 0; i < userList.users.length; i++) {
      newUsers[i] = userList.users[i];
    }
    newUsers[userList.users.length] = userAddress;
    userList.users = newUsers;
    userList.save();
  }
  
  // Check if genesis has ended - if so, process marks for genesis end first
  const genesisEnd = GenesisEnd.load(contractAddressString);
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
  
  // Calculate amount in USD using oracle price
  const wstETHPrice = getWstETHPrice(event.block);
  // amount is in wei (18 decimals), price is in USD with 8 decimals from Chainlink
  const amountInTokens = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  const amountUSD = amountInTokens.times(wstETHPrice);
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
  
  // Store values BEFORE withdrawal for correct calculation
  const depositBeforeWithdrawal = userMarks.currentDeposit;
  const depositUSDBeforeWithdrawal = userMarks.currentDepositUSD;
  const marksBeforeAccumulation = userMarks.currentMarks;
  
  // First, accumulate marks for the time period BEFORE withdrawal
  // Use the deposit amount BEFORE withdrawal for accumulation
  let marksAfterAccumulation = marksBeforeAccumulation;
  if (!userMarks.genesisEnded && userMarks.genesisStartDate.gt(BigInt.fromI32(0)) && depositUSDBeforeWithdrawal.gt(BigDecimal.fromString("0"))) {
    const timeSinceLastUpdate = timestamp.minus(userMarks.lastUpdated);
    const timeSinceLastUpdateBD = timeSinceLastUpdate.toBigDecimal();
    const daysSinceLastUpdate = timeSinceLastUpdateBD.div(SECONDS_PER_DAY);
    
    // Accumulate marks for the deposit BEFORE withdrawal
    const marksAccumulated = depositUSDBeforeWithdrawal.times(MARKS_PER_DOLLAR_PER_DAY).times(daysSinceLastUpdate);
    marksAfterAccumulation = marksBeforeAccumulation.plus(marksAccumulated);
    userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(marksAccumulated);
  }
  
  // Now calculate forfeited marks proportionally based on withdrawal
  // Forfeit from the total marks (original + accumulated) proportionally to withdrawal
  let marksForfeited = BigDecimal.fromString("0");
  
  // Only calculate forfeiture if user has marks and deposits
  if (depositBeforeWithdrawal.gt(BigInt.fromI32(0)) && marksAfterAccumulation.gt(BigDecimal.fromString("0"))) {
    // Calculate withdrawal percentage based on deposit BEFORE withdrawal
    const depositBeforeWithdrawalBD = depositBeforeWithdrawal.toBigDecimal();
    const amountBD = amount.toBigDecimal();
    
    // Ensure we don't divide by zero and withdrawal doesn't exceed deposit
    if (depositBeforeWithdrawalBD.gt(BigDecimal.fromString("0")) && amountBD.le(depositBeforeWithdrawalBD)) {
      const withdrawalPercentage = amountBD.div(depositBeforeWithdrawalBD);
      
      // Forfeit marks proportional to withdrawal from the total marks (after accumulation)
      marksForfeited = marksAfterAccumulation.times(withdrawalPercentage);
      
      // Update user marks
      userMarks.currentMarks = marksAfterAccumulation.minus(marksForfeited);
      userMarks.totalMarksForfeited = userMarks.totalMarksForfeited.plus(marksForfeited);
      
      // Ensure non-negative
      if (userMarks.currentMarks.lt(BigDecimal.fromString("0"))) {
        userMarks.currentMarks = BigDecimal.fromString("0");
      }
    } else {
      // If withdrawal exceeds deposit or invalid, forfeit all marks (shouldn't happen in practice)
      marksForfeited = marksAfterAccumulation;
      userMarks.currentMarks = BigDecimal.fromString("0");
      userMarks.totalMarksForfeited = userMarks.totalMarksForfeited.plus(marksForfeited);
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
  
  // Process all users from UserList
  const userList = UserList.load(contractAddressString);
  if (userList != null) {
    // Iterate through all users and update their marks
    for (let i = 0; i < userList.users.length; i++) {
      const userAddress = userList.users[i];
      const userMarksId = `${contractAddressString}-${userAddress.toHexString()}`;
      const userMarks = UserHarborMarks.load(userMarksId);
      
      if (userMarks != null && !userMarks.genesisEnded) {
        // Process genesis end for this user
        updateUserMarksForGenesisEnd(userMarks, timestamp);
      }
    }
  }
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
