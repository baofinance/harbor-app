import { useMemo } from "react";
import { useContractReads } from "./useContractReads";
import { useContractRead } from "./useContractRead";
import { formatEther } from "viem";
import { markets } from "@/config/markets";
import { contracts, GENESIS_ABI } from "@/config/contracts";
import {
  MINTER_ABI,
  STABILITY_POOL_ABI,
  STABILITY_POOL_MANAGER_ABI,
  WSTETH_ABI,
  ERC20_ABI,
  CHAINLINK_ORACLE_ABI,
} from "@/abis/shared";
import { POLLING_INTERVALS } from "@/config/polling";

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
  // Queued rewards waiting to be distributed
  collateralQueuedRewards: bigint | null;
  leveragedQueuedRewards: bigint | null;
  // Total rewards value for 7 days (queued + projected harvestable share)
  collateralRewards7Day: bigint | null;
  leveragedRewards7Day: bigint | null;
  // Flag for "infinite APR" when there are rewards but no TVL (DEPRECATED - use per-pool flags)
  hasRewardsNoTVL: boolean;
  // Per-pool flags for "rewards waiting" state
  collateralPoolHasRewardsNoTVL: boolean;
  leveragedPoolHasRewardsNoTVL: boolean;
  // Pool TVL values
  collateralPoolTVL: bigint | null;
  leveragedPoolTVL: bigint | null;
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
  const { data: basicReads, isLoading: isLoadingBasic } = useContractReads(
    {
      contracts: [
        // Minter reads
        {
          address: minterAddress as `0x${string}`,
          abi: MINTER_ABI,
          functionName: "harvestable",
        },
        {
          address: minterAddress as `0x${string}`,
          abi: MINTER_ABI,
          functionName: "WRAPPED_COLLATERAL_TOKEN",
        },
        // Stability Pool Manager reads
        {
          address: stabilityPoolManagerAddress as `0x${string}`,
          abi: STABILITY_POOL_MANAGER_ABI,
          functionName: "harvestBountyRatio",
        },
        {
          address: stabilityPoolManagerAddress as `0x${string}`,
          abi: STABILITY_POOL_MANAGER_ABI,
          functionName: "harvestCutRatio",
        },
        // Collateral pool reads
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: STABILITY_POOL_ABI,
          functionName: "totalAssetSupply",
        },
        // Leveraged pool reads
        {
          address: leveragedPoolAddress as `0x${string}`,
          abi: STABILITY_POOL_ABI,
          functionName: "totalAssetSupply",
        },
        // Genesis status
        {
          address: genesisAddress as `0x${string}`,
          abi: GENESIS_ABI,
          functionName: "genesisIsEnded",
        },
        // Price oracle
        {
          address: priceOracleAddress as `0x${string}`,
          abi: CHAINLINK_ORACLE_ABI,
          functionName: "latestAnswer",
        },
        {
          address: priceOracleAddress as `0x${string}`,
          abi: CHAINLINK_ORACLE_ABI,
          functionName: "decimals",
        },
      ],
      enabled:
        !!minterAddress &&
        !!stabilityPoolManagerAddress &&
        !!collateralPoolAddress &&
        !!leveragedPoolAddress,
      refetchInterval: POLLING_INTERVALS.SLOW, // Refresh every 30 seconds
    }
  );

  // Get wstETH balance on the minter and stEthPerToken rate
  const { data: wstETHReads, isLoading: isLoadingWstETH } =
    useContractReads({
      contracts: [
        {
          address: wstETHAddress as `0x${string}`,
          abi: WSTETH_ABI,
          functionName: "stEthPerToken",
        },
        {
          address: wstETHAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [minterAddress as `0x${string}`],
        },
      ],
      enabled: !!wstETHAddress && !!minterAddress,
      refetchInterval: POLLING_INTERVALS.SLOW,
    });

  // Get reward data from collateral pool (for finishAt and queued)
  const wrappedCollateralToken = basicReads?.[1]?.result as
    | `0x${string}`
    | undefined;

  const { data: rewardDataReads, isLoading: isLoadingRewardData } =
    useContractReads({
      contracts: [
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: STABILITY_POOL_ABI,
          functionName: "rewardData",
          args: wrappedCollateralToken ? [wrappedCollateralToken] : undefined,
        },
        {
          address: leveragedPoolAddress as `0x${string}`,
          abi: STABILITY_POOL_ABI,
          functionName: "rewardData",
          args: wrappedCollateralToken ? [wrappedCollateralToken] : undefined,
        },
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: STABILITY_POOL_ABI,
          functionName: "REWARD_PERIOD_LENGTH",
        },
      ],
      enabled:
        !!wrappedCollateralToken &&
        !!collateralPoolAddress &&
        !!leveragedPoolAddress,
      refetchInterval: POLLING_INTERVALS.SLOW,
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
      collateralQueuedRewards: null,
      leveragedQueuedRewards: null,
      collateralRewards7Day: null,
      leveragedRewards7Day: null,
      hasRewardsNoTVL: false,
      collateralPoolHasRewardsNoTVL: false,
      leveragedPoolHasRewardsNoTVL: false,
      collateralPoolTVL: null,
      leveragedPoolTVL: null,
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

      // Extract reward period length
      const rewardPeriodLength = rewardDataReads?.[2]?.result as
        | bigint
        | undefined;

      // Extract queued rewards FIRST - before any early returns
      // rewardData returns: [lastUpdate, finishAt, rate, queued] as 4 separate uint256 values
      const collateralRewardDataRaw = rewardDataReads?.[0]?.result as
        | readonly [bigint, bigint, bigint, bigint]
        | undefined;
      const leveragedRewardDataRaw = rewardDataReads?.[1]?.result as
        | readonly [bigint, bigint, bigint, bigint]
        | undefined;

      // Parse the array into named fields
      const collateralRewardDataParsed = collateralRewardDataRaw
        ? {
            lastUpdate: Number(collateralRewardDataRaw[0]),
            finishAt: Number(collateralRewardDataRaw[1]),
            rate: collateralRewardDataRaw[2],
            queued: collateralRewardDataRaw[3],
          }
        : undefined;
      const leveragedRewardDataParsed = leveragedRewardDataRaw
        ? {
            lastUpdate: Number(leveragedRewardDataRaw[0]),
            finishAt: Number(leveragedRewardDataRaw[1]),
            rate: leveragedRewardDataRaw[2],
            queued: leveragedRewardDataRaw[3],
          }
        : undefined;

      const collateralQueued = collateralRewardDataParsed?.queued ?? 0n;
      const leveragedQueued = leveragedRewardDataParsed?.queued ?? 0n;
      const collateralRate = collateralRewardDataParsed?.rate ?? 0n;
      const leveragedRate = leveragedRewardDataParsed?.rate ?? 0n;
      // Reward period length (default to 7 days if missing)
      const periodLengthSeconds = rewardPeriodLength
        ? Number(rewardPeriodLength)
        : SECONDS_PER_WEEK;

      // Compute 7‑day rewards: current queued plus what will stream over the next period
      const collateralRewards7Day =
        collateralQueued + collateralRate * BigInt(periodLengthSeconds);
      const leveragedRewards7Day =
        leveragedQueued + leveragedRate * BigInt(periodLengthSeconds);

      const totalQueuedRewards = collateralQueued + leveragedQueued;

      // Check if no harvestable amount BUT there are queued/streaming rewards
      if (harvestable === undefined || harvestable === 0n) {
        // Even if no harvestable, if there are queued rewards, we should show them
        const hasRewardsStreaming =
          collateralRewards7Day > 0n || leveragedRewards7Day > 0n;

        // Calculate per-pool "rewards waiting" state
        const collateralHasRewardsNoTVL =
          collateralRewards7Day > 0n &&
          (!collateralPoolSupply || collateralPoolSupply === 0n);
        const leveragedHasRewardsNoTVL =
          leveragedRewards7Day > 0n &&
          (!leveragedPoolSupply || leveragedPoolSupply === 0n);

        if (totalQueuedRewards > 0n || hasRewardsStreaming) {
          return {
            ...defaultResult,
            collateralPoolAPR: collateralHasRewardsNoTVL ? 10000 : null,
            leveragedPoolAPR: leveragedHasRewardsNoTVL ? 10000 : null,
            error: null,
            harvestableAmount: harvestable ?? 0n,
            collateralQueuedRewards: collateralQueued,
            leveragedQueuedRewards: leveragedQueued,
            collateralRewards7Day,
            leveragedRewards7Day,
            hasRewardsNoTVL:
              collateralHasRewardsNoTVL && leveragedHasRewardsNoTVL,
            collateralPoolHasRewardsNoTVL: collateralHasRewardsNoTVL,
            leveragedPoolHasRewardsNoTVL: leveragedHasRewardsNoTVL,
            collateralPoolTVL: collateralPoolSupply ?? null,
            leveragedPoolTVL: leveragedPoolSupply ?? null,
          };
        }
        return {
          ...defaultResult,
          error: "No harvestable amount available",
          harvestableAmount: harvestable ?? 0n,
          collateralQueuedRewards: collateralQueued,
          leveragedQueuedRewards: leveragedQueued,
          collateralPoolTVL: collateralPoolSupply ?? null,
          leveragedPoolTVL: leveragedPoolSupply ?? null,
        };
      }

      // Note: We no longer require BOTH pools to have supply data
      // One pool may have deposits while the other doesn't

      // Get safe pool supply values (default to 0n if undefined)
      const safeCollateralPoolSupply = collateralPoolSupply ?? 0n;
      const safeLeveragedPoolSupply = leveragedPoolSupply ?? 0n;
      const totalPoolHolding =
        safeCollateralPoolSupply + safeLeveragedPoolSupply;

      // Calculate per-pool "rewards waiting" state
      const collateralHasRewardsNoTVL =
        collateralRewards7Day > 0n && safeCollateralPoolSupply === 0n;
      const leveragedHasRewardsNoTVL =
        leveragedRewards7Day > 0n && safeLeveragedPoolSupply === 0n;

      if (totalPoolHolding === 0n) {
        // No TVL in either pool but there may be queued rewards waiting
        return {
          ...defaultResult,
          collateralPoolAPR: collateralRewards7Day > 0n ? 10000 : null, // Signal "10k%+"
          leveragedPoolAPR: leveragedRewards7Day > 0n ? 10000 : null,
          error:
            collateralRewards7Day > 0n || leveragedRewards7Day > 0n
              ? null
              : "No deposits in stability pools",
          harvestableAmount: harvestable,
          collateralQueuedRewards: collateralQueued,
          leveragedQueuedRewards: leveragedQueued,
          collateralRewards7Day,
          leveragedRewards7Day,
          hasRewardsNoTVL:
            collateralRewards7Day > 0n || leveragedRewards7Day > 0n,
          collateralPoolHasRewardsNoTVL: collateralHasRewardsNoTVL,
          leveragedPoolHasRewardsNoTVL: leveragedHasRewardsNoTVL,
          collateralPoolTVL: safeCollateralPoolSupply,
          leveragedPoolTVL: safeLeveragedPoolSupply,
        };
      }

      // Calculate remaining time until period end
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const periodLength = rewardPeriodLength
        ? Number(rewardPeriodLength)
        : SECONDS_PER_WEEK;

      let remainingSeconds: number;

      // Check if there's an active reward period
      const finishAt = collateralRewardDataParsed?.finishAt ?? 0;

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
        (harvestableRemaining * safeCollateralPoolSupply) / totalPoolHolding;
      const toLeveragedPool = harvestableRemaining - toCollateralPool;

      // Total rewards for next period (already extracted collateralQueued and leveragedQueued above)
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
      let collateralPoolAPR: number | null = null;
      if (safeCollateralPoolSupply > 0n && collateralPriceUSD > 0) {
        const rewardsPer7Days = Number(projectedCollateralRate) * periodLength;
        const rewardsValueUSD = (rewardsPer7Days / 1e18) * collateralPriceUSD;
        const depositValueUSD =
          (Number(safeCollateralPoolSupply) / 1e18) * collateralPriceUSD;

        if (depositValueUSD > 0) {
          collateralPoolAPR =
            (rewardsValueUSD / depositValueUSD) * (DAYS_PER_YEAR / 7) * 100;
        }
      } else if (collateralHasRewardsNoTVL) {
        // No TVL but rewards waiting - signal "10k%+"
        collateralPoolAPR = 10000;
      }

      // Calculate APR for leveraged pool
      // For leveraged pool, deposits are in pegged tokens (different price)
      // For simplicity, we'll use same price assumption (pegged token ~= collateral value)
      let leveragedPoolAPR: number | null = null;
      if (safeLeveragedPoolSupply > 0n && collateralPriceUSD > 0) {
        const rewardsPer7Days = Number(projectedLeveragedRate) * periodLength;
        const rewardsValueUSD = (rewardsPer7Days / 1e18) * collateralPriceUSD;
        // Pegged tokens are roughly $1 each (or track some underlying)
        // For now, assume leveraged pool deposits are valued similarly to rewards token
        const depositValueUSD =
          (Number(safeLeveragedPoolSupply) / 1e18) * collateralPriceUSD;

        if (depositValueUSD > 0) {
          leveragedPoolAPR =
            (rewardsValueUSD / depositValueUSD) * (DAYS_PER_YEAR / 7) * 100;
        }
      } else if (leveragedHasRewardsNoTVL) {
        // No TVL but rewards waiting - signal "10k%+"
        leveragedPoolAPR = 10000;
      }

      return {
        collateralPoolAPR:
          collateralPoolAPR !== null &&
          typeof collateralPoolAPR === "number" &&
          isFinite(collateralPoolAPR)
            ? collateralPoolAPR
            : null,
        leveragedPoolAPR:
          leveragedPoolAPR !== null &&
          typeof leveragedPoolAPR === "number" &&
          isFinite(leveragedPoolAPR)
            ? leveragedPoolAPR
            : null,
        isLoading: false,
        error: null,
        harvestableAmount: harvestable,
        projectedHarvestable,
        remainingDays,
        collateralQueuedRewards: collateralQueued,
        leveragedQueuedRewards: leveragedQueued,
        collateralRewards7Day: totalCollateralRewards,
        leveragedRewards7Day: totalLeveragedRewards,
        hasRewardsNoTVL: collateralHasRewardsNoTVL && leveragedHasRewardsNoTVL,
        collateralPoolHasRewardsNoTVL: collateralHasRewardsNoTVL,
        leveragedPoolHasRewardsNoTVL: leveragedHasRewardsNoTVL,
        collateralPoolTVL: safeCollateralPoolSupply,
        leveragedPoolTVL: safeLeveragedPoolSupply,
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
    useContractReads({
      contracts: [
        {
          address: collateralPoolAddress as `0x${string}`,
          abi: STABILITY_POOL_ABI,
          functionName: "assetBalanceOf",
          args: userAddress ? [userAddress] : undefined,
        },
        {
          address: leveragedPoolAddress as `0x${string}`,
          abi: STABILITY_POOL_ABI,
          functionName: "assetBalanceOf",
          args: userAddress ? [userAddress] : undefined,
        },
      ],
      enabled:
        !!userAddress && !!collateralPoolAddress && !!leveragedPoolAddress,
      refetchInterval: POLLING_INTERVALS.SLOW,
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
