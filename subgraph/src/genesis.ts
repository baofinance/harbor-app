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
import { BigDecimal, BigInt, Bytes, ethereum, Address } from "@graphprotocol/graph-ts";
import { WrappedPriceOracle } from "../generated/Genesis_ETH_fxUSD/WrappedPriceOracle";
import { ChainlinkAggregator } from "../generated/HaToken_haETH/ChainlinkAggregator";

// Constants
const MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("10");
const BONUS_MARKS_PER_DOLLAR = BigDecimal.fromString("100"); // 100 marks per dollar bonus at genesis end
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const E18 = BigDecimal.fromString("1000000000000000000"); // 10^18

// Price oracle addresses for each genesis contract
// Returns the price oracle address for a given genesis contract, or empty string if not found
function getPriceOracleAddress(genesisAddress: string): string {
  if (genesisAddress == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073") {
    return "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c"; // ETH/fxUSD
  }
  if (genesisAddress == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe") {
    return "0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6"; // BTC/fxUSD
  }
  if (genesisAddress == "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0") {
    return "0xe370289af2145a5b2f0f7a4a900ebfd478a156db"; // BTC/stETH
  }
  if (genesisAddress == "0x1454707877cdb966e29cea8a190c2169eeca4b8c") {
    return "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c"; // ETH/fxUSD (alternative address)
  }
  return "";
}

// Fallback prices if oracle fails (in USD)
function getFallbackPrice(genesisAddress: string): BigDecimal {
  if (genesisAddress == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073") {
    return BigDecimal.fromString("1.07"); // fxSAVE ~$1.07
  }
  if (genesisAddress == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe") {
    return BigDecimal.fromString("1.07"); // fxSAVE ~$1.07
  }
  if (genesisAddress == "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0") {
    return BigDecimal.fromString("4400"); // wstETH ~$4400 (stETH ~$3600 * rate ~1.22)
  }
  if (genesisAddress == "0x1454707877cdb966e29cea8a190c2169eeca4b8c") {
    return BigDecimal.fromString("1.07"); // fxSAVE ~$1.07
  }
  return BigDecimal.fromString("1.0"); // Default fallback
}

/**
 * Fetch real-time price from the WrappedPriceOracle contract
 * Returns the wrapped token price in USD (underlying price * wrapped rate)
 * 
 * @param genesisAddress - The genesis contract address
 * @param block - The current block
 * @returns Wrapped token price in USD, or fallback price if oracle fails
 */
