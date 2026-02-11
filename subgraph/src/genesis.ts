import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  GenesisEnds as GenesisEndsEvent,
} from "../generated/Genesis_ETH_fxUSD/Genesis";
import {
  Deposit,
  Withdrawal,
  GenesisEnd,
  UserHarborMarks,
  UserList,
  MarketBonusStatus,
} from "../generated/schema";
import { BigDecimal, BigInt, Bytes, ethereum, Address } from "@graphprotocol/graph-ts";
import { WrappedPriceOracle } from "../generated/Genesis_ETH_fxUSD/WrappedPriceOracle";
import { ChainlinkAggregator } from "../generated/HaToken_haETH/ChainlinkAggregator";
import { setMarketBoostWindow, ANCHOR_BOOST_MULTIPLIER, SAIL_BOOST_MULTIPLIER } from "./marksBoost";

// Constants (v1.0.3)
const MARKS_PER_DOLLAR_PER_DAY = BigDecimal.fromString("10");
const BONUS_MARKS_PER_DOLLAR = BigDecimal.fromString("100"); // 100 marks per dollar bonus at genesis end
const EARLY_BONUS_MARKS_PER_DOLLAR = BigDecimal.fromString("100"); // 100 marks per dollar for early depositors
const EARLY_BONUS_THRESHOLD_FXSAVE = BigDecimal.fromString("250000"); // 250k fxUSD tokens (not USD)
const EARLY_BONUS_THRESHOLD_WSTETH = BigDecimal.fromString("70"); // 70 wstETH tokens (not USD)
const EARLY_BONUS_THRESHOLD_FXSAVE_EUR = BigDecimal.fromString("50000"); // 50k fxUSD tokens (EUR markets)
const EARLY_BONUS_THRESHOLD_WSTETH_EUR = BigDecimal.fromString("15"); // ~50k USD in wstETH (EUR markets)
// Metals and all future campaigns (lower threshold)
const EARLY_BONUS_THRESHOLD_FXSAVE_METALS = BigDecimal.fromString("25000"); // 25k fxSAVE
const EARLY_BONUS_THRESHOLD_WSTETH_METALS = BigDecimal.fromString("15"); // 15 wstETH
const SECONDS_PER_DAY = BigDecimal.fromString("86400");
const E18 = BigDecimal.fromString("1000000000000000000"); // 10^18

// 8 days (boost duration, per product rules)
const BOOST_DURATION_SECONDS = BigInt.fromI32(8 * 24 * 60 * 60);

function getCampaignId(contractAddress: Bytes): string {
  const address = contractAddress.toHexString().toLowerCase();
  // Launch Maiden Voyage (first 3 markets)
  if (address == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc") {
    return "launch-maiden-voyage";
  }
  if (address == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c") {
    return "launch-maiden-voyage";
  }
  if (address == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00") {
    return "launch-maiden-voyage";
  }

  // Euro Maiden Voyage
  if (address == "0xf4f97218a00213a57a32e4606aaecc99e1805a89") {
    // stETH-EUR genesis
    return "euro-maiden-voyage";
  }
  if (address == "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b") {
    // fxUSD-EUR genesis
    return "euro-maiden-voyage";
  }

  // Metals Maiden Voyage (GOLD + SILVER)
  if (address == "0x2cbf457112ef5a16cfca10fb173d56a5cc9daa66") {
    return "metals-maiden-voyage"; // fxUSD-GOLD genesis
  }
  if (address == "0x8ad6b177137a6c33070c27d98355717849ce526c") {
    return "metals-maiden-voyage"; // stETH-GOLD genesis
  }
  if (address == "0x66d18b9dd5d1cd51957dfea0e0373b54e06118c8") {
    return "metals-maiden-voyage"; // fxUSD-SILVER genesis
  }
  if (address == "0x8f655ca32a1fa8032955989c19e91886f26439dc") {
    return "metals-maiden-voyage"; // stETH-SILVER genesis
  }

  return "unknown-maiden-voyage";
}

function getCampaignLabel(campaignId: string): string {
  if (campaignId == "launch-maiden-voyage") {
    return "Launch Maiden Voyage";
  }
  if (campaignId == "euro-maiden-voyage") {
    return "Euro Maiden Voyage";
  }
  if (campaignId == "metals-maiden-voyage") {
    return "Metals Maiden Voyage";
  }
  return "Unknown Maiden Voyage";
}

