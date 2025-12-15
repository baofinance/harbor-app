import { useAnvilContractReads } from "./useContractReads";
import { useAccount } from "wagmi";
import { markets as marketsConfig } from "@/config/markets";
import { minterABI } from "@/abis/minter";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { STABILITY_POOL_MANAGER_ABI } from "@/config/contracts";

/**
 * Oracle ABI for Harbor-style price oracle
 */
const oracleABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [
      { type: "uint256", name: "minUnderlyingPrice" },
      { type: "uint256", name: "maxUnderlyingPrice" },
      { type: "uint256", name: "minWrappedRate" },
      { type: "uint256", name: "maxWrappedRate" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface MarketTransparencyData {
  marketId: string;
  marketName: string;
  // Minter data
  collateralRatio: bigint;
  leverageRatio: bigint;
  peggedTokenPrice: bigint;
  leveragedTokenPrice: bigint;
  peggedTokenBalance: bigint;
  leveragedTokenBalance: bigint;
  collateralTokenBalance: bigint;
  // Addresses
  priceOracleAddress: `0x${string}`;
  feeReceiverAddress: `0x${string}`;
  reservePoolAddress: `0x${string}`;
  minterAddress: `0x${string}`;
  peggedTokenAddress: `0x${string}`;
  leveragedTokenAddress: `0x${string}`;
  stabilityPoolCollateralAddress: `0x${string}`;
  stabilityPoolLeveragedAddress: `0x${string}`;
  stabilityPoolManagerAddress: `0x${string}`;
  // Incentive ratios
  mintPeggedIncentiveRatio: bigint;
  redeemPeggedIncentiveRatio: bigint;
  mintLeveragedIncentiveRatio: bigint;
  redeemLeveragedIncentiveRatio: bigint;
  // Oracle data
  minPrice: bigint;
  maxPrice: bigint;
  minRate: bigint;
  maxRate: bigint;
  // Stability pool manager
  rebalanceThreshold: bigint;
}

export interface PoolTransparencyData {
  address: `0x${string}`;
  name: string;
  type: "collateral" | "leveraged";
  tvl: bigint;
  activeRewardTokens: `0x${string}`[];
  earlyWithdrawalFee: bigint;
  withdrawWindow: bigint;
}

export interface UserPoolData {
  poolAddress: `0x${string}`;
  assetBalance: bigint;
  withdrawalRequest: {
    amount: bigint;
    requestedAt: bigint;
  };
}

export interface TransparencyData {
  markets: MarketTransparencyData[];
  pools: PoolTransparencyData[];
  userPools?: UserPoolData[];
  lastUpdatedBlock: bigint;
  lastUpdatedTimestamp: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Number of contract reads per market
const READS_PER_MARKET = 16;
// Number of pool reads per market (2 pools * 4 reads each)
const POOL_READS_PER_MARKET = 8;
// Number of user reads per market (2 pools * 2 reads each)
const USER_READS_PER_MARKET = 4;

export function useTransparencyData(): TransparencyData {
  const { address: userAddress, isConnected } = useAccount();

  // Get all markets from config
  const marketEntries = Object.entries(marketsConfig).filter(
    ([_, market]) => market.addresses?.minter // Only include markets with minter address
  );

  // Build contract reads for all markets
  const allMarketContracts = marketEntries.flatMap(([_, market]) => {
    const minterAddress = market.addresses.minter as `0x${string}`;
    const oracleAddress = market.addresses.priceOracle as `0x${string}`;
    const stabilityPoolManager = market.addresses.stabilityPoolManager as `0x${string}`;

    return [
      // Minter reads (0-13)
      { address: minterAddress, abi: minterABI, functionName: "collateralRatio" },
      { address: minterAddress, abi: minterABI, functionName: "leverageRatio" },
      { address: minterAddress, abi: minterABI, functionName: "peggedTokenPrice" },
      { address: minterAddress, abi: minterABI, functionName: "leveragedTokenPrice" },
      { address: minterAddress, abi: minterABI, functionName: "peggedTokenBalance" },
      { address: minterAddress, abi: minterABI, functionName: "leveragedTokenBalance" },
      { address: minterAddress, abi: minterABI, functionName: "collateralTokenBalance" },
      { address: minterAddress, abi: minterABI, functionName: "priceOracle" },
      { address: minterAddress, abi: minterABI, functionName: "feeReceiver" },
      { address: minterAddress, abi: minterABI, functionName: "reservePool" },
      { address: minterAddress, abi: minterABI, functionName: "mintPeggedTokenIncentiveRatio" },
      { address: minterAddress, abi: minterABI, functionName: "redeemPeggedTokenIncentiveRatio" },
      { address: minterAddress, abi: minterABI, functionName: "mintLeveragedTokenIncentiveRatio" },
      { address: minterAddress, abi: minterABI, functionName: "redeemLeveragedTokenIncentiveRatio" },
      // Oracle reads (14)
      { address: oracleAddress, abi: oracleABI, functionName: "latestAnswer" },
      // Stability pool manager (15)
      { address: stabilityPoolManager, abi: STABILITY_POOL_MANAGER_ABI, functionName: "rebalanceThreshold" },
    ];
  });

  // Pool reads for all markets
  const allPoolContracts = marketEntries.flatMap(([_, market]) => {
    const stabilityPoolCollateral = market.addresses.stabilityPoolCollateral as `0x${string}`;
    const stabilityPoolLeveraged = market.addresses.stabilityPoolLeveraged as `0x${string}`;

    return [
      // Collateral pool (0-3)
      { address: stabilityPoolCollateral, abi: stabilityPoolABI, functionName: "totalAssetSupply" },
      { address: stabilityPoolCollateral, abi: stabilityPoolABI, functionName: "activeRewardTokens" },
      { address: stabilityPoolCollateral, abi: stabilityPoolABI, functionName: "earlyWithdrawFee" },
      { address: stabilityPoolCollateral, abi: stabilityPoolABI, functionName: "withdrawWindow" },
      // Leveraged pool (4-7)
      { address: stabilityPoolLeveraged, abi: stabilityPoolABI, functionName: "totalAssetSupply" },
      { address: stabilityPoolLeveraged, abi: stabilityPoolABI, functionName: "activeRewardTokens" },
      { address: stabilityPoolLeveraged, abi: stabilityPoolABI, functionName: "earlyWithdrawFee" },
      { address: stabilityPoolLeveraged, abi: stabilityPoolABI, functionName: "withdrawWindow" },
    ];
  });

  // User-specific reads for all markets (only if connected)
  const allUserContracts = isConnected && userAddress
    ? marketEntries.flatMap(([_, market]) => {
        const stabilityPoolCollateral = market.addresses.stabilityPoolCollateral as `0x${string}`;
        const stabilityPoolLeveraged = market.addresses.stabilityPoolLeveraged as `0x${string}`;

        return [
          { address: stabilityPoolCollateral, abi: stabilityPoolABI, functionName: "assetBalanceOf", args: [userAddress] },
          { address: stabilityPoolCollateral, abi: stabilityPoolABI, functionName: "withdrawRequest", args: [userAddress] },
          { address: stabilityPoolLeveraged, abi: stabilityPoolABI, functionName: "assetBalanceOf", args: [userAddress] },
          { address: stabilityPoolLeveraged, abi: stabilityPoolABI, functionName: "withdrawRequest", args: [userAddress] },
        ];
      })
    : [];

  // Combine all contracts
  const allContracts = [
    ...allMarketContracts,
    ...allPoolContracts,
    ...allUserContracts,
  ] as const;

  const { data, isLoading, error, refetch } = useAnvilContractReads({
    contracts: allContracts as any,
    enabled: true,
  });

  // Parse result helper
  const parseResult = <T>(index: number, defaultValue: T): T => {
    const result = data?.[index];
    if (result?.status === "success" && result.result !== undefined) {
      return result.result as T;
    }
    return defaultValue;
  };

  // Parse all markets
  const markets: MarketTransparencyData[] = marketEntries.map(([marketId, market], marketIndex) => {
    const baseIndex = marketIndex * READS_PER_MARKET;
    
    const minterAddress = market.addresses.minter as `0x${string}`;
    const oracleAddress = market.addresses.priceOracle as `0x${string}`;
    const stabilityPoolCollateral = market.addresses.stabilityPoolCollateral as `0x${string}`;
    const stabilityPoolLeveraged = market.addresses.stabilityPoolLeveraged as `0x${string}`;
    const stabilityPoolManager = market.addresses.stabilityPoolManager as `0x${string}`;

    // Parse oracle tuple
    const oracleData = parseResult<readonly [bigint, bigint, bigint, bigint]>(
      baseIndex + 14,
      [0n, 0n, 0n, 0n]
    );

    return {
      marketId,
      marketName: market.name,
      collateralRatio: parseResult(baseIndex + 0, 0n),
      leverageRatio: parseResult(baseIndex + 1, 0n),
      peggedTokenPrice: parseResult(baseIndex + 2, 0n),
      leveragedTokenPrice: parseResult(baseIndex + 3, 0n),
      peggedTokenBalance: parseResult(baseIndex + 4, 0n),
      leveragedTokenBalance: parseResult(baseIndex + 5, 0n),
      collateralTokenBalance: parseResult(baseIndex + 6, 0n),
      priceOracleAddress: parseResult(baseIndex + 7, oracleAddress),
      feeReceiverAddress: parseResult(baseIndex + 8, market.addresses.feeReceiver as `0x${string}`),
      reservePoolAddress: parseResult(baseIndex + 9, market.addresses.reservePool as `0x${string}`),
      mintPeggedIncentiveRatio: parseResult(baseIndex + 10, 0n),
      redeemPeggedIncentiveRatio: parseResult(baseIndex + 11, 0n),
      mintLeveragedIncentiveRatio: parseResult(baseIndex + 12, 0n),
      redeemLeveragedIncentiveRatio: parseResult(baseIndex + 13, 0n),
      minPrice: oracleData[0],
      maxPrice: oracleData[1],
      minRate: oracleData[2],
      maxRate: oracleData[3],
      rebalanceThreshold: parseResult(baseIndex + 15, 0n),
      minterAddress,
      peggedTokenAddress: market.addresses.peggedToken as `0x${string}`,
      leveragedTokenAddress: market.addresses.leveragedToken as `0x${string}`,
      stabilityPoolCollateralAddress: stabilityPoolCollateral,
      stabilityPoolLeveragedAddress: stabilityPoolLeveraged,
      stabilityPoolManagerAddress: stabilityPoolManager,
    };
  });

  // Parse all pools
  const poolBaseIndex = marketEntries.length * READS_PER_MARKET;
  const pools: PoolTransparencyData[] = marketEntries.flatMap(([marketId, market], marketIndex) => {
    const stabilityPoolCollateral = market.addresses.stabilityPoolCollateral as `0x${string}`;
    const stabilityPoolLeveraged = market.addresses.stabilityPoolLeveraged as `0x${string}`;
    const baseIndex = poolBaseIndex + marketIndex * POOL_READS_PER_MARKET;

    return [
      {
        address: stabilityPoolCollateral,
        name: `${market.name} Anchor Pool`,
        type: "collateral" as const,
        tvl: parseResult(baseIndex + 0, 0n),
        activeRewardTokens: parseResult(baseIndex + 1, []),
        earlyWithdrawalFee: parseResult(baseIndex + 2, 0n),
        withdrawWindow: parseResult(baseIndex + 3, 0n),
      },
      {
        address: stabilityPoolLeveraged,
        name: `${market.name} Sail Pool`,
        type: "leveraged" as const,
        tvl: parseResult(baseIndex + 4, 0n),
        activeRewardTokens: parseResult(baseIndex + 5, []),
        earlyWithdrawalFee: parseResult(baseIndex + 6, 0n),
        withdrawWindow: parseResult(baseIndex + 7, 0n),
      },
    ];
  });

  // Parse user data if connected
  let userPools: UserPoolData[] | undefined;
  if (isConnected && userAddress) {
    const userBaseIndex = poolBaseIndex + marketEntries.length * POOL_READS_PER_MARKET;
    
    userPools = marketEntries.flatMap(([_, market], marketIndex) => {
      const stabilityPoolCollateral = market.addresses.stabilityPoolCollateral as `0x${string}`;
      const stabilityPoolLeveraged = market.addresses.stabilityPoolLeveraged as `0x${string}`;
      const baseIndex = userBaseIndex + marketIndex * USER_READS_PER_MARKET;

      const collateralWithdrawRequest = parseResult<readonly [bigint, bigint]>(baseIndex + 1, [0n, 0n]);
      const leveragedWithdrawRequest = parseResult<readonly [bigint, bigint]>(baseIndex + 3, [0n, 0n]);

      return [
        {
          poolAddress: stabilityPoolCollateral,
          assetBalance: parseResult(baseIndex + 0, 0n),
          withdrawalRequest: {
            amount: collateralWithdrawRequest[0],
            requestedAt: collateralWithdrawRequest[1],
          },
        },
        {
          poolAddress: stabilityPoolLeveraged,
          assetBalance: parseResult(baseIndex + 2, 0n),
          withdrawalRequest: {
            amount: leveragedWithdrawRequest[0],
            requestedAt: leveragedWithdrawRequest[1],
          },
        },
      ];
    });
  }

  return {
    markets,
    pools,
    userPools,
    lastUpdatedBlock: 0n,
    lastUpdatedTimestamp: Date.now(),
    isLoading,
    error: error ? String(error) : null,
    refetch,
  };
}

// Helper functions for derived values
export function formatCollateralRatio(ratio: bigint): string {
  if (ratio === 0n) return "0%";
  return `${(Number(ratio) / 1e16).toFixed(2)}%`;
}

export function formatLeverageRatio(ratio: bigint): string {
  if (ratio === 0n) return "0x";
  return `${(Number(ratio) / 1e18).toFixed(2)}x`;
}

export function formatIncentiveRatio(ratio: bigint): {
  value: string;
  isDiscount: boolean;
} {
  const num = Number(ratio);
  const percent = (num / 1e16).toFixed(4);
  const isDiscount = num < 0;
  return {
    value: `${isDiscount ? "" : "+"}${percent}%`,
    isDiscount,
  };
}

export function formatTokenPrice(price: bigint, decimals: number = 18): string {
  if (price === 0n) return "0";
  return (Number(price) / 10 ** decimals).toFixed(6);
}

export function formatTokenBalance(
  balance: bigint,
  decimals: number = 18
): string {
  if (balance === 0n) return "0";
  const num = Number(balance) / 10 ** decimals;
  if (num < 0.01) return num.toExponential(2);
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}

export function getHealthColor(
  collateralRatio: bigint,
  threshold: bigint
): "green" | "yellow" | "red" {
  const cr = Number(collateralRatio);
  const th = Number(threshold);

  // If threshold is 0, use default thresholds
  const greenThreshold = th > 0 ? th * 1.15 : 1.5e18;
  const yellowThreshold = th > 0 ? th * 1.05 : 1.3e18;

  if (cr >= greenThreshold) return "green";
  if (cr >= yellowThreshold) return "yellow";
  return "red";
}

export function calculatePeggedPriceUSD(
  collateralBalance: bigint,
  avgPrice: bigint,
  avgRate: bigint,
  collateralRatio: bigint,
  peggedBalance: bigint
): number {
  if (peggedBalance === 0n || collateralRatio === 0n) return 0;

  // collUsd = collateralTokenBalance * avgRate * avgPrice / 1e36
  const collUsd =
    (Number(collateralBalance) * Number(avgRate) * Number(avgPrice)) / 1e36;

  // pegTotalUsd = collUsd / (collateralRatio / 1e18)
  const pegTotalUsd = collUsd / (Number(collateralRatio) / 1e18);

  // pegPriceUsd = pegTotalUsd / (peggedTokenBalance / 1e18)
  const pegPriceUsd = pegTotalUsd / (Number(peggedBalance) / 1e18);

  return pegPriceUsd;
}

export function getWithdrawalRequestStatus(
  requestedAt: bigint,
  withdrawWindow: bigint
): "none" | "waiting" | "open" | "expired" {
  if (requestedAt === 0n) return "none";

  const now = BigInt(Math.floor(Date.now() / 1000));
  const startTime = requestedAt + 86400n; // 1 day delay
  const endTime = startTime + withdrawWindow;

  if (now < startTime) return "waiting";
  if (now < endTime) return "open";
  return "expired";
}
