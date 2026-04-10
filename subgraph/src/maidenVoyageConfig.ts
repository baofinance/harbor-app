import { Address, BigDecimal } from "@graphprotocol/graph-ts";

const ZERO_ADDR = Address.fromString("0x0000000000000000000000000000000000000000");

/** Default USD ownership cap per genesis market */
const DEFAULT_CAP_USD = BigDecimal.fromString("250000");
const DEFAULT_MAX_BOOST = BigDecimal.fromString("5");

// —— Genesis (production + test2) ——

export const GEN_ETH_FXUSD = Address.fromString("0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc");
export const GEN_BTC_FXUSD = Address.fromString("0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c");
export const GEN_BTC_STETH = Address.fromString("0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00");
export const GEN_STETH_EUR = Address.fromString("0xf4f97218a00213a57a32e4606aaecc99e1805a89");
export const GEN_FXUSD_EUR = Address.fromString("0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b");
export const GEN_GOLD_FXUSD = Address.fromString("0x2cbf457112ef5a16cfca10fb173d56a5cc9daa66");
export const GEN_GOLD_STETH = Address.fromString("0x8ad6b177137a6c33070c27d98355717849ce526c");
export const GEN_SILVER_FXUSD = Address.fromString("0x66d18b9dd5d1cd51957dfea0e0373b54e06118c8");
export const GEN_SILVER_STETH = Address.fromString("0x8f655ca32a1fa8032955989c19e91886f26439dc");

// Test / legacy genesis
export const GEN_ETH_FXUSD_T2 = Address.fromString("0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073");
export const GEN_BTC_FXUSD_T2 = Address.fromString("0x288c61c3b3684ff21adf38d878c81457b19bd2fe");
export const GEN_BTC_STETH_T2 = Address.fromString("0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0");
export const GEN_ETH_FXUSD_ALT = Address.fromString("0x1454707877cdb966e29cea8a190c2169eeca4b8c");

// Minters
export const MINT_ETH_FXUSD = Address.fromString("0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F");
export const MINT_BTC_FXUSD = Address.fromString("0x33e32ff4d0677862fa31582cc654a25b9b1e4888");
export const MINT_BTC_STETH = Address.fromString("0xf42516eb885e737780eb864dd07cec8628000919");
export const MINT_STETH_EUR = Address.fromString("0x68911ea33e11bc77e07f6da4db6cd23d723641ce");
export const MINT_FXUSD_EUR = Address.fromString("0xdefb2c04062350678965cbf38a216cc50723b246");
export const MINT_GOLD_FXUSD = Address.fromString("0x880600e0c803d836e305b7c242fc095eed234a8f");
export const MINT_GOLD_STETH = Address.fromString("0xb315dc4698df45a477d8bb4b0bc694c4d1be91b5");
export const MINT_SILVER_FXUSD = Address.fromString("0x177bb50574cda129bdd0b0f50d4e061d38aa75ef");
export const MINT_SILVER_STETH = Address.fromString("0x1c0067bee039a293804b8be951b368d2ec65b3e9");

export const MINT_ETH_FXUSD_T2 = Address.fromString("0x565f90dc7c022e7857734352c7bf645852d8d4e7");
export const MINT_BTC_FXUSD_T2 = Address.fromString("0x7ffe3acb524fb40207709ba597d39c085d258f15");
export const MINT_BTC_STETH_T2 = Address.fromString("0x042e7cb5b993312490ea07fb89f360a65b8a9056");

// ha tokens
export const HA_ETH = Address.fromString("0x7a53ebc85453dd006824084c4f4be758fcf8a5b5");
export const HA_BTC = Address.fromString("0x25ba4a826e1a1346dca2ab530831dbff9c08bea7");
export const HA_EUR = Address.fromString("0x83fd69e0ff5767972b46e61c6833408361bf7346");
export const HA_GOLD = Address.fromString("0x5b66d86932ae5d9751da588d91d494950554061d");
export const HA_SILVER = Address.fromString("0x7de413b0abee6f685a8ff7fb53330e3c56523e74");

// hs (sail) tokens
export const HS_FXUSD_ETH = Address.fromString("0x0cd6bb1a0cfd95e2779edc6d17b664b481f2eb4c");
export const HS_FXUSD_BTC = Address.fromString("0x9567c243f647f9ac37efb7fc26bd9551dce0be1b");
export const HS_STETH_BTC = Address.fromString("0x817adae288ed46b8618aaeffe75acd26a0a1b0fd");
export const HS_FXUSD_GOLD = Address.fromString("0x85730af3a7d7a872ee1d84306e0575f1e00c0980");
export const HS_STETH_GOLD = Address.fromString("0x94460c6477cda339da0e7e39f6aa66ef047e2f6a");
export const HS_STETH_EUR = Address.fromString("0xea23faaf5e464488ecc29883760238b68410d92b");
export const HS_FXUSD_EUR = Address.fromString("0x7a7c1f2502c19193c44662a2aff51c2b76fddaea");
export const HS_FXUSD_SILVER = Address.fromString("0x74692d22a0cb924e4299785cc299291e560df9cf");
export const HS_STETH_SILVER = Address.fromString("0x5bb5672be4553e648c1d20f093826faf77386d34");

