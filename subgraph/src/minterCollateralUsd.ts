/**
 * Wrapped-collateral USD valuation for minters (shared by minterPnL + wrapped maiden fee paths).
 * Kept separate to avoid import cycles with wrappedCollateralMaidenFeesCore.
 */
import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Minter } from "../generated/Minter_ETH_fxUSD/Minter";
import { WrappedPriceOracle } from "../generated/Minter_ETH_fxUSD/WrappedPriceOracle";
import { ChainlinkAggregator } from "../generated/Minter_ETH_fxUSD/ChainlinkAggregator";

const ZERO_BI = BigInt.fromI32(0);
const ZERO_BD = BigDecimal.fromString("0");
const E18_BD = BigDecimal.fromString("1000000000000000000");
const ONE = BigDecimal.fromString("1");

const ETH_USD_FEED = Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419");
const BTC_USD_FEED = Address.fromString("0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c");
const EUR_USD_FEED = Address.fromString("0xb49f677943C0aD637850Ea3b030e1d3778a050bD");
const XAU_USD_FEED = Address.fromString("0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6");
const XAG_USD_FEED = Address.fromString("0x379589227b15F1a12195D3f2d90bBc9F31f95235");
const CHAINLINK_1E8 = BigDecimal.fromString("100000000");

function toE18(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(E18_BD);
}

function chainlinkUsd(feed: Address): BigDecimal {
  const agg = ChainlinkAggregator.bind(feed);
  const ans = agg.try_latestAnswer();
  if (ans.reverted) return ONE;
  return ans.value.toBigDecimal().div(CHAINLINK_1E8);
}

