/**
 * Genesis event handlers for WBTC market
 * Handles Deposit, Withdraw, and GenesisEnds events
 */

import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  GenesisEnds as GenesisEndsEvent,
} from "../generated/Genesis_WBTC/Genesis";
import {
  Deposit,
  Withdrawal,
  GenesisEnd,
  UserHarborMarks,
  UserList,
  UserTotalMarks,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, Address } from "@graphprotocol/graph-ts";

// Constants
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("1.0");

// Helper to get or create UserHarborMarks
function getOrCreateUserHarborMarks(
  contractAddress: Bytes,
  userAddress: Bytes,
  timestamp: BigInt
): UserHarborMarks {
  const id = contractAddress.toHexString().concat("-").concat(userAddress.toHexString());
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
    userMarks.genesisStartDate = timestamp;
    userMarks.genesisEndDate = null;
    userMarks.genesisEnded = false;
    userMarks.lastUpdated = timestamp;
    userMarks.save();
  }

  return userMarks;
}

// Helper to add user to UserList
function addUserToList(contractAddress: Bytes, userAddress: Bytes): void {
  const id = contractAddress.toHexString();
  let userList = UserList.load(id);

  if (userList == null) {
    userList = new UserList(id);
    userList.contractAddress = contractAddress;
    userList.users = [];
  }

  const users = userList.users;
  let found = false;
  for (let i = 0; i < users.length; i++) {
    if (users[i].equals(userAddress)) {
      found = true;
      break;
    }
  }

  if (!found) {
    users.push(userAddress);
    userList.users = users;
    userList.save();
  }
}

// Accumulate marks based on time held
function accumulateMarks(userMarks: UserHarborMarks, currentTimestamp: BigInt): void {
  if (userMarks.currentDeposit.equals(BigInt.fromI32(0))) {
    return;
  }

  const lastUpdate = userMarks.lastUpdated;
  if (currentTimestamp.gt(lastUpdate)) {
    const timeSinceLastUpdate = currentTimestamp.minus(lastUpdate);
    const daysSinceLastUpdate = timeSinceLastUpdate.toBigDecimal().div(SECONDS_PER_DAY);

    if (daysSinceLastUpdate.gt(BigDecimal.fromString("0"))) {
      const marksAccumulated = userMarks.currentDepositUSD
        .times(MARKS_PER_DOLLAR_PER_DAY)
        .times(daysSinceLastUpdate);
      userMarks.currentMarks = userMarks.currentMarks.plus(marksAccumulated);
      userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(marksAccumulated);
    }
  }
}

// Handler for Deposit event
export function handleDeposit(event: DepositEvent): void {
  const contractAddress = event.address;
  const userAddress = event.params.receiver;
  const amount = event.params.collateralIn;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  const logIndex = event.logIndex;

  // Create deposit entity
  const depositId = contractAddress.toHexString()
    .concat("-").concat(userAddress.toHexString())
    .concat("-").concat(txHash.toHexString())
    .concat("-").concat(logIndex.toString());

  const deposit = new Deposit(depositId);
  deposit.contractAddress = contractAddress;
  deposit.user = userAddress;
  deposit.amount = amount;
  deposit.amountUSD = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  deposit.timestamp = timestamp;
  deposit.txHash = txHash;
  deposit.blockNumber = blockNumber;
  deposit.marksPerDay = deposit.amountUSD!.times(MARKS_PER_DOLLAR_PER_DAY);
  deposit.isActive = true;
  deposit.withdrawnAmount = BigInt.fromI32(0);
  deposit.withdrawnAt = null;
  deposit.save();

  // Update user marks
  const userMarks = getOrCreateUserHarborMarks(contractAddress, userAddress, timestamp);
  accumulateMarks(userMarks, timestamp);

  userMarks.currentDeposit = userMarks.currentDeposit.plus(amount);
  userMarks.totalDeposited = userMarks.totalDeposited.plus(amount);
  userMarks.currentDepositUSD = userMarks.currentDeposit.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  userMarks.totalDepositedUSD = userMarks.totalDeposited.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  userMarks.marksPerDay = userMarks.currentDepositUSD.times(MARKS_PER_DOLLAR_PER_DAY);
  userMarks.lastUpdated = timestamp;
  userMarks.save();

  // Add user to list
  addUserToList(contractAddress, userAddress);

  // Update total marks
  updateUserTotalMarks(userAddress, userMarks, timestamp);
}

