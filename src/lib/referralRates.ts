import { getMainnetRpcClient } from "@/config/rpc";
import { fxSaveAbi, wstEthAbi } from "@/abis/rates";
import { aggregatorAbi } from "@/abis/chainlink";

const FX_SAVE_ADDRESS = "0x7743e50F534a7f9F1791DdE7dCD89F7783Eefc39" as const;
const WSTETH_ADDRESS = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0" as const;
const ETH_USD_ORACLE = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" as const;

export type RateSnapshot = {
  token: "fxSAVE" | "wstETH";
  rate: bigint; // 1e18 precision
  blockNumber: bigint;
  timestamp: number;
};

export type PriceSnapshot = {
  token: "ETH";
  price: bigint; // 1e8 precision (Chainlink)
  blockNumber: bigint;
  timestamp: number;
  decimals: number;
};

export async function fetchFxSaveRate(blockNumber?: bigint): Promise<RateSnapshot> {
  const client = getMainnetRpcClient();
  const rate = await client.readContract({
    address: FX_SAVE_ADDRESS,
    abi: fxSaveAbi,
    functionName: "nav",
    blockNumber,
  });

  const block = await client.getBlock({ blockNumber });
  return {
    token: "fxSAVE",
    rate,
    blockNumber: block.number ?? blockNumber ?? 0n,
    timestamp: Number(block.timestamp),
  };
}

export async function fetchWstEthRate(blockNumber?: bigint): Promise<RateSnapshot> {
  const client = getMainnetRpcClient();
  const rate = await client.readContract({
    address: WSTETH_ADDRESS,
    abi: wstEthAbi,
    functionName: "getStETHByWstETH",
    args: [1000000000000000000n],
    blockNumber,
  });

  const block = await client.getBlock({ blockNumber });
  return {
    token: "wstETH",
    rate,
    blockNumber: block.number ?? blockNumber ?? 0n,
    timestamp: Number(block.timestamp),
  };
}

export async function fetchEthUsdPrice(blockNumber?: bigint): Promise<PriceSnapshot> {
  const client = getMainnetRpcClient();
  const decimals = await client.readContract({
    address: ETH_USD_ORACLE,
    abi: aggregatorAbi,
    functionName: "decimals",
    blockNumber,
  });
  const latestRound = await client.readContract({
    address: ETH_USD_ORACLE,
    abi: aggregatorAbi,
    functionName: "latestRoundData",
    blockNumber,
  });

  const block = await client.getBlock({ blockNumber });
  return {
    token: "ETH",
    price: latestRound[1],
    decimals,
    blockNumber: block.number ?? blockNumber ?? 0n,
    timestamp: Number(block.timestamp),
  };
}
