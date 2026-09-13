import { MINTER_ZAP_V4_ABI } from "./minterZapV4Abi";

/**
 * MinterETHZap_v1 ABI: collateral paths match v4; payable ETH paths use `zapNativeAsset*`.
 */
export const MINTER_ETH_ZAP_V1_ABI = MINTER_ZAP_V4_ABI.map((item) => {
  if (
    item.type === "function" &&
    item.name?.startsWith("zapBaseAsset") &&
    item.stateMutability === "payable"
  ) {
    return {
      ...item,
      name: item.name.replace("zapBaseAsset", "zapNativeAsset"),
    };
  }
  return item;
});