/**
 * Hardcoded mapping from Genesis contract -> market sources (v1).
 * This enforces the rule: boosts start exactly at GenesisEnd.timestamp and last 8 days,
 * for ALL sources in the market (ha token + both pools + sail token).
 *
 * Note: This is intentionally explicit; if/when new markets are added, extend this mapping.
 */
function applyMarketBoostWindowsFromGenesisEnd(
  genesisAddress: Address,
  genesisEndTimestamp: BigInt
): void {
  const addr = genesisAddress.toHexString().toLowerCase();
  const start = genesisEndTimestamp;
  const end = genesisEndTimestamp.plus(BOOST_DURATION_SECONDS);

  // Production v1: ETH/fxUSD (haETH + ETH pools + hsFXUSD-ETH)
  if (addr == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc") {
    // haETH
    setMarketBoostWindow(
      "haToken",
      Bytes.fromHexString("0x7a53ebc85453dd006824084c4f4be758fcf8a5b5"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    // pools
    setMarketBoostWindow(
      "stabilityPoolCollateral",
      Bytes.fromHexString("0x1f985cf7c10a81de1940da581208d2855d263d72"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    setMarketBoostWindow(
      "stabilityPoolLeveraged",
      Bytes.fromHexString("0x438b29ec7a1770ddba37d792f1a6e76231ef8e06"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    // sail token
    setMarketBoostWindow(
      "sailToken",
      Bytes.fromHexString("0x0cd6bb1a0cfd95e2779edc6d17b664b481f2eb4c"),
      start,
      end,
      SAIL_BOOST_MULTIPLIER
    );
  }

  // Production v1: BTC/fxUSD (haBTC + BTC fxUSD pools + hsFXUSD-BTC)
  if (addr == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c") {
    // haBTC
    setMarketBoostWindow(
      "haToken",
      Bytes.fromHexString("0x25ba4a826e1a1346dca2ab530831dbff9c08bea7"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    // pools
    setMarketBoostWindow(
      "stabilityPoolCollateral",
      Bytes.fromHexString("0x86561cdb34ebe8b9ababb0dd7bea299fa8532a49"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    setMarketBoostWindow(
      "stabilityPoolLeveraged",
      Bytes.fromHexString("0x9e56f1e1e80ebf165a1daa99f9787b41cd5bfe40"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    // sail token
    setMarketBoostWindow(
      "sailToken",
      Bytes.fromHexString("0x9567c243f647f9ac37efb7fc26bd9551dce0be1b"),
      start,
      end,
      SAIL_BOOST_MULTIPLIER
    );
  }

  // Production v1: BTC/stETH (haBTC + BTC stETH pools + hsSTETH-BTC)
  if (addr == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00") {
    // haBTC (same token as BTC markets)
    setMarketBoostWindow(
      "haToken",
      Bytes.fromHexString("0x25ba4a826e1a1346dca2ab530831dbff9c08bea7"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    // pools
    setMarketBoostWindow(
      "stabilityPoolCollateral",
      Bytes.fromHexString("0x667ceb303193996697a5938cd6e17255eeacef51"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    setMarketBoostWindow(
      "stabilityPoolLeveraged",
      Bytes.fromHexString("0xcb4f3e21de158bf858aa03e63e4cec7342177013"),
      start,
      end,
      ANCHOR_BOOST_MULTIPLIER
    );
    // sail token
    setMarketBoostWindow(
      "sailToken",
      Bytes.fromHexString("0x817adae288ed46b8618aaeffe75acd26a0a1b0fd"),
      start,
      end,
      SAIL_BOOST_MULTIPLIER
    );
  }
}

// Price oracle addresses for each genesis contract
// Returns the price oracle address for a given genesis contract, or empty string if not found
function getPriceOracleAddress(genesisAddress: string): string {
  // Production v1 contracts
  if (genesisAddress == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc") {
    return "0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c"; // ETH/fxUSD (production v1)
  }
  if (genesisAddress == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c") {
    return "0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6"; // BTC/fxUSD (production v1)
  }
  if (genesisAddress == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00") {
    return "0xe370289af2145a5b2f0f7a4a900ebfd478a156db"; // BTC/stETH (production v1)
  }
  // Legacy test contracts
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
  // EUR markets (production v1)
  if (genesisAddress == "0xf4f97218a00213a57a32e4606aaecc99e1805a89") {
    return "0xe370289af2145a5b2f0f7a4a900ebfd478a156db"; // stETH/EUR (EUR::stETH::priceOracle)
  }
  if (genesisAddress == "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b") {
    return "0x71437c90f1e0785dd691fd02f7be0b90cd14c097"; // fxUSD/EUR (EUR::fxUSD::priceOracle)
  }
  return "";
}

// Fallback prices if oracle fails (in USD)
function getFallbackPrice(genesisAddress: string): BigDecimal {
  // Production v1 contracts
  if (genesisAddress == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc") {
    return BigDecimal.fromString("1.07"); // fxSAVE ~$1.07 (production v1)
  }
  if (genesisAddress == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c") {
    return BigDecimal.fromString("1.07"); // fxSAVE ~$1.07 (production v1)
  }
  if (genesisAddress == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00") {
    return BigDecimal.fromString("4400"); // wstETH ~$4400 (production v1)
  }
  // Legacy test contracts
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
  // EUR markets (production v1)
  if (genesisAddress == "0xf4f97218a00213a57a32e4606aaecc99e1805a89") {
    return BigDecimal.fromString("3600"); // wstETH ~$3600 (stETH/EUR)
  }
  if (genesisAddress == "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b") {
    return BigDecimal.fromString("1.07"); // fxSAVE ~$1.07 (fxUSD/EUR)
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
export function getWrappedTokenPriceUSD(genesisAddress: Bytes, block: ethereum.Block): BigDecimal {
  const genesisAddressStr = genesisAddress.toHexString();
  
  // IMPORTANT: The oracle returns the pegged asset price (haETH/haBTC) instead of the underlying collateral
  // For fxUSD/fxSAVE markets: Oracle returns haETH/haBTC price, but we need fxUSD price ($1.00)
  // For wstETH markets: Oracle returns haBTC price, but we need wstETH price (~$3,600)
  // Solution: Use CoinGecko or hardcoded prices for underlying, then multiply by wrapped rate
  
  // Determine if market is BTC-pegged (uses haBTC), ETH-pegged (uses haETH), or EUR-pegged (uses haEUR)
  // BTC-pegged markets: BTC/fxUSD, BTC/stETH
  // ETH-pegged markets: ETH/fxUSD
  // EUR-pegged markets: stETH/EUR, fxUSD/EUR
  const isBTCPeggedMarket = genesisAddressStr == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c" || // BTC/fxUSD (production v1)
                             genesisAddressStr == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00" || // BTC/stETH (production v1)
                             genesisAddressStr == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe" || // BTC/fxUSD (legacy test)
                             genesisAddressStr == "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0"; // BTC/stETH (legacy test)
  
  const isStethEurMarket = genesisAddressStr == "0xf4f97218a00213a57a32e4606aaecc99e1805a89"; // stETH/EUR (production v1)
  
  // ETH/fxUSD and BTC/fxUSD markets use fxUSD as underlying collateral
  const isFxUSDMarket = genesisAddressStr == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc" || // ETH/fxUSD (production v1)
                        genesisAddressStr == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c" || // BTC/fxUSD (production v1)
                        genesisAddressStr == "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b" || // fxUSD/EUR (production v1)
                        genesisAddressStr == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073" || // Legacy test
                        genesisAddressStr == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe" || // Legacy test
                        genesisAddressStr == "0x1454707877cdb966e29cea8a190c2169eeca4b8c"; // Legacy test
  
  // BTC/stETH market uses wstETH as collateral
  const isWstETHMarket = genesisAddressStr == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00" || // BTC/stETH (production v1)
                          genesisAddressStr == "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0"; // Legacy test
  
  if (isFxUSDMarket) {
    // For fxUSD markets: Use same calculation pattern as wstETH
    // Determine if market is ETH-pegged (haETH) or BTC-pegged (haBTC)
    // Oracle returns fxSAVE/ETH or fxSAVE/BTC rate depending on pegged token
    // We need to multiply by ETH/USD or BTC/USD to get fxSAVE price in USD
    
    const oracleAddressStr = getPriceOracleAddress(genesisAddressStr);
    if (oracleAddressStr == "") {
      // No oracle configured - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    // Get fxSAVE rate from the market's oracle
    const oracleAddress = Address.fromString(oracleAddressStr);
    const oracle = WrappedPriceOracle.bind(oracleAddress);
    const result = oracle.try_latestAnswer();
    
    if (result.reverted) {
      // Oracle call failed - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    // Extract fxSAVE rate (18 decimals)
    // For ETH-pegged markets: maxUnderlyingPrice = fxSAVE/ETH rate
    // For BTC-pegged markets: maxUnderlyingPrice = fxSAVE/BTC rate
    const fxsaveRate = result.value.value1; // maxUnderlyingPrice
    const fxsaveRateDecimal = fxsaveRate.toBigDecimal().div(E18);
    
    // Determine if this is an ETH-pegged or BTC-pegged market
    const isETHMarket = genesisAddressStr == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc" || // ETH/fxUSD (production v1)
                        genesisAddressStr == "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b" || // fxUSD/EUR (production v1)
                        genesisAddressStr == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073" || // Legacy test
                        genesisAddressStr == "0x1454707877cdb966e29cea8a190c2169eeca4b8c"; // Legacy test
    
    let peggedTokenUsdPrice: BigDecimal;
    
    if (isETHMarket) {
      // ETH-pegged market: Get ETH/USD price from Chainlink
      // Standard Chainlink ETH/USD oracle: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
      const ethUsdOracleAddress = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
      const ethUsdOracle = ChainlinkAggregator.bind(ethUsdOracleAddress);
      const ethUsdResult = ethUsdOracle.try_latestAnswer();
      
      if (ethUsdResult.reverted) {
        // Chainlink ETH/USD failed - return 0 to indicate pricing failure
        return BigDecimal.fromString("0");
      }
      
      // Chainlink ETH/USD uses 8 decimals
      peggedTokenUsdPrice = ethUsdResult.value.toBigDecimal().div(BigDecimal.fromString("100000000")); // 10^8
    } else {
      // BTC-pegged market: Get BTC/USD price from Chainlink
      // Standard Chainlink BTC/USD oracle: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
      const btcUsdOracleAddress = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");
      const btcUsdOracle = ChainlinkAggregator.bind(btcUsdOracleAddress);
      const btcUsdResult = btcUsdOracle.try_latestAnswer();
      
      if (btcUsdResult.reverted) {
        // Chainlink BTC/USD failed - return 0 to indicate pricing failure
        return BigDecimal.fromString("0");
      }
      
      // Chainlink BTC/USD uses 8 decimals
      peggedTokenUsdPrice = btcUsdResult.value.toBigDecimal().div(BigDecimal.fromString("100000000")); // 10^8
    }
    
    // Apply wrapped rate (fxSAVE NAV) to get fxSAVE price in USD
    const maxWrappedRate = result.value.value3;
    const wrappedRate = maxWrappedRate.toBigDecimal().div(E18);
    
    // Calculate fxSAVE price in USD: (fxSAVE/ETH or fxSAVE/BTC rate) × (ETH/USD or BTC/USD price) × NAV
    const fxsaveUsdPrice = fxsaveRateDecimal.times(peggedTokenUsdPrice).times(wrappedRate);
    
    // Ensure we have a valid price
    if (fxsaveUsdPrice.le(BigDecimal.fromString("0"))) {
      // Calculated price is invalid - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    return fxsaveUsdPrice;
  }
  
  if (isStethEurMarket) {
    // stETH/EUR market: oracle returns stETH per wstETH (wrapped rate). Use ETH/USD to price wstETH in USD.
    const oracleAddressStr = getPriceOracleAddress(genesisAddressStr);
    if (oracleAddressStr == "") {
      // No oracle configured - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    const oracleAddress = Address.fromString(oracleAddressStr);
    const oracle = WrappedPriceOracle.bind(oracleAddress);
    const result = oracle.try_latestAnswer();
    
    if (result.reverted) {
      // Oracle call failed - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    const maxWrappedRate = result.value.value3;
    const wrappedRate = maxWrappedRate.toBigDecimal().div(E18);
    
    // Get ETH/USD price from Chainlink
    const ethUsdOracleAddress = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
    const ethUsdOracle = ChainlinkAggregator.bind(ethUsdOracleAddress);
    const ethUsdResult = ethUsdOracle.try_latestAnswer();
    
    if (ethUsdResult.reverted) {
      // Chainlink ETH/USD failed - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    const ethUsdPrice = ethUsdResult.value.toBigDecimal().div(BigDecimal.fromString("100000000")); // 10^8
    const wstethUsdPrice = ethUsdPrice.times(wrappedRate);
    
    if (wstethUsdPrice.le(BigDecimal.fromString("0"))) {
      // Calculated price is invalid - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    return wstethUsdPrice;
  }
  
  if (isWstETHMarket) {
    // For BTC/stETH market: This market uses haBTC (BTC-pegged), so oracle returns BTC-denominated prices
    // Oracle value: maxUnderlyingPrice = wstETH/BTC rate (e.g., 0.041 BTC per wstETH)
    // We need to multiply by BTC/USD to get wstETH price in USD
    // Calculation: wstETH USD = (wstETH/BTC rate) × (BTC/USD price)
    
    const oracleAddressStr = getPriceOracleAddress(genesisAddressStr);
    if (oracleAddressStr == "") {
      // No oracle configured - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    // Get wstETH/BTC rate from the market's oracle
    const oracleAddress = Address.fromString(oracleAddressStr);
    const oracle = WrappedPriceOracle.bind(oracleAddress);
    const result = oracle.try_latestAnswer();
    
    if (result.reverted) {
      // Oracle call failed - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    // Extract wstETH/BTC rate (18 decimals)
    // Since this is a BTC-pegged market (haBTC), the oracle returns BTC-denominated prices
    const wstethBtcRate = result.value.value1; // maxUnderlyingPrice = wstETH/BTC rate
    const wstethBtcRateDecimal = wstethBtcRate.toBigDecimal().div(E18);
    
    // Get wrapped rate (stETH <-> wstETH conversion, typically ~1.22)
    const maxWrappedRate = result.value.value3;
    const wrappedRate = maxWrappedRate.toBigDecimal().div(E18);
    
    // Get BTC/USD price from Chainlink
    // Standard Chainlink BTC/USD oracle: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
    const btcUsdOracleAddress = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");
    const btcUsdOracle = ChainlinkAggregator.bind(btcUsdOracleAddress);
    const btcUsdResult = btcUsdOracle.try_latestAnswer();
    
      if (btcUsdResult.reverted) {
        // Chainlink BTC/USD failed - return 0 to indicate pricing failure
        return BigDecimal.fromString("0");
      }
    
    // Chainlink BTC/USD uses 8 decimals
    const btcUsdPrice = btcUsdResult.value.toBigDecimal().div(BigDecimal.fromString("100000000")); // 10^8
    
    // Calculate wstETH price in USD: (wstETH/BTC rate) × (BTC/USD price)
    // The oracle returns wstETH/BTC directly (since market is BTC-pegged), so no wrapped rate multiplication needed
    const wstethUsdPrice = wstethBtcRateDecimal.times(btcUsdPrice);
    
    // Ensure we have a valid price
    if (wstethUsdPrice.le(BigDecimal.fromString("0"))) {
      // Calculated price is invalid - return 0 to indicate pricing failure
      return BigDecimal.fromString("0");
    }
    
    return wstethUsdPrice;
  }
  
  // For other markets, use oracle normally
  const oracleAddressStr = getPriceOracleAddress(genesisAddressStr);
  
  // If no oracle configured, return 0 to indicate pricing failure
  if (oracleAddressStr == "") {
    return BigDecimal.fromString("0");
  }
  
  // Bind to the price oracle contract
  const oracleAddress = Address.fromString(oracleAddressStr);
  const oracle = WrappedPriceOracle.bind(oracleAddress);
  
  // Call latestAnswer() which returns (minUnderlyingPrice, maxUnderlyingPrice, minWrappedRate, maxWrappedRate)
  const result = oracle.try_latestAnswer();
  
  if (result.reverted) {
    // Oracle call failed - return 0 to indicate pricing failure
    return BigDecimal.fromString("0");
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
    // Calculated price is invalid - return 0 to indicate pricing failure
    return BigDecimal.fromString("0");
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
    const campaignId = getCampaignId(contractAddress);
    userMarks = new UserHarborMarks(id);
    userMarks.contractAddress = contractAddress;
    userMarks.campaignId = campaignId;
    userMarks.campaignLabel = getCampaignLabel(campaignId);
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
    userMarks.qualifiesForEarlyBonus = false;
    userMarks.earlyBonusMarks = BigDecimal.fromString("0");
    userMarks.earlyBonusEligibleDepositUSD = BigDecimal.fromString("0");
    userMarks.lastUpdated = BigInt.fromI32(0);
  }
  return userMarks;
}

// Helper to get collateral symbol for a genesis contract
function getCollateralSymbol(genesisAddress: string): string {
  // Normalize address to lowercase for comparison
  const addr = genesisAddress.toLowerCase();
  
  // Production v1: ETH/fxUSD and BTC/fxUSD markets use fxSAVE
  if (addr == "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc" || // ETH/fxUSD (production v1)
      addr == "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c" || // BTC/fxUSD (production v1)
      addr == "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b" || // fxUSD/EUR (new)
      addr == "0x2cbf457112ef5a16cfca10fb173d56a5cc9daa66" || // GOLD::fxUSD::genesis (Metals)
      addr == "0x66d18b9dd5d1cd51957dfea0e0373b54e06118c8" || // SILVER::fxUSD::genesis (Metals)
      // Legacy test contracts (for backward compatibility)
      addr == "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073" ||
      addr == "0x288c61c3b3684ff21adf38d878c81457b19bd2fe" ||
      addr == "0x1454707877cdb966e29cea8a190c2169eeca4b8c") {
    return "fxSAVE";
  }
  // Production v1: BTC/stETH market uses wstETH
  if (addr == "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00" || // BTC/stETH (production v1)
      addr == "0xf4f97218a00213a57a32e4606aaecc99e1805a89" || // stETH/EUR
      addr == "0x8ad6b177137a6c33070c27d98355717849ce526c" || // GOLD::stETH::genesis (Metals)
      addr == "0x8f655ca32a1fa8032955989c19e91886f26439dc" || // SILVER::stETH::genesis (Metals)
      // Legacy test contract (for backward compatibility)
      addr == "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0") {
    return "wstETH";
  }
  return "unknown";
}

function getEarlyBonusThresholdAmount(
  contractAddress: Bytes,
  collateralSymbol: string
): BigDecimal {
  const addr = contractAddress.toHexString().toLowerCase();
  // EUR markets
  if (addr == "0xf4f97218a00213a57a32e4606aaecc99e1805a89") {
    // stETH-EUR genesis
    return EARLY_BONUS_THRESHOLD_WSTETH_EUR;
  }
  if (addr == "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b") {
    // fxUSD-EUR genesis
    return EARLY_BONUS_THRESHOLD_FXSAVE_EUR;
  }
  // Metals maiden voyage (and default for all future campaigns)
  if (addr == "0x2cbf457112ef5a16cfca10fb173d56a5cc9daa66" || addr == "0x66d18b9dd5d1cd51957dfea0e0373b54e06118c8") {
    return EARLY_BONUS_THRESHOLD_FXSAVE_METALS; // fxUSD-GOLD, fxUSD-SILVER
  }
  if (addr == "0x8ad6b177137a6c33070c27d98355717849ce526c" || addr == "0x8f655ca32a1fa8032955989c19e91886f26439dc") {
    return EARLY_BONUS_THRESHOLD_WSTETH_METALS; // stETH-GOLD, stETH-SILVER
  }
  const isFxSAVE = collateralSymbol == "fxSAVE";
  return isFxSAVE ? EARLY_BONUS_THRESHOLD_FXSAVE : EARLY_BONUS_THRESHOLD_WSTETH;
}

// Helper to get or create market bonus status
function getOrCreateMarketBonusStatus(
  contractAddress: Bytes
): MarketBonusStatus {
  const id = contractAddress.toHexString();
  let marketBonus = MarketBonusStatus.load(id);
  if (marketBonus == null) {
    marketBonus = new MarketBonusStatus(id);
    marketBonus.contractAddress = contractAddress;
    marketBonus.thresholdReached = false;
    marketBonus.thresholdReachedAt = null;
    marketBonus.cumulativeDeposits = BigDecimal.fromString("0");
    marketBonus.lastUpdated = BigInt.fromI32(0);
  }
  
  // Determine collateral type and set threshold (in token amounts, not USD)
  // Update even if entity exists (fixes entities created with "unknown")
  const collateralSymbol = getCollateralSymbol(contractAddress.toHexString());
  marketBonus.thresholdAmount = getEarlyBonusThresholdAmount(
    contractAddress,
    collateralSymbol
  );
  marketBonus.thresholdToken = collateralSymbol;
  
  return marketBonus;
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
  const depositCampaignId = getCampaignId(contractAddress);
  deposit.campaignId = depositCampaignId;
  deposit.campaignLabel = getCampaignLabel(depositCampaignId);
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
  
  // Early deposit bonus tracking
  // Get market bonus status to check if threshold has been reached
  const marketBonus = getOrCreateMarketBonusStatus(contractAddress);
  
  // Check if threshold already reached before this deposit
  const qualifiesForBonus = !marketBonus.thresholdReached;
  deposit.qualifiesForEarlyBonus = qualifiesForBonus;
  deposit.earlyBonusAmount = qualifiesForBonus 
    ? amountUSD.times(EARLY_BONUS_MARKS_PER_DOLLAR)
    : BigDecimal.fromString("0");
  
  deposit.save();
  
  // Update market bonus status with this deposit (track token amounts, not USD)
  // Always update and save to ensure entity exists (fixes entities created with "unknown")
  if (!marketBonus.thresholdReached) {
    marketBonus.cumulativeDeposits = marketBonus.cumulativeDeposits.plus(amountInTokens);
    
    // Check if threshold is reached with this deposit
    if (marketBonus.cumulativeDeposits.ge(marketBonus.thresholdAmount)) {
      marketBonus.thresholdReached = true;
      marketBonus.thresholdReachedAt = timestamp;
    }
  }
  
  // Always update lastUpdated and save to ensure entity exists
  marketBonus.lastUpdated = timestamp;
  marketBonus.save();
  
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
  
  // Update early bonus eligibility
  if (deposit.qualifiesForEarlyBonus) {
    userMarks.qualifiesForEarlyBonus = true;
    userMarks.earlyBonusEligibleDepositUSD = userMarks.earlyBonusEligibleDepositUSD.plus(amountUSD);
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
  const withdrawalCampaignId = getCampaignId(contractAddress);
  withdrawal.campaignId = withdrawalCampaignId;
  withdrawal.campaignLabel = getCampaignLabel(withdrawalCampaignId);
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
  
  // Reduce early bonus eligible deposit proportionally
  // If user withdraws, they lose early bonus eligibility for the withdrawn portion
  if (userMarks.earlyBonusEligibleDepositUSD.gt(BigDecimal.fromString("0")) && depositUSDBeforeWithdrawal.gt(BigDecimal.fromString("0"))) {
    const withdrawalPercentage = amountUSD.div(depositUSDBeforeWithdrawal);
    const earlyBonusReduction = userMarks.earlyBonusEligibleDepositUSD.times(withdrawalPercentage);
    userMarks.earlyBonusEligibleDepositUSD = userMarks.earlyBonusEligibleDepositUSD.minus(earlyBonusReduction);
    
    // If no more eligible deposit, mark as not qualifying
    if (userMarks.earlyBonusEligibleDepositUSD.le(BigDecimal.fromString("0"))) {
      userMarks.qualifiesForEarlyBonus = false;
      userMarks.earlyBonusEligibleDepositUSD = BigDecimal.fromString("0");
    }
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
  const genesisCampaignId = getCampaignId(contractAddress);
  genesisEnd.campaignId = genesisCampaignId;
  genesisEnd.campaignLabel = getCampaignLabel(genesisCampaignId);
  genesisEnd.timestamp = timestamp;
  genesisEnd.txHash = txHash;
  genesisEnd.blockNumber = blockNumber;
  genesisEnd.save();

  // Enforce market boost windows: exactly 8 days from GenesisEnd.timestamp for all sources in this market.
  applyMarketBoostWindowsFromGenesisEnd(contractAddress, timestamp);
  
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
  
  // Calculate early deposit bonus (100 marks per dollar for early depositors)
  if (userMarks.qualifiesForEarlyBonus && userMarks.earlyBonusEligibleDepositUSD.gt(BigDecimal.fromString("0"))) {
    const earlyBonus = userMarks.earlyBonusEligibleDepositUSD.times(EARLY_BONUS_MARKS_PER_DOLLAR);
    userMarks.earlyBonusMarks = earlyBonus;
    userMarks.currentMarks = userMarks.currentMarks.plus(earlyBonus);
    userMarks.totalMarksEarned = userMarks.totalMarksEarned.plus(earlyBonus);
  }
  
  // No more marks per day after genesis ends
  userMarks.marksPerDay = BigDecimal.fromString("0");
  userMarks.lastUpdated = genesisEndTimestamp;
  userMarks.save();
}
