import { useAccount, useContractReads } from "wagmi";
import { useMemo } from "react";
import { Pool } from "@/config/pools";
import { usePools } from "./usePools";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { rewardsABI } from "@/abis/rewards";
import { minterABI } from "@/abis/minter";
import { CHAINLINK_AGGREGATOR_ABI } from "@/abis/chainlink";
import { successfulBigint } from "@/utils/stabilityPoolCompat";

export const usePoolData = (pools: Pool[]) => {
  const { address } = useAccount();
  const { getMarketByPool } = usePools();

  const contracts = useMemo(() => {
    const allContracts: any[] = [];
    pools.forEach((pool) => {
      const market = getMarketByPool(pool.address);
      const userAddress =
        address ?? "0x0000000000000000000000000000000000000000";

      const baseContracts = [
        {
          address: pool.address,
          abi: stabilityPoolABI,
          functionName: "totalSupply",
        },
        {
          address: pool.address,
          abi: stabilityPoolABI,
          functionName: "totalAssetSupply",
        },
        {
          address: pool.address,
          abi: stabilityPoolABI,
          functionName: "balanceOf",
          args: [userAddress],
        },
        {
          address: pool.address,
          abi: stabilityPoolABI,
          functionName: "assetBalanceOf",
          args: [userAddress],
        },
        {
          address: pool.address,
          abi: rewardsABI,
          functionName: "getClaimableRewards",
          args: [userAddress],
        },
      ];

      if (pool.poolType === "collateral" && market?.addresses.collateralPrice) {
        allContracts.push(
          ...baseContracts,
          {
            address: market.addresses.collateralPrice,
            abi: CHAINLINK_AGGREGATOR_ABI,
            functionName: "latestRoundData",
          },
          {
            address: market.addresses.collateralPrice,
            abi: CHAINLINK_AGGREGATOR_ABI,
            functionName: "decimals",
          }
        );
      } else {
        allContracts.push(
          ...baseContracts,
          {
            address: market?.addresses.minter as `0x${string}`,
            abi: minterABI,
            functionName: "peggedTokenPrice",
          },
          {
            address: market?.addresses.minter as `0x${string}`,
            abi: minterABI,
            functionName: "leverageRatio",
          }
        );
      }
    });
    return allContracts;
  }, [pools, address, getMarketByPool]);

  const { data, ...rest } = useContractReads({
    contracts,
    allowFailure: true,
  });

  const poolData = useMemo(() => {
    if (!data) return [];

    let dataIndex = 0;
    return pools.map((pool) => {
      const i = dataIndex;
      const tvl =
        successfulBigint(data[i]) ?? successfulBigint(data[i + 1]);
      const userDeposit =
        successfulBigint(data[i + 2]) ?? successfulBigint(data[i + 3]);
      const rewards = data[i + 4]?.result as bigint | undefined;

      let price: bigint | undefined;
      let priceDecimals: number | undefined;
      let leverageRatio: bigint | undefined;

      if (pool.poolType === "collateral") {
        const priceData = data[i + 5]?.result as any[] | undefined;
        price = priceData?.[1] as bigint | undefined;
        priceDecimals = data[i + 6]?.result as number | undefined;
        dataIndex += 7;
      } else {
        price = data[i + 5]?.result as bigint | undefined;
        priceDecimals = 18; // LP token price is 18 decimals
        leverageRatio = data[i + 6]?.result as bigint | undefined;
        dataIndex += 7;
      }

      let tvlUSD = 0;
      if (
        tvl !== undefined &&
        price !== undefined &&
        priceDecimals !== undefined
      ) {
        const tvlNum = Number(tvl) / 1e18;
        const priceNum = Number(price) / 10 ** priceDecimals;
        tvlUSD = tvlNum * priceNum;
      }

      const aprBreakdown = {
        collateral: 0,
        steam: 0,
      };

      if (rewards && tvlUSD > 0) {
        // Assuming rewards are for a year. This might need adjustment.
        const rewardsUSD = (Number(rewards) / 1e18) * 1; // Assuming 1 TIDE = $1
        aprBreakdown.collateral = (rewardsUSD / tvlUSD) * 100;
      }

      return {
        ...pool,
        tvl,
        tvlUSD,
        userDeposit,
        aprBreakdown,
        rewards,
        leverageRatio,
      };
    });
  }, [data, pools]);

  return { poolData, ...rest };
};