export function getMaidenVoyageCapUSD(genesis: Address): BigDecimal {
  return DEFAULT_CAP_USD;
}

export function getMaidenVoyageMaxBoost(genesis: Address): BigDecimal {
  return DEFAULT_MAX_BOOST;
}

/** Minter contract -> maiden voyage genesis (Address.zero if none). */
export function getGenesisForMinter(minter: Address): Address {
  const m = minter.toHexString().toLowerCase();

  if (m == MINT_ETH_FXUSD.toHexString().toLowerCase()) return GEN_ETH_FXUSD;
  if (m == MINT_BTC_FXUSD.toHexString().toLowerCase()) return GEN_BTC_FXUSD;
  if (m == MINT_BTC_STETH.toHexString().toLowerCase()) return GEN_BTC_STETH;
  if (m == MINT_STETH_EUR.toHexString().toLowerCase()) return GEN_STETH_EUR;
  if (m == MINT_FXUSD_EUR.toHexString().toLowerCase()) return GEN_FXUSD_EUR;
  if (m == MINT_GOLD_FXUSD.toHexString().toLowerCase()) return GEN_GOLD_FXUSD;
  if (m == MINT_GOLD_STETH.toHexString().toLowerCase()) return GEN_GOLD_STETH;
  if (m == MINT_SILVER_FXUSD.toHexString().toLowerCase()) return GEN_SILVER_FXUSD;
  if (m == MINT_SILVER_STETH.toHexString().toLowerCase()) return GEN_SILVER_STETH;

  if (m == MINT_ETH_FXUSD_T2.toHexString().toLowerCase()) return GEN_ETH_FXUSD_T2;
  if (m == MINT_BTC_FXUSD_T2.toHexString().toLowerCase()) return GEN_BTC_FXUSD_T2;
  if (m == MINT_BTC_STETH_T2.toHexString().toLowerCase()) return GEN_BTC_STETH_T2;

  return ZERO_ADDR;
}

export function isKnownMaidenVoyageGenesis(genesis: Address): boolean {
  const g = genesis.toHexString().toLowerCase();
  if (g == GEN_ETH_FXUSD.toHexString().toLowerCase()) return true;
  if (g == GEN_BTC_FXUSD.toHexString().toLowerCase()) return true;
  if (g == GEN_BTC_STETH.toHexString().toLowerCase()) return true;
  if (g == GEN_STETH_EUR.toHexString().toLowerCase()) return true;
  if (g == GEN_FXUSD_EUR.toHexString().toLowerCase()) return true;
  if (g == GEN_GOLD_FXUSD.toHexString().toLowerCase()) return true;
  if (g == GEN_GOLD_STETH.toHexString().toLowerCase()) return true;
  if (g == GEN_SILVER_FXUSD.toHexString().toLowerCase()) return true;
  if (g == GEN_SILVER_STETH.toHexString().toLowerCase()) return true;
  if (g == GEN_ETH_FXUSD_T2.toHexString().toLowerCase()) return true;
  if (g == GEN_BTC_FXUSD_T2.toHexString().toLowerCase()) return true;
  if (g == GEN_BTC_STETH_T2.toHexString().toLowerCase()) return true;
  if (g == GEN_ETH_FXUSD_ALT.toHexString().toLowerCase()) return true;
  return false;
}

/** Sail -> genesis (Address.zero if unknown). */
export function getGenesisForSailToken(token: Address): Address {
  const m = getMinterForSailToken(token);
  if (m.equals(ZERO_ADDR)) return ZERO_ADDR;
  return getGenesisForMinter(m);
}

/** Sail token -> minter (for pricing). Address.zero if unknown. */
export function getMinterForSailToken(token: Address): Address {
  const t = token.toHexString().toLowerCase();
  if (t == HS_FXUSD_ETH.toHexString().toLowerCase()) return MINT_ETH_FXUSD;
  if (t == HS_FXUSD_BTC.toHexString().toLowerCase()) return MINT_BTC_FXUSD;
  if (t == HS_STETH_BTC.toHexString().toLowerCase()) return MINT_BTC_STETH;
  if (t == HS_FXUSD_GOLD.toHexString().toLowerCase()) return MINT_GOLD_FXUSD;
  if (t == HS_STETH_GOLD.toHexString().toLowerCase()) return MINT_GOLD_STETH;
  if (t == HS_STETH_EUR.toHexString().toLowerCase()) return MINT_STETH_EUR;
  if (t == HS_FXUSD_EUR.toHexString().toLowerCase()) return MINT_FXUSD_EUR;
  if (t == HS_FXUSD_SILVER.toHexString().toLowerCase()) return MINT_SILVER_FXUSD;
  if (t == HS_STETH_SILVER.toHexString().toLowerCase()) return MINT_SILVER_STETH;
  return ZERO_ADDR;
}