function getWrappedTokenPriceUSD(genesisAddress: Bytes, block: ethereum.Block): BigDecimal {
  const genesisAddressStr = genesisAddress.toHexString();
  
  // IMPORTANT: The oracle returns the pegged asset price (haETH/haBTC) instead of the underlying collateral
  // For fxUSD/fxSAVE markets: Oracle returns haETH/haBTC price, but we need fxUSD price ($1.00)
  // For wstETH markets: Oracle returns haBTC price, but we need wstETH price (~$3,600)
  // Solution: Use CoinGecko or hardcoded prices for underlying, then multiply by wrapped rate
  
  // ETH/fxUSD and BTC/fxUSD markets use fxUSD as underlying collateral
  const isFxUSDMarket = genesisAddressStr == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073" || 
                        genesisAddressStr == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe";
  
  // BTC/stETH market uses wstETH as collateral
  const isWstETHMarket = genesisAddressStr == "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0";
  
  if (isFxUSDMarket) {
    // For fxUSD markets: hardcode underlying price to $1.00, then multiply by wrapped rate
    const underlyingPriceUSD = BigDecimal.fromString("1.0"); // fxUSD = $1.00 (hardcoded)
    
    // Get wrapped rate from oracle
    const oracleAddressStr = getPriceOracleAddress(genesisAddressStr);
    if (oracleAddressStr == "") {
      return getFallbackPrice(genesisAddressStr);
    }
    
    const oracleAddress = Address.fromString(oracleAddressStr);
    const oracle = WrappedPriceOracle.bind(oracleAddress);
    const result = oracle.try_latestAnswer();
    
    if (result.reverted) {
      // Oracle call failed, use fallback
      return getFallbackPrice(genesisAddressStr);
    }
    
    // Extract wrapped rate (18 decimals)
    const maxWrappedRate = result.value.value3; // maxWrappedRate (e.g., fxSAVE rate = 1.07)
    const wrappedRate = maxWrappedRate.toBigDecimal().div(E18);
    
    // Calculate wrapped token price: $1.00 * wrapped rate
    // Example: fxSAVE = $1.00 * 1.07 = $1.07
    const wrappedTokenPriceUSD = underlyingPriceUSD.times(wrappedRate);
    
    // Ensure we have a valid price
    if (wrappedTokenPriceUSD.le(BigDecimal.fromString("0"))) {
      return getFallbackPrice(genesisAddressStr);
    }
    
    return wrappedTokenPriceUSD;
  }
  
  if (isWstETHMarket) {
    // For BTC/stETH market: Oracle returns wstETH/BTC cross-rate, not USD price!
    // We need to multiply by BTC/USD to get wstETH price in USD
    // Oracle value: maxUnderlyingPrice = wstETH/BTC rate (e.g., 0.041 BTC per wstETH)
    // Calculation: wstETH USD = (wstETH/BTC rate) × (BTC/USD price)
    
    const oracleAddressStr = getPriceOracleAddress(genesisAddressStr);
    if (oracleAddressStr == "") {
      return getFallbackPrice(genesisAddressStr);
    }
    
    // Get wstETH/BTC rate from the market's oracle
    const oracleAddress = Address.fromString(oracleAddressStr);
    const oracle = WrappedPriceOracle.bind(oracleAddress);
    const result = oracle.try_latestAnswer();
    
    if (result.reverted) {
      return getFallbackPrice(genesisAddressStr);
    }
    
    // Extract wstETH/BTC rate (18 decimals)
    const wstethBtcRate = result.value.value1; // maxUnderlyingPrice = wstETH/BTC rate
    const wstethBtcRateDecimal = wstethBtcRate.toBigDecimal().div(E18);
    
    // Get wrapped rate (stETH <-> wstETH)
    const maxWrappedRate = result.value.value3;
    const wrappedRate = maxWrappedRate.toBigDecimal().div(E18);
    
    // Get BTC/USD price from Chainlink
    // Standard Chainlink BTC/USD oracle: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
    const btcUsdOracleAddress = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");
    const btcUsdOracle = ChainlinkAggregator.bind(btcUsdOracleAddress);
    const btcUsdResult = btcUsdOracle.try_latestAnswer();
    
    if (btcUsdResult.reverted) {
      // If Chainlink fails, use fallback
      return getFallbackPrice(genesisAddressStr);
    }
    
    // Chainlink BTC/USD uses 8 decimals
    const btcUsdPrice = btcUsdResult.value.toBigDecimal().div(BigDecimal.fromString("100000000")); // 10^8
    
    // Calculate wstETH price in USD: (wstETH/BTC rate) × (BTC/USD price) × (wrapped rate)
    // The wrapped rate accounts for the stETH <-> wstETH conversion (~1.22)
    // Example: 0.041 BTC/wstETH × $87,828/BTC × 1.22 = $4,400/wstETH
    const wstethUsdPrice = wstethBtcRateDecimal.times(btcUsdPrice).times(wrappedRate);
    
    // Ensure we have a valid price
    if (wstethUsdPrice.le(BigDecimal.fromString("0"))) {
      return getFallbackPrice(genesisAddressStr);
    }
    
    return wstethUsdPrice;
  }
  
  // For other markets, use oracle normally
  const oracleAddressStr = getPriceOracleAddress(genesisAddressStr);
  
  // If no oracle configured, use fallback
  if (oracleAddressStr == "") {
    return getFallbackPrice(genesisAddressStr);
  }
  
  // Bind to the price oracle contract
  const oracleAddress = Address.fromString(oracleAddressStr);
  const oracle = WrappedPriceOracle.bind(oracleAddress);
  
  // Call latestAnswer() which returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
  const result = oracle.try_latestAnswer();
  
  if (result.reverted) {
    // Oracle call failed, use fallback
    return getFallbackPrice(genesisAddressStr);
  }
  
  // Extract values (all in 18 decimals)
  const maxUnderlyingPrice = result.value.value1; // maxUnderlyingPrice (e.g., wstETH = $4000)
  const maxWrappedRate = result.value.value3; // maxWrappedRate (e.g., wstETH rate = 1.0)
  
  // Convert from BigInt (18 decimals) to BigDecimal
  const underlyingPriceUSD = maxUnderlyingPrice.toBigDecimal().div(E18);
  const wrappedRate = maxWrappedRate.toBigDecimal().div(E18);
  
  // Calculate wrapped token price: underlying price * wrapped rate
  // Example: wstETH = $4000 * 1.0 = $4000
  const wrappedTokenPriceUSD = underlyingPriceUSD.times(wrappedRate);
  
  // Ensure we have a valid price
  if (wrappedTokenPriceUSD.le(BigDecimal.fromString("0"))) {
    return getFallbackPrice(genesisAddressStr);
  }
  
  return wrappedTokenPriceUSD;
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
  
  // Calculate amount in USD using real-time oracle price
  const wrappedTokenPriceUSD = getWrappedTokenPriceUSD(contractAddress, event.block);
  // amount is in wei (18 decimals), price is in USD
  // amountUSD = (amount / 10^18) * priceUSD
  const amountInTokens = amount.toBigDecimal().div(E18);
  const amountUSD = amountInTokens.times(wrappedTokenPriceUSD);
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
  
  // Calculate amount in USD using real-time oracle price
  const wrappedTokenPriceUSD = getWrappedTokenPriceUSD(contractAddress, event.block);
  // amount is in wei (18 decimals), price is in USD
  // amountUSD = (amount / 10^18) * priceUSD
  const amountInTokens = amount.toBigDecimal().div(E18);
  const amountUSD = amountInTokens.times(wrappedTokenPriceUSD);
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
