"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { getSailPriceGraphUrlOptional, getGraphHeaders } from "@/config/graph";

// Safe parsing to avoid client crash on poisoned or malformed subgraph/RPC data
function safeParseFloat(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safeParseInt(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}
function safeBigInt(v: unknown): bigint {
  if (v === null || v === undefined) return 0n;
  try {
    const s = String(v).trim();
    if (!/^-?[0-9]+$/.test(s)) return 0n;
    return BigInt(s);
  } catch {
    return 0n;
  }
}

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
      lots(first: 50, orderBy: lotIndex, orderDirection: asc) {
        id
        lotIndex
        eventType
        tokenAmount
        costUSD
        isFullyRedeemed
        timestamp
        txHash
      }
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
  minterAddress?: `0x${string}`;
  startBlock?: number;
  genesisAddress?: `0x${string}`;
  genesisLeveragedRatio?: number; // Portion of genesis deposit attributed to hs tokens (e.g. 0.5)
  pegTarget?: "ETH" | "BTC"; // Needed to convert oracle prices (pegged-denominated) into USD
  currentTokenPrice?: number; // Current token price in USD (from oracle)
  enabled?: boolean;
  debug?: boolean;
}

export function useSailPositionPnL({
  tokenAddress,
  minterAddress,
  startBlock,
  genesisAddress,
  genesisLeveragedRatio = 0.5,
  pegTarget,
  currentTokenPrice,
  enabled = true,
  debug = false,
}: UseSailPositionPnLOptions): SailPositionPnLData {
  const { address } = useAccount();
  const graphUrl = getSailPriceGraphUrlOptional();
  
  const positionId = tokenAddress && address
    ? `${tokenAddress.toLowerCase()}-${address.toLowerCase()}`
    : "";

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "sailPositionPnL",
      graphUrl,
      tokenAddress,
      minterAddress,
      startBlock,
      genesisAddress,
      genesisLeveragedRatio,
      debug,
      address,
    ],
    queryFn: async () => {
      if (!tokenAddress || !address) {
        // Return empty data structure instead of null
        return {
          userSailPosition: null,
          sailTokenMintEvents: [],
          sailTokenRedeemEvents: [],
        };
      }
      if (!graphUrl) {
        // Not configured (common in staging) — return empty so UI can render without crashing.
        return {
          userSailPosition: null,
          sailTokenMintEvents: [],
          sailTokenRedeemEvents: [],
        };
      }

      const dbg = debug && typeof window !== "undefined";
      const dbgInfo: any = dbg
        ? {
            tokenAddress,
            minterAddress,
            startBlock,
            genesisAddress,
            genesisLeveragedRatio,
            pegTarget,
            address,
            graphUrl,
            positionId,
          }
        : null;

      try {
      const response = await fetch(graphUrl, {
        method: "POST",
          headers: getGraphHeaders(graphUrl),
        body: JSON.stringify({
          query: USER_POSITION_QUERY,
          variables: {
            positionId,
            userAddress: address.toLowerCase(),
            tokenAddress: tokenAddress.toLowerCase(),
          },
        }),
      });

        const result = await response.json();
        if (!response.ok || result?.errors) {
          if (dbg) dbgInfo.subgraph = { ok: false, status: response.status, errors: result?.errors };
          throw new Error(
            `PnL subgraph query failed (${response.status}). ${
              result?.errors ? JSON.stringify(result.errors) : ""
            }`
          );
      }

        const subgraphData = result?.data;
        if (dbg) {
          dbgInfo.subgraph = {
            ok: true,
            hasUserSailPosition: !!subgraphData?.userSailPosition,
            totalCostBasisUSD: subgraphData?.userSailPosition?.totalCostBasisUSD,
            realizedPnLUSD: subgraphData?.userSailPosition?.realizedPnLUSD,
            mintEvents: subgraphData?.sailTokenMintEvents?.length ?? 0,
            redeemEvents: subgraphData?.sailTokenRedeemEvents?.length ?? 0,
          };
          // eslint-disable-next-line no-console
          console.log("[useSailPositionPnL][debug]", dbgInfo);
        }

        // When subgraph has no UserSailPosition (e.g. Euro markets or indexer lag), still return
        // data so we can use mint/redeem events for fallback PnL instead of throwing.
        return subgraphData ?? {
          userSailPosition: null,
          sailTokenMintEvents: [],
          sailTokenRedeemEvents: [],
        };
      } catch (e) {
        if (dbg) {
          dbgInfo.subgraph = { ok: false, error: String(e) };
          // eslint-disable-next-line no-console
          console.log("[useSailPositionPnL][debug]", dbgInfo);
        }
        throw e;
      }
    },
    enabled: enabled && !!tokenAddress && !!address && !!graphUrl,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000,
  });

  // Parse events first (needed for fallback position when UserSailPosition is null)
  // Use safe parsers to avoid client crash on poisoned or malformed subgraph data
  const mintEvents: MintEvent[] = (data?.sailTokenMintEvents || []).map((e: any) => ({
    collateralIn: e?.collateralIn ?? "",
    leveragedOut: e?.leveragedOut ?? "",
    collateralValueUSD: safeParseFloat(e?.collateralValueUSD),
    tokenValueUSD: safeParseFloat(e?.tokenValueUSD),
    pricePerToken: safeParseFloat(e?.pricePerToken),
    timestamp: safeParseInt(e?.timestamp),
    txHash: e?.txHash ?? "",
  }));

  const redeemEvents: RedeemEvent[] = (data?.sailTokenRedeemEvents || []).map((e: any) => ({
    leveragedBurned: e?.leveragedBurned ?? "",
    collateralOut: e?.collateralOut ?? "",
    collateralValueUSD: safeParseFloat(e?.collateralValueUSD),
    tokenValueUSD: safeParseFloat(e?.tokenValueUSD),
    pricePerToken: safeParseFloat(e?.pricePerToken),
    costBasisUSD: safeParseFloat(e?.costBasisUSD),
    realizedPnLUSD: safeParseFloat(e?.realizedPnLUSD),
    timestamp: safeParseInt(e?.timestamp),
    txHash: e?.txHash ?? "",
  }));

  // Position from subgraph, or fallback from mint/redeem events when UserSailPosition is missing (e.g. Euro markets)
  const position: UserSailPosition | null = (() => {
    if (!address || !tokenAddress) return null;
    if (data?.userSailPosition) {
      const u = data.userSailPosition;
      return {
        balance: safeBigInt(u?.balance),
        balanceUSD: safeParseFloat(u?.balanceUSD),
        totalCostBasisUSD: safeParseFloat(u?.totalCostBasisUSD),
        averageCostPerToken: safeParseFloat(u?.averageCostPerToken),
        realizedPnLUSD: safeParseFloat(u?.realizedPnLUSD),
        totalTokensBought: safeBigInt(u?.totalTokensBought),
        totalTokensSold: safeBigInt(u?.totalTokensSold),
        totalSpentUSD: safeParseFloat(u?.totalSpentUSD),
        totalReceivedUSD: safeParseFloat(u?.totalReceivedUSD),
        firstAcquiredAt: safeParseInt(u?.firstAcquiredAt),
        lastUpdated: safeParseInt(u?.lastUpdated),
      };
    }
    // Fallback: derive from events when subgraph has no UserSailPosition (e.g. indexer lag or Euro deployment)
    const totalSpentUSD = mintEvents.reduce((s, e) => s + e.collateralValueUSD, 0);
    const totalReceivedUSD = redeemEvents.reduce((s, e) => s + e.collateralValueUSD, 0);
    const realizedPnLUSD = redeemEvents.reduce((s, e) => s + e.realizedPnLUSD, 0);
    const costBasisRedeemed = redeemEvents.reduce((s, e) => s + e.costBasisUSD, 0);
    const totalTokensBought = mintEvents.reduce((acc, e) => acc + safeBigInt(e.leveragedOut), 0n);
    const totalTokensSold = redeemEvents.reduce((acc, e) => acc + safeBigInt(e.leveragedBurned), 0n);
    const balance = totalTokensBought - totalTokensSold;
    const totalCostBasisUSD = Math.max(0, totalSpentUSD - costBasisRedeemed);
    const balanceDec = balance > 0n ? Number(balance) / 1e18 : 0;
    const averageCostPerToken = balanceDec > 0 ? totalCostBasisUSD / balanceDec : 0;
    const firstAcquiredAt = mintEvents.length
      ? Math.min(...mintEvents.map((e) => e.timestamp))
      : 0;
    const lastUpdated = [...mintEvents, ...redeemEvents].length
      ? Math.max(...[...mintEvents, ...redeemEvents].map((e) => e.timestamp))
      : 0;
    if (balance > 0n || realizedPnLUSD !== 0 || totalTokensBought > 0n) {
      return {
        balance,
        balanceUSD: 0,
        totalCostBasisUSD,
        averageCostPerToken,
        realizedPnLUSD,
        totalTokensBought,
        totalTokensSold,
        totalSpentUSD,
        totalReceivedUSD,
        firstAcquiredAt,
        lastUpdated,
      };
    }
    return null;
  })();

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
    error:
      !graphUrl && enabled && !!tokenAddress && !!address
        ? "PnL unavailable: Sail price subgraph URL is not configured."
        : error
          ? String(error)
          : null,
  };
}