// Handler for Withdraw event
export function handleWithdraw(event: WithdrawEvent): void {
  const contractAddress = event.address;
  const userAddress = event.params.receiver;
  const amount = event.params.amount;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  const logIndex = event.logIndex;

  // Create withdrawal entity
  const withdrawalId = contractAddress.toHexString()
    .concat("-").concat(userAddress.toHexString())
    .concat("-").concat(txHash.toHexString())
    .concat("-").concat(logIndex.toString());

  const withdrawal = new Withdrawal(withdrawalId);
  withdrawal.contractAddress = contractAddress;
  withdrawal.user = userAddress;
  withdrawal.amount = amount;
  withdrawal.amountUSD = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  withdrawal.timestamp = timestamp;
  withdrawal.txHash = txHash;
  withdrawal.blockNumber = blockNumber;

  // Get user marks and calculate forfeited marks
  const userMarks = getOrCreateUserHarborMarks(contractAddress, userAddress, timestamp);
  accumulateMarks(userMarks, timestamp);

  // Calculate proportion withdrawn and forfeit marks proportionally
  let marksForfeited = BigDecimal.fromString("0");
  if (userMarks.currentDeposit.gt(BigInt.fromI32(0))) {
    const proportion = amount.toBigDecimal().div(userMarks.currentDeposit.toBigDecimal());
    marksForfeited = userMarks.currentMarks.times(proportion);
  }

  withdrawal.marksForfeited = marksForfeited;
  withdrawal.save();

  // Update user marks
  userMarks.currentDeposit = userMarks.currentDeposit.minus(amount);
  if (userMarks.currentDeposit.lt(BigInt.fromI32(0))) {
    userMarks.currentDeposit = BigInt.fromI32(0);
  }
  userMarks.currentDepositUSD = userMarks.currentDeposit.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  userMarks.currentMarks = userMarks.currentMarks.minus(marksForfeited);
  userMarks.totalMarksForfeited = userMarks.totalMarksForfeited.plus(marksForfeited);
  userMarks.marksPerDay = userMarks.currentDepositUSD.times(MARKS_PER_DOLLAR_PER_DAY);
  userMarks.lastUpdated = timestamp;
  userMarks.save();

  // Update total marks
  updateUserTotalMarks(userAddress, userMarks, timestamp);
}

// Handler for GenesisEnds event
export function handleGenesisEnd(event: GenesisEndsEvent): void {
  const contractAddress = event.address;
  const timestamp = event.block.timestamp;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;

  // Create GenesisEnd entity
  const genesisEnd = new GenesisEnd(contractAddress.toHexString());
  genesisEnd.contractAddress = contractAddress;
  genesisEnd.timestamp = timestamp;
  genesisEnd.txHash = txHash;
  genesisEnd.blockNumber = blockNumber;
  genesisEnd.save();

  // Update all users in this genesis contract
  const userList = UserList.load(contractAddress.toHexString());
  if (userList != null) {
    const users = userList.users;
    for (let i = 0; i < users.length; i++) {
      const userAddress = users[i];
      const userMarks = getOrCreateUserHarborMarks(contractAddress, userAddress, timestamp);
      
      // Accumulate final marks
      accumulateMarks(userMarks, timestamp);
      
      // Add bonus marks (100 marks per dollar at genesis end)
      const bonusMarks = userMarks.currentDepositUSD.times(BigDecimal.fromString("100"));
      userMarks.bonusMarks = bonusMarks;
      userMarks.currentMarks = userMarks.currentMarks.plus(bonusMarks);
      userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(bonusMarks);
      
      // Mark genesis as ended
      userMarks.genesisEnded = true;
      userMarks.genesisEndDate = timestamp;
      userMarks.marksPerDay = BigDecimal.fromString("0"); // No more marks after genesis ends
      userMarks.lastUpdated = timestamp;
      userMarks.save();

      // Update total marks
      updateUserTotalMarks(userAddress, userMarks, timestamp);
    }
  }
}

// Helper to update UserTotalMarks
function updateUserTotalMarks(
  userAddress: Bytes,
  userMarks: UserHarborMarks,
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

  // Update genesis marks (add to existing since user might have marks from multiple genesis contracts)
  totalMarks.genesisMarks = totalMarks.genesisMarks.plus(userMarks.currentMarks);
  totalMarks.totalMarks = totalMarks.genesisMarks
    .plus(totalMarks.haTokenMarks)
    .plus(totalMarks.stabilityPoolMarks);
  totalMarks.totalMarksPerDay = totalMarks.totalMarksPerDay.plus(userMarks.marksPerDay);
  totalMarks.lastUpdated = timestamp;
  totalMarks.save();
}

