/** Zap contract API generation deployed for a market. */
export type ZapApiVersion = "legacy" | "v1";

export function marketUsesZapV1(
  market: { zapApiVersion?: ZapApiVersion } | null | undefined
): boolean {
  return market?.zapApiVersion === "v1";
}

/** Payable ETH minter paths: v1 uses `zapNativeAsset*` instead of `zapBaseAsset*`. */
export function minterEthNativeZapFunctionName(
  action: "ToPegged" | "ToLeveraged" | "ToStabilityPool",
  useV1: boolean
): `zap${string}` {
  const prefix = useV1 ? "zapNativeAsset" : "zapBaseAsset";
  return `${prefix}${action}` as `zap${string}`;
}

export function minterEthNativeZapPermitFunctionName(
  action: "ToPegged" | "ToLeveraged" | "ToStabilityPool",
  useV1: boolean
): `zap${string}` {
  return `${minterEthNativeZapFunctionName(action, useV1)}WithPermit` as `zap${string}`;
}
