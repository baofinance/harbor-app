/**
 * Maiden voyage yield pool — share of **attributed revenue** (USD) credited to
 * each genesis `MaidenVoyageYieldGlobal` for owners.
 *
 * **Every known genesis must have an entry here** (basis points). There is no
 * fallback default: add a row when onboarding a new maiden market.
 *
 * **Must match** `getMaidenVoyageYieldOwnerShareBps` in
 * `subgraph/src/maidenVoyageConfig.ts` for the same genesis addresses.
 */
export const MAIDEN_VOYAGE_YIELD_OWNER_SHARE_BPS_BY_GENESIS_HEX: Record<
  string,
  number
> = {
  // Production genesis
  "0xc9df4f62474cf6cde6c064db29416a9f4f27ebdc": 500, // ETH / fxUSD
  "0x42cc9a19b358a2a918f891d8a6199d8b05f0bc1c": 500, // BTC / fxUSD
  "0xc64fc46eed431e92c1b5e24dc296b5985ce6cc00": 500, // BTC / stETH
  "0xf4f97218a00213a57a32e4606aaecc99e1805a89": 500, // stETH / EUR
  "0xa9eb43ed6ba3b953a82741f3e226c1d6b029699b": 500, // fxUSD / EUR
  "0x2cbf457112ef5a16cfca10fb173d56a5cc9daa66": 500, // GOLD / fxUSD
  "0x8ad6b177137a6c33070c27d98355717849ce526c": 500, // GOLD / stETH
  "0x66d18b9dd5d1cd51957dfea0e0373b54e06118c8": 500, // SILVER / fxUSD
  "0x8f655ca32a1fa8032955989c19e91886f26439dc": 500, // SILVER / stETH
  // Test / legacy
  "0x5f4398e1d3e33f93e3d7ee710d797e2a154cb073": 500, // ETH / fxUSD (test2)
  "0x288c61c3b3684ff21adf38d878c81457b19bd2fe": 500, // BTC / fxUSD (test2)
  "0x9ae0b57ceada0056dbe21edcd638476fcba3ccc0": 500, // BTC / stETH (test2)
  "0x1454707877cdb966e29cea8a190c2169eeca4b8c": 500, // ETH / fxUSD (alt)
};

export function maidenVoyageYieldOwnerShareBps(
  genesisAddressLower?: string | null
): number | null {
  if (!genesisAddressLower) return null;
  const bps =
    MAIDEN_VOYAGE_YIELD_OWNER_SHARE_BPS_BY_GENESIS_HEX[
      genesisAddressLower.toLowerCase()
    ];
  return bps !== undefined ? bps : null;
}

/** Whole percent for UI (e.g. 5 for 500 bps). */
export function maidenVoyageYieldOwnerSharePercent(
  genesisAddressLower?: string | null
): number | null {
  const bps = maidenVoyageYieldOwnerShareBps(genesisAddressLower);
  return bps === null ? null : bps / 100;
}
