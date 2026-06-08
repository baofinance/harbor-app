/**
 * Maiden voyage **ownership cap** (USD) per genesis contract used for
 * `maidenVoyageDepositCountedUSD` and `finalMaidenVoyageOwnershipShare` in the subgraph.
 *
 * **Every known genesis should have an entry.** Add a row when onboarding a new maiden market.
 *
 * **Must match** `getMaidenVoyageCapUSD` in `subgraph/src/maidenVoyageConfig.ts` for the
 * same genesis addresses. After changing caps, **redeploy and re-sync** the marks subgraph
 * so `finalMaidenVoyageOwnershipShare` and cap status entities reflect the new denominator.
 *
 * Cap can later be set per market to historical total deposits, etc.
 * **New maiden markets:** USD 50_000. **Legacy completed voyages:** USD 100_000.
 */
export const MAIDEN_VOYAGE_CAP_USD_LEGACY = 100_000;

/** Default USD cap for newly onboarded maiden voyage genesis contracts. */
export const MAIDEN_VOYAGE_CAP_USD_DEFAULT = 50_000;

export const MAIDEN_VOYAGE_CAP_USD_BY_GENESIS_HEX: Record<string, number> = {
  // Production genesis
  "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc": MAIDEN_VOYAGE_CAP_USD_LEGACY, // ETH / fxUSD
  "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c": MAIDEN_VOYAGE_CAP_USD_LEGACY, // BTC / fxUSD
  "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00": MAIDEN_VOYAGE_CAP_USD_LEGACY, // BTC / stETH
  "0xf4f97218a00213a57a32e4606aaecc99e1805a89": MAIDEN_VOYAGE_CAP_USD_LEGACY, // stETH / EUR
  "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b": MAIDEN_VOYAGE_CAP_USD_LEGACY, // fxUSD / EUR
  "0x2cbf457112ef5a16cfca10fb173d56a5cc9daa66": MAIDEN_VOYAGE_CAP_USD_LEGACY, // GOLD / fxUSD
  "0x8ad6b177137a6c33070c27d98355717849ce526c": MAIDEN_VOYAGE_CAP_USD_LEGACY, // GOLD / stETH
  "0x66d18b9dd5d1cd51957dfea0e0373b54e06118c8": MAIDEN_VOYAGE_CAP_USD_LEGACY, // SILVER / fxUSD
  "0x8f655ca32a1fa8032955989c19e91886f26439dc": MAIDEN_VOYAGE_CAP_USD_LEGACY, // SILVER / stETH
  "0x40ff767ff4055d53b1bc1b0141221a37b25905fd": MAIDEN_VOYAGE_CAP_USD_DEFAULT, // stETH / USD (mainnet)
  "0x004c7091051bbd43dd1c26e3e37c85f869a987e7": MAIDEN_VOYAGE_CAP_USD_DEFAULT, // stETH / USD (MegaETH)
  // Test / legacy
  "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073": MAIDEN_VOYAGE_CAP_USD_LEGACY, // ETH / fxUSD (test2)
  "0x288c61c3b3684ff21adf38d878c81457b19bd2fe": MAIDEN_VOYAGE_CAP_USD_LEGACY, // BTC / fxUSD (test2)
  "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0": MAIDEN_VOYAGE_CAP_USD_LEGACY, // BTC / stETH (test2)
  "0x1454707877cdb966e29cea8a190c2169eeca4b8c": MAIDEN_VOYAGE_CAP_USD_LEGACY, // ETH / fxUSD (alt)
};

export function maidenVoyageCapUsd(
  genesisAddressLower?: string | null
): number | null {
  if (!genesisAddressLower) return null;
  const v =
    MAIDEN_VOYAGE_CAP_USD_BY_GENESIS_HEX[genesisAddressLower.toLowerCase()];
  return v !== undefined ? v : null;
}
