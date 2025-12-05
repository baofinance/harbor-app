import { useMemo } from "react";
import { useAnvilContractReads } from "./useAnvilContractReads";
import { useAnvilContractRead } from "./useAnvilContractRead";
import { formatEther } from "viem";
import { markets } from "@/config/markets";
import { contracts } from "@/config/contracts";

// ABIs for the contracts we need to read from
const minterABI = [
  {
    inputs: [],
    name: "harvestable",
    outputs: [{ name: "wrappedAmount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "WRAPPED_COLLATERAL_TOKEN",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const stabilityPoolManagerABI = [
  {
    inputs: [],
    name: "harvestBountyRatio",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "harvestCutRatio",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const stabilityPoolABI = [
  {
    inputs: [],
    name: "totalAssetSupply",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "rewardToken", type: "address" }],
    name: "rewardData",
    outputs: [
      {
        components: [
          { name: "rate", type: "uint256" },
          { name: "queued", type: "uint256" },
          { name: "finishAt", type: "uint40" },
          { name: "lastUpdate", type: "uint40" },
          { name: "index", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "REWARD_PERIOD_LENGTH",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "assetBalanceOf",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const wstETHABI = [
  {
    inputs: [],
    name: "stEthPerToken",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const erc20ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const chainlinkOracleABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const genesisABI = [
  {
    inputs: [],
    name: "genesisIsEnded",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Constants
const STAKING_APR = 0.035; // 3.5% APR for stETH staking rewards
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_WEEK = 604800; // 7 days
const DAYS_PER_YEAR = 365;

interface ProjectedAPRResult {
  collateralPoolAPR: number | null;
  leveragedPoolAPR: number | null;
  isLoading: boolean;
  error: string | null;
  harvestableAmount: bigint | null;
  projectedHarvestable: bigint | null;
  remainingDays: number | null;
}

export function useProjectedAPR(
  marketId: string = "pb-steth"
): ProjectedAPRResult {
  const market = markets[marketId as keyof typeof markets];

  const minterAddress = market?.addresses?.minter || contracts.minter;
  const stabilityPoolManagerAddress =
    market?.addresses?.stabilityPoolManager || contracts.stabilityPoolManager;
  const collateralPoolAddress = market?.addresses?.stabilityPoolCollateral;
  const leveragedPoolAddress = market?.addresses?.stabilityPoolLeveraged;
  const priceOracleAddress =
    market?.addresses?.priceOracle || contracts.priceOracle;
  const genesisAddress = market?.addresses?.genesis || contracts.genesis;
  const wstETHAddress =
    market?.addresses?.collateralToken || contracts.wrappedCollateralToken;

  // Batch read: Basic contract data
  const { data: basicReads, isLoading: isLoadingBasic } = useAnvilContractReads(
    {
      contracts: [
        // Minter reads
        {
          address: minterAddress as `0x${string}`,
          abi: minterABI,
          functionName: "harvestable",
        },
        {
          address: minterAddress as `0x${string}`,
          abi: minterABI,
          functionName: "WRAPPED_COLLATERAL_TOKEN",
        },
        // Stability Pool Manager reads
        {
          address: stabilityPoolManagerAddress as `0x${string}`,
          abi: stabilityPoolManagerABI,
          functionName: "harvestBountyRatio",
        },
        {
          address: stabilityPoolManagerAddress as `0x${string}`,
          abi: stabilityPoolManagerABI,
          functionName: "harvestCutRatio",
        },
        // Collateral pool reads
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: stabilityPoolABI,
          functionName: "totalAssetSupply",
        },
        // Leveraged pool reads
        {
          address: leveragedPoolAddress as `0x${string}`,
          abi: stabilityPoolABI,
          functionName: "totalAssetSupply",
        },
        // Genesis status
        {
          address: genesisAddress as `0x${string}`,
          abi: genesisABI,
          functionName: "genesisIsEnded",
        },
        // Price oracle
        {
          address: priceOracleAddress as `0x${string}`,
          abi: chainlinkOracleABI,
          functionName: "latestAnswer",
        },
        {
          address: priceOracleAddress as `0x${string}`,
          abi: chainlinkOracleABI,
          functionName: "decimals",
        },
      ],
      enabled:
        !!minterAddress &&
        !!stabilityPoolManagerAddress &&
        !!collateralPoolAddress &&
        !!leveragedPoolAddress,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Get wstETH balance on the minter and stEthPerToken rate
  const { data: wstETHReads, isLoading: isLoadingWstETH } =
    useAnvilContractReads({
      contracts: [
        {
          address: wstETHAddress as `0x${string}`,
          abi: wstETHABI,
          functionName: "stEthPerToken",
        },
        {
          address: wstETHAddress as `0x${string}`,
          abi: erc20ABI,
          functionName: "balanceOf",
          args: [minterAddress as `0x${string}`],
        },
      ],
      enabled: !!wstETHAddress && !!minterAddress,
      refetchInterval: 30000,
    });

  // Get reward data from collateral pool (for finishAt and queued)
  const wrappedCollateralToken = basicReads?.[1]?.result as
    | `0x${string}`
    | undefined;

  const { data: rewardDataReads, isLoading: isLoadingRewardData } =
    useAnvilContractReads({
      contracts: [
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: stabilityPoolABI,
          functionName: "rewardData",
          args: wrappedCollateralToken ? [wrappedCollateralToken] : undefined,
        },
        {
          address: leveragedPoolAddress as `0x${string}`,
          abi: stabilityPoolABI,
          functionName: "rewardData",
          args: wrappedCollateralToken ? [wrappedCollateralToken] : undefined,
        },
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: stabilityPoolABI,
          functionName: "REWARD_PERIOD_LENGTH",
        },
      ],
      enabled:
        !!wrappedCollateralToken &&
        !!collateralPoolAddress &&
        !!leveragedPoolAddress,
      refetchInterval: 30000,
    });

  const result = useMemo(() => {
    const defaultResult: ProjectedAPRResult = {
      collateralPoolAPR: null,
      leveragedPoolAPR: null,
      isLoading: isLoadingBasic || isLoadingWstETH || isLoadingRewardData,
      error: null,
      harvestableAmount: null,
      projectedHarvestable: null,
      remainingDays: null,
    };

    if (isLoadingBasic || isLoadingWstETH || isLoadingRewardData) {
      return defaultResult;
    }

    try {
      // Extract basic reads
      const harvestable = basicReads?.[0]?.result as bigint | undefined;
      const bountyRatio = basicReads?.[2]?.result as bigint | undefined;
      const cutRatio = basicReads?.[3]?.result as bigint | undefined;
      const collateralPoolSupply = basicReads?.[4]?.result as
        | bigint
        | undefined;
      const leveragedPoolSupply = basicReads?.[5]?.result as bigint | undefined;
      const genesisEnded = basicReads?.[6]?.result as boolean | undefined;
      const priceRaw = basicReads?.[7]?.result as bigint | undefined;
      const priceDecimals =
        (basicReads?.[8]?.result as number | undefined) ?? 8;

      // Extract wstETH reads
      const stEthPerToken = wstETHReads?.[0]?.result as bigint | undefined;
      const wstETHBalance = wstETHReads?.[1]?.result as bigint | undefined;

      // Extract reward data
      const collateralRewardData = rewardDataReads?.[0]?.result as
        | {
            rate: bigint;
            queued: bigint;
            finishAt: number;
            lastUpdate: number;
            index: bigint;
          }
        | undefined;
      const leveragedRewardData = rewardDataReads?.[1]?.result as
        | {
            rate: bigint;
            queued: bigint;
            finishAt: number;
            lastUpdate: number;
            index: bigint;
          }
        | undefined;
      const rewardPeriodLength = rewardDataReads?.[2]?.result as
        | bigint
        | undefined;

      // Validation
      if (harvestable === undefined || harvestable === 0n) {
        return {
          ...defaultResult,
          error: "No harvestable amount available",
          harvestableAmount: harvestable ?? 0n,
        };
      }

      if (!collateralPoolSupply || !leveragedPoolSupply) {
        return {
          ...defaultResult,
          error: "Could not read pool supplies",
          harvestableAmount: harvestable,
        };
      }

      const totalPoolHolding = collateralPoolSupply + leveragedPoolSupply;
      if (totalPoolHolding === 0n) {
        return {
          ...defaultResult,
          error: "No deposits in stability pools",
          harvestableAmount: harvestable,
        };
      }

      // Calculate remaining time until period end
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const periodLength = rewardPeriodLength
        ? Number(rewardPeriodLength)
        : SECONDS_PER_WEEK;

      let remainingSeconds: number;

      // Check if there's an active reward period
      const finishAt = collateralRewardData?.finishAt ?? 0;

      if (finishAt > currentTimestamp) {
        // Active reward period - calculate remaining time
        remainingSeconds = finishAt - currentTimestamp;
      } else if (!genesisEnded) {
        // Genesis not ended yet - assume 7 days from now (or from genesis end)
        // Parse genesis end date from market config
        const genesisEndDate = market?.genesis?.endDate;
        if (genesisEndDate) {
          const genesisEndTimestamp = new Date(genesisEndDate).getTime() / 1000;
          if (genesisEndTimestamp > currentTimestamp) {
            // Genesis hasn't ended yet - project from genesis end + 7 days
            remainingSeconds =
              genesisEndTimestamp - currentTimestamp + periodLength;
          } else {
            // Genesis ended but no harvest yet - assume 7 days
            remainingSeconds = periodLength;
          }
        } else {
          remainingSeconds = periodLength;
        }
      } else {
        // Genesis ended, no active period - assume full 7-day period
        remainingSeconds = periodLength;
      }

      const remainingDays = remainingSeconds / SECONDS_PER_DAY;

      // Project additional yield for remaining days using staking APR
      let projectedHarvestable = harvestable;

      if (stEthPerToken && wstETHBalance && stEthPerToken > 0n) {
        // Calculate underlying collateral (in stETH terms)
        // underlyingCollateral = (wstETHBalance - harvestable) * stEthPerToken / 1e18
        const netBalance =
          wstETHBalance > harvestable ? wstETHBalance - harvestable : 0n;
        const underlyingCollateral =
          (netBalance * stEthPerToken) / BigInt(1e18);

        // Project rate growth
        const dailyRate = STAKING_APR / DAYS_PER_YEAR;
        const rateGrowthFactor = 1 + dailyRate * remainingDays;
        const projectedRate =
          (stEthPerToken * BigInt(Math.floor(rateGrowthFactor * 1e18))) /
          BigInt(1e18);

        // Calculate additional yield
        if (projectedRate > stEthPerToken) {
          const currentValue =
            (underlyingCollateral * BigInt(1e18)) / stEthPerToken;
          const projectedValue =
            (underlyingCollateral * BigInt(1e18)) / projectedRate;
          const additionalYield =
            currentValue > projectedValue ? currentValue - projectedValue : 0n;
          projectedHarvestable = harvestable + additionalYield;
        }
      }

      // Calculate what would go to pools after deductions
      const bounty = bountyRatio
        ? (projectedHarvestable * bountyRatio) / BigInt(1e18)
        : 0n;
      const cut = cutRatio
        ? (projectedHarvestable * cutRatio) / BigInt(1e18)
        : 0n;
      const harvestableRemaining = projectedHarvestable - bounty - cut;

      // Calculate split between pools
      const toCollateralPool =
        (harvestableRemaining * collateralPoolSupply) / totalPoolHolding;
      const toLeveragedPool = harvestableRemaining - toCollateralPool;

      // Get queued rewards
      const collateralQueued = collateralRewardData?.queued ?? 0n;
      const leveragedQueued = leveragedRewardData?.queued ?? 0n;

      // Total rewards for next period
      const totalCollateralRewards = toCollateralPool + collateralQueued;
      const totalLeveragedRewards = toLeveragedPool + leveragedQueued;

      // Calculate projected rates (rewards per second)
      const projectedCollateralRate =
        totalCollateralRewards / BigInt(periodLength);
      const projectedLeveragedRate =
        totalLeveragedRewards / BigInt(periodLength);

      // Get collateral price for USD conversion
      const collateralPriceUSD = priceRaw
        ? Number(priceRaw) / 10 ** priceDecimals
        : 0;

      // Calculate APR for collateral pool
      // APR = (rewardsValue / depositValue) * (365/7) * 100
      let collateralPoolAPR = 0;
      if (collateralPoolSupply > 0n && collateralPriceUSD > 0) {
        const rewardsPer7Days = Number(projectedCollateralRate) * periodLength;
        const rewardsValueUSD = (rewardsPer7Days / 1e18) * collateralPriceUSD;
        const depositValueUSD =
          (Number(collateralPoolSupply) / 1e18) * collateralPriceUSD;

        if (depositValueUSD > 0) {
          collateralPoolAPR =
            (rewardsValueUSD / depositValueUSD) * (DAYS_PER_YEAR / 7) * 100;
        }
      }

      // Calculate APR for leveraged pool
      // For leveraged pool, deposits are in pegged tokens (different price)
      // For simplicity, we'll use same price assumption (pegged token ~= collateral value)
      let leveragedPoolAPR = 0;
      if (leveragedPoolSupply > 0n && collateralPriceUSD > 0) {
        const rewardsPer7Days = Number(projectedLeveragedRate) * periodLength;
        const rewardsValueUSD = (rewardsPer7Days / 1e18) * collateralPriceUSD;
        // Pegged tokens are roughly $1 each (or track some underlying)
        // For now, assume leveraged pool deposits are valued similarly to rewards token
        const depositValueUSD =
          (Number(leveragedPoolSupply) / 1e18) * collateralPriceUSD;

        if (depositValueUSD > 0) {
          leveragedPoolAPR =
            (rewardsValueUSD / depositValueUSD) * (DAYS_PER_YEAR / 7) * 100;
        }
      }

      return {
        collateralPoolAPR: isFinite(collateralPoolAPR)
          ? collateralPoolAPR
          : null,
        leveragedPoolAPR: isFinite(leveragedPoolAPR) ? leveragedPoolAPR : null,
        isLoading: false,
        error: null,
        harvestableAmount: harvestable,
        projectedHarvestable,
        remainingDays,
      };
    } catch (error) {
      console.error("[useProjectedAPR] Error calculating APR:", error);
      return {
        ...defaultResult,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, [
    basicReads,
    wstETHReads,
    rewardDataReads,
    isLoadingBasic,
    isLoadingWstETH,
    isLoadingRewardData,
    market,
  ]);

  return result;
}

/**
 * Hook to get projected APR for a specific user's deposits
 */
export function useUserProjectedAPR(
  marketId: string = "pb-steth",
  userAddress?: `0x${string}`
): {
  collateralPoolAPR: number | null;
  leveragedPoolAPR: number | null;
  userCollateralDeposit: bigint | null;
  userLeveragedDeposit: bigint | null;
  projected7DayRewardsCollateral: number | null;
  projected7DayRewardsLeveraged: number | null;
  isLoading: boolean;
  error: string | null;
} {
  const market = markets[marketId as keyof typeof markets];
  const collateralPoolAddress = market?.addresses?.stabilityPoolCollateral;
  const leveragedPoolAddress = market?.addresses?.stabilityPoolLeveraged;

  // Get base APR data
  const baseAPR = useProjectedAPR(marketId);

  // Get user's deposits
  const { data: userDeposits, isLoading: isLoadingUserDeposits } =
    useAnvilContractReads({
      contracts: [
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: stabilityPoolABI,
          functionName: "assetBalanceOf",
          args: userAddress ? [userAddress] : undefined,
        },
        {
          address: leveragedPoolAddress as `0x${string}`,
          abi: stabilityPoolABI,
          functionName: "assetBalanceOf",
          args: userAddress ? [userAddress] : undefined,
        },
      ],
      enabled:
        !!userAddress && !!collateralPoolAddress && !!leveragedPoolAddress,
      refetchInterval: 30000,
    });

  return useMemo(() => {
    const userCollateralDeposit = userDeposits?.[0]?.result as
      | bigint
      | undefined;
    const userLeveragedDeposit = userDeposits?.[1]?.result as
      | bigint
      | undefined;

    // Calculate 7-day projected rewards based on APR
    let projected7DayRewardsCollateral: number | null = null;
    let projected7DayRewardsLeveraged: number | null = null;

    if (baseAPR.collateralPoolAPR !== null && userCollateralDeposit) {
      const depositValue = Number(formatEther(userCollateralDeposit));
      projected7DayRewardsCollateral =
        (depositValue * (baseAPR.collateralPoolAPR / 100) * 7) / DAYS_PER_YEAR;
    }

    if (baseAPR.leveragedPoolAPR !== null && userLeveragedDeposit) {
      const depositValue = Number(formatEther(userLeveragedDeposit));
      projected7DayRewardsLeveraged =
        (depositValue * (baseAPR.leveragedPoolAPR / 100) * 7) / DAYS_PER_YEAR;
    }

    return {
      collateralPoolAPR: baseAPR.collateralPoolAPR,
      leveragedPoolAPR: baseAPR.leveragedPoolAPR,
      userCollateralDeposit: userCollateralDeposit ?? null,
      userLeveragedDeposit: userLeveragedDeposit ?? null,
      projected7DayRewardsCollateral,
      projected7DayRewardsLeveraged,
      isLoading: baseAPR.isLoading || isLoadingUserDeposits,
      error: baseAPR.error,
    };
  }, [baseAPR, userDeposits, isLoadingUserDeposits]);
}