function getOracleAddressForMinter(minter: Address): Address {
  if (minter.equals(Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F"))) {
    return Address.fromString("0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c");
  }
  if (minter.equals(Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888"))) {
    return Address.fromString("0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6");
  }
  if (minter.equals(Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919"))) {
    return Address.fromString("0xe370289af2145a5b2f0f7a4a900ebfd478a156db");
  }
  if (minter.equals(Address.fromString("0x565f90dc7c022e7857734352c7bf645852d8d4e7"))) {
    return Address.fromString("0x56d1a2fc199ba05f84d2eb8eab5858d3d954030c");
  }
  if (minter.equals(Address.fromString("0x7ffe3acb524fb40207709ba597d39c085d258f15"))) {
    return Address.fromString("0xf6e28853563db7f7e42f5db0e1f959743ac5b0e6");
  }
  if (minter.equals(Address.fromString("0x042e7cb5b993312490ea07fb89f360a65b8a9056"))) {
    return Address.fromString("0xe370289af2145a5b2f0f7a4a900ebfd478a156db");
  }
  if (minter.equals(Address.fromString("0x68911ea33e11bc77e07f6da4db6cd23d723641ce"))) {
    return Address.fromString("0xe370289af2145a5b2f0f7a4a900ebfd478a156db");
  }
  if (minter.equals(Address.fromString("0xdefb2c04062350678965cbf38a216cc50723b246"))) {
    return Address.fromString("0x71437c90f1e0785dd691fd02f7be0b90cd14c097");
  }
  if (minter.equals(Address.fromString("0x880600e0c803d836e305b7c242fc095eed234a8f"))) {
    return Address.fromString("0x1f7f62889e599e51b9e21b27d589fa521516d147");
  }
  if (minter.equals(Address.fromString("0xb315dc4698df45a477d8bb4b0bc694c4d1be91b5"))) {
    return Address.fromString("0x4ebde6143c5e366264ba7416fdea18bc27c04a31");
  }
  if (minter.equals(Address.fromString("0x177bb50574cda129bdd0b0f50d4e061d38aa75ef"))) {
    return Address.fromString("0x14816ff286f2ea46ab48c3275401fd4b1ef817b5");
  }
  if (minter.equals(Address.fromString("0x1c0067bee039a293804b8be951b368d2ec65b3e9"))) {
    return Address.fromString("0x7223e17bd4527acbe44644300ea0f09a4aebc995");
  }
  return Address.zero();
}

function isFxUsdMinter(minter: Address): boolean {
  if (minter.equals(Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F"))) return true;
  if (minter.equals(Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888"))) return true;
  if (minter.equals(Address.fromString("0x565f90dc7c022e7857734352c7bf645852d8d4e7"))) return true;
  if (minter.equals(Address.fromString("0x7ffe3acb524fb40207709ba597d39c085d258f15"))) return true;
  if (minter.equals(Address.fromString("0xdefb2c04062350678965cbf38a216cc50723b246"))) return true;
  if (minter.equals(Address.fromString("0x880600e0c803d836e305b7c242fc095eed234a8f"))) return true;
  if (minter.equals(Address.fromString("0x177bb50574cda129bdd0b0f50d4e061d38aa75ef"))) return true;
  return false;
}

function isEthPegged(minter: Address): boolean {
  if (minter.equals(Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F"))) return true;
  if (minter.equals(Address.fromString("0x565f90dc7c022e7857734352c7bf645852d8d4e7"))) return true;
  return false;
}

function isBtcPegged(minter: Address): boolean {
  if (minter.equals(Address.fromString("0x33e32ff4d0677862fa31582CC654a25b9b1e4888"))) return true;
  if (minter.equals(Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919"))) return true;
  if (minter.equals(Address.fromString("0x7ffe3acb524fb40207709ba597d39c085d258f15"))) return true;
  if (minter.equals(Address.fromString("0x042e7cb5b993312490ea07fb89f360a65b8a9056"))) return true;
  return false;
}

function isBtcStethMinter(minter: Address): boolean {
  if (minter.equals(Address.fromString("0xF42516EB885E737780EB864dd07cEc8628000919"))) return true;
  if (minter.equals(Address.fromString("0x042e7cb5b993312490ea07fb89f360a65b8a9056"))) return true;
  return false;
}

function isStethEurMinter(minter: Address): boolean {
  return minter.equals(Address.fromString("0x68911ea33e11bc77e07f6da4db6cd23d723641ce"));
}

function isGoldStethMinter(minter: Address): boolean {
  return minter.equals(Address.fromString("0xb315dc4698df45a477d8bb4b0bc694c4d1be91b5"));
}

function isSilverStethMinter(minter: Address): boolean {
  return minter.equals(Address.fromString("0x1c0067bee039a293804b8be951b368d2ec65b3e9"));
}

function peggedUsdPrice(): BigDecimal {
  return ONE;
}

function getPegUsdForMinter(minterAddress: Address): BigDecimal {
  if (isEthPegged(minterAddress)) return chainlinkUsd(ETH_USD_FEED);
  if (isBtcPegged(minterAddress)) return chainlinkUsd(BTC_USD_FEED);
  if (isStethEurMinter(minterAddress)) return chainlinkUsd(EUR_USD_FEED);
  if (isGoldStethMinter(minterAddress)) return chainlinkUsd(XAU_USD_FEED);
  if (isSilverStethMinter(minterAddress)) return chainlinkUsd(XAG_USD_FEED);
  return peggedUsdPrice();
}

export function valueCollateralUsd(minterAddress: Address, collateralAmount: BigInt): BigDecimal {
  if (collateralAmount.equals(ZERO_BI)) return ZERO_BD;

  let oracleAddr = getOracleAddressForMinter(minterAddress);
  if (oracleAddr.equals(Address.zero())) {
    const minter = Minter.bind(minterAddress);
    const oracleAddrRes = minter.try_PRICE_ORACLE();
    if (oracleAddrRes.reverted) return ZERO_BD;
    oracleAddr = oracleAddrRes.value;
  }
  const oracle = WrappedPriceOracle.bind(oracleAddr);

  if (isFxUsdMinter(minterAddress)) {
    const priceRes = oracle.try_getPrice();
    if (priceRes.reverted) return ZERO_BD;
    const fxSavePriceEth = toE18(priceRes.value);
    if (fxSavePriceEth.equals(ZERO_BD)) return ZERO_BD;
    const pegUsd = getPegUsdForMinter(minterAddress);
    const fxSavePriceUsd = fxSavePriceEth.times(pegUsd);
    const amountDec = toE18(collateralAmount);
    return amountDec.times(fxSavePriceUsd);
  }

  const ans = oracle.try_latestAnswer();
  if (ans.reverted) return ZERO_BD;

  const maxUnderlyingPrice = toE18(ans.value.value1);
  const maxWrappedRate = toE18(ans.value.value3);
  if (maxWrappedRate.equals(ZERO_BD)) return ZERO_BD;

  const amountDec = toE18(collateralAmount);

  if (isStethEurMinter(minterAddress)) {
    const ethUsd = chainlinkUsd(ETH_USD_FEED);
    return amountDec.times(maxWrappedRate).times(ethUsd);
  }

  if (maxUnderlyingPrice.equals(ZERO_BD)) return ZERO_BD;

  const pegUsd = getPegUsdForMinter(minterAddress);
  if (isBtcStethMinter(minterAddress)) {
    return amountDec.times(maxUnderlyingPrice).times(pegUsd);
  }
  return amountDec.times(maxUnderlyingPrice).times(maxWrappedRate).times(pegUsd);
}
