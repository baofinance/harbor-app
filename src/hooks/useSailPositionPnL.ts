"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getSailPriceGraphUrl, getGraphHeaders } from "@/config/graph";

// GraphQL query for user position and PnL
const USER_POSITION_QUERY = `
  query GetUserPosition($positionId: ID!, $userAddress: Bytes!, $tokenAddress: Bytes!) {
    userSailPosition(id: $positionId) {
      id
      tokenAddress
      user
      balance
      balanceUSD
      totalCostBasisUSD
      averageCostPerToken
      realizedPnLUSD
      totalTokensBought
      totalTokensSold
      totalSpentUSD
      totalReceivedUSD
      firstAcquiredAt
      lastUpdated
    }
    
    # Get recent mint/redeem events for this user
    sailTokenMintEvents(
      where: { user: $userAddress, tokenAddress: $tokenAddress }
      orderBy: timestamp
      orderDirection: desc
      first: 50
    ) {
      id
      collateralIn
      leveragedOut
      collateralValueUSD
      tokenValueUSD
      pricePerToken
      timestamp
      txHash
    }
    
    sailTokenRedeemEvents(
      where: { user: $userAddress, tokenAddress: $tokenAddress }
      orderBy: timestamp
      orderDirection: desc
      first: 50
    ) {
      id
      leveragedBurned
      collateralOut
      collateralValueUSD
      tokenValueUSD
      pricePerToken
      costBasisUSD
      realizedPnLUSD
      timestamp
      txHash
    }
  }
`;

export interface UserSailPosition {
  balance: bigint;
  balanceUSD: number;
  totalCostBasisUSD: number;
  averageCostPerToken: number;
  realizedPnLUSD: number;
  totalTokensBought: bigint;
  totalTokensSold: bigint;
  totalSpentUSD: number;
  totalReceivedUSD: number;
  firstAcquiredAt: number;
  lastUpdated: number;
}

export interface MintEvent {
  collateralIn: string;
  leveragedOut: string;
  collateralValueUSD: number;
  tokenValueUSD: number;
  pricePerToken: number;
  timestamp: number;
  txHash: string;
}

export interface RedeemEvent {
  leveragedBurned: string;
  collateralOut: string;
  collateralValueUSD: number;
  tokenValueUSD: number;
  pricePerToken: number;
  costBasisUSD: number;
  realizedPnLUSD: number;
  timestamp: number;
  txHash: string;
}

export interface SailPositionPnLData {
  position: UserSailPosition | null;
  mintEvents: MintEvent[];
  redeemEvents: RedeemEvent[];
  
  // Computed values
  currentValueUSD: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  totalPnL: number; // realized + unrealized
  
  isLoading: boolean;
  error: string | null;
}

interface UseSailPositionPnLOptions {
  tokenAddress: string;
  currentTokenPrice?: number; // Current token price in USD (from oracle)
  enabled?: boolean;
}

export function useSailPositionPnL({
  tokenAddress,
  currentTokenPrice,
  enabled = true,
}: UseSailPositionPnLOptions): SailPositionPnLData {
  const { address } = useAccount();
  const graphUrl = getSailPriceGraphUrl();
  
  const positionId = tokenAddress && address
    ? `${tokenAddress.toLowerCase()}-${address.toLowerCase()}`
    : "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["sailPositionPnL", tokenAddress, address],
    queryFn: async () => {
      if (!tokenAddress || !address) {
        // Return empty data structure instead of null
        return {
          userSailPosition: null,
          sailTokenMintEvents: [],
          sailTokenRedeemEvents: [],
        };
      }

      const response = await fetch(graphUrl, {
        method: "POST",
        headers: getGraphHeaders(),
        body: JSON.stringify({
          query: USER_POSITION_QUERY,
          variables: {
            positionId,
            userAddress: address.toLowerCase(),
            tokenAddress: tokenAddress.toLowerCase(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL query failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      // Ensure we always return a valid data structure
      return result.data || {
        userSailPosition: null,
        sailTokenMintEvents: [],
        sailTokenRedeemEvents: [],
      };
    },
    enabled: enabled && !!tokenAddress && !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });

  // Parse position data
  const position: UserSailPosition | null = data?.userSailPosition
    ? {
        balance: BigInt(data.userSailPosition.balance),
        balanceUSD: parseFloat(data.userSailPosition.balanceUSD),
        totalCostBasisUSD: parseFloat(data.userSailPosition.totalCostBasisUSD),
        averageCostPerToken: parseFloat(data.userSailPosition.averageCostPerToken),
        realizedPnLUSD: parseFloat(data.userSailPosition.realizedPnLUSD),
        totalTokensBought: BigInt(data.userSailPosition.totalTokensBought),
        totalTokensSold: BigInt(data.userSailPosition.totalTokensSold),
        totalSpentUSD: parseFloat(data.userSailPosition.totalSpentUSD),
        totalReceivedUSD: parseFloat(data.userSailPosition.totalReceivedUSD),
        firstAcquiredAt: parseInt(data.userSailPosition.firstAcquiredAt),
        lastUpdated: parseInt(data.userSailPosition.lastUpdated),
      }
    : null;

  // Parse events
  const mintEvents: MintEvent[] = (data?.sailTokenMintEvents || []).map((e: any) => ({
    collateralIn: e.collateralIn,
    leveragedOut: e.leveragedOut,
    collateralValueUSD: parseFloat(e.collateralValueUSD),
    tokenValueUSD: parseFloat(e.tokenValueUSD),
    pricePerToken: parseFloat(e.pricePerToken),
    timestamp: parseInt(e.timestamp),
    txHash: e.txHash,
  }));

  const redeemEvents: RedeemEvent[] = (data?.sailTokenRedeemEvents || []).map((e: any) => ({
    leveragedBurned: e.leveragedBurned,
    collateralOut: e.collateralOut,
    collateralValueUSD: parseFloat(e.collateralValueUSD),
    tokenValueUSD: parseFloat(e.tokenValueUSD),
    pricePerToken: parseFloat(e.pricePerToken),
    costBasisUSD: parseFloat(e.costBasisUSD),
    realizedPnLUSD: parseFloat(e.realizedPnLUSD),
    timestamp: parseInt(e.timestamp),
    txHash: e.txHash,
  }));

  // Calculate current value and PnL
  let currentValueUSD = 0;
  let unrealizedPnL = 0;
  let unrealizedPnLPercent = 0;

  if (position && position.balance > 0n) {
    // If we have current token price, use it; otherwise use subgraph's balanceUSD
    if (currentTokenPrice && currentTokenPrice > 0) {
      const balanceDecimal = Number(position.balance) / 1e18;
      currentValueUSD = balanceDecimal * currentTokenPrice;
    } else {
      currentValueUSD = position.balanceUSD;
    }

    // Calculate unrealized PnL
    unrealizedPnL = currentValueUSD - position.totalCostBasisUSD;
    
    if (position.totalCostBasisUSD > 0) {
      unrealizedPnLPercent = (unrealizedPnL / position.totalCostBasisUSD) * 100;
    }
  }

  const totalPnL = (position?.realizedPnLUSD || 0) + unrealizedPnL;

  return {
    position,
    mintEvents,
    redeemEvents,
    currentValueUSD,
    unrealizedPnL,
    unrealizedPnLPercent,
    totalPnL,
    isLoading,
    error: error ? String(error) : null,
  };
}

