import { markets } from "./contracts";
import { arbitrum, mainnet } from "viem/chains";

// TODO: URGENT - Update steamedUSD and BTC icons once final token assets are available
// Current icons are placeholders:
// - /icons/steamedUSD.png
// - /icons/btc.png

export interface Pool {
  id: string;
  groupName: string;
  groupIcon: string;
  groupSubText?: string;
  name: string;
  assetIcons: string[];
  address: `0x${string}`;
  type: "Collateral" | "Leveraged";
  tokenSymbol: string;
  chain: string;
  chainId: number;
  chainIcon: string;
  description: string;
  marketId: string;
  poolType: "collateral" | "leveraged";
  assetDecimals: number;
}

const launchPools: Pool[] = [
  // Group 1: zheETH
  {
    id: "zheeth-fxsave",
    groupName: "zheETH",
    groupIcon: "🟢",
    name: "fxSAVE",
    assetIcons: ["/icons/fxSave.png"],
    address: markets["eth-fxusd"].addresses.stabilityPoolCollateral as `0x${string}`,
    type: "Collateral",
    tokenSymbol: "fxSAVE",
    chain: "Ethereum",
    chainId: 1,
    chainIcon: "/icons/eth.png",
    description: "Deposit fxSAVE to earn yield and secure the protocol.",
    marketId: "eth-fxusd",
    poolType: "collateral",
    assetDecimals: 18,
  },
  {
    id: "zheeth-steamedusd-eth",
    groupName: "zheETH",
    groupIcon: "🟢",
    name: "steamedUSD / ETH",
    assetIcons: ["/icons/steamedUSD.png", "/icons/eth.png"], // TODO: Update steamedUSD icon when available
    address: markets["eth-fxusd"].addresses.stabilityPoolLeveraged as `0x${string}`,
    type: "Leveraged",
    tokenSymbol: "steamedUSD/ETH",
    chain: "Ethereum",
    chainId: 1,
    chainIcon: "/icons/eth.png",
    description:
      "Provide liquidity for the steamedUSD/ETH pair to earn leveraged rewards.",
    marketId: "eth-fxusd",
    poolType: "leveraged",
    assetDecimals: 18,
  },
  // Group 2: zheBTC (fxSAVE collateral)
  {
    id: "zhebtc-fxsave-fxsave",
    groupName: "zheBTC",
    groupIcon: "🟠",
    groupSubText: "(fxSAVE collateral)",
    name: "fxSAVE",
    assetIcons: ["/icons/fxSave.png"],
    address: markets["btc-fxusd"].addresses
      .stabilityPoolCollateral as `0x${string}`,
    type: "Collateral",
    tokenSymbol: "fxSAVE",
    chain: "Ethereum",
    chainId: 1,
    chainIcon: "/icons/eth.png",
    description: "Deposit fxSAVE to earn yield and secure the protocol.",
    marketId: "btc-fxusd",
    poolType: "collateral",
    assetDecimals: 18,
  },
  {
    id: "zhebtc-fxsave-steamedusd-btc",
    groupName: "zheBTC",
    groupIcon: "🟠",
    groupSubText: "(fxSAVE collateral)",
    name: "steamedUSD / BTC",
    assetIcons: ["/icons/steamedUSD.png", "/icons/btc.png"], // TODO: Update steamedUSD and BTC icons when available
    address: markets["btc-fxusd"].addresses
      .stabilityPoolLeveraged as `0x${string}`,
    type: "Leveraged",
    tokenSymbol: "steamedUSD/BTC",
    chain: "Ethereum",
    chainId: 1,
    chainIcon: "/icons/eth.png",
    description:
      "Provide liquidity for the steamedUSD/BTC pair to earn leveraged rewards.",
    marketId: "btc-fxusd",
    poolType: "leveraged",
    assetDecimals: 18,
  },
  // Group 3: zheBTC (wstETH collateral)
  {
    id: "zhebtc-wsteth-wsteth",
    groupName: "zheBTC",
    groupIcon: "🔵",
    groupSubText: "(wstETH collateral)",
    name: "wstETH",
    assetIcons: ["/icons/wstETH.webp"],
    address: markets["btc-steth"].addresses
      .stabilityPoolCollateral as `0x${string}`,
    type: "Collateral",
    tokenSymbol: "wstETH",
    chain: "Ethereum",
    chainId: 1,
    chainIcon: "/icons/eth.png",
    description: "Deposit wstETH to earn yield and secure the protocol.",
    marketId: "btc-steth",
    poolType: "collateral",
    assetDecimals: 18,
  },
  {
    id: "zhebtc-wsteth-steamedeth-btc",
    groupName: "zheBTC",
    groupIcon: "🔵",
    groupSubText: "(wstETH collateral)",
    name: "steamedETH / BTC",
    assetIcons: ["/icons/steamedeth.svg", "/icons/btc.png"], // TODO: Update BTC icon when available
    address: markets["btc-steth"].addresses
      .stabilityPoolLeveraged as `0x${string}`,
    type: "Leveraged",
    tokenSymbol: "steamedETH/BTC",
    chain: "Ethereum",
    chainId: 1,
    chainIcon: "/icons/eth.png",
    description:
      "Provide liquidity for the steamedETH/BTC pair to earn leveraged rewards.",
    marketId: "btc-steth",
    poolType: "leveraged",
    assetDecimals: 18,
  },
];

export const pools: Pool[] = launchPools;

export const poolsByAddress = pools.reduce((acc, pool) => {
  acc[pool.address] = pool;
  return acc;
}, {} as Record<`0x${string}`, Pool>);
