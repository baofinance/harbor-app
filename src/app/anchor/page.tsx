"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  useAccount,
  useContractReads,
  useWriteContract,
  usePublicClient,
  useContractRead,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { markets } from "@/config/markets";
import { POLLING_INTERVALS } from "@/config/polling";
import {
  formatUSD,
  formatToken,
  formatDateTime,
  formatTimeRemaining,
} from "@/utils/formatters";
import {
  EtherscanLink as SharedEtherscanLink,
  TokenLogo,
  getLogoPath,
} from "@/components/shared";
import { useGenesisMarks } from "@/hooks/useGenesisMarks";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowRightIcon,
  GiftIcon,
  CheckCircleIcon,
  XMarkIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { AnchorDepositWithdrawModal } from "@/components/AnchorDepositWithdrawModal";
import { AnchorCompoundModal } from "@/components/AnchorCompoundModal";
import { AnchorClaimAllModal } from "@/components/AnchorClaimAllModal";
import {
  CompoundTargetTokenModal,
  CompoundTargetMode,
  CompoundSelectedPosition,
  CompoundTargetOption,
} from "@/components/CompoundTargetTokenModal";
import {
  TransactionProgressModal,
  TransactionStep,
} from "@/components/TransactionProgressModal";
import {
  CompoundConfirmationModal,
  FeeInfo,
} from "@/components/CompoundConfirmationModal";
import {
  CompoundPoolSelectionModal,
  PoolOption,
} from "@/components/CompoundPoolSelectionModal";
import { AnchorClaimMarketModal } from "@/components/AnchorClaimMarketModal";
import SimpleTooltip from "@/components/SimpleTooltip";
import InfoTooltip from "@/components/InfoTooltip";
import { aprABI } from "@/abis/apr";
import { rewardsABI } from "@/abis/rewards";
import {
  STABILITY_POOL_ABI,
  ERC20_ABI,
  MINTER_ABI,
  MINTER_ABI_EXTENDED,
  STABILITY_POOL_MANAGER_ABI,
  WRAPPED_PRICE_ORACLE_ABI,
} from "@/abis/shared";
import Image from "next/image";
import { useProjectedAPR } from "@/hooks/useProjectedAPR";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { useMarketBoostWindows } from "@/hooks/useMarketBoostWindows";
import { MarksBoostBadge } from "@/components/MarksBoostBadge";
import { useWithdrawalRequests } from "@/hooks/useWithdrawalRequests";
import { useStabilityPoolRewards } from "@/hooks/useStabilityPoolRewards";
import { useAllStabilityPoolRewards } from "@/hooks/useAllStabilityPoolRewards";
import { useMultipleVolatilityProtection } from "@/hooks/useVolatilityProtection";
import { useMarketPositions } from "@/hooks/useMarketPositions";
import { useMultipleTokenPrices } from "@/hooks/useTokenPrices";
import { useFxSAVEAPR } from "@/hooks/useFxSAVEAPR";
import { useWstETHAPR } from "@/hooks/useWstETHAPR";
import { useCoinGeckoPrices } from "@/hooks/useCoinGeckoPrice";
import { useContractReads as useWagmiContractReads } from "wagmi";
import { useCoinGeckoPrice } from "@/hooks/useCoinGeckoPrice";
import {
  formatRatio,
  formatAPR,
  formatCompactUSD,
  calculateVolatilityProtection,
  getAcceptedDepositAssets,
} from "@/utils/anchor";
import { useAnchorPrices } from "@/hooks/anchor/useAnchorPrices";
import { useGroupedMarkets } from "@/hooks/anchor/useGroupedMarkets";
import { useAnchorMarketData } from "@/hooks/anchor/useAnchorMarketData";
import { useAnchorContractReads } from "@/hooks/anchor/useAnchorContractReads";
import { useAnchorRewards } from "@/hooks/anchor/useAnchorRewards";
import { useAnchorMarks } from "@/hooks/anchor/useAnchorMarks";
import { useAnchorTransactions } from "@/hooks/anchor/useAnchorTransactions";
import { RewardTokensDisplay } from "@/components/anchor/RewardTokensDisplay";
import { AnchorMarketExpandedView } from "@/components/anchor/AnchorMarketExpandedView";
import { useAnchorTokenMetadata } from "@/hooks/anchor/useAnchorTokenMetadata";
import { useAnchorUserDeposits } from "@/hooks/anchor/useAnchorUserDeposits";
import { calculateReadOffset } from "@/utils/anchor/calculateReadOffset";
import { useMultipleCollateralPrices } from "@/hooks/useCollateralPrice";

// Flag to temporarily disable anchor marks (set to false to pause marks)
const ANCHOR_MARKS_ENABLED = true;

// Token metadata types are now in useAnchorTokenMetadata hook
import { usePoolRewardAPR } from "@/hooks/usePoolRewardAPR";
import { usePoolRewardTokens } from "@/hooks/usePoolRewardTokens";
import { WithdrawalTimer } from "@/components/WithdrawalTimer";
// Use shared ABIs from @/abis/shared
const minterABI = MINTER_ABI_EXTENDED;
const stabilityPoolABI = STABILITY_POOL_ABI;
const stabilityPoolManagerABI = STABILITY_POOL_MANAGER_ABI;
const erc20ABI = ERC20_ABI;
const wrappedPriceOracleABI = WRAPPED_PRICE_ORACLE_ABI;
const chainlinkOracleABI = WRAPPED_PRICE_ORACLE_ABI;

// Helper function to get accepted deposit assets from market config

// Component to display reward tokens for a market group
// RewardTokensDisplay component has been extracted to components/anchor/RewardTokensDisplay.tsx
// AnchorMarketExpandedView component has been extracted to components/anchor/AnchorMarketExpandedView.tsx

export default function AnchorPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // CoinGecko prices are now provided by useAnchorPrices hook (see below)
  const [expandedMarkets, setExpandedMarkets] = useState<string[]>([]);
  const [manageModal, setManageModal] = useState<{
    marketId: string;
    market: any;
    initialTab?:
      | "mint"
      | "deposit"
      | "withdraw"
      | "redeem"
      | "deposit-mint"
      | "withdraw-redeem";
    simpleMode?: boolean;
    bestPoolType?: "collateral" | "sail";
    allMarkets?: Array<{ marketId: string; market: any }>;
    initialDepositAsset?: string;
  } | null>(null);
  const [compoundModal, setCompoundModal] = useState<{
    marketId: string;
    market: any;
    poolType: "collateral" | "sail";
    rewardAmount: bigint;
  } | null>(null);
  const [compoundPoolSelection, setCompoundPoolSelection] = useState<{
    market: any;
    pools: PoolOption[];
  } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCompounding, setIsCompounding] = useState(false);
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [isCompoundingAll, setIsCompoundingAll] = useState(false);
  const [earlyWithdrawModal, setEarlyWithdrawModal] = useState<{
    poolAddress: `0x${string}`;
    poolType: "collateral" | "sail";
    start: bigint;
    end: bigint;
    earlyWithdrawFee: bigint;
    symbol?: string;
    poolBalance?: bigint;
  } | null>(null);
  const [withdrawAmountModal, setWithdrawAmountModal] = useState<{
    poolAddress: `0x${string}`;
    poolType: "collateral" | "sail";
    useEarly: boolean;
    symbol?: string;
    maxAmount?: bigint;
  } | null>(null);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawAmountError, setWithdrawAmountError] = useState<string | null>(
    null
  );
  const [transactionProgress, setTransactionProgress] = useState<{
    isOpen: boolean;
    title: string;
    steps: TransactionStep[];
    currentStepIndex: number;
  } | null>(null);
  const [compoundConfirmation, setCompoundConfirmation] = useState<{
    steps: TransactionStep[];
    fees: FeeInfo[];
    feeErrors?: string[];
    onConfirm: () => void;
  } | null>(null);
  const [compoundTargetModal, setCompoundTargetModal] = useState<{
    selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
    positions: CompoundSelectedPosition[];
    options: CompoundTargetOption[];
  } | null>(null);
  const [compoundIntent, setCompoundIntent] = useState<{
    mode: CompoundTargetMode;
    selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
    targetMarketId?: string;
  } | null>(null);
  const [advancedPreflight, setAdvancedPreflight] = useState<{
    key: string;
    isLoading: boolean;
    error?: string;
    fees: Array<{
      id: string;
      label: string;
      tokenSymbol: string;
      feeFormatted: string;
      feePercentage?: number;
      details?: string;
    }>;
    // execution plan (chosen routes). Used to avoid recalculating after claim.
    plan?: {
      targetMarketId: string;
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>;
      selectedClaimPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
      redeemPegged: Array<{
        peggedToken: `0x${string}`;
        amount: bigint;
        minter: `0x${string}`;
        wrappedCollateralToken: `0x${string}`;
        expectedOut: bigint;
      }>;
      redeemLeveraged: Array<{
        marketId: string;
        leveragedToken: `0x${string}`;
        amount: bigint;
        minter: `0x${string}`;
        expectedOut: bigint;
      }>;
      mint: Array<{
        wrappedToken: `0x${string}`;
        amount: bigint;
        minter: `0x${string}`;
        expectedMint: bigint;
      }>;
    };
  } | null>(null);

  const [simplePreflight, setSimplePreflight] = useState<{
    key: string;
    isLoading: boolean;
    error?: string;
    fees: Array<{
      id: string;
      label: string;
      tokenSymbol: string;
      feeFormatted: string;
      feePercentage?: number;
      details?: string;
    }>;
  } | null>(null);
  // Ref to track cancellation for claim all and compound operations
  const cancelOperationRef = useRef<(() => void) | null>(null);
  const [isEarningsExpanded, setIsEarningsExpanded] = useState(false);
  const [isClaimAllModalOpen, setIsClaimAllModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMarketForClaim, setSelectedMarketForClaim] = useState<
    string | null
  >("all");
  const [isClaimMarketModalOpen, setIsClaimMarketModalOpen] = useState(false);
  const [contractAddressesModal, setContractAddressesModal] = useState<{
    marketId: string;
    market: any;
    minterAddress: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before showing dynamic content to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get all markets with pegged tokens (we'll filter by collateral balance later)
  const anchorMarkets = useMemo(
    () => Object.entries(markets).filter(([_, m]) => m.peggedToken),
    []
  );

  // Build markets config for volatility protection hook
  const volProtectionMarketsConfig = useMemo(
    () =>
      anchorMarkets.map(([_, m]) => ({
        minterAddress: (m as any).addresses?.minter as
          | `0x${string}`
          | undefined,
        collateralPoolAddress: (m as any).addresses?.stabilityPoolCollateral as
          | `0x${string}`
          | undefined,
        sailPoolAddress: (m as any).addresses?.stabilityPoolLeveraged as
          | `0x${string}`
          | undefined,
      })),
    [anchorMarkets]
  );

  // Fetch volatility protection data for all markets
  const { data: volProtectionData } = useMultipleVolatilityProtection(
    volProtectionMarketsConfig,
    { refetchInterval: 30000 }
  );

  const queryClient = useQueryClient();
  const useAnvil = false;

  // Get projected APR for the primary market (pb-steth)
  const projectedAPR = useProjectedAPR("pb-steth");

  // Wrapped collateral APR (DeFiLlama yields). Used for "projected APR" before pool rewards start.
  const { data: fxSAVEApy } = useFxSAVEAPR(true);
  const { data: wstETHApy } = useWstETHAPR(true);

  // Anchor ledger marks are now provided by useAnchorMarks hook (see below)

  // Collect all pool addresses for withdrawal request queries
  const allPoolAddresses = useMemo(() => {
    const addresses: `0x${string}`[] = [];
    anchorMarkets.forEach(([_, market]) => {
      if ((market as any).addresses?.stabilityPoolCollateral) {
        addresses.push(
          (market as any).addresses.stabilityPoolCollateral as `0x${string}`
        );
      }
      if ((market as any).addresses?.stabilityPoolLeveraged) {
        addresses.push(
          (market as any).addresses.stabilityPoolLeveraged as `0x${string}`
        );
      }
    });
    return addresses;
  }, [anchorMarkets]);

  // Fetch withdrawal requests for all pools
  const { data: withdrawalRequests = [] } =
    useWithdrawalRequests(allPoolAddresses);

  // Create a map of pool address to reward token symbols
  // We'll query reward tokens for each unique pool and combine them per market group
  const poolToRewardTokens = useMemo(() => {
    const map = new Map<`0x${string}`, string[]>();
    anchorMarkets.forEach(([_, market]) => {
      const collateralPool = (market as any).addresses
        ?.stabilityPoolCollateral as `0x${string}` | undefined;
      const sailPool = (market as any).addresses?.stabilityPoolLeveraged as
        | `0x${string}`
        | undefined;
      if (collateralPool) map.set(collateralPool, []);
      if (sailPool) map.set(sailPool, []);
    });
    return map;
  }, [anchorMarkets]);

  // Note: allMarketContracts is no longer needed - useAnchorMarks can get peggedTokenPrice from reads
  // We'll pass undefined and let the hook extract it from reads directly
  const allMarketContracts = undefined;

  // Use extracted hook for token metadata
  useAnchorTokenMetadata(anchorMarkets);

  // Use extracted hook for contract reads
  const { reads, refetchReads, isLoading: isLoadingReads, isError: isReadsError, error: readsError } = useAnchorContractReads(
    anchorMarkets,
    useAnvil
  );

  // Build a fallback price map from the existing reads (per-market peggedTokenPrice)
  const peggedPricesFromReads = useMemo(() => {
    const map: Record<string, bigint | undefined> = {};
    if (!reads) return map;

    anchorMarkets.forEach(([id, m], mi) => {
      // Use utility function to calculate offset
      const baseOffset = calculateReadOffset(anchorMarkets, mi);
      const priceRead = reads?.[baseOffset + 3];
      if (
        priceRead &&
        priceRead.result !== undefined &&
        priceRead.result !== null
      ) {
        map[id] = priceRead.result as bigint;
      }
    });

    return map;
  }, [anchorMarkets, reads]);

  // Get CoinGecko IDs for underlying collateral (e.g., fxUSD) and wrapped tokens (e.g., fxSAVE, wstETH)
  const coinGeckoIds = useMemo(() => {
    const ids = new Set<string>();
    anchorMarkets.forEach(([id, m]) => {
      const underlyingCoinGeckoId = (m as any).underlyingCoinGeckoId as
        | string
        | undefined;
      if (underlyingCoinGeckoId) {
        ids.add(underlyingCoinGeckoId);
      }
      // Also add wrapped token CoinGecko IDs
      const coinGeckoId = (m as any).coinGeckoId as string | undefined;
      if (coinGeckoId) {
        ids.add(coinGeckoId);
      }
    });
    // Add wstETH and stETH for fallback
    ids.add("wrapped-steth");
    ids.add("lido-staked-ethereum-steth");
    // Add peg targets used for oracle conversions (BTC/ETH-pegged markets)
    ids.add("bitcoin");
    ids.add("ethereum");
    return Array.from(ids);
  }, [anchorMarkets]);

  // Fetch collateral prices from CoinGecko (for depeg detection and wrapped token prices)
  const { prices: coinGeckoPrices, isLoading: coinGeckoLoading, error: coinGeckoError } = useCoinGeckoPrices(coinGeckoIds);

  // Calculate USD prices using hook (needed for marks calculation)
  const {
    peggedPriceUSDMap,
    mergedPeggedPriceMap,
    ethPrice,
    btcPrice,
    fxUSDPrice,
    fxSAVEPrice,
    usdcPrice,
  } = useAnchorPrices(anchorMarkets, reads, peggedPricesFromReads);

  // Use extracted hook for marks calculations
  const {
    totalAnchorMarks,
    totalAnchorMarksPerDay,
    totalMarksPerDay,
    sailMarksPerDay,
    maidenVoyageMarksPerDay: maidenVoyageMarksPerDayFromHook,
    haBalances,
    poolDeposits,
    sailBalances,
    isLoading: isLoadingAnchorMarks,
    error: anchorMarksError,
  } = useAnchorMarks(anchorMarkets, allMarketContracts, reads);

  // Subgraph-backed ledger marks (source of truth for airdrops)
  const {
    haBalances: haLedgerBalances,
    poolDeposits: poolLedgerDeposits,
    loading: isLoadingLedgerMarks,
    error: ledgerMarksError,
  } = useAnchorLedgerMarks({ enabled: true });

  const { totalAnchorLedgerMarks, totalAnchorLedgerMarksPerDay } = useMemo(() => {
    const totalMarks =
      (haLedgerBalances ?? []).reduce((sum, b) => sum + (b.estimatedMarks ?? 0), 0) +
      (poolLedgerDeposits ?? []).reduce((sum, d) => sum + (d.estimatedMarks ?? 0), 0);

    const totalPerDay =
      (haLedgerBalances ?? []).reduce((sum, b) => sum + (b.marksPerDay ?? 0), 0) +
      (poolLedgerDeposits ?? []).reduce((sum, d) => sum + (d.marksPerDay ?? 0), 0);

    return { totalAnchorLedgerMarks: totalMarks, totalAnchorLedgerMarksPerDay: totalPerDay };
  }, [haLedgerBalances, poolLedgerDeposits]);

  const anchorBoostIds = useMemo(() => {
    const ids: string[] = [];
    // Include all anchor markets (not just user's balances) so boost banners show when no wallet is connected
    for (const [_, market] of anchorMarkets) {
      const peggedTokenAddress = (market as any)?.addresses?.peggedToken as string | undefined;
      if (peggedTokenAddress) {
        ids.push(`haToken-${peggedTokenAddress.toLowerCase()}`);
      }
      const collateralPoolAddress = (market as any)?.addresses?.stabilityPoolCollateral as string | undefined;
      if (collateralPoolAddress) {
        ids.push(`stabilityPoolCollateral-${collateralPoolAddress.toLowerCase()}`);
      }
      const leveragedPoolAddress = (market as any)?.addresses?.stabilityPoolLeveraged as string | undefined;
      if (leveragedPoolAddress) {
        ids.push(`stabilityPoolLeveraged-${leveragedPoolAddress.toLowerCase()}`);
      }
    }
    return Array.from(new Set(ids));
  }, [anchorMarkets]);

  const { data: anchorBoostWindowsData } = useMarketBoostWindows({
    enabled: anchorBoostIds.length > 0,
    ids: anchorBoostIds,
    first: 100,
  });

  const activeAnchorBoostEndTimestamp = useMemo(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const windows = anchorBoostWindowsData?.marketBoostWindows ?? [];
    const active = windows
      .map((w) => ({
        start: Number(w.startTimestamp),
        end: Number(w.endTimestamp),
        mult: Number(w.boostMultiplier),
      }))
      .filter((w) => nowSec >= w.start && nowSec < w.end && w.mult >= 10);
    if (active.length === 0) return null;
    return active.reduce((minEnd, w) => Math.min(minEnd, w.end), active[0].end);
  }, [anchorBoostWindowsData]);

  // Keep for backward compatibility
  const maidenVoyageMarksPerDay = maidenVoyageMarksPerDayFromHook;

  // Use extracted hook for user deposits
  const { userDepositMap, refetchUserDeposits } = useAnchorUserDeposits(
    anchorMarkets,
    useAnvil
  );

  // Use extracted hook for rewards calculations
  const {
    allPoolRewards,
    poolRewardsMap,
    isLoadingAllRewards,
    isFetchingAllRewards,
    isErrorAllRewards,
  } =
    useAnchorRewards(anchorMarkets, reads, ethPrice, btcPrice, peggedPriceUSDMap);

  const showLiveAprLoading = isLoadingAllRewards || (isFetchingAllRewards && poolRewardsMap.size === 0);

  // Build market configs for positions hook
  const marketPositionConfigs = useMemo(() => {
    return anchorMarkets.map(([id, m]) => {
      const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
      const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;
      const peggedTokenAddress = (m as any)?.addresses?.peggedToken as
        | `0x${string}`
        | undefined;

      return {
        marketId: id,
        peggedTokenAddress,
        collateralPoolAddress: hasCollateralPool
          ? ((m as any).addresses?.stabilityPoolCollateral as `0x${string}`)
          : undefined,
        sailPoolAddress: hasSailPool
          ? ((m as any).addresses?.stabilityPoolLeveraged as `0x${string}`)
          : undefined,
        minterAddress: (m as any).addresses?.minter as
          | `0x${string}`
          | undefined,
      };
    });
  }, [anchorMarkets]);

  // Fetch pegged token prices using the new unified hook
  const tokenPriceInputs = useMemo(() => {
    return marketPositionConfigs
      .map((c) => {
        // Find the market to get pegTarget
        const market = anchorMarkets.find(([id]) => id === c.marketId)?.[1];
        return {
          marketId: c.marketId,
          minterAddress: c.minterAddress!,
          pegTarget: (market as any)?.pegTarget || "USD",
        };
      })
      .filter((c) => c.minterAddress); // Filter out markets without minter
  }, [marketPositionConfigs, anchorMarkets]);

  const tokenPricesByMarket = useMultipleTokenPrices(tokenPriceInputs);

  // Fetch all positions using the unified hook, passing shared prices
  const {
    positionsMap: marketPositions,
    totalPositionUSD: allMarketsTotalPositionUSD,
    hasPositions: userHasPositions,
    refetch: refetchPositions,
  } = useMarketPositions(marketPositionConfigs, address, mergedPeggedPriceMap);

  // Group markets by peggedToken.symbol (for grouping ha tokens)
  const groupedMarkets = useGroupedMarkets(
    anchorMarkets,
    reads,
    marketPositions
  );

  // Process all market data using hook
  const allMarketsData = useAnchorMarketData(
    anchorMarkets,
    reads,
    marketPositions,
    poolRewardsMap,
    poolDeposits,
    projectedAPR,
    { fxSAVEApy: fxSAVEApy ?? null, wstETHApy: wstETHApy ?? null },
    peggedPriceUSDMap,
    ethPrice
  );

  // ---------------------------------------------------------------------------
  // Anchor stats strip (protocol-level)
  // ---------------------------------------------------------------------------
  const anchorStats = useMemo(() => {
    const safeEthPrice = ethPrice && ethPrice > 0 ? ethPrice : null;

    let yieldGeneratingTVLUSD = 0;
    let stabilityPoolTVLUSD = 0;

    let bestApr = 0;
    let bestAprLabel: string | null = null;

    for (const md of allMarketsData) {
      const collateralSymbol = md.market?.collateral?.symbol?.toLowerCase?.() || "";
      const isFxUSDMarket = collateralSymbol === "fxusd" || collateralSymbol === "fxsave";
      const isWstETHMarket = collateralSymbol === "wsteth" || collateralSymbol === "steth";

      // -------- Yield Generating TVL (minter collateral) --------
      if (md.collateralValue) {
        if (isFxUSDMarket) {
          // collateralValue is in fxUSD units (≈ $1)
          yieldGeneratingTVLUSD += Number(md.collateralValue) / 1e18;
        } else if (isWstETHMarket && md.wrappedRate) {
          const wrappedRateNum = Number(md.wrappedRate) / 1e18;
          const stETHAmount = Number(md.collateralValue) / 1e18; // underlying-equivalent
          const wstETHAmount =
            wrappedRateNum > 0 ? stETHAmount / wrappedRateNum : stETHAmount;
          const wstETHPriceUSD =
            safeEthPrice !== null ? safeEthPrice * wrappedRateNum : 0;
          if (wstETHPriceUSD > 0) {
            yieldGeneratingTVLUSD += wstETHAmount * wstETHPriceUSD;
          }
        } else if (md.collateralPrice) {
          // collateralPrice is maxUnderlyingPrice (18dp) => USD price per token
          const priceUSD = Number(md.collateralPrice) / 1e18;
          const amount = Number(md.collateralValue) / 1e18;
          if (priceUSD > 0 && Number.isFinite(priceUSD)) {
            yieldGeneratingTVLUSD += amount * priceUSD;
          }
        }
      }

      // -------- Total Stability Pool TVL (protocol) --------
      const peggedUSD =
        peggedPriceUSDMap && peggedPriceUSDMap[md.marketId]
          ? Number(peggedPriceUSDMap[md.marketId]) / 1e18
          : 0;

      if (peggedUSD > 0) {
        if (md.collateralPoolTVL) {
          stabilityPoolTVLUSD += (Number(md.collateralPoolTVL) / 1e18) * peggedUSD;
        }
        if (md.sailPoolTVL) {
          stabilityPoolTVLUSD += (Number(md.sailPoolTVL) / 1e18) * peggedUSD;
        }
      }

      // -------- Highest APR Stability Pool (protocol) --------
      const collateralApr =
        md.collateralPoolAPR
          ? (md.collateralPoolAPR.collateral || 0) + (md.collateralPoolAPR.steam || 0)
          : 0;
      const sailApr =
        md.sailPoolAPR
          ? (md.sailPoolAPR.collateral || 0) + (md.sailPoolAPR.steam || 0)
          : 0;

      const symbol = md.market?.peggedToken?.symbol || md.marketId;
      if (collateralApr > bestApr) {
        bestApr = collateralApr;
        bestAprLabel = `${symbol} Collateral SP`;
      }
      if (sailApr > bestApr) {
        bestApr = sailApr;
        bestAprLabel = `${symbol} Sail SP`;
      }
    }

    const yieldConcentration =
      stabilityPoolTVLUSD > 0 ? yieldGeneratingTVLUSD / stabilityPoolTVLUSD : 0;

    return {
      yieldGeneratingTVLUSD,
      stabilityPoolTVLUSD,
      yieldConcentration,
      bestApr,
      bestAprLabel,
    };
  }, [allMarketsData, peggedPriceUSDMap, ethPrice]);

  // Create a map for quick lookup: marketId -> marketData
  const marketsDataMap = useMemo(() => {
    const map = new Map<string, (typeof allMarketsData)[0]>();
    allMarketsData.forEach((marketData) => {
      map.set(marketData.marketId, marketData);
    });
    return map;
  }, [allMarketsData]);

  // Fetch collateral prices for all markets using the hook
  const collateralPriceOracleAddresses = useMemo(() => {
    return anchorMarkets.map(([_, market]) => 
      (market as any).addresses?.collateralPrice as `0x${string}` | undefined
    );
  }, [anchorMarkets]);

  const { prices: collateralPricesMap } = useMultipleCollateralPrices(
    collateralPriceOracleAddresses,
    { refetchInterval: 30000 }
  );

  // Use extracted hook for transaction handlers
  const {
    handlePendingWithdraw,
    handleClaimRewards,
    handleCompoundRewards,
    createCompoundHandlers,
    handleClaimAll,
    handleCompoundAll,
    updateProgressStep,
    setCurrentStep,
    isUserRejection,
  } = useAnchorTransactions({
    anchorMarkets,
    reads,
    peggedPriceUSDMap,
    allPoolRewards,
    poolRewardsMap,
    transactionProgress,
    setTransactionProgress,
    setCompoundConfirmation,
    setCompoundPoolSelection,
    setIsClaiming,
    setIsCompounding,
    setIsClaimingAll,
    setIsCompoundingAll,
    setEarlyWithdrawModal,
    refetchReads,
    refetchUserDeposits,
    cancelOperationRef,
    isClaimingAll,
    isCompoundingAll,
  });

  const claimAllPositions = useMemo(() => {
    // Build positions array using allPoolRewards from useAllStabilityPoolRewards
    const positions: Array<{
      marketId: string;
      market: any;
      poolType: "collateral" | "sail";
      rewards: bigint;
      rewardsUSD: number;
      deposit: bigint;
      depositUSD: number;
      rewardTokens: Array<{
        symbol: string;
        claimable: bigint;
        claimableFormatted: string;
      }>;
    }> = [];

    if (reads && anchorMarkets && allPoolRewards) {
      anchorMarkets.forEach(([id, m], mi) => {
        const hasCollateralPool = !!(m as any).addresses?.stabilityPoolCollateral;
        const hasSailPool = !!(m as any).addresses?.stabilityPoolLeveraged;

        // Calculate offset for this market to get deposit data
        let offset = 0;
        for (let i = 0; i < mi; i++) {
          const prevMarket = anchorMarkets[i][1];
          const prevHasCollateral = !!(prevMarket as any).addresses
            ?.stabilityPoolCollateral;
          const prevHasSail = !!(prevMarket as any).addresses
            ?.stabilityPoolLeveraged;
          const prevHasPriceOracle = !!(prevMarket as any).addresses
            ?.collateralPrice;
          offset += 4;
          if (prevHasCollateral) offset += 3;
          if (prevHasSail) offset += 3;
          if (prevHasPriceOracle) offset += 1;
        }

        const baseOffset = offset;
        const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
          | bigint
          | undefined;
        let currentOffset = baseOffset + 4;

        // Get price oracle for USD calculations
        const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
        const collateralPriceDecimals = 18;
        let collateralPrice: bigint | undefined;
        let priceOffset = currentOffset;
        if (hasCollateralPool) priceOffset += 3;
        if (hasSailPool) priceOffset += 3;
        if (hasPriceOracle) {
          const latestAnswerResult = reads?.[priceOffset]?.result;
          if (latestAnswerResult !== undefined && latestAnswerResult !== null) {
            if (Array.isArray(latestAnswerResult)) {
              collateralPrice = latestAnswerResult[1] as bigint;
            } else if (typeof latestAnswerResult === "object") {
              const obj = latestAnswerResult as { maxUnderlyingPrice?: bigint };
              collateralPrice = obj.maxUnderlyingPrice;
            } else if (typeof latestAnswerResult === "bigint") {
              collateralPrice = latestAnswerResult;
            }
          }
        }

        // Collateral pool position
        if (hasCollateralPool) {
          const collateralPoolAddress = (m as any).addresses
            ?.stabilityPoolCollateral as `0x${string}`;
          const collateralPoolDeposit = reads?.[currentOffset]?.result as
            | bigint
            | undefined;

          // Get rewards from allPoolRewards
          const poolReward = allPoolRewards.find(
            (pr) =>
              pr.poolAddress.toLowerCase() ===
              collateralPoolAddress.toLowerCase()
          );

          let depositUSD = 0;
          const rewardsUSD = poolReward?.claimableValue || 0;

          // Calculate total rewards as bigint (sum of all reward tokens)
          const totalRewards =
            poolReward?.rewardTokens.reduce(
              (sum, token) => sum + token.claimable,
              0n
            ) || 0n;

          if (
            collateralPoolDeposit &&
            collateralPrice &&
            collateralPriceDecimals !== undefined
          ) {
            const price =
              Number(collateralPrice) /
              10 ** (Number(collateralPriceDecimals) || 8);
            const depositAmount = Number(collateralPoolDeposit) / 1e18;
            depositUSD = depositAmount * price;
          }

          // Only include if there are rewards
          if (poolReward && poolReward.claimableValue > 0) {
            positions.push({
              marketId: id,
              market: m,
              poolType: "collateral",
              rewards: totalRewards,
              rewardsUSD,
              deposit: collateralPoolDeposit || 0n,
              depositUSD,
              rewardTokens: poolReward.rewardTokens.map((token) => ({
                symbol: token.symbol,
                claimable: token.claimable,
                claimableFormatted: formatEther(token.claimable),
              })),
            });
          }

          currentOffset += 3;
        }

        // Sail pool position
        if (hasSailPool) {
          const sailPoolAddress = (m as any).addresses
            ?.stabilityPoolLeveraged as `0x${string}`;
          const sailPoolDeposit = reads?.[currentOffset]?.result as
            | bigint
            | undefined;

          // Get rewards from allPoolRewards
          const poolReward = allPoolRewards.find(
            (pr) =>
              pr.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase()
          );

          let depositUSD = 0;
          const rewardsUSD = poolReward?.claimableValue || 0;

          // Calculate total rewards as bigint (sum of all reward tokens)
          const totalRewards =
            poolReward?.rewardTokens.reduce(
              (sum, token) => sum + token.claimable,
              0n
            ) || 0n;

          if (
            sailPoolDeposit &&
            peggedTokenPrice &&
            collateralPrice &&
            collateralPriceDecimals !== undefined
          ) {
            const peggedPrice = Number(peggedTokenPrice) / 1e18;
            const collateralPriceNum =
              Number(collateralPrice) /
              10 ** (Number(collateralPriceDecimals) || 8);
            const depositAmount = Number(sailPoolDeposit) / 1e18;
            depositUSD = depositAmount * (peggedPrice * collateralPriceNum);
          }

          // Only include if there are rewards
          if (poolReward && poolReward.claimableValue > 0) {
            positions.push({
              marketId: id,
              market: m,
              poolType: "sail",
              rewards: totalRewards,
              rewardsUSD,
              deposit: sailPoolDeposit || 0n,
              depositUSD,
              rewardTokens: poolReward.rewardTokens.map((token) => ({
                symbol: token.symbol,
                claimable: token.claimable,
                claimableFormatted: formatEther(token.claimable),
              })),
            });
          }
        }
      });
    }

    return positions;
  }, [reads, anchorMarkets, allPoolRewards]);

  const handleCompoundConfirm = async (
    market: any,
    allocations: Array<{ poolId: "collateral" | "sail"; percentage: number }>,
    rewardAmount: bigint
  ) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
    const collateralPoolAddress = market.addresses?.stabilityPoolCollateral as
      | `0x${string}`
      | undefined;
    const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as
      | `0x${string}`
      | undefined;
    const collateralAddress = market.addresses?.collateralToken as
      | `0x${string}`
      | undefined;
    const peggedTokenAddress = market.addresses?.peggedToken as
      | `0x${string}`
      | undefined;
    const leveragedTokenAddress = market.addresses?.leveragedToken as
      | `0x${string}`
      | undefined;

    if (!minterAddress || !address) {
      throw new Error("Missing required addresses");
    }

    const marketSymbol = market.peggedToken?.symbol || market.id;
    const collateralSymbol =
      market.collateralToken?.symbol ||
      market.collateral?.symbol ||
      "collateral";
    const leveragedSymbol =
      market.leveragedToken?.symbol || market.sail?.symbol || "sail";

    // Validate allocations
    if (allocations.length === 0) {
      throw new Error("No pools selected for compounding");
    }

    // Filter allocations to only include pools with percentage > 0
    const activeAllocations = allocations.filter((a) => a.percentage > 0);
    if (activeAllocations.length === 0) {
      throw new Error("No pools selected for compounding");
    }

    // Get pool addresses for ALL pools that have rewards - we'll claim from each one
    interface PoolWithRewards {
      poolType: "collateral" | "sail";
      poolAddress: `0x${string}`;
      rewards: {
        poolAddress: string;
        rewardTokens?: Array<{
          address: string;
          symbol: string;
          claimable: bigint;
        }>;
      };
    }
    const poolsWithRewards: PoolWithRewards[] = [];

    if (collateralPoolAddress) {
      const collateralRewards = allPoolRewards?.find(
        (r) =>
          r.poolAddress.toLowerCase() === collateralPoolAddress.toLowerCase() &&
          r.rewardTokens.some((rt) => rt.claimable > 0n)
      );
      if (collateralRewards) {
        poolsWithRewards.push({
          poolType: "collateral",
          poolAddress: collateralPoolAddress,
          rewards: collateralRewards,
        });
      }
    }
    if (sailPoolAddress) {
      const sailRewards = allPoolRewards?.find(
        (r) =>
          r.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase() &&
          r.rewardTokens.some((rt) => rt.claimable > 0n)
      );
      if (sailRewards) {
        poolsWithRewards.push({
          poolType: "sail",
          poolAddress: sailPoolAddress,
          rewards: sailRewards,
        });
      }
    }

    if (poolsWithRewards.length === 0) {
      throw new Error("No pools with claimable rewards found");
    }

    if (!collateralAddress || !peggedTokenAddress) {
      throw new Error("Missing required token addresses");
    }

    // Initialize progress modal early to show errors if they occur
    const initialSteps: TransactionStep[] = [
      {
        id: "setup",
        label: "Setting up compound process...",
        status: "in_progress",
      },
    ];

    setTransactionProgress({
      isOpen: true,
      title: "Compounding Rewards",
      steps: initialSteps,
      currentStepIndex: 0,
    });

    // Track if the process has been cancelled (defined outside try block so it's accessible everywhere)
    const cancelRef = { current: false };

    // Declare variables outside try blocks so they're accessible in both setup and execution phases
    let steps: TransactionStep[] = [];
    let leveragedReceived = 0n;
    let totalCollateralForMinting = 0n;
    let collateralReceived = 0n;
    let haReceived = 0n;
    let expectedOutput: bigint | undefined;

    // Interface for categorized rewards (declared here for type access in both blocks)
    interface CategorizedReward {
      address: `0x${string}`;
      symbol: string;
      amount: bigint;
      type: "collateral" | "ha" | "hs";
    }
    let categorizedRewards: CategorizedReward[] = [];

    try {
      // Step 1: Get claimable rewards from ALL pools that have rewards
      if (!allPoolRewards || allPoolRewards.length === 0) {
        throw new Error(
          "Rewards data not loaded yet. Please wait and try again."
        );
      }

      // Aggregate rewards from ALL pools
      const allClaimableRewards: Array<{
        address: `0x${string}`;
        symbol: string;
        claimable: bigint;
      }> = [];

      poolsWithRewards.forEach((pool) => {
        if (pool.rewards?.rewardTokens) {
          pool.rewards.rewardTokens.forEach((rt) => {
            if (rt.claimable > 0n) {
              // Check if we already have this token, if so add to it
              const existing = allClaimableRewards.find(
                (r) => r.address.toLowerCase() === rt.address.toLowerCase()
              );
              if (existing) {
                existing.claimable += rt.claimable;
              } else {
                allClaimableRewards.push({
                  address: rt.address as `0x${string}`,
                  symbol: rt.symbol,
                  claimable: rt.claimable,
                });
              }
            }
          });
        }
      });

      if (allClaimableRewards.length === 0) {
        updateProgressStep("setup", {
          status: "error",
          error: "No rewards available to compound",
        });
        throw new Error("No rewards available to compound");
      }

      // Categorize reward tokens by type (collateral, ha, hs)
      categorizedRewards = allClaimableRewards.map((r) => {
        const tokenLower = r.address.toLowerCase();
        let tokenType: "collateral" | "ha" | "hs" = "collateral";

        // Check if it's the collateral token
        if (
          collateralAddress &&
          tokenLower === collateralAddress.toLowerCase()
        ) {
          tokenType = "collateral";
        }
        // Check if it's the pegged token (ha)
        else if (
          peggedTokenAddress &&
          tokenLower === peggedTokenAddress.toLowerCase()
        ) {
          tokenType = "ha";
        }
        // Check if it's the leveraged token (hs)
        else if (
          leveragedTokenAddress &&
          tokenLower === leveragedTokenAddress.toLowerCase()
        ) {
          tokenType = "hs";
        }
        // Default to collateral if we can't identify
        else {
          tokenType = "collateral";
        }

        return {
          address: r.address,
          symbol: r.symbol,
          amount: r.claimable,
          type: tokenType,
        };
      });

      // Extract amounts by type
      collateralReceived = categorizedRewards
        .filter((r) => r.type === "collateral")
        .reduce((sum, r) => sum + r.amount, 0n);

      haReceived = categorizedRewards
        .filter((r) => r.type === "ha")
        .reduce((sum, r) => sum + r.amount, 0n);

      leveragedReceived = categorizedRewards
        .filter((r) => r.type === "hs")
        .reduce((sum, r) => sum + r.amount, 0n);

      // Build all steps upfront based on reward types
      // Create claim steps for EACH pool that has rewards
      steps = [];

      poolsWithRewards.forEach((pool) => {
        const poolName = pool.poolType === "collateral" ? "Collateral" : "Sail";
        const fullPoolName = `${marketSymbol} ${poolName} Pool`;

        // Get rewards specific to this pool for the details
        const poolRewardDetails = pool.rewards?.rewardTokens
          ?.filter((rt) => rt.claimable > 0n)
          .map((rt) => {
            const amount = Number(rt.claimable) / 1e18;
            let formatted: string;
            if (amount >= 1) {
              formatted = amount.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (amount >= 0.01) {
              formatted = amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else {
              formatted = amount
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 18,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            }
            return `${formatted} ${rt.symbol}`;
          })
          .join(",");

        steps.push({
          id: `claim-${pool.poolType}`,
          label: `Claim rewards from ${fullPoolName}`,
          status: "pending" as const,
          details: poolRewardDetails
            ? `Claiming ${poolRewardDetails}`
            : undefined,
        });
      });

      // Add redeem steps if we'll receive hs (leveraged) tokens
      // We'll attach fee info to the redeem step after calculating fees
      let redeemStepIndex: number | null = null;
      if (leveragedReceived > 0n && leveragedTokenAddress) {
        steps.push(
          {
            id: "approve-leveraged",
            label: "Approve leveraged tokens for redemption",
            status: "pending",
            details: (() => {
              const amount = Number(leveragedReceived) / 1e18;
              const formatted =
                amount >= 1
                  ? amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })
                  : amount
                      .toLocaleString(undefined, {
                        maximumFractionDigits: 18,
                        useGrouping: false,
                      })
                      .replace(/\.?0+$/, "");
              return `Approve ${formatted} ${
                categorizedRewards.find((r) => r.type === "hs")?.symbol || "hs"
              }`;
            })(),
          },
          {
            id: "redeem",
            label: "Redeem leveraged tokens for collateral",
            status: "pending",
            details: (() => {
              const amount = Number(leveragedReceived) / 1e18;
              const formatted =
                amount >= 1
                  ? amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })
                  : amount
                      .toLocaleString(undefined, {
                        maximumFractionDigits: 18,
                        useGrouping: false,
                      })
                      .replace(/\.?0+$/, "");
              return `Redeem ${formatted} ${
                categorizedRewards.find((r) => r.type === "hs")?.symbol || "hs"
              } → ${collateralSymbol}`;
            })(),
          }
        );
        redeemStepIndex = steps.length - 1; // The redeem step is the last one we just added
      }

      // Add mint steps only if we have collateral to mint (from direct collateral rewards or from redeemed hs tokens)
      // Note: ha tokens don't need minting, they can be deposited directly
      const needsMinting = collateralReceived > 0n || leveragedReceived > 0n;

      // We'll attach fee info to the mint step after calculating fees
      let mintStepIndex: number | null = null;
      if (needsMinting) {
        steps.push(
          {
            id: "approve-collateral",
            label: `Approve ${collateralSymbol} for minting`,
            status: "pending",
            details:
              collateralReceived > 0n
                ? (() => {
                    const amount = Number(collateralReceived) / 1e18;
                    let formatted: string;
                    if (amount >= 1) {
                      formatted = amount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 6,
                      });
                    } else if (amount >= 0.01) {
                      formatted = amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      });
                    } else {
                      formatted = amount
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 18,
                          useGrouping: false,
                        })
                        .replace(/\.?0+$/, "");
                    }
                    return `Approve ${formatted} ${collateralSymbol}`;
                  })()
                : `Approve ${collateralSymbol} from redemption`,
          },
          {
            id: "mint",
            label: "Mint pegged tokens",
            status: "pending",
            details: "Mint ha tokens from collateral",
          }
        );
        mintStepIndex = steps.length - 1; // The mint step is the last one we just added
      }

      // Add deposit steps for each selected pool
      // If we have ha tokens directly, we can deposit them without minting
      const hasHaTokens = haReceived > 0n;
      const willHaveHaTokens = needsMinting || hasHaTokens;

      if (willHaveHaTokens) {
        // Add approve and deposit steps for each selected pool
        activeAllocations.forEach((allocation) => {
          const poolName =
            allocation.poolId === "collateral" ? "Collateral" : "Sail";

          steps.push({
            id: `approve-pegged-${allocation.poolId}`,
            label: `Approve pegged tokens for ${poolName} Pool`,
            status: "pending",
            details: `Approve ha tokens for ${poolName.toLowerCase()} pool deposit`,
          });

          steps.push({
            id: `deposit-${allocation.poolId}`,
            label: `Deposit to ${poolName} Pool`,
            status: "pending",
            details: `Deposit ${
              allocation.percentage
            }% to ${poolName.toLowerCase()} pool`,
          });
        });
      }

      // Fetch collateral price from price oracle for accurate USD calculations
      let collateralPriceUSD = 0;
      const priceOracleAddress = market.addresses?.collateralPrice as
        | `0x${string}`
        | undefined;
      if (priceOracleAddress && publicClient) {
        try {
          const client = false ? publicClient : publicClient;
          const priceResult = await client?.readContract({
            address: priceOracleAddress,
            abi: wrappedPriceOracleABI,
            functionName: "latestAnswer",
          });

          if (
            priceResult &&
            Array.isArray(priceResult) &&
            priceResult.length >= 2
          ) {
            // Use maxUnderlyingPrice (index 1), prices are in 18 decimals
            const maxPrice = priceResult[1] as bigint;
            collateralPriceUSD = Number(maxPrice) / 1e18;
          }
        } catch (priceError) {
        }
      }

      // Calculate all fees upfront
      const fees: FeeInfo[] = [];
      const feeErrors: string[] = [];

      totalCollateralForMinting = collateralReceived;

      // Calculate redeem fee if we'll receive leveraged tokens
      if (leveragedReceived > 0n && leveragedTokenAddress) {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Use the appropriate client based on environment (same as deposit modal)
        const client = false ? publicClient : publicClient;
        if (!client) {
          throw new Error("Public client not available");
        }

        let redeemDryRunResult:
          | [bigint, bigint, bigint, bigint, bigint, bigint]
          | undefined;
        // Retry logic similar to deposit modal (retry: 1)
        let lastError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            redeemDryRunResult = (await client.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "redeemLeveragedTokenDryRun",
              args: [leveragedReceived],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
            // If successful, break out of retry loop
            if (redeemDryRunResult) break;
          } catch (error: any) {
            lastError = error;
            // Wait a bit before retrying (only on first attempt)
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        // If still failed after retries, log but don't throw
        if (!redeemDryRunResult && lastError) {
          // Contract call failed - fees won't be shown upfront
          // User will see fees during actual transaction
        }

        if (
          redeemDryRunResult &&
          Array.isArray(redeemDryRunResult) &&
          redeemDryRunResult.length >= 4
        ) {
          const wrappedFee = redeemDryRunResult[1] as bigint;
          const wrappedCollateralReturned = redeemDryRunResult[3] as bigint;

          // Validate that wrappedFee is a valid bigint
          if (
            wrappedFee !== undefined &&
            typeof wrappedFee === "bigint" &&
            wrappedFee >= 0n
          ) {
            // Format fee amount nicely
            const feeAmountNum = Number(wrappedFee) / 1e18;
            let feeFormatted: string;
            if (feeAmountNum >= 1) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.01) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.0001) {
              // For amounts between 0.0001 and 0.01, show up to 6 decimals
              feeFormatted = feeAmountNum
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            } else {
              // For very small amounts (< 0.0001), show up to 8 significant digits
              const significantDigits = 8;
              const magnitude = Math.floor(Math.log10(Math.abs(feeAmountNum)));
              const decimals = Math.max(0, significantDigits - magnitude - 1);
              feeFormatted = feeAmountNum
                .toFixed(decimals)
                .replace(/\.?0+$/, "");
            }
            const feePercentage =
              leveragedReceived > 0n
                ? (Number(wrappedFee) / Number(leveragedReceived)) * 100
                : 0;

            // Calculate USD value using the fetched collateral price
            let feeUSD: number | undefined;
            if (collateralPriceUSD > 0) {
              feeUSD = parseFloat(feeFormatted) * collateralPriceUSD;
            }

            const redeemFee = {
              feeAmount: wrappedFee,
              feeFormatted,
              feeUSD,
              feePercentage,
              tokenSymbol: collateralSymbol, // Fee is in wrapped collateral, not leveraged token
              label: "Redeem Leveraged Tokens",
            };
            fees.push(redeemFee);

            // Attach fee to the redeem step
            if (redeemStepIndex !== null && steps[redeemStepIndex]) {
              steps[redeemStepIndex].fee = {
                amount: wrappedFee,
                formatted: feeFormatted,
                usd: feeUSD,
                percentage: feePercentage,
                tokenSymbol: collateralSymbol, // Fee is in wrapped collateral, not leveraged token
              };
            }

            // Update total collateral for minting
            if (
              wrappedCollateralReturned !== undefined &&
              typeof wrappedCollateralReturned === "bigint"
            ) {
              totalCollateralForMinting =
                collateralReceived + wrappedCollateralReturned;
            }
          }
        }
      }

      // Calculate mint fee
      if (totalCollateralForMinting > 0n) {
        if (!publicClient) {
          throw new Error("Public client not available");
        }

        // Use the appropriate client based on environment (same as deposit modal)
        const client = false ? publicClient : publicClient;
        if (!client) {
          throw new Error("Public client not available");
        }

        let mintDryRunResult:
          | [bigint, bigint, bigint, bigint, bigint, bigint]
          | undefined;
        // Retry logic similar to deposit modal (retry: 1)
        let lastError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            mintDryRunResult = (await client.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "mintPeggedTokenDryRun",
              args: [totalCollateralForMinting],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
            // If successful, break out of retry loop
            if (
              mintDryRunResult &&
              Array.isArray(mintDryRunResult) &&
              mintDryRunResult.length >= 2
            ) {
              break;
            }
          } catch (error: any) {
            lastError = error;
            // Wait a bit before retrying (only on first attempt)
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        if (
          mintDryRunResult &&
          Array.isArray(mintDryRunResult) &&
          mintDryRunResult.length >= 2
        ) {
          const wrappedFee = mintDryRunResult[1] as bigint;

          // Validate that wrappedFee is a valid bigint
          if (
            wrappedFee !== undefined &&
            typeof wrappedFee === "bigint" &&
            wrappedFee >= 0n
          ) {
            // Format fee amount nicely
            const feeAmountNum = Number(wrappedFee) / 1e18;
            let feeFormatted: string;
            if (feeAmountNum >= 1) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.01) {
              feeFormatted = feeAmountNum.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              });
            } else if (feeAmountNum >= 0.0001) {
              // For amounts between 0.0001 and 0.01, show up to 6 decimals
              feeFormatted = feeAmountNum
                .toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                  useGrouping: false,
                })
                .replace(/\.?0+$/, "");
            } else {
              // For very small amounts (< 0.0001), show up to 8 significant digits
              const significantDigits = 8;
              const magnitude = Math.floor(Math.log10(Math.abs(feeAmountNum)));
              const decimals = Math.max(0, significantDigits - magnitude - 1);
              feeFormatted = feeAmountNum
                .toFixed(decimals)
                .replace(/\.?0+$/, "");
            }
            const feePercentage =
              totalCollateralForMinting > 0n
                ? (Number(wrappedFee) / Number(totalCollateralForMinting)) * 100
                : 0;

            // Calculate USD value using the fetched collateral price
            let feeUSD: number | undefined;
            if (collateralPriceUSD > 0) {
              feeUSD = parseFloat(feeFormatted) * collateralPriceUSD;
            }

            const mintFee = {
              feeAmount: wrappedFee,
              feeFormatted,
              feeUSD,
              feePercentage,
              tokenSymbol: collateralSymbol,
              label: "Mint Pegged Tokens",
            };
            fees.push(mintFee);

            // Attach fee to the mint step
            if (mintStepIndex !== null && steps[mintStepIndex]) {
              steps[mintStepIndex].fee = {
                amount: wrappedFee,
                formatted: feeFormatted,
                usd: feeUSD,
                percentage: feePercentage,
                tokenSymbol: collateralSymbol,
              };
            }
          }
        } else if (lastError) {
          // Track fee estimation error
          feeErrors.push(
            `Failed to estimate mint fee: ${
              lastError.message || "Unknown error"
            }`
          );
          // Removed debug logging
        }
      }

      const handleCancel = () => {
        cancelRef.current = true;
        setIsCompounding(false);
        // Mark all pending steps as cancelled
        steps.forEach((step) => {
          if (step.status === "pending") {
            updateProgressStep(step.id, {
              status: "error",
              error: "Cancelled by user",
            });
          }
        });
      };

      // Store cancel handler in ref so TransactionProgressModal can access it
      cancelOperationRef.current = handleCancel;

      // Show confirmation modal first (always show it, even if no fees, to show steps)
      await new Promise<void>((resolve, reject) => {
        setCompoundConfirmation({
          steps,
          fees,
          feeErrors,
          onConfirm: () => {
            // Close confirmation modal first
            setCompoundConfirmation(null);
            // Resolve immediately - UI updates will happen in next tick
            resolve();
          },
        });
      });

      // Now show the progress modal after confirmation
      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps,
        currentStepIndex: 0,
      });

      // Small delay to ensure UI updates
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (setupError: any) {
      // Handle errors during setup phase
      const errorMessage =
        setupError?.message || "Failed to set up compound process";
      updateProgressStep("setup", {
        status: "error",
        error: errorMessage,
      });
      setIsCompounding(false);
      return; // Exit early - don't proceed with transactions
    }

    // Wait a moment after confirmation to ensure UI is ready
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      setIsCompounding(true);

      // Verify writeContractAsync is available
      if (typeof writeContractAsync !== "function") {
        throw new Error("writeContractAsync is not a function");
      }

      // Find the index of a step dynamically
      const findStepIndex = (stepId: string): number => {
        return steps.findIndex((s) => s.id === stepId);
      };

      // Step 1: Claim rewards from ALL pools that have rewards
      for (let i = 0; i < poolsWithRewards.length; i++) {
        const pool = poolsWithRewards[i];
        const stepId = `claim-${pool.poolType}`;

        if (cancelRef.current) throw new Error("Cancelled by user");

        // Update progress to show we're starting this claim
        const stepIndex = findStepIndex(stepId);
        setCurrentStep(stepIndex);
        updateProgressStep(stepId, { status: "in_progress" });

        // Wait a moment to ensure UI updates
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (cancelRef.current) throw new Error("Cancelled by user");

        // Execute the claim transaction for this pool
        updateProgressStep(stepId, {
          status: "in_progress",
          details: "Sending transaction to wallet...",
        });

        const claimHash = await writeContractAsync({
          address: pool.poolAddress,
          abi: rewardsABI,
          functionName: "claim",
        });
        updateProgressStep(stepId, {
          status: "in_progress",
          txHash: claimHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: claimHash as `0x${string}`,
        });
        updateProgressStep(stepId, {
          status: "completed",
          txHash: claimHash as string,
          details: "Transaction confirmed",
        });

        // Small delay to ensure UI updates before moving to next step
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Step 2: If we received leveraged tokens, redeem them for collateral
      let currentStepIndex = poolsWithRewards.length;

      if (leveragedReceived > 0n && leveragedTokenAddress) {
        // Approve leveraged token for minter if needed
        if (cancelRef.current) throw new Error("Cancelled by user");
        currentStepIndex = findStepIndex("approve-leveraged");
        setCurrentStep(currentStepIndex);
        updateProgressStep("approve-leveraged", { status: "in_progress" });
        const leveragedAllowance = (await publicClient?.readContract({
          address: leveragedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, minterAddress],
        })) as bigint | undefined;

        if (!leveragedAllowance || leveragedAllowance < leveragedReceived) {
          const approveLeveragedHash = await writeContractAsync({
            address: leveragedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [minterAddress, leveragedReceived],
          });
          updateProgressStep("approve-leveraged", {
            status: "in_progress",
            txHash: approveLeveragedHash as string,
            details: "Waiting for transaction confirmation...",
          });
          await publicClient?.waitForTransactionReceipt({
            hash: approveLeveragedHash as `0x${string}`,
          });
          updateProgressStep("approve-leveraged", {
            status: "completed",
            txHash: approveLeveragedHash as string,
            details: "Transaction confirmed",
          });
        } else {
          updateProgressStep("approve-leveraged", {
            status: "completed",
            details: "Already approved",
          });
        }

        // Redeem leveraged tokens for collateral
        if (cancelRef.current) throw new Error("Cancelled by user");
        currentStepIndex = findStepIndex("redeem");
        setCurrentStep(currentStepIndex);
        updateProgressStep("redeem", { status: "in_progress" });

        const collateralFromRedeem = (await publicClient?.readContract({
          address: minterAddress,
          abi: minterABI,
          functionName: "calculateRedeemLeveragedTokenOutput",
          args: [leveragedReceived],
        })) as bigint | undefined;

        if (!collateralFromRedeem)
          throw new Error("Failed to calculate redeem output");

        const minCollateralOut = (collateralFromRedeem * 99n) / 100n;
        const redeemHash = await writeContractAsync({
          address: minterAddress,
          abi: minterABI,
          functionName: "redeemLeveragedToken",
          args: [leveragedReceived, address, minCollateralOut],
        });
        updateProgressStep("redeem", {
          status: "in_progress",
          txHash: redeemHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: redeemHash as `0x${string}`,
        });
        updateProgressStep("redeem", {
          status: "completed",
          txHash: redeemHash as string,
          details: "Transaction confirmed",
        });
      }

      // Step 3: Mint ha tokens from total collateral
      if (totalCollateralForMinting === 0n) {
        throw new Error("No collateral available for minting");
      }

      // Calculate mint output (use dry run to get peggedMinted)
      const dryRunResult = (await publicClient?.readContract({
        address: minterAddress,
        abi: minterABI,
        functionName: "mintPeggedTokenDryRun",
        args: [totalCollateralForMinting],
      })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;

      const expectedOutput = dryRunResult?.[3];

      if (!expectedOutput) throw new Error("Failed to calculate mint output");

      // Approve collateral for minter if needed
      if (cancelRef.current) throw new Error("Cancelled by user");
      currentStepIndex = findStepIndex("approve-collateral");
      setCurrentStep(currentStepIndex);
      updateProgressStep("approve-collateral", { status: "in_progress" });
      const allowance = (await publicClient?.readContract({
        address: collateralAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, minterAddress],
      })) as bigint | undefined;

      if (cancelRef.current) throw new Error("Cancelled by user");
      if (!allowance || allowance < totalCollateralForMinting) {
        const approveHash = await writeContractAsync({
          address: collateralAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [minterAddress, totalCollateralForMinting],
        });
        updateProgressStep("approve-collateral", {
          status: "in_progress",
          txHash: approveHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
        });
        updateProgressStep("approve-collateral", {
          status: "completed",
          txHash: approveHash as string,
          details: "Transaction confirmed",
        });
      } else {
        updateProgressStep("approve-collateral", {
          status: "completed",
          details: "Already approved",
        });
      }

      // Mint pegged tokens
      if (cancelRef.current) throw new Error("Cancelled by user");
      currentStepIndex = findStepIndex("mint");
      setCurrentStep(currentStepIndex);
      updateProgressStep("mint", { status: "in_progress" });
      const minPeggedOut = (expectedOutput * 99n) / 100n;
      const mintHash = await writeContractAsync({
        address: minterAddress,
        abi: minterABI,
        functionName: "mintPeggedToken",
        args: [totalCollateralForMinting, address, minPeggedOut],
      });
      updateProgressStep("mint", {
        status: "in_progress",
        txHash: mintHash as string,
        details: "Waiting for transaction confirmation...",
      });
      await publicClient?.waitForTransactionReceipt({
        hash: mintHash as `0x${string}`,
      });
      updateProgressStep("mint", {
        status: "completed",
        txHash: mintHash as string,
        details: "Transaction confirmed",
      });

      // Step 4: Approve and deposit to each stability pool
      // Use only ha tokens from this flow: claimed ha rewards + newly minted ha
      const mintedHaFromThisFlow = expectedOutput || 0n;
      const depositAmount = haReceived + mintedHaFromThisFlow;
      if (depositAmount === 0n) {
        throw new Error("No ha tokens from rewards/mint to deposit");
      }

      // Deposit to all selected pools based on percentage allocations
      // Calculate deposit amounts based on percentages
      let remainingAmount = depositAmount;

      for (let i = 0; i < activeAllocations.length; i++) {
        const allocation = activeAllocations[i];
        const poolType = allocation.poolId;
        const targetPoolAddress =
          poolType === "collateral" ? collateralPoolAddress : sailPoolAddress;
        const poolName = poolType === "collateral" ? "Collateral" : "Sail";

        if (!targetPoolAddress) {
          throw new Error(`Pool address not found for ${poolType} pool`);
        }

        // Calculate deposit amount based on percentage
        // For the last pool, use remaining amount to account for rounding
        let poolDepositAmount: bigint;
        if (i === activeAllocations.length - 1) {
          poolDepositAmount = remainingAmount;
        } else {
          // Calculate: depositAmount * percentage / 100
          poolDepositAmount =
            (depositAmount * BigInt(allocation.percentage)) / 100n;
          remainingAmount -= poolDepositAmount;
        }

        // Step: Approve for this pool
        if (cancelRef.current) throw new Error("Cancelled by user");
        const approveStepId = `approve-pegged-${poolType}`;
        currentStepIndex = findStepIndex(approveStepId);
        setCurrentStep(currentStepIndex);
        updateProgressStep(approveStepId, { status: "in_progress" });

        // Check allowance for this pool
        const poolAllowance = (await publicClient?.readContract({
          address: peggedTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, targetPoolAddress],
        })) as bigint | undefined;

        if (!poolAllowance || poolAllowance < poolDepositAmount) {
          const approveHash = await writeContractAsync({
            address: peggedTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [targetPoolAddress, poolDepositAmount],
          });
          updateProgressStep(approveStepId, {
            status: "in_progress",
            txHash: approveHash as string,
            details: "Waiting for transaction confirmation...",
          });
          await publicClient?.waitForTransactionReceipt({
            hash: approveHash as `0x${string}`,
          });
          updateProgressStep(approveStepId, {
            status: "completed",
            txHash: approveHash as string,
            details: "Transaction confirmed",
          });
        } else {
          updateProgressStep(approveStepId, {
            status: "completed",
            details: "Already approved",
          });
        }

        // Step: Deposit to this pool
        if (cancelRef.current) throw new Error("Cancelled by user");
        const depositStepId = `deposit-${poolType}`;
        currentStepIndex = findStepIndex(depositStepId);
        setCurrentStep(currentStepIndex);
        updateProgressStep(depositStepId, { status: "in_progress" });

        const minDepositAmount = (poolDepositAmount * 99n) / 100n;
        const depositHash = await writeContractAsync({
          address: targetPoolAddress,
          abi: STABILITY_POOL_ABI,
          functionName: "deposit",
          args: [poolDepositAmount, address, minDepositAmount],
        });
        updateProgressStep(depositStepId, {
          status: "in_progress",
          txHash: depositHash as string,
          details: "Waiting for transaction confirmation...",
        });
        await publicClient?.waitForTransactionReceipt({
          hash: depositHash as `0x${string}`,
        });
        updateProgressStep(depositStepId, {
          status: "completed",
          txHash: depositHash as string,
          details: "Transaction confirmed",
        });

        // Small delay between pools to ensure UI updates
        if (i < activeAllocations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([refetchReads(), refetchUserDeposits()]);
    } catch (error: any) {
      const errorMessage = isUserRejection(error)
        ? "User declined the transaction"
        : error.message || "Transaction failed";

      // If user rejected or cancelled, mark all remaining steps as cancelled
      if (isUserRejection(error) || error.message === "Cancelled by user") {
        if (transactionProgress) {
          transactionProgress.steps.forEach((step, index) => {
            if (
              index > transactionProgress.currentStepIndex &&
              step.status === "pending"
            ) {
              updateProgressStep(step.id, {
                status: "error",
                error: "Cancelled - previous transaction declined",
              });
            }
          });
        }
      }

      // Mark current step as error
      if (transactionProgress) {
        const currentStep =
          transactionProgress.steps[transactionProgress.currentStepIndex];
        if (currentStep) {
          updateProgressStep(currentStep.id, {
            status: "error",
            error: errorMessage,
          });
        } else {
          // If no current step, mark the first pending step as error
          const firstPendingStep = transactionProgress.steps.find(
            (s) => s.status === "pending"
          );
          if (firstPendingStep) {
            updateProgressStep(firstPendingStep.id, {
              status: "error",
              error: errorMessage,
            });
          }
        }
      } else {
        // If transactionProgress is null, create it to show the error
        setTransactionProgress({
          isOpen: true,
          title: "Compounding Rewards",
          steps: steps.map((s, i) =>
            i === 0
              ? { ...s, status: "error" as const, error: errorMessage }
              : s
          ),
          currentStepIndex: 0,
        });
      }
      // Don't close modal on error - let user see what failed
    } finally {
      setIsCompounding(false);
      cancelOperationRef.current = null;
    }
  };

  // Claim all, compound all, and buy $TIDE handlers
  // handleClaimAll, handleCompoundAll are now provided by useAnchorTransactions hook

  const handleBuyTide = async (
    selectedPools: Array<{
      marketId: string;
      poolType: "collateral" | "sail";
    }> = []
  ) => {
    // TODO: Implement Buy $TIDE functionality
    // This would involve swapping rewards for $TIDE tokens
    // Buy $TIDE functionality to be implemented
    // For now, we'll just claim the rewards first
    // In the future, this should swap rewards for $TIDE
    await handleClaimAll(selectedPools);
  };

  const ensureAllowance = useCallback(
    async (token: `0x${string}`, spender: `0x${string}`, amount: bigint) => {
      if (!address || !publicClient) return;
      if (amount <= 0n) return;
      const formatTxError = (e: any): string => {
        const msgRaw =
          e?.shortMessage ||
          e?.cause?.shortMessage ||
          e?.cause?.message ||
          e?.message ||
          String(e);

        const msg = String(msgRaw);
        const lower = msg.toLowerCase();

        // Hardware wallets / connectors sometimes surface this as an "unknown RPC error"
        // but it's actually just a disconnected signer device.
        if (lower.includes("device disconnected") || lower.includes("disconnected during action")) {
          return "Wallet device disconnected. Reconnect your wallet and try again.";
        }
        if (
          lower.includes("user rejected") ||
          lower.includes("user denied") ||
          lower.includes("rejected the request") ||
          lower.includes("request rejected")
        ) {
          return "Transaction was rejected in your wallet.";
        }

        // Strip noisy viem request dumps (Request Arguments / Contract Call blobs).
        const trimmed = msg.split("Request Arguments:")[0]?.trim();
        return trimmed || "Transaction failed. Please try again.";
      };

      const readAllowance = async () => {
        const currentAllowance = (await publicClient.readContract({
          address: token,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, spender],
        })) as bigint;
        return currentAllowance ?? 0n;
      };

      const sendApprove = async () => {
        const approveHash = await writeContractAsync({
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spender, amount],
        });
        await publicClient.waitForTransactionReceipt({
          hash: approveHash as `0x${string}`,
        });
      };

      const allowance0 = await readAllowance();
      if (allowance0 >= amount) return;

      try {
        await sendApprove();
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        const isNonceError =
          msg.includes("nonce") && (msg.includes("lower") || msg.includes("too low"));

        // If we hit a nonce sync issue (usually due to pending txs / wallet nonce cache),
        // wait briefly, re-check allowance (maybe the approval already mined), then retry once.
        if (isNonceError) {
          await new Promise((r) => setTimeout(r, 1500));
          const allowance1 = await readAllowance();
          if (allowance1 >= amount) return;
          await sendApprove();
          return;
        }

        throw new Error(formatTxError(e));
      }
    },
    [address, publicClient, writeContractAsync]
  );

  const readErc20Balance = useCallback(
    async (token: `0x${string}`) => {
      if (!address || !publicClient) return 0n;
      const bal = (await publicClient.readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      return bal ?? 0n;
    },
    [address, publicClient]
  );

  const getSelectedPoolsByMarket = useCallback(
    (
      selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>
    ) => {
      const map = new Map<string, Array<"collateral" | "sail">>();
      for (const p of selectedPools) {
        const arr = map.get(p.marketId) ?? [];
        if (!arr.includes(p.poolType)) arr.push(p.poolType);
        map.set(p.marketId, arr);
      }
      return map;
    },
    []
  );

  const getPoolRewardTokens = useCallback(
    (poolAddress: `0x${string}`) => {
      const poolReward = allPoolRewards?.find(
        (r) => r.poolAddress.toLowerCase() === poolAddress.toLowerCase()
      );
      return poolReward?.rewardTokens ?? [];
    },
    [allPoolRewards]
  );

  const formatTokenAmount = useCallback((amount: bigint): string => {
    const num = Number(amount) / 1e18;
    if (!Number.isFinite(num) || num === 0) return "0";
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return num
      .toLocaleString(undefined, { maximumFractionDigits: 8, useGrouping: false })
      .replace(/\.?0+$/, "");
  }, []);

  const runAdvancedPreflight = useCallback(
    async (args: {
      targetMarketId: string;
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>;
      selectedClaimPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
    }) => {
      if (!publicClient) {
        setAdvancedPreflight({
          key: "",
          isLoading: false,
          error: "Public client not available",
          fees: [],
        });
        return;
      }

      const key = JSON.stringify({
        t: args.targetMarketId,
        a: args.allocations
          .slice()
          .sort((x, y) => x.poolAddress.localeCompare(y.poolAddress))
          .map((x) => [x.poolAddress.toLowerCase(), x.percentage]),
        c: args.selectedClaimPools
          .slice()
          .sort((x, y) => `${x.marketId}-${x.poolType}`.localeCompare(`${y.marketId}-${y.poolType}`)),
      });

      setAdvancedPreflight({
        key,
        isLoading: true,
        fees: [],
      });

      try {
        const targetMarket = anchorMarkets.find(([id]) => id === args.targetMarketId)?.[1];
        if (!targetMarket) throw new Error("Target market not found");
        const targetPegged = targetMarket.addresses?.peggedToken as `0x${string}` | undefined;
        if (!targetPegged) throw new Error("Target pegged token missing");

        // Aggregate claimable rewards from selected claim pools using `allPoolRewards`
        const peggedByToken = new Map<`0x${string}`, bigint>();
        const leveragedByMarket = new Map<string, bigint>();
        const wrappedByToken = new Map<`0x${string}`, bigint>();

        for (const { marketId, poolType } of args.selectedClaimPools) {
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          if (!market) continue;
          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as `0x${string}` | undefined)
              : (market.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined);
          if (!poolAddress) continue;
          const rts = getPoolRewardTokens(poolAddress);

          const peggedTokenAddr = market.addresses?.peggedToken as `0x${string}` | undefined;
          const leveragedTokenAddr = market.addresses?.leveragedToken as `0x${string}` | undefined;
          const wrappedTokenAddr = market.addresses?.wrappedCollateralToken as `0x${string}` | undefined;

          for (const rt of rts) {
            if (!rt.claimable || rt.claimable <= 0n) continue;
            const addr = (rt.address as `0x${string}`).toLowerCase() as `0x${string}`;
            if (peggedTokenAddr && addr === peggedTokenAddr.toLowerCase()) {
              peggedByToken.set(peggedTokenAddr, (peggedByToken.get(peggedTokenAddr) ?? 0n) + rt.claimable);
            } else if (leveragedTokenAddr && addr === leveragedTokenAddr.toLowerCase()) {
              leveragedByMarket.set(marketId, (leveragedByMarket.get(marketId) ?? 0n) + rt.claimable);
            } else if (wrappedTokenAddr && addr === wrappedTokenAddr.toLowerCase()) {
              wrappedByToken.set(wrappedTokenAddr, (wrappedByToken.get(wrappedTokenAddr) ?? 0n) + rt.claimable);
            } else {
              // Unknown reward token type for this market; ignore for now.
            }
          }
        }

        // Build redeem leveraged plans (market-specific)
        const redeemLeveragedPlan: Array<{
          marketId: string;
          leveragedToken: `0x${string}`;
          amount: bigint;
          minter: `0x${string}`;
          expectedOut: bigint;
          fee: bigint;
        }> = [];
        for (const [marketId, amount] of leveragedByMarket.entries()) {
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          const minter = market?.addresses?.minter as `0x${string}` | undefined;
          const leveragedToken = market?.addresses?.leveragedToken as `0x${string}` | undefined;
          if (!minter || !leveragedToken) continue;
          const dry = (await publicClient.readContract({
            address: minter,
            abi: minterABI,
            functionName: "redeemLeveragedTokenDryRun",
            args: [amount],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint];
          const fee = dry?.[1] ?? 0n;
          const out = dry?.[3] ?? 0n;
          redeemLeveragedPlan.push({ marketId, leveragedToken, amount, minter, expectedOut: out, fee });

          const wrappedToken = market?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
          if (wrappedToken) {
            wrappedByToken.set(wrappedToken, (wrappedByToken.get(wrappedToken) ?? 0n) + out);
          }
        }

        // Redeem non-target pegged via best market (lowest fee %)
        const redeemPeggedPlan: Array<{
          peggedToken: `0x${string}`;
          amount: bigint;
          minter: `0x${string}`;
          wrappedCollateralToken: `0x${string}`;
          expectedOut: bigint;
          fee: bigint;
          feePct?: number;
          marketId: string;
          tokenSymbol: string;
        }> = [];

        for (const [peggedToken, amount] of peggedByToken.entries()) {
          if (peggedToken.toLowerCase() === targetPegged.toLowerCase()) continue;
          const candidates = anchorMarkets
            .map(([id, m]) => ({ id, market: m }))
            .filter(({ market }) => {
              const p = (market as any)?.addresses?.peggedToken as `0x${string}` | undefined;
              return p && p.toLowerCase() === peggedToken.toLowerCase();
            });
          let best: null | {
            marketId: string;
            minter: `0x${string}`;
            wrapped: `0x${string}`;
            fee: bigint;
            out: bigint;
            feePct?: number;
            tokenSymbol: string;
          } = null;

          for (const c of candidates) {
            const minter = (c.market as any).addresses?.minter as `0x${string}` | undefined;
            const wrapped = (c.market as any).addresses?.wrappedCollateralToken as `0x${string}` | undefined;
            if (!minter || !wrapped) continue;
            const dry = (await publicClient.readContract({
              address: minter,
              abi: minterABI,
              functionName: "redeemPeggedTokenDryRun",
              args: [amount],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint];
            const fee = dry?.[1] ?? 0n;
            const out = dry?.[4] ?? 0n;
            const denom = fee + out;
            const feePct = denom > 0n ? (Number(fee) / Number(denom)) * 100 : undefined;
            const tokenSymbol = (c.market as any)?.peggedToken?.symbol || "ha";

            if (
              !best ||
              (feePct !== undefined &&
                best.feePct !== undefined &&
                feePct < best.feePct - 1e-9) ||
              (feePct !== undefined && best.feePct === undefined) ||
              (feePct === best.feePct && out > best.out)
            ) {
              best = { marketId: c.id, minter, wrapped, fee, out, feePct, tokenSymbol };
            }
          }
          if (!best) throw new Error("Failed to compute redeem dry run");
          redeemPeggedPlan.push({
            peggedToken,
            amount,
            minter: best.minter,
            wrappedCollateralToken: best.wrapped,
            expectedOut: best.out,
            fee: best.fee,
            feePct: best.feePct,
            marketId: best.marketId,
            tokenSymbol: best.tokenSymbol,
          });
          wrappedByToken.set(best.wrapped, (wrappedByToken.get(best.wrapped) ?? 0n) + best.out);
        }

        // Mint target token per wrapped collateral token via best market (lowest fee %)
        const mintPlan: Array<{
          wrappedToken: `0x${string}`;
          amount: bigint;
          minter: `0x${string}`;
          expectedMint: bigint;
          fee: bigint;
          feePct?: number;
          marketId: string;
          collateralSymbol: string;
        }> = [];

        const targetMintMarkets = anchorMarkets
          .map(([id, m]) => ({ id, market: m }))
          .filter(({ market }) => {
            const p = (market as any)?.addresses?.peggedToken as `0x${string}` | undefined;
            const minter = (market as any)?.addresses?.minter as `0x${string}` | undefined;
            const wrapped = (market as any)?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
            return !!p && !!minter && !!wrapped && p.toLowerCase() === targetPegged.toLowerCase();
          });

        for (const [wrappedToken, amount] of wrappedByToken.entries()) {
          if (amount <= 0n) continue;
          const candidates = targetMintMarkets.filter(({ market }) => {
            const w = (market as any)?.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
            return w && w.toLowerCase() === wrappedToken.toLowerCase();
          });
          if (candidates.length === 0) continue;
          let best: null | {
            marketId: string;
            minter: `0x${string}`;
            minted: bigint;
            fee: bigint;
            feePct?: number;
            collateralSymbol: string;
          } = null;

          for (const c of candidates) {
            const minter = (c.market as any).addresses?.minter as `0x${string}` | undefined;
            if (!minter) continue;
            const dry = (await publicClient.readContract({
              address: minter,
              abi: minterABI,
              functionName: "mintPeggedTokenDryRun",
              args: [amount],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            const fee = dry?.[1] ?? 0n;
            const taken = dry?.[2] ?? 0n;
            const minted = dry?.[3] ?? 0n;
            const feePct = taken > 0n ? (Number(fee) / Number(taken)) * 100 : undefined;
            const collateralSymbol = (c.market as any)?.collateral?.symbol || "collateral";

            if (
              !best ||
              (feePct !== undefined &&
                best.feePct !== undefined &&
                feePct < best.feePct - 1e-9) ||
              (feePct !== undefined && best.feePct === undefined) ||
              (feePct === best.feePct && minted > best.minted)
            ) {
              best = { marketId: c.id, minter, minted, fee, feePct, collateralSymbol };
            }
          }
          if (!best) continue;
          mintPlan.push({
            wrappedToken,
            amount,
            minter: best.minter,
            expectedMint: best.minted,
            fee: best.fee,
            feePct: best.feePct,
            marketId: best.marketId,
            collateralSymbol: best.collateralSymbol,
          });
        }

        const fees = [
          ...redeemLeveragedPlan.map((p) => {
            const market = anchorMarkets.find(([id]) => id === p.marketId)?.[1];
            const tokenSymbol = market?.collateral?.symbol || "collateral";
            const feePct =
              p.fee + p.expectedOut > 0n
                ? (Number(p.fee) / Number(p.fee + p.expectedOut)) * 100
                : undefined;
            return {
              id: `redeem-hs-${p.marketId}`,
              label: `Redeem leveraged (${p.marketId})`,
              tokenSymbol,
              feeFormatted: formatTokenAmount(p.fee),
              feePercentage: feePct,
              details: `Redeem ${formatTokenAmount(p.amount)} hs → ${formatTokenAmount(p.expectedOut)} ${tokenSymbol}`,
            };
          }),
          ...redeemPeggedPlan.map((p) => {
            const market = anchorMarkets.find(([id]) => id === p.marketId)?.[1];
            const tokenSymbol = market?.collateral?.symbol || "collateral";
            return {
              id: `redeem-ha-${p.peggedToken.toLowerCase()}`,
              label: `Redeem ${p.tokenSymbol} (${p.marketId})`,
              tokenSymbol,
              feeFormatted: formatTokenAmount(p.fee),
              feePercentage: p.feePct,
              details: `Redeem ${formatTokenAmount(p.amount)} ${p.tokenSymbol} → ${formatTokenAmount(p.expectedOut)} ${tokenSymbol}`,
            };
          }),
          ...mintPlan.map((p) => ({
            id: `mint-${p.wrappedToken.toLowerCase()}`,
            label: `Mint ${(targetMarket as any)?.peggedToken?.symbol || "ha"} (${p.marketId})`,
            tokenSymbol: p.collateralSymbol,
            feeFormatted: formatTokenAmount(p.fee),
            feePercentage: p.feePct,
            details: `Mint ${formatTokenAmount(p.expectedMint)} from ${formatTokenAmount(p.amount)} ${p.collateralSymbol}`,
          })),
        ];

        setAdvancedPreflight({
          key,
          isLoading: false,
          fees,
          plan: {
            targetMarketId: args.targetMarketId,
            allocations: args.allocations,
            selectedClaimPools: args.selectedClaimPools,
            redeemPegged: redeemPeggedPlan.map((p) => ({
              peggedToken: p.peggedToken,
              amount: p.amount,
              minter: p.minter,
              wrappedCollateralToken: p.wrappedCollateralToken,
              expectedOut: p.expectedOut,
            })),
            redeemLeveraged: redeemLeveragedPlan.map((p) => ({
              marketId: p.marketId,
              leveragedToken: p.leveragedToken,
              amount: p.amount,
              minter: p.minter,
              expectedOut: p.expectedOut,
            })),
            mint: mintPlan.map((p) => ({
              wrappedToken: p.wrappedToken,
              amount: p.amount,
              minter: p.minter,
              expectedMint: p.expectedMint,
            })),
          },
        });
      } catch (e: any) {
        setAdvancedPreflight({
          key,
          isLoading: false,
          error: e?.message || "Failed to calculate fees",
          fees: [],
        });
      }
    },
    [anchorMarkets, formatTokenAmount, getPoolRewardTokens, publicClient]
  );

  const runSimplePreflight = useCallback(
    async (args: {
      selectedClaimPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>;
    }) => {
      if (!publicClient) {
        setSimplePreflight({
          key: "",
          isLoading: false,
          error: "Public client not available",
          fees: [],
        });
        return;
      }

      const key = JSON.stringify({
        c: args.selectedClaimPools
          .slice()
          .sort((x, y) =>
            `${x.marketId}-${x.poolType}`.localeCompare(`${y.marketId}-${y.poolType}`)
          ),
      });

      setSimplePreflight({
        key,
        isLoading: true,
        fees: [],
      });

      try {
        // Aggregate claimable rewards from selected pools using `allPoolRewards`
        const leveragedByMarket = new Map<string, bigint>();
        const wrappedByMarket = new Map<string, bigint>();

        for (const { marketId, poolType } of args.selectedClaimPools) {
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          if (!market) continue;
          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as `0x${string}` | undefined)
              : (market.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined);
          if (!poolAddress) continue;

          const leveragedTokenAddr = market.addresses?.leveragedToken as `0x${string}` | undefined;
          const wrappedTokenAddr =
            market.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
          if (!wrappedTokenAddr) continue;

          const rts = getPoolRewardTokens(poolAddress);
          for (const rt of rts) {
            if (!rt.claimable || rt.claimable <= 0n) continue;
            const addr = (rt.address as `0x${string}`).toLowerCase() as `0x${string}`;
            if (leveragedTokenAddr && addr === leveragedTokenAddr.toLowerCase()) {
              leveragedByMarket.set(
                marketId,
                (leveragedByMarket.get(marketId) ?? 0n) + rt.claimable
              );
            } else if (addr === wrappedTokenAddr.toLowerCase()) {
              wrappedByMarket.set(
                marketId,
                (wrappedByMarket.get(marketId) ?? 0n) + rt.claimable
              );
            } else {
              // pegged token rewards have no protocol fee for conversion, so ignore here
            }
          }
        }

        const fees: Array<{
          id: string;
          label: string;
          tokenSymbol: string;
          feeFormatted: string;
          feePercentage?: number;
          details?: string;
        }> = [];

        for (const [marketId, leveragedAmount] of leveragedByMarket.entries()) {
          if (leveragedAmount <= 0n) continue;
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          const minter = market?.addresses?.minter as `0x${string}` | undefined;
          if (!market || !minter) continue;
          const collateralSymbol = market?.collateral?.symbol || "collateral";

          const dry = (await publicClient.readContract({
            address: minter,
            abi: minterABI,
            functionName: "redeemLeveragedTokenDryRun",
            args: [leveragedAmount],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint];
          const fee = dry?.[1] ?? 0n;
          const out = dry?.[3] ?? 0n;
          const feePct =
            fee + out > 0n ? (Number(fee) / Number(fee + out)) * 100 : undefined;

          fees.push({
            id: `simple-redeem-hs-${marketId}`,
            label: `Redeem leveraged (${marketId})`,
            tokenSymbol: collateralSymbol,
            feeFormatted: formatTokenAmount(fee),
            feePercentage: feePct,
            details: `Redeem ${formatTokenAmount(leveragedAmount)} hs → ${formatTokenAmount(out)} ${collateralSymbol}`,
          });

          // Redemption produces wrapped collateral which will be minted into pegged
          wrappedByMarket.set(marketId, (wrappedByMarket.get(marketId) ?? 0n) + out);
        }

        for (const [marketId, wrappedAmount] of wrappedByMarket.entries()) {
          if (wrappedAmount <= 0n) continue;
          const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
          const minter = market?.addresses?.minter as `0x${string}` | undefined;
          if (!market || !minter) continue;
          const collateralSymbol = market?.collateral?.symbol || "collateral";
          const peggedSymbol = market?.peggedToken?.symbol || "ha";

          const dry = (await publicClient.readContract({
            address: minter,
            abi: minterABI,
            functionName: "mintPeggedTokenDryRun",
            args: [wrappedAmount],
          })) as [bigint, bigint, bigint, bigint, bigint, bigint];
          const fee = dry?.[1] ?? 0n;
          const taken = dry?.[2] ?? 0n;
          const minted = dry?.[3] ?? 0n;
          const feePct = taken > 0n ? (Number(fee) / Number(taken)) * 100 : undefined;

          fees.push({
            id: `simple-mint-${marketId}`,
            label: `Mint ${peggedSymbol} (${marketId})`,
            tokenSymbol: collateralSymbol,
            feeFormatted: formatTokenAmount(fee),
            feePercentage: feePct,
            details: `Mint ${formatTokenAmount(minted)} ${peggedSymbol} from ${formatTokenAmount(wrappedAmount)} ${collateralSymbol}`,
          });
        }

        setSimplePreflight({
          key,
          isLoading: false,
          fees,
        });
      } catch (e: any) {
        setSimplePreflight({
          key,
          isLoading: false,
          error: e?.message || "Failed to calculate fees",
          fees: [],
        });
      }
    },
    [anchorMarkets, formatTokenAmount, getPoolRewardTokens, publicClient]
  );

  const handleCompoundAllKeepPerToken = useCallback(
    async (
      selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>,
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>
    ) => {
      if (!address || !publicClient) throw new Error("Wallet not connected");

      const selectedByMarket = getSelectedPoolsByMarket(selectedPools);
      const marketsToProcess = Array.from(selectedByMarket.keys());
      if (marketsToProcess.length === 0) return;

      // Snapshot initial balances so we only act on newly-claimed rewards.
      const initialByMarket = new Map<
        string,
        { pegged: bigint; leveraged: bigint; wrapped: bigint }
      >();
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const peggedTokenAddress = market.addresses?.peggedToken as `0x${string}` | undefined;
        const leveragedTokenAddress = market.addresses?.leveragedToken as `0x${string}` | undefined;
        const wrappedCollateralToken = market.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
        if (!peggedTokenAddress || !wrappedCollateralToken) continue;
        const pegged = await readErc20Balance(peggedTokenAddress);
        const leveraged = leveragedTokenAddress ? await readErc20Balance(leveragedTokenAddress) : 0n;
        const wrapped = await readErc20Balance(wrappedCollateralToken);
        initialByMarket.set(marketId, { pegged, leveraged, wrapped });
      }

      const steps: TransactionStep[] = [];
      for (const marketId of marketsToProcess) {
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          steps.push({
            id: `claim-${marketId}-${poolType}`,
            label: `Claim rewards from ${marketId} ${poolType} pool`,
            status: "pending",
          });
        }
      }
      steps.push({
        id: "compound",
        label: "Redeem / Mint / Deposit",
        status: "pending",
      });

      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps,
        currentStepIndex: 0,
      });

      // Step 1: claim from each selected pool
      let stepIndex = 0;
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          const stepId = `claim-${marketId}-${poolType}`;
          setCurrentStep(stepIndex);
          updateProgressStep(stepId, { status: "in_progress" });

          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as `0x${string}` | undefined)
              : (market.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined);
          if (!poolAddress) {
            updateProgressStep(stepId, { status: "error", error: "Pool address not found" });
            stepIndex++;
            continue;
          }

          const hash = await writeContractAsync({
            address: poolAddress,
            abi: rewardsABI,
            functionName: "claim",
          });
          updateProgressStep(stepId, { status: "in_progress", txHash: hash as string });
          await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
          updateProgressStep(stepId, { status: "completed", txHash: hash as string });
          stepIndex++;
        }
      }

      // Step 2: per-market redeem/mint/deposit using the chosen pool list (by address)
      setCurrentStep(stepIndex);
      updateProgressStep("compound", { status: "in_progress" });

      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;

        const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
        const peggedTokenAddress = market.addresses?.peggedToken as `0x${string}` | undefined;
        const leveragedTokenAddress = market.addresses?.leveragedToken as `0x${string}` | undefined;
        const wrappedCollateralToken = market.addresses?.wrappedCollateralToken as `0x${string}` | undefined;
        const collateralPoolAddress = market.addresses?.stabilityPoolCollateral as `0x${string}` | undefined;
        const sailPoolAddress = market.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined;

        if (!minterAddress || !peggedTokenAddress || !wrappedCollateralToken) continue;

        const initial = initialByMarket.get(marketId);
        if (!initial) continue;
        const peggedAfterClaim = await readErc20Balance(peggedTokenAddress);
        const leveragedAfterClaim = leveragedTokenAddress ? await readErc20Balance(leveragedTokenAddress) : 0n;
        const wrappedAfterClaim = await readErc20Balance(wrappedCollateralToken);

        const claimedPegged = peggedAfterClaim > initial.pegged ? peggedAfterClaim - initial.pegged : 0n;
        const claimedLeveraged =
          leveragedAfterClaim > initial.leveraged ? leveragedAfterClaim - initial.leveraged : 0n;
        // wrapped delta will be re-read after redemptions; keep initial baseline
        void wrappedAfterClaim;

        // Redeem leveraged -> wrapped collateral
        if (claimedLeveraged > 0n && leveragedTokenAddress) {
          await ensureAllowance(leveragedTokenAddress, minterAddress, claimedLeveraged);
          // Compute min out via dry run
          let minOut = 0n;
          try {
            const dry = (await publicClient.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "redeemLeveragedTokenDryRun",
              args: [claimedLeveraged],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            if (dry && Array.isArray(dry) && dry.length >= 4) {
              const returned = dry[3] as bigint;
              minOut = (returned * 99n) / 100n;
            }
          } catch {}

          const redeemHash = await writeContractAsync({
            address: minterAddress,
            abi: minterABI,
            functionName: "redeemLeveragedToken",
            args: [claimedLeveraged, address, minOut],
          });
          await publicClient.waitForTransactionReceipt({ hash: redeemHash as `0x${string}` });
        }

        // Mint pegged from *new* wrapped collateral (claims + redemptions)
        const wrappedAfterRedeem = await readErc20Balance(wrappedCollateralToken);
        const collateralToMint = wrappedAfterRedeem > initial.wrapped ? wrappedAfterRedeem - initial.wrapped : 0n;
        if (collateralToMint > 0n) {
          await ensureAllowance(wrappedCollateralToken, minterAddress, collateralToMint);
          let minPeggedOut = 0n;
          try {
            const dry = (await publicClient.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "mintPeggedTokenDryRun",
              args: [collateralToMint],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            if (dry && Array.isArray(dry) && dry.length >= 4) {
              const peggedMinted = dry[3] as bigint;
              minPeggedOut = (peggedMinted * 99n) / 100n;
            }
          } catch {}

          const mintHash = await writeContractAsync({
            address: minterAddress,
            abi: minterABI,
            functionName: "mintPeggedToken",
            args: [collateralToMint, address, minPeggedOut],
          });
          await publicClient.waitForTransactionReceipt({ hash: mintHash as `0x${string}` });
        }

        const peggedAfterMint = await readErc20Balance(peggedTokenAddress);
        const totalPeggedToDeposit = peggedAfterMint > initial.pegged ? peggedAfterMint - initial.pegged : 0n;
        if (totalPeggedToDeposit <= 0n) continue;

        // Deposit to selected pools that belong to this market (collateral/sail pools for this market)
        const validPoolSet = new Set<string>(
          [collateralPoolAddress, sailPoolAddress]
            .filter(Boolean)
            .map((x) => (x as string).toLowerCase())
        );
        const active = allocations
          .filter((a) => a.percentage > 0)
          .filter((a) => validPoolSet.has(a.poolAddress.toLowerCase()));
        const sum = active.reduce((s, a) => s + a.percentage, 0);
        if (sum === 0) continue;

        for (const a of active) {
          const poolAddress = a.poolAddress as `0x${string}`;
          const pct = (a.percentage * 100) / sum;
          const amt = (totalPeggedToDeposit * BigInt(Math.round(pct))) / 100n;
          if (amt <= 0n) continue;
          await ensureAllowance(peggedTokenAddress, poolAddress, amt);
          const depositHash = await writeContractAsync({
            address: poolAddress,
            abi: STABILITY_POOL_ABI,
            functionName: "deposit",
            args: [amt, address, 0n],
          });
          await publicClient.waitForTransactionReceipt({ hash: depositHash as `0x${string}` });
        }
      }

      updateProgressStep("compound", { status: "completed" });
    },
    [
      address,
      publicClient,
      anchorMarkets,
      writeContractAsync,
      updateProgressStep,
      setCurrentStep,
      setTransactionProgress,
      ensureAllowance,
      readErc20Balance,
      getSelectedPoolsByMarket,
      getPoolRewardTokens,
    ]
  );

  const handleCompoundAllToSingleToken = useCallback(
    async (
      selectedPools: Array<{ marketId: string; poolType: "collateral" | "sail" }>,
      targetMarketId: string,
      allocations: Array<{ poolAddress: `0x${string}`; percentage: number }>,
      preflightPlan?: NonNullable<typeof advancedPreflight>["plan"]
    ) => {
      if (!address || !publicClient) throw new Error("Wallet not connected");

      const targetMarket = anchorMarkets.find(([id]) => id === targetMarketId)?.[1];
      if (!targetMarket) throw new Error("Target market not found");

      const targetPegged = targetMarket.addresses?.peggedToken as `0x${string}` | undefined;
      const targetCollateralPool = targetMarket.addresses?.stabilityPoolCollateral as `0x${string}` | undefined;
      const targetSailPool = targetMarket.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined;

      if (!targetPegged) {
        throw new Error("Missing target market addresses");
      }

      const selectedByMarket = getSelectedPoolsByMarket(selectedPools);
      const marketsToProcess = Array.from(selectedByMarket.keys());
      if (marketsToProcess.length === 0) return;

      // Snapshot balances so we only act on newly-claimed rewards.
      // NOTE: pegged tokens can be shared across multiple markets, so we snapshot per-token-address to avoid double counting.
      const initialPeggedByToken = new Map<`0x${string}`, bigint>();
      const initialLeveragedByMarket = new Map<string, bigint>();
      const initialWrappedByToken = new Map<`0x${string}`, bigint>();

      for (const marketId of marketsToProcess) {
        const m = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!m) continue;
        const peggedTokenAddress = m.addresses?.peggedToken as `0x${string}` | undefined;
        const leveragedTokenAddress = m.addresses?.leveragedToken as `0x${string}` | undefined;
        const wrappedCollateralToken = m.addresses?.wrappedCollateralToken as `0x${string}` | undefined;

        if (peggedTokenAddress && !initialPeggedByToken.has(peggedTokenAddress)) {
          initialPeggedByToken.set(peggedTokenAddress, await readErc20Balance(peggedTokenAddress));
        }
        if (leveragedTokenAddress) {
          initialLeveragedByMarket.set(marketId, await readErc20Balance(leveragedTokenAddress));
        }
        if (wrappedCollateralToken && !initialWrappedByToken.has(wrappedCollateralToken)) {
          initialWrappedByToken.set(wrappedCollateralToken, await readErc20Balance(wrappedCollateralToken));
        }
      }

      const claimSteps: TransactionStep[] = [];
      for (const marketId of marketsToProcess) {
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          claimSteps.push({
            id: `claim-${marketId}-${poolType}`,
            label: `Claim rewards from ${marketId} ${poolType} pool`,
            status: "pending",
          });
        }
      }

      // If we have a preflight plan (computed before continuing), show the full set of steps up front.
      // This prevents the progress modal from only showing claim steps during the initial phase.
      const preActionSteps: TransactionStep[] = preflightPlan
        ? [
            ...preflightPlan.redeemLeveraged.map((p) => ({
              id: `redeem-hs-${p.marketId}`,
              label: `Redeem leveraged rewards (${p.marketId})`,
              status: "pending" as const,
              details: "Redeem leveraged rewards → wrapped collateral",
            })),
            ...preflightPlan.redeemPegged.map((p) => {
              const tokenSymbol =
                anchorMarkets.find(([_, m]) => {
                  const addr = (m as any)?.addresses?.peggedToken as `0x${string}` | undefined;
                  return addr && addr.toLowerCase() === p.peggedToken.toLowerCase();
                })?.[1]?.peggedToken?.symbol || "ha";
              return {
                id: `redeem-ha-${p.peggedToken.slice(2, 8)}`,
                label: `Redeem ${tokenSymbol} → collateral`,
                status: "pending" as const,
                details: "Redeem non-target Anchor tokens → wrapped collateral",
              };
            }),
            ...preflightPlan.mint.map((p) => ({
              id: `mint-${p.wrappedToken.slice(2, 8)}`,
              label: `Mint ${(targetMarket.peggedToken?.symbol || "ha")} from collateral`,
              status: "pending" as const,
              details: "Mint target Anchor token from wrapped collateral",
            })),
            ...allocations
              .filter((a) => a.percentage > 0)
              .map((a) => ({
                id: `deposit-${a.poolAddress.toLowerCase()}`,
                label: "Deposit to selected pool",
                status: "pending" as const,
                details: `${a.percentage}% allocation`,
              })),
          ]
        : [];

      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps: [...claimSteps, ...preActionSteps],
        currentStepIndex: 0,
      });

      // Step 1: claim from each selected pool
      let stepIndex = 0;
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const poolTypes = selectedByMarket.get(marketId) ?? [];
        for (const poolType of poolTypes) {
          const stepId = `claim-${marketId}-${poolType}`;
          setCurrentStep(stepIndex);
          updateProgressStep(stepId, { status: "in_progress" });

          const poolAddress =
            poolType === "collateral"
              ? (market.addresses?.stabilityPoolCollateral as `0x${string}` | undefined)
              : (market.addresses?.stabilityPoolLeveraged as `0x${string}` | undefined);
          if (!poolAddress) {
            updateProgressStep(stepId, { status: "error", error: "Pool address not found" });
            stepIndex++;
            continue;
          }

          const hash = await writeContractAsync({
            address: poolAddress,
            abi: rewardsABI,
            functionName: "claim",
          });
          updateProgressStep(stepId, { status: "in_progress", txHash: hash as string });
          await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
          updateProgressStep(stepId, { status: "completed", txHash: hash as string });
          stepIndex++;
        }
      }

      const initialTargetPegged = await readErc20Balance(targetPegged);

      // 2a) Redeem leveraged tokens (must use the market minter)
      type RedeemLeveragedPlan = {
        id: string;
        marketId: string;
        minter: `0x${string}`;
        leveragedToken: `0x${string}`;
        amount: bigint;
        fee: bigint;
        expectedOut: bigint;
        minOut: bigint;
      };
      const leveragedPlans: RedeemLeveragedPlan[] = [];
      for (const marketId of marketsToProcess) {
        const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
        if (!market) continue;
        const minterAddress = market.addresses?.minter as `0x${string}` | undefined;
        const leveragedTokenAddress = market.addresses?.leveragedToken as `0x${string}` | undefined;
        if (!minterAddress || !leveragedTokenAddress) continue;

        const initialLeveraged = initialLeveragedByMarket.get(marketId) ?? 0n;
        const leveragedAfterClaim = await readErc20Balance(leveragedTokenAddress);
        const claimedLeveraged =
          leveragedAfterClaim > initialLeveraged ? leveragedAfterClaim - initialLeveraged : 0n;
        if (claimedLeveraged <= 0n) continue;

        // No post-claim dry-run: use the preflight ratios if available.
        let fee = 0n;
        let expectedOut = 0n;
        if (preflightPlan) {
          const pre = preflightPlan.redeemLeveraged?.find((x) => x.marketId === marketId);
          expectedOut =
            pre && pre.amount > 0n ? (pre.expectedOut * claimedLeveraged) / pre.amount : 0n;
        } else {
          try {
            const dry = (await publicClient.readContract({
              address: minterAddress,
              abi: minterABI,
              functionName: "redeemLeveragedTokenDryRun",
              args: [claimedLeveraged],
            })) as [bigint, bigint, bigint, bigint, bigint, bigint];
            if (dry && Array.isArray(dry) && dry.length >= 4) {
              fee = dry[1] as bigint; // wrappedFee
              const returned = dry[3] as bigint;
              expectedOut = returned;
            }
          } catch {}
        }
        const minOut = expectedOut > 0n ? (expectedOut * 99n) / 100n : 0n;

        leveragedPlans.push({
          id: `redeem-hs-${marketId}`,
          marketId,
          minter: minterAddress,
          leveragedToken: leveragedTokenAddress,
          amount: claimedLeveraged,
          fee,
          expectedOut,
          minOut,
        });
      }

      // 2b) Redeem non-target pegged tokens using the best market by dry-run (max collateral returned)
      const claimedPeggedByToken = new Map<`0x${string}`, bigint>();
      for (const [token, initial] of initialPeggedByToken.entries()) {
        const after = await readErc20Balance(token);
        const delta = after > initial ? after - initial : 0n;
        if (delta > 0n) claimedPeggedByToken.set(token, delta);
      }

      type RedeemPeggedPlan = {
        id: string;
        peggedToken: `0x${string}`;
        amount: bigint;
        chosenMarketId: string;
        minter: `0x${string}`;
        wrappedCollateralToken: `0x${string}`;
        fee: bigint;
        feePct?: number;
        expectedOut: bigint;
        minOut: bigint;
        tokenSymbol: string;
      };
      const peggedPlans: RedeemPeggedPlan[] = [];

      const formatToken = (amount: bigint): string => {
        const num = Number(amount) / 1e18;
        if (!Number.isFinite(num) || num === 0) return "0";
        if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
        return num.toLocaleString(undefined, { maximumFractionDigits: 8, useGrouping: false }).replace(/\.?0+$/, "");
      };

      for (const [peggedTokenAddr, amount] of claimedPeggedByToken.entries()) {
        if (peggedTokenAddr.toLowerCase() === targetPegged.toLowerCase()) continue; // keep target token

        let chosenMinter: `0x${string}` | undefined;
        let chosenWrapped: `0x${string}` | undefined;
        let chosenMarketId: string | undefined;
        let expectedOut = 0n;
        let fee = 0n;
        let feePct: number | undefined;

        if (preflightPlan) {
          const pre = preflightPlan.redeemPegged?.find(
            (x) => x.peggedToken.toLowerCase() === peggedTokenAddr.toLowerCase()
          );
          if (!pre) throw new Error("Missing preflight plan for pegged redemption");
          chosenMinter = pre.minter;
          chosenWrapped = pre.wrappedCollateralToken;
          expectedOut = pre.amount > 0n ? (pre.expectedOut * amount) / pre.amount : 0n;
          chosenMarketId =
            anchorMarkets.find(
              ([id, m]) =>
                ((m as any).addresses?.minter as `0x${string}` | undefined)?.toLowerCase() ===
                chosenMinter!.toLowerCase()
            )?.[0] || "preflight";
        } else {
          // Candidate minters for this pegged token
          const candidates = anchorMarkets
            .map(([id, m]) => ({ id, market: m }))
            .filter(({ market }) => {
              const p = (market as any).addresses?.peggedToken as `0x${string}` | undefined;
              const minter = (market as any).addresses?.minter as `0x${string}` | undefined;
              return !!p && !!minter && p.toLowerCase() === peggedTokenAddr.toLowerCase();
            });

          if (candidates.length === 0) {
            throw new Error("No redeem market found for a claimed pegged token");
          }

          let best: {
            marketId: string;
            minter: `0x${string}`;
            wrappedCollateralToken: `0x${string}`;
            collateralOut: bigint;
            fee: bigint;
            feePct?: number;
          } | null = null;

          for (const c of candidates) {
            const minter = (c.market as any).addresses?.minter as `0x${string}` | undefined;
            const wrapped = (c.market as any).addresses?.wrappedCollateralToken as
              | `0x${string}`
              | undefined;
            if (!minter || !wrapped) continue;
            try {
              const dry = (await publicClient.readContract({
                address: minter,
                abi: minterABI,
                functionName: "redeemPeggedTokenDryRun",
                args: [amount],
              })) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
              const fee = dry && Array.isArray(dry) && dry.length >= 2 ? (dry[1] as bigint) : 0n;
              const returned =
                dry && Array.isArray(dry) && dry.length >= 5 ? (dry[4] as bigint) : 0n;
              const denom = fee + returned;
              const feePct = denom > 0n ? (Number(fee) / Number(denom)) * 100 : undefined;

              // Choose the lowest fee percent; tie-break on best net out.
              if (
                !best ||
                (feePct !== undefined &&
                  best.feePct !== undefined &&
                  feePct < best.feePct - 1e-9) ||
                (feePct !== undefined && best.feePct === undefined) ||
                (feePct === best.feePct && returned > best.collateralOut)
              ) {
                best = {
                  marketId: c.id,
                  minter,
                  wrappedCollateralToken: wrapped,
                  collateralOut: returned,
                  fee,
                  feePct,
                };
              }
            } catch {
              // ignore failed dry run candidates
            }
          }

          if (!best) {
            throw new Error("Failed to dry-run redeem on all candidate markets");
          }

          chosenMinter = best.minter;
          chosenWrapped = best.wrappedCollateralToken;
          chosenMarketId = best.marketId;
          expectedOut = best.collateralOut;
          fee = best.fee;
          feePct = best.feePct;
        }

        const minOut = expectedOut > 0n ? (expectedOut * 99n) / 100n : 0n;
        const tokenSymbol =
          anchorMarkets.find(([_, m]) => {
            const p = (m as any).addresses?.peggedToken as `0x${string}` | undefined;
            return p && p.toLowerCase() === peggedTokenAddr.toLowerCase();
          })?.[1]?.peggedToken?.symbol || "ha";

        peggedPlans.push({
          id: `redeem-ha-${peggedTokenAddr.slice(2, 8)}`,
          peggedToken: peggedTokenAddr,
          amount,
          chosenMarketId: chosenMarketId || "preflight",
          minter: chosenMinter!,
          wrappedCollateralToken: chosenWrapped!,
          fee,
          feePct,
          expectedOut,
          minOut,
          tokenSymbol,
        });

        // Track this wrapped collateral token for minting deltas later
        if (chosenWrapped && !initialWrappedByToken.has(chosenWrapped)) {
          initialWrappedByToken.set(
            chosenWrapped,
            await readErc20Balance(chosenWrapped)
          );
        }
      }

      // Determine all wrapped collateral token deltas (claims + redemptions)
      const wrappedDeltas: Array<{ token: `0x${string}`; amount: bigint }> = [];
      for (const [token, initial] of initialWrappedByToken.entries()) {
        const after = await readErc20Balance(token);
        const delta = after > initial ? after - initial : 0n;
        if (delta > 0n) wrappedDeltas.push({ token, amount: delta });
      }

      // Candidate mint markets for the target token (may include multiple collaterals)
      const targetMintMarkets = anchorMarkets
        .map(([id, m]) => ({ id, market: m }))
        .filter(({ market }) => {
          const p = (market as any).addresses?.peggedToken as `0x${string}` | undefined;
          const minter = (market as any).addresses?.minter as `0x${string}` | undefined;
          const wrapped = (market as any).addresses?.wrappedCollateralToken as `0x${string}` | undefined;
          return !!p && !!minter && !!wrapped && p.toLowerCase() === targetPegged.toLowerCase();
        });

      type MintPlan = {
        id: string;
        wrappedToken: `0x${string}`;
        amount: bigint;
        chosenMarketId: string;
        minter: `0x${string}`;
        fee: bigint;
        feePct?: number;
        expectedMint: bigint;
        minPeggedOut: bigint;
      };
      const mintPlans: MintPlan[] = [];

      for (const { token: wrappedToken, amount } of wrappedDeltas) {
        let chosenMinter: `0x${string}` | undefined;
        let expectedMint = 0n;
        let fee = 0n;
        let feePct: number | undefined;

        if (preflightPlan) {
          const pre = preflightPlan.mint?.find(
            (x) => x.wrappedToken.toLowerCase() === wrappedToken.toLowerCase()
          );
          if (!pre) throw new Error("Missing preflight plan for mint");
          chosenMinter = pre.minter;
          expectedMint = pre.amount > 0n ? (pre.expectedMint * amount) / pre.amount : 0n;
        } else {
          // Find candidate minters that accept this wrapped collateral for the target token
          const candidates = targetMintMarkets
            .map(({ market }) => ({
              minter: (market as any).addresses?.minter as `0x${string}` | undefined,
              wrapped: (market as any).addresses?.wrappedCollateralToken as `0x${string}` | undefined,
              marketId: (market as any).id as string | undefined,
            }))
            .filter((x) => !!x.minter && !!x.wrapped && x.wrapped.toLowerCase() === wrappedToken.toLowerCase()) as Array<{minter:`0x${string}`; wrapped:`0x${string}`}>;

          if (candidates.length === 0) {
            throw new Error("No mint market found for one of the collateral types produced by redemption");
          }

          let best: { minter: `0x${string}`; peggedOut: bigint; fee: bigint; feePct?: number } | null = null;
          for (const c of candidates) {
            try {
              const dry = (await publicClient.readContract({
                address: c.minter,
                abi: minterABI,
                functionName: "mintPeggedTokenDryRun",
                args: [amount],
              })) as [bigint, bigint, bigint, bigint, bigint, bigint] | undefined;
              const fee = dry && Array.isArray(dry) && dry.length >= 2 ? (dry[1] as bigint) : 0n;
              const taken = dry && Array.isArray(dry) && dry.length >= 3 ? (dry[2] as bigint) : 0n;
              const minted = dry && Array.isArray(dry) && dry.length >= 4 ? (dry[3] as bigint) : 0n;
              const feePct = taken > 0n ? (Number(fee) / Number(taken)) * 100 : undefined;

              if (
                !best ||
                (feePct !== undefined &&
                  best.feePct !== undefined &&
                  feePct < best.feePct - 1e-9) ||
                (feePct !== undefined && best.feePct === undefined) ||
                (feePct === best.feePct && minted > best.peggedOut)
              ) {
                best = { minter: c.minter, peggedOut: minted, fee, feePct };
              }
            } catch {
              // ignore failed candidates
            }
          }

          if (!best) throw new Error("Failed to dry-run mint on all candidate markets");
          chosenMinter = best.minter;
          expectedMint = best.peggedOut;
          fee = best.fee;
          feePct = best.feePct;
        }

        const minPeggedOut = expectedMint > 0n ? (expectedMint * 99n) / 100n : 0n;
        mintPlans.push({
          id: `mint-${wrappedToken.slice(2, 8)}`,
          wrappedToken,
          amount,
          chosenMarketId: targetMarketId,
          minter: chosenMinter!,
          fee,
          feePct,
          expectedMint,
          minPeggedOut,
        });
      }

      // Deposit steps can be expanded to show per-pool approvals/deposits; for now show per-pool deposit steps
      const depositSteps: TransactionStep[] = allocations
        .filter((a) => a.percentage > 0)
        .map((a) => ({
          id: `deposit-${a.poolAddress.toLowerCase()}`,
          label: "Deposit to selected pool",
          status: "pending" as const,
          details: `${a.percentage}% allocation`,
        }));

      // Replace the steps list with explicit action steps including fees
      const actionSteps: TransactionStep[] = [
        ...leveragedPlans.map((p) => ({
          id: p.id,
          label: `Redeem leveraged rewards (${p.marketId})`,
          status: "pending" as const,
          details: `Redeem ${formatToken(p.amount)} hs → wrapped collateral`,
          fee:
            p.fee > 0n
              ? {
                  amount: p.fee,
                  formatted: formatToken(p.fee),
                  percentage:
                    p.fee + p.expectedOut > 0n
                      ? (Number(p.fee) / Number(p.fee + p.expectedOut)) * 100
                      : undefined,
                  tokenSymbol: targetMarket?.collateral?.symbol || "collateral",
                }
              : undefined,
        })),
        ...peggedPlans.map((p) => ({
          id: p.id,
          label: `Redeem ${p.tokenSymbol} → collateral`,
          status: "pending" as const,
          details: `Using ${p.chosenMarketId}: redeem ${formatToken(p.amount)} ${p.tokenSymbol} → ${formatToken(p.expectedOut)} wrapped collateral`,
          fee:
            p.fee > 0n
              ? {
                  amount: p.fee,
                  formatted: formatToken(p.fee),
                  percentage: p.feePct,
                  tokenSymbol: targetMarket?.collateral?.symbol || "collateral",
                }
              : undefined,
        })),
        ...mintPlans.map((p) => ({
          id: p.id,
          label: `Mint ${(targetMarket.peggedToken?.symbol || "ha")} from collateral`,
          status: "pending" as const,
          details: `Mint ${formatToken(p.expectedMint)} ${(targetMarket.peggedToken?.symbol || "ha")} from ${formatToken(p.amount)} wrapped collateral`,
          fee:
            p.fee > 0n
              ? {
                  amount: p.fee,
                  formatted: formatToken(p.fee),
                  percentage: p.feePct,
                  tokenSymbol: targetMarket?.collateral?.symbol || "collateral",
                }
              : undefined,
        })),
        ...depositSteps,
      ];

      setTransactionProgress({
        isOpen: true,
        title: "Compounding Rewards",
        steps: [
          ...claimSteps.map((s) => ({ ...s, status: "completed" as const })),
          ...actionSteps,
        ],
        currentStepIndex: claimSteps.length,
      });

      // Execute leveraged redeems
      for (const p of leveragedPlans) {
        setCurrentStep(claimSteps.length + actionSteps.findIndex((s) => s.id === p.id));
        updateProgressStep(p.id, { status: "in_progress" });
        await ensureAllowance(p.leveragedToken, p.minter, p.amount);
        const hash = await writeContractAsync({
          address: p.minter,
          abi: minterABI,
          functionName: "redeemLeveragedToken",
          args: [p.amount, address, p.minOut],
        });
        updateProgressStep(p.id, { status: "in_progress", txHash: hash as string });
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        updateProgressStep(p.id, { status: "completed", txHash: hash as string });
      }

      // Execute pegged redeems
      for (const p of peggedPlans) {
        setCurrentStep(claimSteps.length + actionSteps.findIndex((s) => s.id === p.id));
        updateProgressStep(p.id, { status: "in_progress" });
        await ensureAllowance(p.peggedToken, p.minter, p.amount);
        const hash = await writeContractAsync({
          address: p.minter,
          abi: minterABI,
          functionName: "redeemPeggedToken",
          args: [p.amount, address, p.minOut],
        });
        updateProgressStep(p.id, { status: "in_progress", txHash: hash as string });
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        updateProgressStep(p.id, { status: "completed", txHash: hash as string });
      }

      // Execute mints
      for (const p of mintPlans) {
        setCurrentStep(claimSteps.length + actionSteps.findIndex((s) => s.id === p.id));
        updateProgressStep(p.id, { status: "in_progress" });
        await ensureAllowance(p.wrappedToken, p.minter, p.amount);
        const hash = await writeContractAsync({
          address: p.minter,
          abi: minterABI,
          functionName: "mintPeggedToken",
          args: [p.amount, address, p.minPeggedOut],
        });
        updateProgressStep(p.id, { status: "in_progress", txHash: hash as string });
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
        updateProgressStep(p.id, { status: "completed", txHash: hash as string });
      }

      // Step 4: deposit target pegged into selected pools (by address)
      // Recompute how much target pegged we actually ended up with and deposit according to allocation.
      const targetPeggedAfterMint = await readErc20Balance(targetPegged);
      const totalPeggedToDeposit =
        targetPeggedAfterMint > initialTargetPegged
          ? targetPeggedAfterMint - initialTargetPegged
          : 0n;
      if (totalPeggedToDeposit > 0n) {
        // Only deposit into pools that match the chosen target token (same pegged token address).
        // We assume the modal only lists valid pools, but still normalize percentages defensively.
        const active = allocations.filter((a) => a.percentage > 0);
        const sum = active.reduce((s, a) => s + a.percentage, 0);
        if (sum === 0) return;

        for (const a of active) {
          const poolAddress = a.poolAddress as `0x${string}`;
          const stepId = `deposit-${poolAddress.toLowerCase()}`;
          const pct = (a.percentage * 100) / sum;
          const amt = (totalPeggedToDeposit * BigInt(Math.round(pct))) / 100n;
          if (amt <= 0n) continue;
          try {
            // Show progress for the specific deposit row (approval + deposit happen here).
            const idx = actionSteps.findIndex((s) => s.id === stepId);
            if (idx >= 0) setCurrentStep(claimSteps.length + idx);
            updateProgressStep(stepId, {
              status: "in_progress",
              details: `${a.percentage}% allocation (approving & depositing…)`,
            });

            await ensureAllowance(targetPegged, poolAddress, amt);
            updateProgressStep(stepId, {
              status: "in_progress",
              details: `${a.percentage}% allocation (depositing…)`,
            });

            const depositHash = await writeContractAsync({
              address: poolAddress,
              abi: STABILITY_POOL_ABI,
              functionName: "deposit",
              args: [amt, address, 0n],
            });
            await publicClient.waitForTransactionReceipt({ hash: depositHash as `0x${string}` });

            updateProgressStep(stepId, {
              status: "completed",
              txHash: depositHash as string,
              details: `${a.percentage}% allocation (${formatToken(amt)} deposited)`,
            });
          } catch (e: any) {
            updateProgressStep(stepId, {
              status: "error",
              error: e?.message || "Deposit failed",
            });
            throw e;
          }
        }
      }
    },
    [
      address,
      publicClient,
      anchorMarkets,
      writeContractAsync,
      updateProgressStep,
      setCurrentStep,
      setTransactionProgress,
      ensureAllowance,
      readErc20Balance,
      getSelectedPoolsByMarket,
      getPoolRewardTokens,
    ]
  );

  // Individual market claim handlers
  const handleClaimMarketBasicClaim = async () => {
    if (!address || !selectedMarketForClaim || isClaiming) return;
    const market = anchorMarkets.find(
      ([id]) => id === selectedMarketForClaim
    )?.[1];
    if (!market) return;

    try {
      setIsClaiming(true);
      if ((market as any).addresses?.stabilityPoolCollateral) {
        await handleClaimRewards(market, "collateral");
      }
      if ((market as any).addresses?.stabilityPoolLeveraged) {
        await handleClaimRewards(market, "sail");
      }
      // Wait for blockchain state to update
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // Refetch all contract data
      await Promise.all([refetchReads(), refetchUserDeposits()]);
    } catch (e) {
      // Failed to claim market rewards
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimMarketCompound = async () => {
    if (!address || !selectedMarketForClaim || isCompounding) return;
    const market = anchorMarkets.find(
      ([id]) => id === selectedMarketForClaim
    )?.[1];
    if (!market) return;

    try {
      setIsCompounding(true);
      // Collect rewards for this market
      const marketRewards: Array<{
        poolType: "collateral" | "sail";
        rewardAmount: bigint;
      }> = [];

      if ((market as any).addresses?.stabilityPoolCollateral) {
        const rewards = await publicClient.readContract({
          address: (market as any).addresses.stabilityPoolCollateral,
          abi: rewardsABI,
          functionName: "getClaimableRewards",
          args: [address],
        });
        if (rewards && rewards > 0n) {
          marketRewards.push({ poolType: "collateral", rewardAmount: rewards });
        }
      }

      if ((market as any).addresses?.stabilityPoolLeveraged) {
        const rewards = await publicClient.readContract({
          address: (market as any).addresses.stabilityPoolLeveraged,
          abi: rewardsABI,
          functionName: "getClaimableRewards",
          args: [address],
        });
        if (rewards && rewards > 0n) {
          marketRewards.push({ poolType: "sail", rewardAmount: rewards });
        }
      }

      if (marketRewards.length === 0) return;

      // Claim and compound rewards (similar to handleCompoundAll but for single market)
      // This is a simplified version - you may want to reuse the compound logic
      for (const { poolType, rewardAmount } of marketRewards) {
        if (poolType === "collateral") {
          await handleClaimRewards(market, "collateral");
          // Then mint and deposit (simplified - you may want to add a compound modal)
        } else {
          await handleClaimRewards(market, "sail");
          // Then redeem sail, mint pegged, and deposit (simplified)
        }
      }
    } catch (e) {
      // Failed to compound market rewards
    } finally {
      setIsCompounding(false);
    }
  };

  const handleClaimMarketBuyTide = async () => {
    // TODO: Implement Buy $TIDE functionality for individual market
    await handleClaimMarketBasicClaim();
  };

  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <>
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pb-6">
          {/* Header */}
          <div className="mb-2">
            {/* Title - Full Row */}
            <div className="p-4 flex items-center justify-center mb-0">
              <h1 className="font-bold font-mono text-white text-5xl sm:text-6xl md:text-7xl text-center">
                Anchor
              </h1>
            </div>

            {/* Subheader */}
            <div className="flex items-center justify-center mb-2 -mt-6">
              <p className="text-white/80 text-lg text-center">
                Pegged tokens with real yield
              </p>
            </div>

            {/* Four Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Mint Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <BanknotesIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Mint
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Mint a pegged token with a supported asset
                </p>
              </div>

              {/* Secure Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ShieldCheckIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Secure
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Deposit into a stability pool to secure the protocol
                </p>
              </div>

              {/* Earn Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <CurrencyDollarIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Earn
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Earn real yield from collateral and trading fees for helping
                  secure the protocol
                </p>
              </div>

              {/* Redeem Box */}
              <div className="bg-[#17395F] p-4">
                <div className="flex items-center justify-center mb-2">
                  <ArrowPathIcon className="w-6 h-6 text-white mr-2" />
                  <h2 className="font-bold text-white text-lg text-center">
                    Redeem
                  </h2>
                </div>
                <p className="text-sm text-white/80 text-center">
                  Redeem for collateral at any time
                </p>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mb-2 overflow-hidden border border-white/15 bg-black/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <div className="h-0.5 bg-gradient-to-r from-[#9ED5BE] via-[#FF8A7A] to-[#1E4775] opacity-80" />
            <div className="p-2.5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-[11px] text-white/70 uppercase tracking-widest font-semibold">
                  Protocol Stats
                </div>
                <div className="text-[10px] text-white/50 font-mono">
                  terminal view
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 border border-white/10 overflow-hidden">
                <div className="flex flex-col items-center justify-center text-center px-3 py-2 border-b border-white/10 lg:border-b-0 lg:border-r border-white/10">
                  <div className="text-lg font-semibold text-white font-mono">
                    {formatCompactUSD(anchorStats.yieldGeneratingTVLUSD)}
                  </div>
                  <div className="text-[11px] text-white/60 uppercase tracking-widest mt-0.5">
                    Yield Generating TVL
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center px-3 py-2 border-b border-white/10 lg:border-b-0 lg:border-r border-white/10">
                  <div className="text-lg font-semibold text-white font-mono">
                    {formatCompactUSD(anchorStats.stabilityPoolTVLUSD)}
                  </div>
                  <div className="text-[11px] text-white/60 uppercase tracking-widest mt-0.5">
                    Stability Pool TVL
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center px-3 py-2 border-r border-white/10">
                  <div className="text-lg font-semibold text-white font-mono">
                    {anchorStats.yieldConcentration > 0
                      ? `${anchorStats.yieldConcentration.toFixed(2)}x`
                      : "-"}
                  </div>
                  <div className="text-[11px] text-white/60 uppercase tracking-widest mt-0.5">
                    Avg Yield Concentration
                  </div>
                  <div className="text-[10px] text-white/45 font-mono mt-0.5">
                    Yield / Pool
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center text-center px-3 py-2">
                  <div className="text-lg font-semibold text-white font-mono">
                    {anchorStats.bestApr > 0
                      ? `${anchorStats.bestApr.toFixed(2)}%`
                      : "-"}
                  </div>
                  <div className="text-[11px] text-white/60 uppercase tracking-widest mt-0.5">
                    Highest APR Pool
                  </div>
                  <div className="text-[10px] text-white/45 font-mono mt-0.5 truncate">
                    {anchorStats.bestAprLabel || ""}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Subgraph Error Banner */}
          {ledgerMarksError && (
            <div className="bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 rounded p-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-[#FF8A7A] text-xl mt-0.5">⚠️</div>
                <div className="flex-1">
                  <p className="text-[#FF8A7A] font-semibold text-sm mb-1">
                    Harbor Marks Subgraph Error
                  </p>
                  <p className="text-white/70 text-xs">
                    {ledgerMarksError instanceof Error
                      ? ledgerMarksError.message
                      : "Unable to load Harbor Marks data. This may be due to rate limiting or service issues. Your positions and core functionality remain unaffected."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rewards Bar - Under Title Boxes */}
          {(() => {
            // Calculate total rewards for the bar
            let totalRewardsForBar = 0;
            let totalPositionForBar = 0;
            // For blended APR calculation
            let totalWeightedAPR = 0; // Sum of (depositUSD * APR)
            let totalDepositUSD = 0; // Sum of depositUSD
            // Total stability pool deposits (USD). Excludes wallet balances.
            let totalStabilityPoolDepositsUSD = 0;
            // Track individual positions for tooltip
            const positionAPRs: Array<{
              poolType: "collateral" | "sail";
              marketId: string;
              depositUSD: number;
              apr: number;
            }> = [];

            if (reads) {
              anchorMarkets.forEach(([id, m], mi) => {
                const hasCollateralPool = !!(m as any).addresses
                  ?.stabilityPoolCollateral;
                const hasSailPool = !!(m as any).addresses
                  ?.stabilityPoolLeveraged;

                let offset = 0;
                for (let i = 0; i < mi; i++) {
                  const prevMarket = anchorMarkets[i][1];
                  const prevHasCollateral = !!(prevMarket as any).addresses
                    ?.stabilityPoolCollateral;
                  const prevHasSail = !!(prevMarket as any).addresses
                    ?.stabilityPoolLeveraged;
                  const prevHasPriceOracle = !!(prevMarket as any).addresses
                    ?.collateralPrice;
                  const prevHasStabilityPoolManager = !!(prevMarket as any)
                    .addresses?.stabilityPoolManager;
                  const prevPeggedTokenAddress = (prevMarket as any)?.addresses
                    ?.peggedToken;
                  offset += 5; // 4 minter calls + 1 config call
                  if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
                  if (prevHasCollateral) {
                    offset += 4; // 4 pool reads
                    if (prevPeggedTokenAddress) offset += 1; // rewardData
                  }
                  if (prevHasSail) {
                    offset += 4; // 4 pool reads
                    if (prevPeggedTokenAddress) offset += 1; // rewardData
                  }
                  if (prevHasPriceOracle) offset += 1;
                }

                const baseOffset = offset;
                const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
                  | bigint
                  | undefined;

                // Account for rebalanceThreshold if current market has stabilityPoolManager
                const hasStabilityPoolManager = !!(m as any).addresses
                  ?.stabilityPoolManager;
                const currentPeggedTokenAddress = (m as any).addresses
                  ?.peggedToken;
                let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
                if (hasStabilityPoolManager) currentOffset += 1; // rebalanceThreshold

                let collateralPoolRewards: bigint | undefined;
                let sailPoolRewards: bigint | undefined;
                let collateralPoolDeposit: bigint | undefined;
                let sailPoolDeposit: bigint | undefined;
                let collateralPoolAPR:
                  | { collateral: number; steam: number }
                  | undefined;
                let sailPoolAPR:
                  | { collateral: number; steam: number }
                  | undefined;

                if (hasCollateralPool) {
                  const collateralPoolTVL = reads?.[currentOffset]?.result as
                    | bigint
                    | undefined;
                  const collateralAPRResult = reads?.[currentOffset + 1]
                    ?.result as [bigint, bigint] | undefined;
                  collateralPoolAPR = collateralAPRResult
                    ? {
                        collateral:
                          (Number(collateralAPRResult[0]) / 1e16) * 100,
                        steam: (Number(collateralAPRResult[1]) / 1e16) * 100,
                      }
                    : undefined;
                  const collateralRewardsRead = reads?.[currentOffset + 2];
                  collateralPoolRewards =
                    collateralRewardsRead?.status === "success" &&
                    collateralRewardsRead.result !== undefined &&
                    collateralRewardsRead.result !== null
                      ? (collateralRewardsRead.result as bigint)
                      : undefined;

                  const collateralDepositRead = reads?.[currentOffset + 3];
                  if (
                    collateralDepositRead?.status === "success" &&
                    collateralDepositRead.result !== undefined &&
                    collateralDepositRead.result !== null
                  ) {
                    collateralPoolDeposit =
                      collateralDepositRead.result as bigint;
                  }

                  // Read reward data for APR fallback calculation
                  const collateralRewardDataRead = currentPeggedTokenAddress
                    ? reads?.[currentOffset + 4]
                    : undefined;
                  const collateralRewardData =
                    collateralRewardDataRead?.status === "success" &&
                    collateralRewardDataRead.result
                      ? (collateralRewardDataRead.result as [
                          bigint,
                          bigint,
                          bigint,
                          bigint
                        ]) // [lastUpdate, finishAt, rate, queued]
                      : undefined;

                  // Calculate APR from reward rate if contract APR is 0 or undefined
                  if (
                    collateralRewardData &&
                    collateralPoolTVL &&
                    collateralPoolTVL > 0n &&
                    peggedTokenPrice
                  ) {
                    const rewardRate = collateralRewardData[2]; // rate
                    if (rewardRate > 0n) {
                      const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                      const ratePerTokenPerSecond =
                        Number(rewardRate) / Number(collateralPoolTVL);
                      const annualRewards =
                        ratePerTokenPerSecond *
                        Number(collateralPoolTVL) *
                        SECONDS_PER_YEAR;

                      const rewardTokenPrice = Number(peggedTokenPrice) / 1e18; // pegged token price in USD
                      const depositTokenPrice = Number(peggedTokenPrice) / 1e18; // same for collateral pool
                      const annualRewardsValueUSD =
                        (annualRewards * rewardTokenPrice) / 1e18;
                      const depositValueUSD =
                        (Number(collateralPoolTVL) * depositTokenPrice) / 1e18;

                      if (depositValueUSD > 0) {
                        const calculatedAPR =
                          (annualRewardsValueUSD / depositValueUSD) * 100;

                        // Add to existing APR (don't replace, accumulate)
                        if (calculatedAPR > 0) {
                          if (!collateralPoolAPR) {
                            collateralPoolAPR = {
                              collateral: calculatedAPR,
                              steam: 0,
                            };
                          } else {
                            // Add to existing APR
                            collateralPoolAPR = {
                              collateral:
                                (collateralPoolAPR.collateral || 0) +
                                calculatedAPR,
                              steam: collateralPoolAPR.steam || 0,
                            };
                          }
                        }
                      }
                    }
                  }

                  // Add additional APR from all reward tokens (including wstETH, etc.)
                  const collateralPoolAddress = hasCollateralPool
                    ? ((m as any).addresses?.stabilityPoolCollateral as
                        | `0x${string}`
                        | undefined)
                    : undefined;
                  if (collateralPoolAddress) {
                    const poolReward = poolRewardsMap.get(
                      collateralPoolAddress
                    );
                    if (
                      poolReward?.totalRewardAPR &&
                      poolReward.totalRewardAPR > 0
                    ) {
                      // Add the APR from all reward tokens to the existing APR
                      // We need to subtract the pegged token APR we already added to avoid double-counting
                      const peggedTokenAPR =
                        collateralRewardData && collateralRewardData[2] > 0n
                          ? (() => {
                              const rewardRate = collateralRewardData[2];
                              const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                              const ratePerTokenPerSecond =
                                Number(rewardRate) / Number(collateralPoolTVL);
                              const annualRewards =
                                ratePerTokenPerSecond *
                                Number(collateralPoolTVL) *
                                SECONDS_PER_YEAR;
                              const rewardTokenPrice =
                                Number(peggedTokenPrice) / 1e18;
                              const depositTokenPrice =
                                Number(peggedTokenPrice) / 1e18;
                              const annualRewardsValueUSD =
                                (annualRewards * rewardTokenPrice) / 1e18;
                              const depositValueUSD =
                                (Number(collateralPoolTVL) *
                                  depositTokenPrice) /
                                1e18;
                              return depositValueUSD > 0
                                ? (annualRewardsValueUSD / depositValueUSD) *
                                    100
                                : 0;
                            })()
                          : 0;
                      const additionalAPR =
                        poolReward.totalRewardAPR - peggedTokenAPR;
                      if (additionalAPR > 0) {
                        if (!collateralPoolAPR) {
                          collateralPoolAPR = {
                            collateral: poolReward.totalRewardAPR,
                            steam: 0,
                          };
                        } else {
                          collateralPoolAPR = {
                            collateral:
                              (collateralPoolAPR.collateral || 0) +
                              additionalAPR,
                            steam: collateralPoolAPR.steam || 0,
                          };
                        }
                      } else if (
                        poolReward.totalRewardAPR > 0 &&
                        !collateralPoolAPR
                      ) {
                        // If we don't have pegged token APR but have other reward tokens
                        collateralPoolAPR = {
                          collateral: poolReward.totalRewardAPR,
                          steam: 0,
                        };
                      }
                    }
                  }

                  currentOffset += 4; // 4 pool reads
                  if (currentPeggedTokenAddress) currentOffset += 1; // rewardData
                }

                if (hasSailPool) {
                  const sailPoolTVL = reads?.[currentOffset]?.result as
                    | bigint
                    | undefined;
                  const sailAPRResult = reads?.[currentOffset + 1]?.result as
                    | [bigint, bigint]
                    | undefined;
                  sailPoolAPR = sailAPRResult
                    ? {
                        collateral: (Number(sailAPRResult[0]) / 1e16) * 100,
                        steam: (Number(sailAPRResult[1]) / 1e16) * 100,
                      }
                    : undefined;
                  const sailRewardsRead = reads?.[currentOffset + 2];
                  sailPoolRewards =
                    sailRewardsRead?.status === "success" &&
                    sailRewardsRead.result !== undefined &&
                    sailRewardsRead.result !== null
                      ? (sailRewardsRead.result as bigint)
                      : undefined;

                  const sailDepositRead = reads?.[currentOffset + 3];
                  if (
                    sailDepositRead?.status === "success" &&
                    sailDepositRead.result !== undefined &&
                    sailDepositRead.result !== null
                  ) {
                    sailPoolDeposit = sailDepositRead.result as bigint;
                  }

                  // Read reward data for APR fallback calculation
                  const sailRewardDataRead = currentPeggedTokenAddress
                    ? reads?.[currentOffset + 4]
                    : undefined;
                  const sailRewardData =
                    sailRewardDataRead?.status === "success" &&
                    sailRewardDataRead.result
                      ? (sailRewardDataRead.result as [
                          bigint,
                          bigint,
                          bigint,
                          bigint
                        ]) // [lastUpdate, finishAt, rate, queued]
                      : undefined;

                  // Calculate APR from reward rate if contract APR is 0 or undefined
                  if (
                    sailRewardData &&
                    sailPoolTVL &&
                    sailPoolTVL > 0n &&
                    peggedTokenPrice
                  ) {
                    const rewardRate = sailRewardData[2]; // rate
                    if (rewardRate > 0n) {
                      const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                      const ratePerTokenPerSecond =
                        Number(rewardRate) / Number(sailPoolTVL);
                      const annualRewards =
                        ratePerTokenPerSecond *
                        Number(sailPoolTVL) *
                        SECONDS_PER_YEAR;

                      const rewardTokenPrice = Number(peggedTokenPrice) / 1e18; // pegged token price in USD
                      const depositTokenPrice = Number(peggedTokenPrice) / 1e18; // same for sail pool
                      const annualRewardsValueUSD =
                        (annualRewards * rewardTokenPrice) / 1e18;
                      const depositValueUSD =
                        (Number(sailPoolTVL) * depositTokenPrice) / 1e18;

                      if (depositValueUSD > 0) {
                        const calculatedAPR =
                          (annualRewardsValueUSD / depositValueUSD) * 100;

                        // Add to existing APR (don't replace, accumulate)
                        if (calculatedAPR > 0) {
                          if (!sailPoolAPR) {
                            sailPoolAPR = {
                              collateral: calculatedAPR,
                              steam: 0,
                            };
                          } else {
                            // Add to existing APR
                            sailPoolAPR = {
                              collateral:
                                (sailPoolAPR.collateral || 0) + calculatedAPR,
                              steam: sailPoolAPR.steam || 0,
                            };
                          }
                        }
                      }
                    }
                  }

                  // Add additional APR from all reward tokens (including wstETH, etc.)
                  const sailPoolAddress = hasSailPool
                    ? ((m as any).addresses?.stabilityPoolLeveraged as
                        | `0x${string}`
                        | undefined)
                    : undefined;
                  if (sailPoolAddress) {
                    const poolReward = poolRewardsMap.get(sailPoolAddress);
                    if (
                      poolReward?.totalRewardAPR &&
                      poolReward.totalRewardAPR > 0
                    ) {
                      // Add the APR from all reward tokens to the existing APR
                      // We need to subtract the pegged token APR we already added to avoid double-counting
                      // Calculate pegged token APR if we have the data
                      let peggedTokenAPR = 0;
                      if (
                        sailRewardData &&
                        sailRewardData[2] > 0n &&
                        sailPoolTVL &&
                        sailPoolTVL > 0n &&
                        peggedTokenPrice
                      ) {
                        const rewardRate = sailRewardData[2];
                        const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
                        const ratePerTokenPerSecond =
                          Number(rewardRate) / Number(sailPoolTVL);
                        const annualRewards =
                          ratePerTokenPerSecond *
                          Number(sailPoolTVL) *
                          SECONDS_PER_YEAR;
                        const rewardTokenPrice =
                          Number(peggedTokenPrice) / 1e18;
                        const depositTokenPrice =
                          Number(peggedTokenPrice) / 1e18;
                        const annualRewardsValueUSD =
                          (annualRewards * rewardTokenPrice) / 1e18;
                        const depositValueUSD =
                          (Number(sailPoolTVL) * depositTokenPrice) / 1e18;
                        if (depositValueUSD > 0) {
                          peggedTokenAPR =
                            (annualRewardsValueUSD / depositValueUSD) * 100;
                        }
                      }
                      const additionalAPR =
                        poolReward.totalRewardAPR - peggedTokenAPR;
                      if (additionalAPR > 0) {
                        if (!sailPoolAPR) {
                          sailPoolAPR = {
                            collateral: poolReward.totalRewardAPR,
                            steam: 0,
                          };
                        } else {
                          sailPoolAPR = {
                            collateral:
                              (sailPoolAPR.collateral || 0) + additionalAPR,
                            steam: sailPoolAPR.steam || 0,
                          };
                        }
                      }
                    }
                  }

                  currentOffset += 4; // 4 pool reads
                  if (currentPeggedTokenAddress) currentOffset += 1; // rewardData
                }

                const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
                const collateralPriceDecimals = 18;
                let collateralPrice: bigint | undefined;
                if (hasPriceOracle) {
                  const latestAnswerResult = reads?.[currentOffset]?.result;
                  if (
                    latestAnswerResult !== undefined &&
                    latestAnswerResult !== null
                  ) {
                    if (Array.isArray(latestAnswerResult)) {
                      collateralPrice = latestAnswerResult[1] as bigint;
                    } else if (typeof latestAnswerResult === "object") {
                      const obj = latestAnswerResult as {
                        maxUnderlyingPrice?: bigint;
                      };
                      collateralPrice = obj.maxUnderlyingPrice;
                    } else if (typeof latestAnswerResult === "bigint") {
                      collateralPrice = latestAnswerResult;
                    }
                  }
                }

                // Get position data from hook (more accurate than contract reads)
                const positionData = marketPositions?.[id];
                const userDeposit = positionData?.walletHa || 0n;
                const collateralPoolDepositUSD =
                  positionData?.collateralPoolUSD || 0;
                const sailPoolDepositUSD = positionData?.sailPoolUSD || 0;

                // Total deposits should reflect *all* stability pool deposits (regardless of APR),
                // and should NOT include wallet balances.
                totalStabilityPoolDepositsUSD +=
                  (collateralPoolDepositUSD || 0) + (sailPoolDepositUSD || 0);

                // Calculate rewards USD from all reward tokens
                // Use the aggregated rewards from useAllStabilityPoolRewards
                if (hasCollateralPool) {
                  const collateralPoolAddress = (m as any).addresses
                    ?.stabilityPoolCollateral as `0x${string}`;
                  const poolReward = poolRewardsMap.get(collateralPoolAddress);
                  if (poolReward && poolReward.claimableValue > 0) {
                    totalRewardsForBar += poolReward.claimableValue;
                  }
                }
                if (hasSailPool) {
                  const sailPoolAddress = (m as any).addresses
                    ?.stabilityPoolLeveraged as `0x${string}`;
                  const poolReward = poolRewardsMap.get(sailPoolAddress);
                  if (poolReward && poolReward.claimableValue > 0) {
                    totalRewardsForBar += poolReward.claimableValue;
                  }
                }

                // Calculate blended APR using position data from hooks and APR from all reward tokens
                // Collateral Pool
                if (hasCollateralPool && collateralPoolDepositUSD > 0) {
                  const collateralPoolAddress = (m as any).addresses
                    ?.stabilityPoolCollateral as `0x${string}`;
                  const poolReward = poolRewardsMap.get(collateralPoolAddress);

                  // Use totalRewardAPR from useAllStabilityPoolRewards (includes all reward tokens)
                  const poolAPR = poolReward?.totalRewardAPR || 0;

                  if (poolAPR > 0) {
                    totalPositionForBar += collateralPoolDepositUSD;
                    totalWeightedAPR += collateralPoolDepositUSD * poolAPR;
                    totalDepositUSD += collateralPoolDepositUSD;
                    // Track for tooltip
                    positionAPRs.push({
                      poolType: "collateral",
                      marketId: id,
                      depositUSD: collateralPoolDepositUSD,
                      apr: poolAPR,
                    });
                  } else {
                    // Still count position even if no APR
                    totalPositionForBar += collateralPoolDepositUSD;
                  }
                }

                // Sail Pool
                if (hasSailPool && sailPoolDepositUSD > 0) {
                  const sailPoolAddress = (m as any).addresses
                    ?.stabilityPoolLeveraged as `0x${string}`;
                  const poolReward = poolRewardsMap.get(sailPoolAddress);

                  // Use totalRewardAPR from useAllStabilityPoolRewards (includes all reward tokens)
                  const poolAPR = poolReward?.totalRewardAPR || 0;

                  if (poolAPR > 0) {
                    totalPositionForBar += sailPoolDepositUSD;
                    totalWeightedAPR += sailPoolDepositUSD * poolAPR;
                    totalDepositUSD += sailPoolDepositUSD;
                    // Track for tooltip
                    positionAPRs.push({
                      poolType: "sail",
                      marketId: id,
                      depositUSD: sailPoolDepositUSD,
                      apr: poolAPR,
                    });
                  } else {
                    // Still count position even if no APR
                    totalPositionForBar += sailPoolDepositUSD;
                  }
                }

                // Wallet ha tokens (don't earn APR, but count towards total position)
                if (
                  userDeposit &&
                  userDeposit > 0n &&
                  positionData?.walletHaUSD
                ) {
                  totalPositionForBar += positionData.walletHaUSD;
                  // Note: ha tokens in wallet don't earn APR, so we don't add them to blended APR
                }
              });
            }

            const rewardsPercentage =
              totalPositionForBar > 0
                ? Math.min(
                    (totalRewardsForBar / totalPositionForBar) * 100,
                    100
                  )
                : 0;
            // Calculate blended APR from stability pool positions
            const blendedAPRForBar =
              totalDepositUSD > 0 ? totalWeightedAPR / totalDepositUSD : 0;

            return (
              <div className="mb-2 overflow-hidden border border-white/15 bg-black/30 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <div className="h-0.5 bg-gradient-to-r from-[#1E4775] via-[#FF8A7A] to-[#9ED5BE] opacity-80" />
                <div className="p-2.5">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {/* Rewards Header Box */}
                  <div className="bg-black/20 border border-white/10 p-2.5 flex items-center justify-center gap-2 md:col-span-1 lg:col-span-1">
                    <h2 className="font-bold font-mono text-white text-2xl text-center">
                      Rewards
                    </h2>
                    <InfoTooltip
                      label={
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-bold text-lg mb-2">
                              Anchor Ledger Marks
                            </h3>
                            <p className="text-white/90 leading-relaxed">
                              Anchor Ledger Marks are earned by holding ha
                              tokens (pegged tokens) and depositing into
                              stability pools.
                            </p>
                          </div>

                          <div className="border-t border-white/20 pt-3">
                            <p className="text-white/90 leading-relaxed mb-2">
                              Each mark represents your contribution to
                              stabilizing Harbor markets through token holdings
                              and pool deposits.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-white/70 mt-0.5">•</span>
                              <p className="text-white/90 leading-relaxed">
                                The more you contribute, the deeper your mark on
                                the ledger.
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-white/70 mt-0.5">•</span>
                              <p className="text-white/90 leading-relaxed">
                                When $TIDE surfaces, these marks will convert
                                into your share of rewards and governance power.
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-white/20 pt-3">
                            <p className="text-white/80 italic leading-relaxed">
                              Think of them as a record of your journey — every
                              mark, a line in Harbor's logbook.
                            </p>
                          </div>
                        </div>
                      }
                      side="right"
                    >
                      <QuestionMarkCircleIcon className="w-5 h-5 text-white cursor-help" />
                    </InfoTooltip>
                  </div>

                  {/* Combined Content Box */}
                  <div className="bg-black/20 border border-white/10 p-2.5 md:col-span-1 lg:col-span-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 overflow-hidden border border-white/10">
                      {/* Total Deposits */}
                      <div className="flex flex-col items-center justify-center px-3 py-2 border-b border-white/10 sm:border-b-0 sm:border-r border-white/10">
                        <div className="text-[11px] text-white/60 uppercase tracking-widest text-center">
                          Total Deposits
                        </div>
                        <div className="text-lg font-semibold text-white font-mono text-center mt-1">
                          {totalStabilityPoolDepositsUSD > 0
                            ? formatCompactUSD(totalStabilityPoolDepositsUSD)
                            : "$0.00"}
                        </div>
                      </div>

                      {/* Claimable Value */}
                      <div className="flex flex-col items-center justify-center px-3 py-2 border-b border-white/10 lg:border-b-0 lg:border-r border-white/10">
                        <div className="text-[11px] text-white/60 uppercase tracking-widest text-center">
                          Claimable Value
                        </div>
                        <div className="text-lg font-semibold text-white font-mono text-center mt-1">
                          $
                          {totalRewardsForBar > 0
                            ? totalRewardsForBar.toFixed(2)
                            : "0.00"}
                        </div>
                      </div>

                      {/* vAPR */}
                      <div className="flex flex-col items-center justify-center px-3 py-2 border-b border-white/10 sm:border-b-0 sm:border-r border-white/10">
                        <div className="text-[11px] text-white/60 uppercase tracking-widest text-center font-medium flex items-center justify-center gap-1">
                          vAPR
                          <SimpleTooltip
                            label={
                              <div className="text-left">
                                <div className="font-semibold mb-1">
                                  Blended APR from Your Positions
                                </div>
                                {positionAPRs.length > 0 ? (
                                  <div className="text-xs space-y-1">
                                    {positionAPRs.length > 10 ? (
                                      // If more than 10 positions, show summary
                                      <>
                                        <div>
                                          • Total positions: {positionAPRs.length}
                                        </div>
                                        {(() => {
                                          const collateralCount = positionAPRs.filter(
                                            (pos) => pos.poolType === "collateral"
                                          ).length;
                                          const sailCount = positionAPRs.filter(
                                            (pos) => pos.poolType === "sail"
                                          ).length;
                                          return (
                                            <>
                                              {collateralCount > 0 && (
                                                <div className="ml-2">
                                                  - Collateral: {collateralCount}
                                                </div>
                                              )}
                                              {sailCount > 0 && (
                                                <div className="ml-2">
                                                  - Sail: {sailCount}
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                        <div className="mt-2 pt-2 border-t border-white/20 font-semibold">
                                          Weighted Average: {" "}
                                          {blendedAPRForBar > 0
                                            ? `${blendedAPRForBar.toFixed(2)}%`
                                            : "-"}
                                        </div>
                                      </>
                                    ) : (
                                      // If 10 or fewer positions, show individual positions
                                      <>
                                        {positionAPRs.map((pos, idx) => (
                                          <div key={idx}>
                                            •{" "}
                                            {pos.poolType === "collateral"
                                              ? "Collateral"
                                              : "Sail"}
                                            {" "}
                                            Pool ({pos.marketId}): {" "}
                                            {pos.apr.toFixed(2)}% (
                                            {formatCompactUSD(pos.depositUSD)})
                                          </div>
                                        ))}
                                        <div className="mt-2 pt-2 border-t border-white/20 font-semibold">
                                          Weighted Average: {" "}
                                          {blendedAPRForBar > 0
                                            ? `${blendedAPRForBar.toFixed(2)}%`
                                            : "-"}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs">
                                    No stability pool positions found
                                  </div>
                                )}
                                {/** Hide projected APRs while live reward APRs are still loading */}
                                {!showLiveAprLoading &&
                                  !isErrorAllRewards &&
                                  projectedAPR.harvestableAmount !== null &&
                                  projectedAPR.harvestableAmount > 0n &&
                                  blendedAPRForBar <= 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90">
                                      Projected APR (next 7 days):{" "}
                                      {projectedAPR.collateralPoolAPR !==
                                        null &&
                                        `${projectedAPR.collateralPoolAPR.toFixed(
                                          2
                                        )}% (Collateral)`}
                                      {projectedAPR.collateralPoolAPR !==
                                        null &&
                                        projectedAPR.leveragedPoolAPR !==
                                          null &&
                                        " /"}
                                      {projectedAPR.leveragedPoolAPR !== null &&
                                        `${projectedAPR.leveragedPoolAPR.toFixed(
                                          2
                                        )}% (Sail)`}
                                      <br />
                                      Based on{" "}
                                      {(
                                        Number(projectedAPR.harvestableAmount) /
                                        1e18
                                      ).toFixed(4)}
                                      {" "}
                                      wstETH harvestable.
                                      {projectedAPR.remainingDays !== null &&
                                        ` ~${projectedAPR.remainingDays.toFixed(
                                          1
                                        )} days until harvest.`}
                                    </div>
                                  )}
                              </div>
                            }
                          >
                            <span className="text-white/50 cursor-help text-xs">
                              [?]
                            </span>
                          </SimpleTooltip>
                        </div>
                        <div className="text-lg font-semibold text-white font-mono text-center mt-1">
                          {blendedAPRForBar > 0
                            ? `${blendedAPRForBar.toFixed(2)}%`
                            : "-"}
                        </div>
                      </div>

                      {/* Claim Button */}
                      <div className="flex flex-col items-center justify-center text-center px-3 py-2">
                        <div className="text-[11px] text-white/60 uppercase tracking-widest text-center">
                          Action
                        </div>
                        <button
                          onClick={() => {
                            setIsClaimAllModalOpen(true);
                          }}
                          disabled={isClaimingAll || isCompoundingAll}
                          className="mt-1 px-4 py-1.5 text-xs font-medium bg-white/10 text-white border border-white/20 hover:bg-white/15 disabled:bg-white/5 disabled:text-white/40 disabled:border-white/10 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          Claim
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Anchor Ledger Marks Box */}
                  <div className="bg-black/20 border border-white/10 p-2.5 md:col-span-1 lg:col-span-1">
                    <div className="text-[11px] text-white/60 uppercase tracking-widest mb-0.5 text-center">
                      Anchor Ledger Marks
                    </div>
                    <div className="text-base font-bold text-white font-mono text-center tabular-nums">
                      {!ANCHOR_MARKS_ENABLED ? (
                        "0"
                      ) : !mounted || isLoadingLedgerMarks ? (
                        <span className="text-white/50">-</span>
                      ) : totalAnchorLedgerMarks > 0 ? (
                        totalAnchorLedgerMarks.toLocaleString(undefined, {
                          minimumFractionDigits:
                            totalAnchorLedgerMarks < 100 ? 2 : 0,
                          maximumFractionDigits:
                            totalAnchorLedgerMarks < 100 ? 2 : 0,
                        })
                      ) : (
                        "0"
                      )}
                    </div>
                    <div className="text-[10px] text-white/50 text-center mt-0.5">
                      {!ANCHOR_MARKS_ENABLED
                        ? "0 marks/day"
                        : !mounted || isLoadingLedgerMarks
                        ? ""
                        : totalAnchorLedgerMarksPerDay > 0
                        ? `${totalAnchorLedgerMarksPerDay.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })} marks/day`
                        : "0 marks/day"}
                    </div>
                  </div>
                </div>
                </div>

                {activeAnchorBoostEndTimestamp && (
                  <div className="mt-2 w-full min-w-0">
                    <MarksBoostBadge
                      multiplier={10}
                      endTimestamp={activeAnchorBoostEndTimestamp}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Divider */}
          <div className="border-t border-white/10 my-2"></div>

          {/* Earnings Section */}
          {(() => {
            // Calculate totals across all markets
            let totalCollateralRewards = 0n;
            let totalSailRewards = 0n;
            let totalCollateralRewardsUSD = 0;
            let totalSailRewardsUSD = 0;
            let totalAPR = 0;
            let aprCount = 0;
            let totalDepositUSD = 0;

            anchorMarkets.forEach(([id, m], mi) => {
              const hasCollateralPool = !!(m as any).addresses
                ?.stabilityPoolCollateral;
              const hasSailPool = !!(m as any).addresses
                ?.stabilityPoolLeveraged;

              let offset = 0;
              for (let i = 0; i < mi; i++) {
                const prevMarket = anchorMarkets[i][1];
                const prevHasCollateral = !!(prevMarket as any).addresses
                  ?.stabilityPoolCollateral;
                const prevHasSail = !!(prevMarket as any).addresses
                  ?.stabilityPoolLeveraged;
                const prevHasPriceOracle = !!(prevMarket as any).addresses
                  ?.collateralPrice;
                const prevHasStabilityPoolManager = !!(prevMarket as any)
                  .addresses?.stabilityPoolManager;
                offset += 5; // 4 minter calls + 1 config call
                if (prevHasStabilityPoolManager) offset += 1; // rebalanceThreshold
                if (prevHasCollateral) offset += 4;
                if (prevHasSail) offset += 4;
                if (prevHasPriceOracle) offset += 1;
              }

              const baseOffset = offset;
              const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
                | bigint
                | undefined;

              let currentOffset = baseOffset + 5; // 4 minter calls + 1 config call
              let collateralPoolRewards: bigint | undefined;
              let collateralPoolAPR:
                | { collateral: number; steam: number }
                | undefined;
              let sailPoolRewards: bigint | undefined;
              let sailPoolAPR:
                | { collateral: number; steam: number }
                | undefined;

              if (hasCollateralPool) {
                const collateralAPRResult = reads?.[currentOffset + 1]
                  ?.result as [bigint, bigint] | undefined;
                collateralPoolAPR = collateralAPRResult
                  ? {
                      collateral: (Number(collateralAPRResult[0]) / 1e16) * 100,
                      steam: (Number(collateralAPRResult[1]) / 1e16) * 100,
                    }
                  : undefined;
                // Note: We'll update APR later using aggregated rewards from all tokens
                currentOffset += 4;
              }

              if (hasSailPool) {
                const sailAPRResult = reads?.[currentOffset + 1]?.result as
                  | [bigint, bigint]
                  | undefined;
                sailPoolAPR = sailAPRResult
                  ? {
                      collateral: (Number(sailAPRResult[0]) / 1e16) * 100,
                      steam: (Number(sailAPRResult[1]) / 1e16) * 100,
                    }
                  : undefined;
                // Note: We'll update APR later using aggregated rewards from all tokens
                currentOffset += 4;
              }

              // Get price oracle for USD calculations
              const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
              const collateralPriceDecimals = 18;
              let collateralPrice: bigint | undefined;
              if (hasPriceOracle) {
                const latestAnswerResult = reads?.[currentOffset]?.result;
                if (
                  latestAnswerResult !== undefined &&
                  latestAnswerResult !== null
                ) {
                  if (Array.isArray(latestAnswerResult)) {
                    collateralPrice = latestAnswerResult[1] as bigint;
                  } else if (typeof latestAnswerResult === "object") {
                    const obj = latestAnswerResult as {
                      maxUnderlyingPrice?: bigint;
                    };
                    collateralPrice = obj.maxUnderlyingPrice;
                  } else if (typeof latestAnswerResult === "bigint") {
                    collateralPrice = latestAnswerResult;
                  }
                }
              }

              // Calculate USD values using aggregated rewards from all reward tokens
              const collateralPoolAddress = hasCollateralPool
                ? ((m as any).addresses?.stabilityPoolCollateral as
                    | `0x${string}`
                    | undefined)
                : undefined;
              const sailPoolAddress = hasSailPool
                ? ((m as any).addresses?.stabilityPoolLeveraged as
                    | `0x${string}`
                    | undefined)
                : undefined;

              // Use aggregated rewards from useAllStabilityPoolRewards (includes all reward tokens)
              if (collateralPoolAddress) {
                const poolReward = poolRewardsMap.get(collateralPoolAddress);
                if (poolReward && poolReward.claimableValue > 0) {
                  totalCollateralRewardsUSD += poolReward.claimableValue;
                }
                // Also update APR to include all reward tokens
                if (
                  poolReward?.totalRewardAPR &&
                  poolReward.totalRewardAPR > 0
                ) {
                  // Replace the APR from contract with the aggregated APR from all reward tokens
                  if (collateralPoolAPR) {
                    // Add additional APR from other reward tokens (subtract contract APR to avoid double-counting)
                    const contractAPR =
                      (collateralPoolAPR.collateral || 0) +
                      (collateralPoolAPR.steam || 0);
                    const additionalAPR =
                      poolReward.totalRewardAPR - contractAPR;
                    if (additionalAPR > 0) {
                      collateralPoolAPR = {
                        collateral:
                          (collateralPoolAPR.collateral || 0) + additionalAPR,
                        steam: collateralPoolAPR.steam || 0,
                      };
                    } else {
                      // If total reward APR is higher, use it instead
                      collateralPoolAPR = {
                        collateral: poolReward.totalRewardAPR,
                        steam: 0,
                      };
                    }
                  } else {
                    // If no contract APR, use the total reward APR
                    collateralPoolAPR = {
                      collateral: poolReward.totalRewardAPR,
                      steam: 0,
                    };
                  }
                }
              }

              if (sailPoolAddress) {
                const poolReward = poolRewardsMap.get(sailPoolAddress);
                if (poolReward && poolReward.claimableValue > 0) {
                  totalSailRewardsUSD += poolReward.claimableValue;
                }
                // Also update APR to include all reward tokens
                if (
                  poolReward?.totalRewardAPR &&
                  poolReward.totalRewardAPR > 0
                ) {
                  // Replace the APR from contract with the aggregated APR from all reward tokens
                  if (sailPoolAPR) {
                    // Add additional APR from other reward tokens (subtract contract APR to avoid double-counting)
                    const contractAPR =
                      (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0);
                    const additionalAPR =
                      poolReward.totalRewardAPR - contractAPR;
                    if (additionalAPR > 0) {
                      sailPoolAPR = {
                        collateral:
                          (sailPoolAPR.collateral || 0) + additionalAPR,
                        steam: sailPoolAPR.steam || 0,
                      };
                    } else {
                      // If total reward APR is higher, use it instead
                      sailPoolAPR = {
                        collateral: poolReward.totalRewardAPR,
                        steam: 0,
                      };
                    }
                  } else {
                    // If no contract APR, use the total reward APR
                    sailPoolAPR = {
                      collateral: poolReward.totalRewardAPR,
                      steam: 0,
                    };
                  }
                }
              }

              // Calculate total deposit USD for earnings calculation using hook data
              const positionData = marketPositions[id];
              if (positionData?.walletHaUSD) {
                totalDepositUSD += positionData.walletHaUSD;
              }

              // Update total APR after we've updated the APR values with all reward tokens
              if (collateralPoolAPR) {
                totalAPR +=
                  (collateralPoolAPR.collateral || 0) +
                  (collateralPoolAPR.steam || 0);
                aprCount++;
              }
              if (sailPoolAPR) {
                totalAPR +=
                  (sailPoolAPR.collateral || 0) + (sailPoolAPR.steam || 0);
                aprCount++;
              }
            });

            const totalRewardsUSD =
              totalCollateralRewardsUSD + totalSailRewardsUSD;
            const averageAPR = aprCount > 0 ? totalAPR / aprCount : 0;

            // Collect markets with deposits and rewards
            const marketsWithRewards: Array<{
              market: any;
              marketId: string;
              userDeposit: bigint;
              userDepositUSD: number;
              collateralRewards: bigint;
              collateralRewardsUSD: number;
              sailRewards: bigint;
              sailRewardsUSD: number;
              collateralSymbol: string;
              sailSymbol: string;
              hasCollateralPool: boolean;
              hasSailPool: boolean;
            }> = [];

            anchorMarkets.forEach(([id, m], mi) => {
              const hasCollateralPool = !!(m as any).addresses
                ?.stabilityPoolCollateral;
              const hasSailPool = !!(m as any).addresses
                ?.stabilityPoolLeveraged;
              const positionData = marketPositions[id];
              const userDeposit = positionData?.walletHa || 0n;

              let offset = 0;
              for (let i = 0; i < mi; i++) {
                const prevMarket = anchorMarkets[i][1];
                const prevHasCollateral = !!(prevMarket as any).addresses
                  ?.stabilityPoolCollateral;
                const prevHasSail = !!(prevMarket as any).addresses
                  ?.stabilityPoolLeveraged;
                const prevHasPriceOracle = !!(prevMarket as any).addresses
                  ?.collateralPrice;
                offset += 4;
                if (prevHasCollateral) offset += 3;
                if (prevHasSail) offset += 3;
                if (prevHasPriceOracle) offset += 1;
              }

              const baseOffset = offset;
              const peggedTokenPrice = reads?.[baseOffset + 3]?.result as
                | bigint
                | undefined;

              let currentOffset = baseOffset + 4;
              let collateralPoolRewards: bigint | undefined;
              let sailPoolRewards: bigint | undefined;

              if (hasCollateralPool) {
                collateralPoolRewards = reads?.[currentOffset + 2]?.result as
                  | bigint
                  | undefined;
                currentOffset += 3;
              }

              if (hasSailPool) {
                sailPoolRewards = reads?.[currentOffset + 2]?.result as
                  | bigint
                  | undefined;
                currentOffset += 3;
              }

              const hasPriceOracle = !!(m as any).addresses?.collateralPrice;
              const collateralPriceDecimals = 18;
              let collateralPrice: bigint | undefined;
              if (hasPriceOracle) {
                const latestAnswerResult = reads?.[currentOffset]?.result;
                if (
                  latestAnswerResult !== undefined &&
                  latestAnswerResult !== null
                ) {
                  if (Array.isArray(latestAnswerResult)) {
                    collateralPrice = latestAnswerResult[1] as bigint;
                  } else if (typeof latestAnswerResult === "object") {
                    const obj = latestAnswerResult as {
                      maxUnderlyingPrice?: bigint;
                    };
                    collateralPrice = obj.maxUnderlyingPrice;
                  } else if (typeof latestAnswerResult === "bigint") {
                    collateralPrice = latestAnswerResult;
                  }
                }
              }

              let collateralRewardsUSD = 0;
              let sailRewardsUSD = 0;

              // getClaimableRewards returns rewards in pegged token (ha token)
              // So we use peggedTokenPrice for USD calculation
              if (
                collateralPoolRewards &&
                collateralPoolRewards > 0n &&
                peggedTokenPrice
              ) {
                const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                const rewardsAmount = Number(collateralPoolRewards) / 1e18;
                collateralRewardsUSD = rewardsAmount * peggedPriceUSD;
              }

              if (sailPoolRewards && sailPoolRewards > 0n && peggedTokenPrice) {
                const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                const rewardsAmount = Number(sailPoolRewards) / 1e18;
                sailRewardsUSD = rewardsAmount * peggedPriceUSD;
              }

              const totalMarketRewardsUSD =
                collateralRewardsUSD + sailRewardsUSD;

              // Calculate user deposit USD for sorting
              let userDepositUSD = 0;
              if (
                userDeposit &&
                userDeposit > 0n &&
                peggedTokenPrice &&
                collateralPrice &&
                collateralPriceDecimals !== undefined
              ) {
                const peggedPrice = Number(peggedTokenPrice) / 1e18;
                const collateralPriceNum =
                  Number(collateralPrice) /
                  10 ** (Number(collateralPriceDecimals) || 8);
                const depositAmount = Number(userDeposit) / 1e18;
                userDepositUSD =
                  depositAmount * (peggedPrice * collateralPriceNum);
              }

              // Include all markets (for dropdown), even if no deposits or rewards
              marketsWithRewards.push({
                market: m,
                marketId: id,
                userDeposit: userDeposit,
                userDepositUSD,
                collateralRewards: collateralPoolRewards || 0n,
                collateralRewardsUSD,
                sailRewards: sailPoolRewards || 0n,
                sailRewardsUSD,
                collateralSymbol: m.collateral?.symbol || "ETH",
                sailSymbol: m.leveragedToken?.symbol || "hs",
                hasCollateralPool,
                hasSailPool,
              });
            });

            // Sort markets by deposit amount (descending)
            const sortedMarketsWithRewards = [...marketsWithRewards].sort(
              (a, b) => b.userDepositUSD - a.userDepositUSD
            );

            return (
              <>
                {/* Expanded View */}
                {isEarningsExpanded && marketsWithRewards.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#1E4775]/20 space-y-2">
                    {marketsWithRewards
                      .filter(
                        ({
                          collateralRewards,
                          sailRewards,
                          collateralRewardsUSD,
                          sailRewardsUSD,
                        }) => {
                          const totalMarketRewardsUSD =
                            collateralRewardsUSD + sailRewardsUSD;
                          return (
                            totalMarketRewardsUSD > 0 ||
                            (collateralRewards && collateralRewards > 0n) ||
                            (sailRewards && sailRewards > 0n)
                          );
                        }
                      )
                      .map(
                        ({
                          market,
                          marketId,
                          collateralRewards,
                          collateralRewardsUSD,
                          sailRewards,
                          sailRewardsUSD,
                          collateralSymbol,
                          sailSymbol,
                        }) => {
                          const marketTotalUSD =
                            collateralRewardsUSD + sailRewardsUSD;
                          const hasCollateral = collateralRewards > 0n;
                          const hasSail = sailRewards > 0n;

                          return (
                            <div
                              key={marketId}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex-1">
                                <div className="text-[#1E4775] font-medium">
                                  {market.peggedToken?.symbol || marketId}
                                </div>
                                <div className="text-[#1E4775]/70">
                                  ${marketTotalUSD.toFixed(2)}
                                  {hasCollateral && (
                                    <span className="ml-2">
                                      {formatToken(collateralRewards)}
                                      {" "}
                                      {collateralSymbol}
                                    </span>
                                  )}
                                  {hasSail && (
                                    <span className="ml-2">
                                      {formatToken(sailRewards)} {sailSymbol}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hasCollateral) {
                                    handleClaimRewards(market, "collateral");
                                  }
                                  if (hasSail) {
                                    handleClaimRewards(market, "sail");
                                  }
                                }}
                                disabled={isClaimingAll || marketTotalUSD === 0}
                                className="px-3 py-1 text-xs font-medium bg-white text-[#1E4775] border border-white hover:bg-white/90 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors rounded-full"
                              >
                                Claim
                              </button>
                            </div>
                          );
                        }
                      )}
                  </div>
                )}
              </>
            );
          })()}

          {/* Wallet Positions Not Earning Yield */}
          {(() => {
            if (!isConnected || !address) return null;

            // Group markets by ha token address to find wallet positions not in pools
            const walletPositionsByToken = new Map<
              string,
              {
                tokenAddress: string;
                symbol: string;
                balance: bigint;
                balanceUSD: number;
                markets: Array<{ marketId: string; market: any; marketData: (typeof allMarketsData)[0] }>;
              }
            >();

            // Iterate through all markets to find wallet positions
            allMarketsData.forEach((marketData) => {
              const peggedTokenAddress = (marketData.market as any)?.addresses?.peggedToken as string | undefined;
              if (!peggedTokenAddress) return;

              const tokenAddressLower = peggedTokenAddress.toLowerCase();
              const walletBalance = marketData.userDeposit || 0n;
              const walletBalanceUSD = marketData.haTokenBalanceUSD || 0;

              // Include if wallet has balance (regardless of pool deposits - they are separate)
              if (walletBalance > 0n) {
                if (!walletPositionsByToken.has(tokenAddressLower)) {
                  walletPositionsByToken.set(tokenAddressLower, {
                    tokenAddress: peggedTokenAddress,
                    symbol: marketData.market?.peggedToken?.symbol || "ha",
                    balance: walletBalance,
                    balanceUSD: walletBalanceUSD,
                    markets: [],
                  });
                }
                const position = walletPositionsByToken.get(tokenAddressLower)!;
                position.markets.push({
                  marketId: marketData.marketId,
                  market: marketData.market,
                  marketData,
                });
                // Use the highest balance/USD value (should be same across markets for same token)
                if (walletBalanceUSD > position.balanceUSD) {
                  position.balanceUSD = walletBalanceUSD;
                }
              }
            });

            if (walletPositionsByToken.size === 0) return null;

            return (
              <section className="mb-4">
                <div className="space-y-2">
                  {/* Header with coral tag */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-[#FF8A7A] text-white text-xs font-medium uppercase tracking-wider px-2 py-1">
                      You have anchor tokens that aren't earning yield
                    </span>
                  </div>

                  {/* Token positions */}
                  {Array.from(walletPositionsByToken.values()).map((position) => {
                    const firstMarket = position.markets[0];
                    const marketData = firstMarket.marketData;

                    return (
                      <div
                        key={position.tokenAddress}
                        className="bg-white border border-[#1E4775]/10 p-3 hover:bg-[rgb(var(--surface-selected-rgb))] transition-colors"
                      >
                        {/* Desktop layout (>= lg) - matches market bars grid */}
                        <div className="hidden lg:grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                          {/* Token */}
                          <div className="whitespace-nowrap min-w-0 overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <SimpleTooltip label={position.symbol}>
                                <Image
                                  src={getLogoPath(position.symbol)}
                                  alt={position.symbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                                {position.symbol}
                              </span>
                            </div>
                          </div>

                          {/* Deposit Assets - Info text */}
                          <div className="text-center min-w-0">
                            <span className="text-xs text-[#1E4775]/60 whitespace-nowrap">
                              Deposit in a stability pool to earn yield
                            </span>
                          </div>

                          {/* APR - empty */}
                          <div></div>

                          {/* Earnings - empty */}
                          <div></div>

                          {/* Reward Assets - empty */}
                          <div></div>

                          {/* Position */}
                          <div className="text-center min-w-0">
                            <span className="text-[#1E4775] font-medium text-xs font-mono">
                              {formatToken(position.balance)} {position.symbol} ({formatCompactUSD(position.balanceUSD)})
                            </span>
                          </div>

                          {/* Actions */}
                          <div
                            className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const enrichedMarkets = position.markets.map((m) => ({
                                  marketId: m.marketId,
                                  market: {
                                    ...m.market,
                                    wrappedRate: m.marketData?.wrappedRate,
                                  },
                                }));
                                setManageModal({
                                  marketId: firstMarket.marketId,
                                  market: {
                                    ...firstMarket.market,
                                    wrappedRate: marketData?.wrappedRate,
                                  },
                                  initialTab: "deposit",
                                  simpleMode: true,
                                  bestPoolType: "collateral",
                                  allMarkets: enrichedMarkets,
                                  // Default the modal deposit-asset selector to the ha token.
                                  // (Some flows otherwise default to collateral, which is confusing here.)
                                  initialDepositAsset: firstMarket.market?.peggedToken?.symbol || position.symbol,
                                });
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                            >
                              Deposit
                            </button>
                          </div>
                        </div>

                        {/* Medium/narrow layout (md to < lg) - matches market bars grid */}
                        <div className="hidden md:grid lg:hidden grid-cols-[1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                          {/* Token */}
                          <div className="whitespace-nowrap min-w-0 overflow-hidden">
                            <div className="flex items-center justify-center gap-1.5">
                              <SimpleTooltip label={position.symbol}>
                                <Image
                                  src={getLogoPath(position.symbol)}
                                  alt={position.symbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775] font-medium text-sm">
                                {position.symbol}
                              </span>
                            </div>
                          </div>

                          {/* APR - Info text */}
                          <div className="text-center min-w-0">
                            <span className="text-xs text-[#1E4775]/60 whitespace-nowrap">
                              Deposit in a stability pool to earn yield
                            </span>
                          </div>

                          {/* Position */}
                          <div className="text-center min-w-0">
                            <span className="text-[#1E4775] font-medium text-xs font-mono">
                              {formatToken(position.balance)} {position.symbol} ({formatCompactUSD(position.balanceUSD)})
                            </span>
                          </div>

                          {/* Actions */}
                          <div
                            className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const enrichedMarkets = position.markets.map((m) => ({
                                  marketId: m.marketId,
                                  market: {
                                    ...m.market,
                                    wrappedRate: m.marketData?.wrappedRate,
                                  },
                                }));
                                  setManageModal({
                                    marketId: firstMarket.marketId,
                                    market: {
                                      ...firstMarket.market,
                                      wrappedRate: marketData?.wrappedRate,
                                    },
                                    initialTab: "deposit",
                                    simpleMode: true,
                                    bestPoolType: "collateral",
                                    allMarkets: enrichedMarkets,
                                    initialDepositAsset:
                                      firstMarket.market?.peggedToken?.symbol || position.symbol,
                                  });
                                }}
                                className="px-3 py-1.5 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                              >
                                Deposit
                              </button>
                            </div>
                          </div>

                          {/* Mobile layout (< md) */}
                        <div className="md:hidden space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <SimpleTooltip label={position.symbol}>
                                <Image
                                  src={getLogoPath(position.symbol)}
                                  alt={position.symbol}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help"
                                />
                              </SimpleTooltip>
                              <span className="text-[#1E4775] font-medium text-sm truncate">
                                {position.symbol}
                              </span>
                              <span className="text-xs text-[#1E4775]/60 hidden sm:inline ml-2 whitespace-nowrap">
                                Deposit in a stability pool to earn yield
                              </span>
                            </div>
                            <div
                              className="flex items-center justify-end flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const enrichedMarkets = position.markets.map((m) => ({
                                    marketId: m.marketId,
                                    market: {
                                      ...m.market,
                                      wrappedRate: m.marketData?.wrappedRate,
                                    },
                                  }));
                                  setManageModal({
                                    marketId: firstMarket.marketId,
                                    market: {
                                      ...firstMarket.market,
                                      wrappedRate: marketData?.wrappedRate,
                                    },
                                    initialTab: "deposit",
                                    simpleMode: true,
                                    bestPoolType: "collateral",
                                    allMarkets: enrichedMarkets,
                                    initialDepositAsset:
                                      firstMarket.market?.peggedToken?.symbol || position.symbol,
                                  });
                                }}
                                className="px-3 py-1.5 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                              >
                                Deposit
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-[#1E4775]/60">
                            {formatToken(position.balance)} {position.symbol} ({formatCompactUSD(position.balanceUSD)})
                          </div>
                          <div className="text-xs text-[#1E4775]/60 sm:hidden">
                            Deposit in a stability pool to earn yield
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Separator bar */}
                <div className="border-t border-white/10 mt-4"></div>
              </section>
            );
          })()}

          {/* Markets List */}
          <section className="space-y-2 overflow-visible">
            {/* Stability Pools Header */}
            <div className="mb-3">
              <h2 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Stability Pools
              </h2>
            </div>

            {/* Market Cards/Rows */}
            {(() => {
              // Show loading state while fetching market data
              if (isLoadingReads) {
                return null; // Don't show anything while loading
              }

              // Show error state if there's an issue loading markets
              if (isReadsError) {
                return (
                  <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
                    <p className="text-white text-lg font-medium mb-4">
                      Error loading markets
                    </p>
                    <button
                      onClick={() => refetchReads()}
                      className="px-4 py-2 bg-[#FF8A7A] text-white rounded hover:bg-[#FF6B5A] transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                );
              }

              // Check if any markets have finished genesis (marketsDataMap only contains finished markets)
              if (marketsDataMap.size === 0) {
                return (
                  <div className="bg-[#17395F] border border-white/10 p-6 rounded-lg text-center">
                    <p className="text-white text-lg font-medium mb-4">
                      No markets available
                    </p>
                    <button
                      onClick={() => refetchReads()}
                      className="px-4 py-2 bg-[#FF8A7A] text-white rounded hover:bg-[#FF6B5A] transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                );
              }

              // Show grouped markets by ha token
              // Group markets by pegged token symbol
              const groups: Record<
                string,
                Array<{
                  marketId: string;
                  market: any;
                  marketIndex: number;
                }>
              > = {};

              anchorMarkets.forEach(([id, m], mi) => {
                const symbol = m.peggedToken?.symbol || "UNKNOWN";
                if (!groups[symbol]) {
                  groups[symbol] = [];
                }
                groups[symbol].push({
                  marketId: id,
                  market: m,
                  marketIndex: mi,
                });
              });

              // Process each group
              return (
                <>
                  {/* Header Row (desktop) */}
                  <div className="hidden lg:block bg-white py-1.5 px-2 overflow-x-auto">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-[10px] lg:text-[11px] text-[#1E4775] font-semibold">
                      <div className="min-w-0 text-center">Token</div>
                      <div className="text-center min-w-0">Deposit Assets</div>
                      <div className="text-center min-w-0">APR</div>
                      <div className="text-center min-w-0">Earnings</div>
                      <div className="text-center min-w-0">Reward Assets</div>
                      <div className="text-center min-w-0">Position</div>
                      <div className="text-center min-w-0">Actions</div>
                    </div>
                  </div>

                  {/* Header Row (md / narrow) */}
                  <div className="hidden md:block lg:hidden bg-white py-1.5 px-2 overflow-x-auto">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 items-center uppercase tracking-wider text-[10px] text-[#1E4775] font-semibold">
                      <div className="min-w-0 text-center">Token</div>
                      <div className="text-center min-w-0">APR</div>
                      <div className="text-center min-w-0">Position</div>
                      <div className="text-center min-w-0">Actions</div>
                    </div>
                  </div>
                  {Object.entries(groups).map(([symbol, marketList]) => {
                // Collect all data for markets in this group from the hook
                const marketsData = marketList
                  .map(({ marketId }) => marketsDataMap.get(marketId))
                  .filter((m): m is NonNullable<typeof m> => m !== undefined);

                // Use all markets in the group (not just those with collateral > 0)
                // This ensures all markets are displayed in the expanded view
                const activeMarketsData = marketsData;

                // Skip this group if no markets exist
                if (activeMarketsData.length === 0) {
                  return null;
                }

                // Calculate combined values - only include stability pool deposits (not wallet balances)
                const combinedPositionUSD = activeMarketsData.reduce(
                  (sum, m) => {
                    return sum + m.collateralPoolDepositUSD + m.sailPoolDepositUSD;
                  },
                  0
                );
                // Also track total token amounts (for display when USD isn't available) - only pool deposits
                const combinedPositionTokens = activeMarketsData.reduce(
                  (sum, m) =>
                    sum +
                    Number(m.collateralPoolDeposit || 0n) / 1e18 +
                    Number(m.sailPoolDeposit || 0n) / 1e18,
                  0
                );
                const combinedRewardsUSD = activeMarketsData.reduce(
                  (sum, m) => sum + m.collateralRewardsUSD + m.sailRewardsUSD,
                  0
                );

                // Calculate APR ranges across all markets in group
                const allMinAPRs = activeMarketsData
                  .map((m) => m.minAPR)
                  .filter((v) => v > 0);
                const allMaxAPRs = activeMarketsData
                  .map((m) => m.maxAPR)
                  .filter((v) => v > 0);
                const minAPR =
                  allMinAPRs.length > 0 ? Math.min(...allMinAPRs) : 0;
                const maxAPR =
                  allMaxAPRs.length > 0 ? Math.max(...allMaxAPRs) : 0;

                // Collect actual APRs from stability pools for tooltip
                const collateralPoolAPRs = activeMarketsData
                  .map((m) => m.collateralPoolAPR)
                  .filter(
                    (apr): apr is { collateral: number; steam: number } =>
                      apr !== undefined
                  )
                  .map((apr) => apr.collateral + apr.steam)
                  .filter((v) => v > 0);
                const sailPoolAPRs = activeMarketsData
                  .map((m) => m.sailPoolAPR)
                  .filter(
                    (apr): apr is { collateral: number; steam: number } =>
                      apr !== undefined
                  )
                  .map((apr) => apr.collateral + apr.steam)
                  .filter((v) => v > 0);
                const collateralPoolAPRMin =
                  collateralPoolAPRs.length > 0
                    ? Math.min(...collateralPoolAPRs)
                    : null;
                const collateralPoolAPRMax =
                  collateralPoolAPRs.length > 0
                    ? Math.max(...collateralPoolAPRs)
                    : null;
                const sailPoolAPRMin =
                  sailPoolAPRs.length > 0 ? Math.min(...sailPoolAPRs) : null;
                const sailPoolAPRMax =
                  sailPoolAPRs.length > 0 ? Math.max(...sailPoolAPRs) : null;

                // Calculate projected APR ranges
                const allMinProjectedAPRs = activeMarketsData
                  .map((m) => m.minProjectedAPR)
                  .filter((v): v is number => v !== null && v > 0);
                const allMaxProjectedAPRs = activeMarketsData
                  .map((m) => m.maxProjectedAPR)
                  .filter((v): v is number => v !== null && v > 0);
                const minProjectedAPR =
                  allMinProjectedAPRs.length > 0
                    ? Math.min(...allMinProjectedAPRs)
                    : null;
                const maxProjectedAPR =
                  allMaxProjectedAPRs.length > 0
                    ? Math.max(...allMaxProjectedAPRs)
                    : null;

                // Collect all unique wrapped collateral assets (only show wrapped collateral, not all accepted assets)
                const assetMap = new Map<
                  string,
                  { symbol: string; name: string }
                >();
                marketList.forEach(({ market }) => {
                  // Only show wrapped collateral (fxSAVE, wstETH)
                  if (market?.collateral?.symbol) {
                    const wrappedCollateral = {
                      symbol: market.collateral.symbol,
                      name: market.collateral.name || market.collateral.symbol,
                    };
                    if (!assetMap.has(wrappedCollateral.symbol)) {
                      assetMap.set(wrappedCollateral.symbol, wrappedCollateral);
                    }
                  }
                });
                const allDepositAssets = Array.from(assetMap.values());

                // Collect all unique reward tokens from pools for markets in this group
                const firstMarket = marketList[0]?.market;
                
                // Helper function to get directly zappable assets (no slippage)
                // Excludes wrapped collateral since it's already shown in the main deposit assets view
                const getDirectlyZappableAssets = (market: any): Array<{ symbol: string; name: string }> => {
                  const collateralSymbol = market?.collateral?.symbol?.toLowerCase() || "";
                  const isFxSAVEMarket = collateralSymbol === "fxsave";
                  const isWstETHMarket = collateralSymbol === "wsteth";
                  
                  if (isFxSAVEMarket) {
                    // Exclude fxSAVE (wrapped collateral) - only show USDC and fxUSD
                    return [
                      { symbol: "USDC", name: "USD Coin" },
                      { symbol: "fxUSD", name: "f(x) USD" },
                    ];
                  } else if (isWstETHMarket) {
                    // Exclude wstETH (wrapped collateral) - only show ETH and stETH
                    return [
                      { symbol: "ETH", name: "Ethereum" },
                      { symbol: "stETH", name: "Lido Staked ETH" },
                    ];
                  }
                  return [];
                };
                
                // Collect zappable assets from all markets in the group
                const zappableAssetsMap = new Map<
                  string,
                  { symbol: string; name: string }
                >();
                marketList.forEach(({ market }) => {
                  const zappableAssets = getDirectlyZappableAssets(market);
                  zappableAssets.forEach((asset) => {
                    if (!zappableAssetsMap.has(asset.symbol)) {
                      zappableAssetsMap.set(asset.symbol, asset);
                    }
                  });
                });
                const directlyZappableAssets = Array.from(zappableAssetsMap.values());
                const collateralPoolAddress = firstMarket?.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = firstMarket?.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;
                const peggedTokenSymbol = firstMarket?.peggedToken?.symbol;
                const collateralSymbol = firstMarket?.collateral?.symbol || "";

                const isExpanded = expandedMarkets.includes(symbol);

                return (
                  <React.Fragment key={symbol}>
                    <div
                      className={`p-3 overflow-visible md:overflow-x-auto transition cursor-pointer ${
                        isExpanded
                          ? "bg-[rgb(var(--surface-selected-rgb))]"
                          : "bg-white hover:bg-[rgb(var(--surface-selected-rgb))]"
                      }`}
                      onClick={(e) => {
                        // Expand unless clicking on a button or element that stops propagation
                        const target = e.target as HTMLElement;
                        if (target.closest('button') === null && target.closest('[onclick]') === null) {
                          setExpandedMarkets((prev) =>
                            prev.includes(symbol)
                              ? prev.filter((s) => s !== symbol)
                              : [...prev, symbol]
                          );
                        }
                      }}
                    >
                      {/* Mobile card layout (< md) - modeled after Maiden Voyage page */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <SimpleTooltip label={peggedTokenSymbol || symbol}>
                              <Image
                                src={getLogoPath(peggedTokenSymbol || symbol)}
                                alt={peggedTokenSymbol || symbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help"
                              />
                            </SimpleTooltip>
                            <span className="text-[#1E4775] font-semibold text-base truncate">
                              {symbol}
                            </span>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                            )}
                          </div>

                          <div
                            className="flex items-center justify-end flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isConnected) return;
                                const enrichedAllMarkets = marketList.map((m) => {
                                  const marketData = marketsData.find(
                                    (md) => md.marketId === m.marketId
                                  );
                                  return {
                                    marketId: m.marketId,
                                    market: {
                                      ...m.market,
                                      wrappedRate: marketData?.wrappedRate,
                                    },
                                  };
                                });
                                setManageModal({
                                  marketId: marketList[0].marketId,
                                  market: {
                                    ...marketList[0].market,
                                    wrappedRate: marketsData.find(
                                      (md) => md.marketId === marketList[0].marketId
                                    )?.wrappedRate,
                                  },
                                  initialTab: "deposit",
                                  simpleMode: true,
                                  bestPoolType: "collateral",
                                  allMarkets: enrichedAllMarkets,
                                });
                              }}
                              disabled={!isConnected}
                              className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-full whitespace-nowrap ${
                                !isConnected
                                  ? "bg-[#1E4775]/40 text-white/80 cursor-not-allowed"
                                  : "bg-[#1E4775] text-white hover:bg-[#17395F]"
                              }`}
                            >
                              Manage
                            </button>
                          </div>
                        </div>

                        {/* Mobile stats: single row, headers above values */}
                        <div
                          className="flex items-stretch justify-between gap-3 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col items-end leading-tight min-w-0">
                            <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
                              APR
                            </div>
                            <div className="text-[#1E4775] font-semibold text-sm font-mono">
                              {(() => {
                                const hasCurrentAPR = minAPR > 0 || maxAPR > 0;
                                const hasProjectedAPR =
                                  (minProjectedAPR !== null && minProjectedAPR > 0) ||
                                  (maxProjectedAPR !== null && maxProjectedAPR > 0);
                                const formatRange = (min: number, max: number) => {
                                  if (min > 0 && min !== max) return `${min.toFixed(1)}% - ${max.toFixed(1)}%`;
                                  return `${max.toFixed(1)}%`;
                                };
                                const currentStr = hasCurrentAPR ? formatRange(minAPR, maxAPR) : "";
                                const projMin =
                                  minProjectedAPR !== null ? minProjectedAPR : maxProjectedAPR ?? 0;
                                const projMax =
                                  maxProjectedAPR !== null ? maxProjectedAPR : minProjectedAPR ?? 0;
                                const projectedStr = hasProjectedAPR ? formatRange(projMin, projMax) : "";
                                if (!hasCurrentAPR && !hasProjectedAPR) return "-";
                                if (!hasCurrentAPR) return projectedStr ? `Proj ${projectedStr}` : "-";
                                // Don't show projected APR if we have LIVE APRs
                                return currentStr || "-";
                              })()}
                            </div>
                          </div>

                          <div className="flex flex-col items-end leading-tight min-w-0">
                            <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
                              Position
                            </div>
                            <div className="text-[#1E4775] font-semibold text-sm font-mono">
                              {combinedPositionUSD > 0
                                ? formatCompactUSD(combinedPositionUSD)
                                : combinedPositionTokens > 0
                                ? `${combinedPositionTokens.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })} ${symbol}`
                                : "-"}
                            </div>
                          </div>

                          <div className="flex flex-col items-end leading-tight min-w-0">
                            <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
                              Earnings
                            </div>
                            <div className="text-[#1E4775] font-semibold text-sm font-mono">
                              {combinedRewardsUSD > 0 ? `$${combinedRewardsUSD.toFixed(2)}` : "-"}
                            </div>
                          </div>

                          <div className="flex flex-col items-end leading-tight min-w-0">
                            <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
                              Rewards
                            </div>
                            <div className="mt-0.5 flex items-center justify-end">
                              <RewardTokensDisplay
                                collateralPool={collateralPoolAddress}
                                sailPool={sailPoolAddress}
                                iconSize={16}
                                className="justify-end gap-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Medium / narrow layout (md to < lg) */}
                      <div className="hidden md:grid lg:hidden grid-cols-[1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                        <div className="whitespace-nowrap min-w-0 overflow-hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <SimpleTooltip label={peggedTokenSymbol || symbol}>
                              <Image
                                src={getLogoPath(peggedTokenSymbol || symbol)}
                                alt={peggedTokenSymbol || symbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help"
                              />
                            </SimpleTooltip>
                            <span className="text-[#1E4775] font-medium text-sm">
                              {symbol}
                            </span>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        <div
                          className="text-center min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(() => {
                            const hasCurrentAPR = minAPR > 0 || maxAPR > 0;
                            const hasProjectedAPR =
                              (minProjectedAPR !== null && minProjectedAPR > 0) ||
                              (maxProjectedAPR !== null && maxProjectedAPR > 0);
                            const formatRange = (min: number, max: number) => {
                              if (min > 0 && min !== max) {
                                return `${min.toFixed(1)}% - ${max.toFixed(1)}%`;
                              }
                              return `${max.toFixed(1)}%`;
                            };
                            const currentStr = hasCurrentAPR ? formatRange(minAPR, maxAPR) : "";
                            const projMin =
                              minProjectedAPR !== null ? minProjectedAPR : maxProjectedAPR ?? 0;
                            const projMax =
                              maxProjectedAPR !== null ? maxProjectedAPR : minProjectedAPR ?? 0;
                            const projectedStr = hasProjectedAPR ? formatRange(projMin, projMax) : "";

                            if (!hasCurrentAPR && !hasProjectedAPR) {
                              return <span className="text-[#1E4775] font-bold text-sm font-mono">-</span>;
                            }

                            if (!hasCurrentAPR && hasProjectedAPR) {
                              return (
                                <div className="flex flex-col items-center leading-tight">
                                  <div className="text-[10px] text-[#1E4775]/60 font-semibold">Proj</div>
                                  <div className="text-[#1E4775] font-bold text-sm font-mono">
                                    {projectedStr}
                                  </div>
                                </div>
                              );
                            }

                            // Don't show projected APR if we have LIVE APRs
                            if (hasCurrentAPR) {
                              return (
                                <span className="text-[#1E4775] font-bold text-sm font-mono">
                                  {currentStr}
                                </span>
                              );
                            }

                            return (
                              <span className="text-[#1E4775] font-bold text-sm font-mono">
                                {currentStr || "-"}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-center min-w-0">
                          <div className="inline-flex items-stretch justify-center gap-4 whitespace-nowrap">
                            <div className="flex flex-col items-center leading-tight">
                              <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
                                Position
                              </div>
                              <div className="text-[#1E4775] font-medium text-xs font-mono">
                                {combinedPositionUSD > 0
                                  ? formatCompactUSD(combinedPositionUSD)
                                  : combinedPositionTokens > 0
                                  ? `${combinedPositionTokens.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                    })} ${symbol}`
                                  : "-"}
                              </div>
                            </div>
                            <div className="flex flex-col items-center leading-tight">
                              <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
                                Earnings
                              </div>
                              <div className="text-[#1E4775] font-medium text-xs font-mono">
                                {combinedRewardsUSD > 0 ? `$${combinedRewardsUSD.toFixed(2)}` : "-"}
                              </div>
                            </div>
                            <div className="flex flex-col items-center leading-tight">
                              <div className="text-[10px] text-[#1E4775]/60 font-semibold uppercase tracking-wide">
                                Rewards
                              </div>
                              <div className="mt-0.5 flex items-center justify-center">
                                <RewardTokensDisplay
                                  collateralPool={collateralPoolAddress}
                                  sailPool={sailPoolAddress}
                                  iconSize={16}
                                  className="justify-center gap-1"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isConnected) return;
                              const enrichedAllMarkets = marketList.map((m) => {
                                const marketData = marketsData.find((md) => md.marketId === m.marketId);
                                return {
                                  marketId: m.marketId,
                                  market: { ...m.market, wrappedRate: marketData?.wrappedRate },
                                };
                              });
                              setManageModal({
                                marketId: marketList[0].marketId,
                                market: {
                                  ...marketList[0].market,
                                  wrappedRate: marketsData.find((md) => md.marketId === marketList[0].marketId)
                                    ?.wrappedRate,
                                },
                                initialTab: "deposit",
                                simpleMode: true,
                                bestPoolType: "collateral",
                                allMarkets: enrichedAllMarkets,
                              });
                            }}
                            disabled={!isConnected}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-full whitespace-nowrap ${
                              !isConnected
                                ? "bg-[#1E4775]/40 text-white/80 cursor-not-allowed"
                                : "bg-[#1E4775] text-white hover:bg-[#17395F]"
                            }`}
                          >
                            Manage
                          </button>
                        </div>
                      </div>

                      {/* Desktop layout (>= lg) */}
                      <div className="hidden lg:grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center text-sm">
                        <div className="whitespace-nowrap min-w-0 overflow-hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <SimpleTooltip label={peggedTokenSymbol || symbol}>
                              <Image
                                src={getLogoPath(peggedTokenSymbol || symbol)}
                                alt={peggedTokenSymbol || symbol}
                                width={20}
                                height={20}
                                className="flex-shrink-0 cursor-help"
                              />
                            </SimpleTooltip>
                            <span className="text-[#1E4775] font-medium text-sm lg:text-base">
                              {symbol}
                            </span>
                            {isExpanded ? (
                              <ChevronUpIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                            ) : (
                              <ChevronDownIcon className="w-5 h-5 text-[#1E4775] flex-shrink-0" />
                            )}
                          </div>
                        </div>
                        <div
                          className="flex items-center justify-center gap-1.5 min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {allDepositAssets.map((asset) => {
                            return (
                              <SimpleTooltip
                                key={asset.symbol}
                                label={
                                  <div>
                                    <div className="font-semibold mb-1">
                                      {asset.name}
                                    </div>
                                    <div className="text-xs opacity-90">
                                          Collateral is owned by the market and
                                      your position is swapped for{" "}
                                          {peggedTokenSymbol || "haTOKENS"}.
                                    </div>
                                  </div>
                                }
                              >
                                <Image
                                  src={getLogoPath(asset.symbol)}
                                  alt={asset.name}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 cursor-help rounded-full"
                                />
                              </SimpleTooltip>
                            );
                          })}
                          <SimpleTooltip
                            label={
                              <div>
                                <div className="font-semibold mb-1">
                                  Any Token Supported
                                </div>
                                <div className="text-xs opacity-90 space-y-2">
                                  {directlyZappableAssets.length > 0 && (
                                    <div>
                                      <div className="font-semibold mb-1">
                                        Direct zap (no slippage):
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {directlyZappableAssets.map((asset) => (
                                          <div
                                            key={asset.symbol}
                                            className="flex items-center gap-1"
                                          >
                                            <Image
                                              src={getLogoPath(asset.symbol)}
                                              alt={asset.name}
                                              width={16}
                                              height={16}
                                              className="flex-shrink-0 rounded-full"
                                            />
                                            <span>{asset.symbol}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    Other ERC20 tokens can be deposited via
                                    ParaSwap and will be automatically swapped to{" "}
                                    {collateralSymbol}.
                                  </div>
                                </div>
                              </div>
                            }
                          >
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold uppercase tracking-wide cursor-help whitespace-nowrap">
                              <ArrowPathIcon className="w-3 h-3" />
                              <span>Any Token</span>
                            </div>
                          </SimpleTooltip>
                        </div>
                        <div
                          className="text-center min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SimpleTooltip
                            label={
                              <div className="text-left">
                                <div className="font-semibold mb-1">
                                  APR by Pool
                                </div>
                                {showLiveAprLoading ? (
                                  <div className="text-xs">Loading live APRs…</div>
                                ) : projectedAPR.hasRewardsNoTVL ? (
                                  <div className="text-xs space-y-2">
                                    <div className="bg-green-500/20 border border-green-500/30 px-2 py-1">
                                      <span className="font-semibold text-green-400">
                                        Rewards waiting!
                                      </span>
                                      <div className="mt-1 text-green-300">
                                        No deposits yet - first depositors will
                                        receive maximum APR
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {projectedAPR.collateralRewards7Day !==
                                        null &&
                                        projectedAPR.collateralRewards7Day >
                                          0n && (
                                          <div>
                                            • Collateral Pool:{" "}
                                            {(
                                              Number(
                                                projectedAPR.collateralRewards7Day
                                              ) / 1e18
                                            ).toFixed(4)}
                                            {" "}
                                            wstETH streaming over 7 days
                                          </div>
                                        )}
                                      {projectedAPR.leveragedRewards7Day !==
                                        null &&
                                        projectedAPR.leveragedRewards7Day >
                                          0n && (
                                          <div>
                                            • Sail Pool:{" "}
                                            {(
                                              Number(
                                                projectedAPR.leveragedRewards7Day
                                              ) / 1e18
                                            ).toFixed(4)}
                                            {" "}
                                            wstETH streaming over 7 days
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs space-y-1">
                                    {/* Collateral Pool APR with reward tokens - aggregate across all markets */}
                                    {(() => {
                                      // Collect all reward token APRs from all collateral pools in the group
                                      const allCollateralRewardTokenAPRs: Array<{
                                        symbol: string;
                                        apr: number;
                                      }> = [];
                                      
                                      marketList.forEach(({ market }) => {
                                        const poolAddress = (market as any)?.addresses
                                          ?.stabilityPoolCollateral as `0x${string}` | undefined;
                                        if (poolAddress) {
                                          const poolReward = poolRewardsMap.get(poolAddress);
                                          if (poolReward?.rewardTokenAPRs) {
                                            allCollateralRewardTokenAPRs.push(...poolReward.rewardTokenAPRs);
                                          }
                                        }
                                      });

                                      if (allCollateralRewardTokenAPRs.length === 0) {
                                        return (
                                          <div>
                                            <div className="font-semibold">• Collateral Pool:</div>
                                            <div className="ml-2 mt-0.5">
                                              {showLiveAprLoading
                                                ? "Loading"
                                                : collateralPoolAPRMin !== null &&
                                                  collateralPoolAPRMax !== null
                                                ? collateralPoolAPRMin ===
                                                  collateralPoolAPRMax
                                                  ? `${collateralPoolAPRMin.toFixed(2)}%`
                                                  : `${collateralPoolAPRMin.toFixed(2)}% - ${collateralPoolAPRMax.toFixed(2)}%`
                                                : "-"}
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Group by symbol and get min/max APR per token
                                      const tokenAPRMap = new Map<string, { min: number; max: number }>();
                                      allCollateralRewardTokenAPRs.forEach(({ symbol, apr }) => {
                                        if (!tokenAPRMap.has(symbol)) {
                                          tokenAPRMap.set(symbol, { min: apr, max: apr });
                                        } else {
                                          const existing = tokenAPRMap.get(symbol)!;
                                          tokenAPRMap.set(symbol, {
                                            min: Math.min(existing.min, apr),
                                            max: Math.max(existing.max, apr),
                                          });
                                        }
                                      });

                                      const uniqueTokens = Array.from(tokenAPRMap.entries()).map(([symbol, { min, max }]) => ({
                                        symbol,
                                        min,
                                        max,
                                        avg: (min + max) / 2,
                                      }));

                                      // Sort by average APR to show lowest first
                                      uniqueTokens.sort((a, b) => a.avg - b.avg);

                                      // Always show only MIN and MAX across all tokens
                                      const allAPRs = uniqueTokens.flatMap(t => [t.min, t.max]);
                                      const globalMin = Math.min(...allAPRs);
                                      const globalMax = Math.max(...allAPRs);
                                      
                                      // Find which tokens correspond to min and max
                                      const minToken = uniqueTokens.find(t => t.min === globalMin || t.max === globalMin) || uniqueTokens[0];
                                      const maxToken = uniqueTokens.find(t => t.min === globalMax || t.max === globalMax) || uniqueTokens[uniqueTokens.length - 1];

                                      if (uniqueTokens.length === 1) {
                                        const token = uniqueTokens[0];
                                        return (
                                          <div>
                                            <div className="font-semibold">• Collateral Pool:</div>
                                            <div className="ml-2 mt-0.5">
                                              {token.min === token.max
                                                ? `${token.min.toFixed(2)}%`
                                                : `${token.min.toFixed(2)}% - ${token.max.toFixed(2)}%`}
                                              {" "}({token.symbol})
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Multiple tokens - show only MIN and MAX
                                      return (
                                        <div>
                                          <div className="font-semibold">• Collateral Pool:</div>
                                          <div className="ml-2 mt-0.5">
                                            {globalMin.toFixed(2)}% ({minToken.symbol}) -{" "}
                                            {globalMax.toFixed(2)}% ({maxToken.symbol})
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Sail Pool APR with reward tokens - aggregate across all markets */}
                                    {(() => {
                                      // Collect all reward token APRs from all sail pools in the group
                                      const allSailRewardTokenAPRs: Array<{
                                        symbol: string;
                                        apr: number;
                                      }> = [];
                                      
                                      marketList.forEach(({ market }) => {
                                        const poolAddress = (market as any)?.addresses
                                          ?.stabilityPoolLeveraged as `0x${string}` | undefined;
                                        if (poolAddress) {
                                          const poolReward = poolRewardsMap.get(poolAddress);
                                          if (poolReward?.rewardTokenAPRs) {
                                            allSailRewardTokenAPRs.push(...poolReward.rewardTokenAPRs);
                                          }
                                        }
                                      });

                                      if (allSailRewardTokenAPRs.length === 0) {
                                        return (
                                          <div>
                                            <div className="font-semibold">• Sail Pool:</div>
                                            <div className="ml-2 mt-0.5">
                                              {showLiveAprLoading
                                                ? "Loading"
                                                : sailPoolAPRMin !== null &&
                                                  sailPoolAPRMax !== null
                                                ? sailPoolAPRMin === sailPoolAPRMax
                                                  ? `${sailPoolAPRMin.toFixed(2)}%`
                                                  : `${sailPoolAPRMin.toFixed(2)}% - ${sailPoolAPRMax.toFixed(2)}%`
                                                : "-"}
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Group by symbol and get min/max APR per token
                                      const tokenAPRMap = new Map<string, { min: number; max: number }>();
                                      allSailRewardTokenAPRs.forEach(({ symbol, apr }) => {
                                        if (!tokenAPRMap.has(symbol)) {
                                          tokenAPRMap.set(symbol, { min: apr, max: apr });
                                        } else {
                                          const existing = tokenAPRMap.get(symbol)!;
                                          tokenAPRMap.set(symbol, {
                                            min: Math.min(existing.min, apr),
                                            max: Math.max(existing.max, apr),
                                          });
                                        }
                                      });

                                      const uniqueTokens = Array.from(tokenAPRMap.entries()).map(([symbol, { min, max }]) => ({
                                        symbol,
                                        min,
                                        max,
                                        avg: (min + max) / 2,
                                      }));

                                      // Sort by average APR to show lowest first
                                      uniqueTokens.sort((a, b) => a.avg - b.avg);

                                      // Always show only MIN and MAX across all tokens
                                      const allAPRs = uniqueTokens.flatMap(t => [t.min, t.max]);
                                      const globalMin = Math.min(...allAPRs);
                                      const globalMax = Math.max(...allAPRs);
                                      
                                      // Find which tokens correspond to min and max
                                      const minToken = uniqueTokens.find(t => t.min === globalMin || t.max === globalMin) || uniqueTokens[0];
                                      const maxToken = uniqueTokens.find(t => t.min === globalMax || t.max === globalMax) || uniqueTokens[uniqueTokens.length - 1];

                                      if (uniqueTokens.length === 1) {
                                        const token = uniqueTokens[0];
                                        return (
                                          <div>
                                            <div className="font-semibold">• Sail Pool:</div>
                                            <div className="ml-2 mt-0.5">
                                              {token.min === token.max
                                                ? `${token.min.toFixed(2)}%`
                                                : `${token.min.toFixed(2)}% - ${token.max.toFixed(2)}%`}
                                              {" "}({token.symbol})
                                            </div>
                                          </div>
                                        );
                                      }

                                      // Multiple tokens - show only MIN and MAX
                                      return (
                                        <div>
                                          <div className="font-semibold">• Sail Pool:</div>
                                          <div className="ml-2 mt-0.5">
                                            {globalMin.toFixed(2)}% ({minToken.symbol}) -{" "}
                                            {globalMax.toFixed(2)}% ({maxToken.symbol})
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}
                                {/* Only show Projected APR if we don't have LIVE APRs (and live APRs are not loading) */}
                                {!showLiveAprLoading &&
                                  !isErrorAllRewards &&
                                  !projectedAPR.hasRewardsNoTVL &&
                                  minAPR === 0 && maxAPR === 0 &&
                                  (projectedAPR.collateralPoolAPR !== null ||
                                    projectedAPR.leveragedPoolAPR !== null) && (
                                    <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-90">
                                      <div className="font-semibold mb-1">
                                        Projected APR (next 7 days)
                                      </div>
                                      <div className="space-y-1">
                                        <div>
                                          • Collateral Pool:{" "}
                                          {projectedAPR.collateralPoolAPR !==
                                          null
                                            ? `${projectedAPR.collateralPoolAPR.toFixed(
                                                2
                                              )}%`
                                            : "-"}
                                        </div>
                                        <div>
                                          • Sail Pool:{" "}
                                          {projectedAPR.leveragedPoolAPR !==
                                          null
                                            ? `${projectedAPR.leveragedPoolAPR.toFixed(
                                                2
                                              )}%`
                                            : "-"}
                                        </div>
                                      </div>
                                      {projectedAPR.harvestableAmount !==
                                        null &&
                                        projectedAPR.harvestableAmount > 0n && (
                                          <div className="mt-1 text-xs opacity-80">
                                            Based on{" "}
                                            {(
                                              Number(
                                                projectedAPR.harvestableAmount
                                              ) / 1e18
                                            ).toFixed(4)}
                                            {" "}
                                            wstETH harvestable.
                                            {projectedAPR.remainingDays !==
                                              null &&
                                              ` ~${projectedAPR.remainingDays.toFixed(
                                                1
                                              )} days until harvest.`}
                                          </div>
                                        )}
                                    </div>
                                  )}
                              </div>
                            }
                          >
                            <span
                              className={`font-medium text-xs font-mono cursor-help ${
                                projectedAPR.hasRewardsNoTVL
                                  ? "text-green-600 font-bold"
                                  : "text-[#1E4775]"
                              }`}
                            >
                              {(() => {
                                if (showLiveAprLoading) {
                                  return "Loading";
                                }
                                // Special case: rewards waiting with no TVL
                                if (projectedAPR.hasRewardsNoTVL) {
                                  return "10k%+";
                                }

                                const hasCurrentAPR = minAPR > 0 || maxAPR > 0;
                                const hasProjectedAPR =
                                  (minProjectedAPR !== null &&
                                    minProjectedAPR > 0) ||
                                  (maxProjectedAPR !== null &&
                                    maxProjectedAPR > 0);

                                const formatRange = (
                                  min: number,
                                  max: number
                                ): string => {
                                  if (min > 0 && min !== max) {
                                    return `${min.toFixed(1)}% - ${max.toFixed(
                                      1
                                    )}%`;
                                  }
                                  return `${max.toFixed(1)}%`;
                                };

                                const currentStr = hasCurrentAPR
                                  ? formatRange(minAPR, maxAPR)
                                  : "";

                                const projMin =
                                  minProjectedAPR !== null
                                    ? minProjectedAPR
                                    : maxProjectedAPR ?? 0;
                                const projMax =
                                  maxProjectedAPR !== null
                                    ? maxProjectedAPR
                                    : minProjectedAPR ?? 0;
                                const projectedStr = hasProjectedAPR
                                  ? formatRange(projMin, projMax)
                                  : "";

                                if (!hasCurrentAPR && !hasProjectedAPR) {
                                  return "-";
                                }

                                if (!hasCurrentAPR && hasProjectedAPR) {
                                  return projectedStr ? `Proj\n${projectedStr}` : "-";
                                  }

                                // Don't show projected APR if we have LIVE APRs
                                if (hasCurrentAPR) {
                                  return currentStr || "-";
                                }

                                return currentStr || "-";
                              })()}
                            </span>
                          </SimpleTooltip>
                        </div>
                        <div
                          className="text-center min-w-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[#1E4775] font-bold text-sm font-mono">
                            {combinedRewardsUSD > 0
                              ? `$${combinedRewardsUSD.toFixed(2)}`
                              : "-"}
                          </div>
                        </div>
                        <RewardTokensDisplay
                          collateralPool={collateralPoolAddress}
                          sailPool={sailPoolAddress}
                        />
                        <div className="text-center min-w-0">
                          <span className="text-[#1E4775] font-medium text-xs font-mono">
                            {combinedPositionUSD > 0
                              ? formatCompactUSD(combinedPositionUSD)
                              : combinedPositionTokens > 0
                              ? `${combinedPositionTokens.toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 2 }
                                )} ${symbol}`
                              : "-"}
                          </span>
                        </div>
                        <div
                          className="text-center min-w-0 flex items-center justify-center gap-1.5 pr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Find the wrappedRate from marketsData for each market
                              const enrichedAllMarkets = marketList.map((m) => {
                                const marketData = marketsData.find(
                                  (md) => md.marketId === m.marketId
                                );
                                return {
                                  marketId: m.marketId,
                                  market: {
                                    ...m.market,
                                    wrappedRate: marketData?.wrappedRate,
                                  },
                                };
                              });

                              setManageModal({
                                marketId: marketList[0].marketId,
                                market: {
                                  ...marketList[0].market,
                                  wrappedRate: marketsData.find(
                                    (md) =>
                                      md.marketId === marketList[0].marketId
                                  )?.wrappedRate,
                                },
                                initialTab: "deposit",
                                simpleMode: true,
                                bestPoolType: "collateral",
                                allMarkets: enrichedAllMarkets,
                              });
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-[#1E4775] text-white hover:bg-[#17395F] transition-colors rounded-full whitespace-nowrap"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded View - Show all markets in group */}
                    {isExpanded && (
                      <div className="bg-[rgb(var(--surface-selected-rgb))] p-4 border-t border-white/20">
                        {/* Consolidated Your Positions - shown once for the group */}
                        {(() => {
                          // Aggregate pool deposits across all markets (wallet balances shown in separate section)
                          const haSymbol =
                            activeMarketsData[0]?.market?.peggedToken?.symbol || "ha";

                          // Aggregate pool deposits across all markets
                          let totalCollateralPoolDeposit = 0n;
                          let totalCollateralPoolDepositUSD = 0;
                          let totalSailPoolDeposit = 0n;
                          let totalSailPoolDepositUSD = 0;

                          // Collect all withdrawal requests for this group
                          const groupWithdrawalRequests: typeof withdrawalRequests =
                            [];

                          activeMarketsData.forEach((md) => {
                            if (
                              md.collateralPoolDeposit &&
                              md.collateralPoolDeposit > 0n
                            ) {
                              totalCollateralPoolDeposit +=
                                md.collateralPoolDeposit;
                              totalCollateralPoolDepositUSD +=
                                md.collateralPoolDepositUSD || 0;
                            }
                            if (md.sailPoolDeposit && md.sailPoolDeposit > 0n) {
                              totalSailPoolDeposit += md.sailPoolDeposit;
                              totalSailPoolDepositUSD +=
                                md.sailPoolDepositUSD || 0;
                            }
                            // Collect withdrawal requests for this market
                            const marketRequests = withdrawalRequests.filter(
                              (req) =>
                                req.poolAddress.toLowerCase() ===
                                  md.market.addresses?.stabilityPoolCollateral?.toLowerCase() ||
                                req.poolAddress.toLowerCase() ===
                                  md.market.addresses?.stabilityPoolLeveraged?.toLowerCase()
                            );
                            groupWithdrawalRequests.push(...marketRequests);
                          });

                          const hasGroupPositions =
                            totalCollateralPoolDepositUSD > 0 ||
                            totalSailPoolDepositUSD > 0 ||
                            totalCollateralPoolDeposit > 0n ||
                            totalSailPoolDeposit > 0n;

                          if (
                            !hasGroupPositions &&
                            groupWithdrawalRequests.length === 0
                          ) {
                            return null;
                          }

                          return (
                            <div className="mb-4">
                              {/* Withdrawal requests for the group */}
                              {groupWithdrawalRequests.length > 0 && (
                                <div className="bg-white border border-[#1E4775]/10 shadow-sm p-3 space-y-2 mb-3">
                                  <div className="text-[10px] text-[#1E4775]/70 font-semibold uppercase tracking-wide">
                                    Withdrawal Requests
                                  </div>
                                  <div className="space-y-1.5">
                                    {groupWithdrawalRequests.map((request) => {
                                      // Find the market this request belongs to
                                      const requestMarket =
                                        activeMarketsData.find(
                                          (md) =>
                                            request.poolAddress.toLowerCase() ===
                                              md.market.addresses?.stabilityPoolCollateral?.toLowerCase() ||
                                            request.poolAddress.toLowerCase() ===
                                              md.market.addresses?.stabilityPoolLeveraged?.toLowerCase()
                                        );
                                      const isCollateralPool =
                                        request.poolAddress.toLowerCase() ===
                                        requestMarket?.market.addresses?.stabilityPoolCollateral?.toLowerCase();
                                      const poolType = isCollateralPool
                                        ? "collateral"
                                        : "sail";
                                      const startSec = Number(request.start);
                                      const endSec = Number(request.end);
                                      const isWindowOpen =
                                        request.status === "window";
                                      const countdownTarget =
                                        request.status === "waiting"
                                          ? startSec
                                          : endSec;
                                      
                                      const countdownLabel =
                                        request.status === "waiting"
                                          ? "Withdraw window opens"
                                          : request.status === "window"
                                          ? "Window closes in"
                                          : "Window expired";
                                      // Format time remaining without "ends in" prefix for waiting windows
                                      const formatTimeOnly = (
                                        endDate: Date,
                                        currentDate: Date
                                      ): string => {
                                        const diffMs = endDate.getTime() - currentDate.getTime();
                                        if (diffMs <= 0) return "Ended";
                                        
                                        const diffHours = diffMs / (1000 * 60 * 60);
                                        const diffDays = diffHours / 24;
                                        const diffMinutes = diffMs / (1000 * 60);
                                        
                                        if (diffDays >= 2) {
                                          return `${diffDays.toFixed(1)} days`;
                                        } else if (diffHours >= 2) {
                                          return `${diffHours.toFixed(1)} hours`;
                                        } else {
                                          return `${diffMinutes.toFixed(0)} minutes`;
                                        }
                                      };
                                      
                                      const countdownText =
                                        countdownTarget > 0
                                          ? request.status === "waiting"
                                            ? formatTimeOnly(
                                                new Date(countdownTarget * 1000),
                                                request.currentTime
                                                  ? new Date(
                                                      Number(request.currentTime) * 1000
                                                    )
                                                  : new Date()
                                              )
                                            : formatTimeRemaining(
                                                new Date(
                                                  countdownTarget * 1000
                                                ).toISOString(),
                                                request.currentTime
                                                  ? new Date(
                                                      Number(
                                                        request.currentTime
                                                      ) * 1000
                                                    )
                                                  : new Date()
                                              )
                                          : "Ended";

                                      return (
                                        <div
                                          key={`${
                                            request.poolAddress
                                          }-${request.start.toString()}`}
                                          className="p-2 bg-[#FF8A7A]/10 border border-[#FF8A7A]/30 text-xs flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                            <span className="text-[#1E4775] font-semibold">
                                              {poolType === "collateral"
                                                ? "Collateral"
                                                : "Sail"}{" "}
                                              Pool
                                              {requestMarket &&
                                                activeMarketsData.length >
                                                  1 && (
                                                  <span className="text-[#1E4775]/50 ml-1">
                                                    (
                                                    {requestMarket.market
                                                      .collateral?.symbol ||
                                                      "?"}
                                                    )
                                                  </span>
                                                )}
                                            </span>
                                            <span
                                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                                request.status === "window"
                                                  ? "bg-green-200 text-green-800 border-green-500"
                                                  : request.status === "waiting"
                                                  ? "bg-amber-200 text-amber-800 border-amber-500"
                                                  : "bg-gray-200 text-gray-700 border-gray-400"
                                              }`}
                                            >
                                              {request.status === "window"
                                                ? "Open"
                                                : request.status === "waiting"
                                                ? "Waiting"
                                                : "Expired"}
                                            </span>
                                            <span className="text-[11px] text-[#1E4775]/70">
                                              {request.status === "waiting"
                                                ? `${countdownLabel} ${countdownText}`
                                                : `${countdownLabel}: ${countdownText}`
                                              }
                                            </span>
                                          </div>
                                          <div className="flex gap-1.5">
                                            <button
                                              onClick={async () => {
                                                if (isWindowOpen) {
                                                  setWithdrawAmountInput("");
                                                  setWithdrawAmountError(null);
                                                  const maxAmount =
                                                    poolType === "collateral"
                                                      ? requestMarket?.collateralPoolDeposit
                                                      : requestMarket?.sailPoolDeposit;
                                                  setWithdrawAmountModal({
                                                    poolAddress:
                                                      request.poolAddress,
                                                    poolType,
                                                    useEarly: false,
                                                    symbol: haSymbol,
                                                    maxAmount: maxAmount || 0n,
                                                  });
                                                } else {
                                                  setEarlyWithdrawModal({
                                                    poolAddress:
                                                      request.poolAddress,
                                                    poolType,
                                                    start: request.start,
                                                    end: request.end,
                                                    earlyWithdrawFee:
                                                      request.earlyWithdrawFee,
                                                    symbol: haSymbol,
                                                    poolBalance:
                                                      (poolType === "collateral"
                                                        ? requestMarket?.collateralPoolDeposit
                                                        : requestMarket?.sailPoolDeposit) ||
                                                      0n,
                                                  });
                                                }
                                              }}
                                              className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                                                isWindowOpen
                                                  ? "bg-[#1E4775] text-white hover:bg-[#17395F]"
                                                  : "bg-orange-500 text-white hover:bg-orange-600"
                                              } transition-colors whitespace-nowrap`}
                                            >
                                              Withdraw
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Your Positions - consolidated (only stability pool deposits) */}
                              {hasGroupPositions && (
                                <div className="bg-white border border-[#1E4775]/10 shadow-sm p-3 space-y-2">
                                  <div className="text-[10px] text-[#1E4775]/70 font-semibold uppercase tracking-wide">
                                    Your Positions
                                  </div>
                                  <div className="space-y-2">
                                    {(() => {
                                      // Show one row per (marketId, poolType) so we don't collapse positions
                                      // across different markets in the same ha-token group.
                                      const hasMultipleMarkets =
                                        activeMarketsData.length > 1;

                                      const rows: Array<{
                                        key: string;
                                        label: string;
                                        deposit: bigint;
                                        depositUSD: number;
                                      }> = [];

                                      activeMarketsData.forEach((md) => {
                                        const marketLabel =
                                          md.market?.collateral?.symbol ||
                                          md.marketId;

                                        if (
                                          md.collateralPoolDeposit &&
                                          md.collateralPoolDeposit > 0n
                                        ) {
                                          rows.push({
                                            key: `${md.marketId}-collateral`,
                                            label: `Collateral Pool${
                                              hasMultipleMarkets
                                                ? ` (${marketLabel})`
                                                : ""
                                            }`,
                                            deposit: md.collateralPoolDeposit,
                                            depositUSD:
                                              md.collateralPoolDepositUSD || 0,
                                          });
                                        }

                                        if (
                                          md.sailPoolDeposit &&
                                          md.sailPoolDeposit > 0n
                                        ) {
                                          rows.push({
                                            key: `${md.marketId}-sail`,
                                            label: `Sail Pool${
                                              hasMultipleMarkets
                                                ? ` (${marketLabel})`
                                                : ""
                                            }`,
                                            deposit: md.sailPoolDeposit,
                                            depositUSD: md.sailPoolDepositUSD || 0,
                                          });
                                        }
                                      });

                                      if (rows.length === 0) return null;

                                      return rows.map((r) => (
                                        <div
                                          key={r.key}
                                          className="flex justify-between items-center text-xs"
                                        >
                                          <span className="text-[#1E4775]/70">
                                            {r.label}:
                                          </span>
                                          <div className="text-right">
                                            <div className="font-semibold text-[#1E4775] font-mono">
                                              {formatCompactUSD(r.depositUSD)}
                                            </div>
                                            <div className="text-[10px] text-[#1E4775]/50 font-mono">
                                              {formatToken(r.deposit)} {haSymbol}
                                            </div>
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {activeMarketsData.map((marketData) => {
                          // Get volatility protection from hook data
                          const minterAddr =
                            marketData.minterAddress?.toLowerCase();
                          const volProtData = minterAddr
                            ? volProtectionData?.get(minterAddr)
                            : undefined;
                          const volatilityProtection =
                            volProtData?.protection ?? "-";

                          // Format min collateral ratio
                          const minCollateralRatioFormatted =
                            marketData.minCollateralRatio
                              ? `${(
                                  Number(marketData.minCollateralRatio) / 1e16
                                ).toFixed(2)}%`
                              : "-";

                          // Detect if this is an fxUSD market
                          const collateralSymbol =
                            marketData.market.collateral?.symbol?.toLowerCase() ||
                            "";
                          const isFxUSDMarket =
                            collateralSymbol === "fxusd" ||
                            collateralSymbol === "fxsave";

                          // Get collateral price from the hook (same logic as genesis page)
                          const collateralPriceOracleAddress = marketData.market.addresses?.collateralPrice as
                            | `0x${string}`
                            | undefined;
                          const collateralPriceData = collateralPriceOracleAddress
                            ? collateralPricesMap.get(collateralPriceOracleAddress.toLowerCase())
                            : undefined;

                          // Get underlying price from hook (this is the underlying token price, e.g., fxUSD or stETH)
                          // NOTE: The oracle returns price in peg token units (ETH or BTC), not USD
                          let underlyingPriceUSD = collateralPriceData?.priceUSD || 0;
                          const wrappedRate = collateralPriceData?.maxRate || marketData.wrappedRate;
                          const wrappedRateNum = wrappedRate ? Number(wrappedRate) / 1e18 : 1;
                          
                          // Convert oracle price from peg token units to USD
                          // The oracle returns price in the peg token (ETH for ETH/fxUSD, BTC for BTC/fxUSD, etc.)
                          const pegTarget = (marketData.market as any)?.pegTarget?.toLowerCase();
                          const isBTCMarket = pegTarget === "btc" || pegTarget === "bitcoin";
                          const isETHMarket = pegTarget === "eth" || pegTarget === "ethereum";
                          
                          if (underlyingPriceUSD > 0) {
                            // Oracle price is in peg token units, convert to USD
                            if (isBTCMarket) {
                              // Prefer Chainlink-backed btcPrice (from useAnchorPrices) over CoinGecko-only map.
                              const btcPriceUSD = btcPrice || 0;
                              if (btcPriceUSD > 0) {
                                underlyingPriceUSD = underlyingPriceUSD * btcPriceUSD;
                              } else {
                                // Can't convert, use 0
                                underlyingPriceUSD = 0;
                              }
                            } else if (isETHMarket) {
                              if (ethPrice && ethPrice > 0) {
                                underlyingPriceUSD = underlyingPriceUSD * ethPrice;
                              } else {
                                // Can't convert, use 0
                                underlyingPriceUSD = 0;
                              }
                            }
                            // For other markets, assume oracle already returns USD price
                          }
                          
                          // Fallback: For fxUSD markets, if we couldn't calculate from oracle, use $1.00
                          if (isFxUSDMarket && underlyingPriceUSD === 0) {
                            underlyingPriceUSD = 1.0;
                          }
                          
                          // Check if CoinGecko has the wrapped token price directly
                          const marketCoinGeckoId = (marketData.market as any)?.coinGeckoId as string | undefined;
                          const coinGeckoReturnedPrice = marketCoinGeckoId && coinGeckoPrices?.[marketCoinGeckoId];
                          
                          // Check if CoinGecko returned a price for the wrapped token (fxSAVE or wstETH)
                          const isWstETH = collateralSymbol.toLowerCase() === "wsteth";
                          const isFxSAVE = collateralSymbol.toLowerCase() === "fxsave";
                          const coinGeckoIsWrappedToken =
                            coinGeckoReturnedPrice &&
                            marketCoinGeckoId &&
                            ((marketCoinGeckoId.toLowerCase() === "wrapped-steth" && isWstETH) ||
                              ((marketCoinGeckoId.toLowerCase() === "fx-usd-saving" || marketCoinGeckoId.toLowerCase() === "fxsave") && isFxSAVE));
                          
                          // Fallback: Use stETH price from CoinGecko if wstETH price isn't available yet
                          const stETHPrice = coinGeckoPrices?.["lido-staked-ethereum-steth"];
                          const useStETHFallback =
                            isWstETH &&
                            !coinGeckoIsWrappedToken &&
                            underlyingPriceUSD === 0 &&
                            stETHPrice &&
                            stETHPrice > 0 &&
                            wrappedRate &&
                            wrappedRate > 0n;
                          
                          // Calculate wrapped token price (same logic as genesis page)
                          // collateralValue is in wrapped tokens, so we need wrapped token price
                          let wrappedTokenPriceUSD = 0;
                          if (coinGeckoIsWrappedToken && coinGeckoReturnedPrice && coinGeckoReturnedPrice > 0) {
                            // CoinGecko already returns wrapped token price (e.g., wstETH, fxSAVE)
                            wrappedTokenPriceUSD = coinGeckoReturnedPrice;
                          } else if (useStETHFallback) {
                            // Use stETH price * wrapped rate as fallback while wstETH loads
                            wrappedTokenPriceUSD = stETHPrice * wrappedRateNum;
                          } else if ((isWstETH || isFxSAVE) && coinGeckoLoading && marketCoinGeckoId && underlyingPriceUSD > 0 && wrappedRate) {
                            // While CoinGecko loads, use oracle * wrapped rate for wstETH or fxSAVE
                            wrappedTokenPriceUSD = underlyingPriceUSD * wrappedRateNum;
                          } else if (wrappedRate && underlyingPriceUSD > 0) {
                            // Multiply underlying by wrapped rate (e.g., fxUSD -> fxSAVE, stETH -> wstETH)
                            wrappedTokenPriceUSD = underlyingPriceUSD * wrappedRateNum;
                          } else if (coinGeckoLoading && marketCoinGeckoId) {
                            // Still loading CoinGecko, don't use fallback price yet
                            wrappedTokenPriceUSD = 0;
                          } else if (isFxSAVE) {
                            // Hardcoded fallback for fxSAVE if everything fails
                            wrappedTokenPriceUSD = 1.07;
                          } else if (underlyingPriceUSD > 0) {
                            // Fallback to underlying price if no wrapped rate
                            wrappedTokenPriceUSD = underlyingPriceUSD;
                          }
                          
                          // Use wrapped token price for collateral value calculation (same as genesis page)
                          const collateralPriceUSD = wrappedTokenPriceUSD;

                          // Get user's position data for price calculation
                          const positionData =
                            marketPositions[marketData.marketId];

                          // Total ha tokens: Use totalDebt (total supply, matches peggedTokenBalance from minter)
                          const totalHaTokens =
                            marketData.totalDebt !== undefined
                              ? Number(marketData.totalDebt) / 1e18
                              : 0;

                          // Collateral value calculation
                          // IMPORTANT: Minter.collateralTokenBalance() / collateralValue is returned in **underlying-equivalent units**
                          // - fxUSD markets: returned value is in fxUSD units (even though the minter holds fxSAVE)
                          // - wstETH markets: returned value is in stETH units (even though the minter holds wstETH)
                          // This matches on-chain behavior: underlyingEq = wrappedBalance * wrappedRate (where wrappedRate is underlying per wrapped).
                          const collateralTokensUnderlyingEq =
                            marketData.collateralValue !== undefined
                              ? Number(marketData.collateralValue) / 1e18
                              : 0;

                          const collateralTokensWrapped =
                            wrappedRateNum > 0
                              ? collateralTokensUnderlyingEq / wrappedRateNum
                              : collateralTokensUnderlyingEq;
                          
                          // Removed debug logging

                          // Calculate collateral value USD.
                          // We compute USD from the wrapped token price (fxSAVE/wstETH) and convert the underlying-equivalent amount back to wrapped.
                          let collateralValueUSD = 0;
                          if (collateralTokensWrapped > 0 && collateralPriceUSD > 0) {
                            collateralValueUSD =
                              collateralTokensWrapped * collateralPriceUSD;
                          }

                          // Calculate total debt in USD (same calculation as market position)
                          // Use peggedPriceUSDMap which contains USD prices (already converted)
                          // This matches how useMarketPositions calculates walletHaUSD
                          const usdPriceFromMap =
                            peggedPriceUSDMap[marketData.marketId];
                          const peggedPriceUSD =
                            usdPriceFromMap && usdPriceFromMap > 0n
                              ? Number(usdPriceFromMap) / 1e18
                              : positionData?.peggedTokenPrice &&
                                positionData.peggedTokenPrice > 0n
                              ? Number(positionData.peggedTokenPrice) / 1e18
                              : marketData.peggedTokenPrice &&
                                marketData.peggedTokenPrice > 0n
                              ? Number(marketData.peggedTokenPrice) / 1e18
                              : 1; // Default to $1 peg
                          // Use same calculation as positionData.walletHaUSD
                          const totalDebtUSD = totalHaTokens * peggedPriceUSD;

                          return (
                            <React.Fragment key={marketData.marketId}>
                            <div
                              className="bg-white p-2 mb-2 border border-[#1E4775]/10"
                            >
                              <div className="flex items-center justify-end mb-2">
                                <button
                                  onClick={() =>
                                    setContractAddressesModal({
                                      marketId: marketData.marketId,
                                      market: marketData.market,
                                      minterAddress: marketData.minterAddress,
                                    })
                                  }
                                  className="text-[#1E4775]/60 hover:text-[#1E4775] text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  <span>Contracts</span>
                                  <ArrowRightIcon className="w-3 h-3" />
                                </button>
                              </div>
                              {(() => {
                                // Calculate TVL in USD for both pools from stability pool contracts
                                // Use the same CR-aware USD pricing as positions (prefer peggedPriceUSDMap; fallback to contract reads)
                                const tvlUsdPriceFromMap =
                                  peggedPriceUSDMap[marketData.marketId];
                                // Extra robustness: if the USD map is missing/zero for haBTC/haETH,
                                // fall back to CoinGecko peg-target USD price.
                                const peggedSymbolLower =
                                  marketData.market?.peggedToken?.symbol
                                    ?.toLowerCase?.() || "";
                                const btcUsdFallback = btcPrice || 0;
                                const ethUsdFallback = ethPrice || 0;

                                const peggedPriceUSD =
                                  tvlUsdPriceFromMap && tvlUsdPriceFromMap > 0n
                                    ? Number(tvlUsdPriceFromMap) / 1e18
                                    : peggedSymbolLower.includes("btc") &&
                                      btcUsdFallback > 0
                                    ? btcUsdFallback
                                    : peggedSymbolLower.includes("eth") &&
                                      ethUsdFallback > 0
                                    ? ethUsdFallback
                                    : positionData?.peggedTokenPrice &&
                                      positionData.peggedTokenPrice > 0n
                                    ? Number(positionData.peggedTokenPrice) / 1e18
                                    : marketData.peggedTokenPrice &&
                                      marketData.peggedTokenPrice > 0n
                                    ? Number(marketData.peggedTokenPrice) / 1e18
                                    : 1; // fallback to $1 peg if price missing

                                const collateralPoolTVLTokens =
                                  marketData.collateralPoolTVL
                                    ? Number(marketData.collateralPoolTVL) /
                                      1e18
                                    : 0;
                                const collateralPoolTVLUSD =
                                  collateralPoolTVLTokens * peggedPriceUSD;

                                const sailPoolTVLTokens = marketData.sailPoolTVL
                                  ? Number(marketData.sailPoolTVL) / 1e18
                                  : 0;
                                const sailPoolTVLUSD =
                                  sailPoolTVLTokens * peggedPriceUSD;

                                // Dev-only debug to validate TVL reads, especially right after new pool deployments.
                                if (process.env.NODE_ENV === "development") {
                                  // eslint-disable-next-line no-console
                                  console.log("[Anchor][TVL]", {
                                    marketId: marketData.marketId,
                                    collateralPoolTVL: marketData.collateralPoolTVL?.toString(),
                                    sailPoolTVL: marketData.sailPoolTVL?.toString(),
                                    peggedPriceUSD,
                                  });
                                }

                                // Calculate APR values for display
                                const collateralPoolAddress = (marketData.market as any)?.addresses
                                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                                const sailPoolAddress = (marketData.market as any)?.addresses
                                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;
                                
                                const collateralPoolReward = collateralPoolAddress
                                  ? poolRewardsMap.get(collateralPoolAddress)
                                  : undefined;
                                const sailPoolReward = sailPoolAddress
                                  ? poolRewardsMap.get(sailPoolAddress)
                                  : undefined;

                                // Get APR values - use rewardTokenAPRs for per-token breakdown, or totalRewardAPR for single value
                                const collateralPoolAPR = collateralPoolReward?.totalRewardAPR || 0;
                                const sailPoolAPR = sailPoolReward?.totalRewardAPR || 0;

                                return (
                                  <>
                                    {/* Row 1: Collateral, Min CR, Vol. Protection, Collateral Pool TVL, Sail Pool TVL */}
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 mb-1.5">
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                          Collateral
                                        </div>
                                        <div className="text-xs font-semibold text-[#1E4775]">
                                          {marketData.market.collateral?.symbol ||
                                            "ETH"}
                                        </div>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                          Min CR
                                        </div>
                                        <div className="text-xs font-semibold text-[#1E4775]">
                                          {minCollateralRatioFormatted}
                                        </div>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5 flex items-center justify-center gap-1">
                                          Vol. Protection
                                          <SimpleTooltip
                                            side="top"
                                            label={
                                              <div className="space-y-2">
                                                <p className="font-semibold mb-1">
                                                  Volatility Protection
                                                </p>
                                                <p>
                                                  The percentage adverse price
                                                  movement between collateral and
                                                  the pegged token that the system
                                                  can withstand before reaching
                                                  the depeg point (100% collateral
                                                  ratio).
                                                </p>
                                                <p>
                                                  For example, an ETH-pegged token
                                                  with USD collateral is protected
                                                  against ETH price spikes (ETH
                                                  becoming more expensive relative
                                                  to USD).
                                                </p>
                                                <p>
                                                  This accounts for stability
                                                  pools that can rebalance and
                                                  improve the collateral ratio
                                                  during adverse price movements.
                                                </p>
                                                <p className="text-xs text-gray-400 italic">
                                                  Higher percentage = more
                                                  protection. Assumes no
                                                  additional deposits or
                                                  withdrawals.
                                                </p>
                                              </div>
                                            }
                                          >
                                            <span className="text-[#1E4775]/30 cursor-help">
                                              [?]
                                            </span>
                                          </SimpleTooltip>
                                        </div>
                                        <div className="text-xs font-semibold text-[#1E4775]">
                                          {volatilityProtection}
                                        </div>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                          Collateral Pool TVL
                                        </div>
                                        <SimpleTooltip
                                          label={
                                            collateralPoolTVLTokens > 0
                                              ? `${collateralPoolTVLTokens.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  }
                                                )} ${
                                                  marketData.market.peggedToken
                                                    ?.symbol || "ha"
                                                }`
                                              : "No deposits"
                                          }
                                        >
                                          <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                            {collateralPoolTVLUSD > 0
                                              ? collateralPoolTVLUSD < 100
                                                ? `$${collateralPoolTVLUSD.toFixed(2)}`
                                                : formatCompactUSD(collateralPoolTVLUSD)
                                              : collateralPoolTVLUSD === 0
                                              ? "$0.00"
                                              : "-"}
                                          </div>
                                        </SimpleTooltip>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                          Sail Pool TVL
                                        </div>
                                        <SimpleTooltip
                                          label={
                                            sailPoolTVLTokens > 0
                                              ? `${sailPoolTVLTokens.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  }
                                                )} ${
                                                  marketData.market.peggedToken
                                                    ?.symbol || "ha"
                                                }`
                                              : "No deposits"
                                          }
                                        >
                                          <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                            {sailPoolTVLUSD > 0
                                              ? sailPoolTVLUSD < 100
                                                ? `$${sailPoolTVLUSD.toFixed(2)}`
                                                : formatCompactUSD(sailPoolTVLUSD)
                                              : sailPoolTVLUSD === 0
                                              ? "$0.00"
                                              : "-"}
                                          </div>
                                        </SimpleTooltip>
                                      </div>
                                    </div>

                                    {/* Row 2: Collateral (USD), Current CR, Total haETH, Collateral Pool APR, Sail Pool APR */}
                                    <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                          Collateral (USD)
                                        </div>
                                        <SimpleTooltip
                                          label={
                                            <div className="space-y-1">
                                              <div>
                                                {collateralTokensUnderlyingEq.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          }
                                              )}{" "}
                                                {marketData.market.collateral
                                                  ?.underlyingSymbol ||
                                                  (isFxUSDMarket ? "fxUSD" : "stETH")}{" "}
                                                (underlying)
                                              </div>
                                              <div className="text-white/70">
                                                {collateralTokensWrapped.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  }
                                                )}{" "}
                                                {marketData.market.collateral
                                                  ?.symbol || "ETH"}{" "}
                                                (wrapped)
                                              </div>
                                            </div>
                                          }
                                        >
                                          <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                            {collateralValueUSD > 0
                                              ? `$${collateralValueUSD < 100
                                                  ? collateralValueUSD.toFixed(2)
                                                  : collateralValueUSD.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 0,
                                                  }
                                                )}`
                                              : collateralValueUSD === 0
                                              ? "$0.00"
                                              : "-"}
                                          </div>
                                        </SimpleTooltip>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                          Current CR
                                        </div>
                                        <div className="text-xs font-semibold text-[#1E4775]">
                                          {formatRatio(
                                            marketData.collateralRatio
                                          )}
                                        </div>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5">
                                          Total{" "}
                                          {marketData.market.peggedToken
                                            ?.symbol || "ha"}
                                        </div>
                                        <SimpleTooltip
                                          label={
                                            totalDebtUSD > 0
                                              ? `$${totalDebtUSD.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 0,
                                                  }
                                                )} USD`
                                              : "No tokens minted"
                                          }
                                        >
                                          <div className="text-xs font-semibold text-[#1E4775] cursor-help">
                                            {totalHaTokens > 0
                                              ? totalHaTokens.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits: 4,
                                                    maximumFractionDigits: 4,
                                                  }
                                                )
                                              : totalHaTokens === 0
                                              ? "0.0000"
                                              : "-"}
                                          </div>
                                        </SimpleTooltip>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5 flex items-center justify-center gap-1">
                                          Collateral Pool APR
                                          <SimpleTooltip
                                            side="top"
                                            label={
                                              <div className="space-y-2">
                                                <p className="font-semibold mb-1">
                                                  Collateral Pool APR Calculation
                                                </p>
                                                <p>
                                                  The APR is calculated from reward rates for all active reward tokens (e.g., fxSAVE, wstETH) in the pool.
                                                </p>
                                                <p className="font-semibold mt-2">
                                                  Formula:
                                                </p>
                                                <p className="text-xs font-mono bg-white/10 p-2 rounded">
                                                  APR = (Annual Rewards Value USD / Deposit Value USD) × 100
                                                </p>
                                                <p className="text-xs mt-2">
                                                  Where:
                                                </p>
                                                <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                                                  <li>Annual Rewards = (rewardRate × seconds_per_year) / 1e18 × rewardTokenPriceUSD</li>
                                                  <li>Deposit Value = (poolTVL / 1e18) × depositTokenPriceUSD</li>
                                                  <li>All reward tokens' APRs are summed to get the total APR</li>
                                                </ul>
                                                <p className="text-xs text-gray-400 italic mt-2">
                                                  The APR reflects the annualized return from all reward tokens currently streaming into the pool.
                                                </p>
                                              </div>
                                            }
                                          >
                                            <span className="text-[#1E4775]/30 cursor-help">
                                              [?]
                                            </span>
                                          </SimpleTooltip>
                                        </div>
                                        <div className="text-xs font-semibold text-[#1E4775]">
                                          {showLiveAprLoading
                                            ? "Loading"
                                            : collateralPoolAPR > 0
                                            ? `${collateralPoolAPR.toFixed(2)}%`
                                            : "-"}
                                        </div>
                                      </div>
                                      <div className="bg-[#1E4775]/5 p-1.5 text-center">
                                        <div className="text-[10px] text-[#1E4775]/70 mb-0.5 flex items-center justify-center gap-1">
                                          Sail Pool APR
                                          <SimpleTooltip
                                            side="top"
                                            label={
                                              <div className="space-y-2">
                                                <p className="font-semibold mb-1">
                                                  Sail Pool APR Calculation
                                                </p>
                                                <p>
                                                  The APR is calculated from reward rates for all active reward tokens (e.g., fxSAVE, wstETH) in the pool.
                                                </p>
                                                <p className="font-semibold mt-2">
                                                  Formula:
                                                </p>
                                                <p className="text-xs font-mono bg-white/10 p-2 rounded">
                                                  APR = (Annual Rewards Value USD / Deposit Value USD) × 100
                                                </p>
                                                <p className="text-xs mt-2">
                                                  Where:
                                                </p>
                                                <ul className="text-xs space-y-1 list-disc list-inside ml-2">
                                                  <li>Annual Rewards = (rewardRate × seconds_per_year) / 1e18 × rewardTokenPriceUSD</li>
                                                  <li>Deposit Value = (poolTVL / 1e18) × depositTokenPriceUSD</li>
                                                  <li>All reward tokens' APRs are summed to get the total APR</li>
                                                </ul>
                                                <p className="text-xs text-gray-400 italic mt-2">
                                                  The APR reflects the annualized return from all reward tokens currently streaming into the pool.
                                                </p>
                                              </div>
                                            }
                                          >
                                            <span className="text-[#1E4775]/30 cursor-help">
                                              [?]
                                            </span>
                                          </SimpleTooltip>
                                        </div>
                                        <div className="text-xs font-semibold text-[#1E4775]">
                                          {showLiveAprLoading
                                            ? "Loading"
                                            : sailPoolAPR > 0
                                            ? `${sailPoolAPR.toFixed(2)}%`
                                            : "-"}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
                </>
              );
            })()}
          </section>
        </main>

        {manageModal && (
          <AnchorDepositWithdrawModal
            isOpen={!!manageModal}
            onClose={() => setManageModal(null)}
            marketId={manageModal.marketId}
            market={manageModal.market}
            initialTab={manageModal.initialTab || "mint"}
            simpleMode={true}
            bestPoolType={manageModal.bestPoolType || "collateral"}
            allMarkets={manageModal.allMarkets}
            initialDepositAsset={manageModal.initialDepositAsset}
            initialDepositAsset={manageModal.initialDepositAsset}
            onSuccess={async () => {
              // Wait for blockchain state to update
              await new Promise((resolve) => setTimeout(resolve, 2000));
              // Refetch all contract data
              await Promise.all([refetchReads(), refetchUserDeposits()]);
            }}
          />
        )}

        {compoundModal && (
          // Convert old compoundModal to new pool selection flow
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => setCompoundModal(null)}
            onConfirm={async (allocations) => {
              setCompoundModal(null);
              try {
                // Calculate reward amount from all pools
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                await handleCompoundConfirm(
                  compoundModal.market,
                  allocations,
                  totalRewardAmount
                );
              } catch (error: any) {
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={(() => {
              // Build pools array from the market
              const market = compoundModal.market;
              const collateralPoolAddress = market.addresses
                ?.stabilityPoolCollateral as `0x${string}` | undefined;
              const sailPoolAddress = market.addresses
                ?.stabilityPoolLeveraged as `0x${string}` | undefined;

              const pools: PoolOption[] = [];

              // Get pegged token price for TVL calculation
              let peggedTokenPrice: bigint | undefined;
              const marketIndex = anchorMarkets.findIndex(
                ([id]) =>
                  id === compoundModal.market.id ||
                  (compoundModal.market as any).addresses?.peggedToken
              );
              if (marketIndex >= 0 && reads) {
                let offset = 0;
                for (let i = 0; i < marketIndex; i++) {
                  const prevMarket = anchorMarkets[i][1];
                  const prevHasCollateral = !!(prevMarket as any).addresses
                    ?.stabilityPoolCollateral;
                  const prevHasSail = !!(prevMarket as any).addresses
                    ?.stabilityPoolLeveraged;
                  const prevHasPriceOracle = !!(prevMarket as any).addresses
                    ?.collateralPrice;
                  const prevHasStabilityPoolManager = !!(prevMarket as any)
                    .addresses?.stabilityPoolManager;
                  const prevPeggedTokenAddress = (prevMarket as any)?.addresses
                    ?.peggedToken;
                  offset += 5;
                  if (prevHasStabilityPoolManager) offset += 1;
                  if (prevHasCollateral) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasSail) {
                    offset += 4;
                    if (prevPeggedTokenAddress) offset += 1;
                  }
                  if (prevHasPriceOracle) offset += 1;
                }
                peggedTokenPrice = reads?.[offset + 3]?.result as
                  | bigint
                  | undefined;
              }

              if (collateralPoolAddress) {
                const collateralPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    collateralPoolAddress.toLowerCase()
                );
                const collateralPoolAPR = collateralPoolData?.totalAPR;

                let collateralTVLUSD: number | undefined;
                if (collateralPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(collateralPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  collateralTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "collateral",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Collateral Pool`,
                  address: collateralPoolAddress,
                  apr: collateralPoolAPR,
                  tvl: collateralPoolData?.tvl,
                  tvlUSD: collateralTVLUSD,
                  enabled: true,
                });
              }

              if (sailPoolAddress) {
                const sailPoolData = allPoolRewards?.find(
                  (r) =>
                    r.poolAddress.toLowerCase() ===
                    sailPoolAddress.toLowerCase()
                );
                const sailPoolAPR = sailPoolData?.totalAPR;

                let sailTVLUSD: number | undefined;
                if (sailPoolData?.tvl !== undefined && peggedTokenPrice) {
                  const tvlTokens = Number(sailPoolData.tvl) / 1e18;
                  const peggedPriceUSD = Number(peggedTokenPrice) / 1e18;
                  sailTVLUSD = tvlTokens * peggedPriceUSD;
                }

                pools.push({
                  id: "sail",
                  name: `${
                    compoundModal.market.peggedToken?.symbol ||
                    compoundModal.market.id
                  } Sail Pool`,
                  address: sailPoolAddress,
                  apr: sailPoolAPR,
                  tvl: sailPoolData?.tvl,
                  tvlUSD: sailTVLUSD,
                  enabled: true,
                });
              }

              return pools;
            })()}
            marketSymbol={
              compoundModal.market.peggedToken?.symbol ||
              compoundModal.market.id
            }
          />
        )}

        <AnchorClaimAllModal
          isOpen={isClaimAllModalOpen}
          onClose={() => setIsClaimAllModalOpen(false)}
          onBasicClaim={handleClaimAll}
          onCompound={(selectedPools) => {
            const selectedKey = new Set(
              selectedPools.map((p) => `${p.marketId}-${p.poolType}`)
            );
            const selectedPositions = claimAllPositions.filter((p) =>
              selectedKey.has(`${p.marketId}-${p.poolType}`)
            );

            const selectedMarketIds = Array.from(
              new Set(selectedPositions.map((p) => p.marketId))
            );

            // Build token options grouped by pegged token address, and include APRs for *all* pools across *all* markets for that token.
            const tokenAddrToRepresentativeMarketId = new Map<string, string>();
            for (const marketId of selectedMarketIds) {
              const market = anchorMarkets.find(([id]) => id === marketId)?.[1];
              const peggedTokenAddr = (market as any)?.addresses?.peggedToken as
                | `0x${string}`
                | undefined;
              if (!peggedTokenAddr) continue;
              if (!tokenAddrToRepresentativeMarketId.has(peggedTokenAddr.toLowerCase())) {
                tokenAddrToRepresentativeMarketId.set(peggedTokenAddr.toLowerCase(), marketId);
              }
            }

            const options: CompoundTargetOption[] = Array.from(
              tokenAddrToRepresentativeMarketId.entries()
            ).map(([peggedTokenAddrLower, representativeMarketId]) => {
              // Find *all* markets that share this pegged token
              const marketsForToken = anchorMarkets.filter(([_, m]) => {
                const p = (m as any)?.addresses?.peggedToken as `0x${string}` | undefined;
                return p && p.toLowerCase() === peggedTokenAddrLower;
              });

              const symbol =
                anchorMarkets.find(([id]) => id === representativeMarketId)?.[1]
                  ?.peggedToken?.symbol || representativeMarketId;

              const pools = marketsForToken.flatMap(([mid, m]) => {
                const collateralSymbol = (m as any)?.collateral?.symbol || "collateral";
                const collateralPoolAddress = (m as any).addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = (m as any).addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                // Prefer the APR used on the Anchor page (from `useAnchorMarketData`), which falls back to
                // contract APRs when live reward APRs are unavailable.
                const marketData = marketsDataMap.get(mid);
                const collateralAprFromMarketData =
                  marketData?.collateralPoolAPR
                    ? (marketData.collateralPoolAPR.collateral || 0) +
                      (marketData.collateralPoolAPR.steam || 0)
                    : undefined;
                const sailAprFromMarketData =
                  marketData?.sailPoolAPR
                    ? (marketData.sailPoolAPR.collateral || 0) +
                      (marketData.sailPoolAPR.steam || 0)
                    : undefined;

                const items: Array<{
                  marketId: string;
                  collateralSymbol: string;
                  poolType: "collateral" | "sail";
                  apr?: number;
                }> = [];

                if (collateralPoolAddress) {
                  const apr =
                    collateralAprFromMarketData ??
                    allPoolRewards?.find(
                      (r) =>
                        r.poolAddress.toLowerCase() ===
                        collateralPoolAddress.toLowerCase()
                    )?.totalAPR;
                  items.push({
                    marketId: mid,
                    collateralSymbol,
                    poolType: "collateral",
                    poolAddress: collateralPoolAddress,
                    apr,
                  });
                }
                if (sailPoolAddress) {
                  const apr =
                    sailAprFromMarketData ??
                    allPoolRewards?.find(
                      (r) =>
                        r.poolAddress.toLowerCase() === sailPoolAddress.toLowerCase()
                    )?.totalAPR;
                  items.push({
                    marketId: mid,
                    collateralSymbol,
                    poolType: "sail",
                    poolAddress: sailPoolAddress,
                    apr,
                  });
                }
                return items;
              });

              return {
                marketId: representativeMarketId,
                symbol,
                pools,
              };
            });

            setCompoundTargetModal({
              selectedPools,
              positions: selectedPositions as CompoundSelectedPosition[],
              options,
            });

            setIsClaimAllModalOpen(false);
          }}
          onBuyTide={handleBuyTide}
          positions={claimAllPositions}
          isLoading={isClaimingAll || isCompoundingAll}
        />

        {compoundTargetModal && (
          <CompoundTargetTokenModal
            isOpen={true}
            onClose={() => {
              setCompoundTargetModal(null);
              // allow user to go back to pool selection step
              setIsClaimAllModalOpen(true);
            }}
            positions={compoundTargetModal.positions}
            options={compoundTargetModal.options}
            selectedClaimPools={compoundTargetModal.selectedPools}
            preflight={
              advancedPreflight
                ? {
                    key: advancedPreflight.key,
                    isLoading: advancedPreflight.isLoading,
                    error: advancedPreflight.error,
                    fees: advancedPreflight.fees,
                  }
                : null
            }
            onPreflight={runAdvancedPreflight}
            simplePreflight={
              simplePreflight
                ? {
                    key: simplePreflight.key,
                    isLoading: simplePreflight.isLoading,
                    error: simplePreflight.error,
                    fees: simplePreflight.fees,
                  }
                : null
            }
            onSimplePreflight={runSimplePreflight}
            onContinue={({ mode, targetMarketId, allocations }) => {
              // Advanced compound: allocations are selected inline, so skip the next modal entirely.
              if (mode === "single-token" && targetMarketId && allocations) {
                setCompoundTargetModal(null);
                void (async () => {
                  try {
                    const preflight =
                      advancedPreflight?.isLoading
                        ? undefined
                        : advancedPreflight?.plan &&
                          advancedPreflight.plan.targetMarketId === targetMarketId
                        ? advancedPreflight.plan
                        : undefined;
                    await handleCompoundAllToSingleToken(
                      compoundTargetModal.selectedPools,
                      targetMarketId,
                      allocations,
                      preflight
                    );
                  } catch (error: any) {
                    setTransactionProgress({
                      isOpen: true,
                      title: "Compounding Rewards",
                      steps: [
                        {
                          id: "error",
                          label: "Error",
                          status: "error",
                          error: error?.message || "An error occurred",
                        },
                      ],
                      currentStepIndex: 0,
                    });
                  }
                })();
                return;
              }

              // Simple compound (and any other modes) continue to the next modal as before.
              setCompoundIntent({
                mode,
                selectedPools: compoundTargetModal.selectedPools,
                targetMarketId,
              });

              const marketForPoolSelection = compoundTargetModal.positions[0]?.market;
              if (marketForPoolSelection) {
                handleCompoundRewards(marketForPoolSelection, "collateral", 0n);
              }
              setCompoundTargetModal(null);
            }}
          />
        )}

        {selectedMarketForClaim && (
          <AnchorClaimMarketModal
            isOpen={isClaimMarketModalOpen}
            onClose={() => setIsClaimMarketModalOpen(false)}
            onBasicClaim={handleClaimMarketBasicClaim}
            onCompound={handleClaimMarketCompound}
            onBuyTide={handleClaimMarketBuyTide}
            marketSymbol={
              anchorMarkets.find(([id]) => id === selectedMarketForClaim)?.[1]
                ?.peggedToken?.symbol || "Market"
            }
            isLoading={isClaiming || isCompounding}
          />
        )}

        {/* Compound Pool Selection Modal */}
        {compoundPoolSelection && (
          <CompoundPoolSelectionModal
            isOpen={true}
            onClose={() => {
              setCompoundPoolSelection(null);
              setCompoundIntent(null);
            }}
            onConfirm={async (allocations) => {
              setCompoundPoolSelection(null);
              try {
                // If we're coming from the Claim All -> Compound flow, branch based on intent.
                if (compoundIntent?.mode === "single-token" && compoundIntent.targetMarketId) {
                  await handleCompoundAllToSingleToken(
                    compoundIntent.selectedPools,
                    compoundIntent.targetMarketId,
                    allocations
                  );
                  setCompoundIntent(null);
                  return;
                }

                if (compoundIntent?.mode === "keep-per-token") {
                  await handleCompoundAllKeepPerToken(
                    compoundIntent.selectedPools,
                    allocations
                  );
                  setCompoundIntent(null);
                  return;
                }

                // Default: original single-market compound confirm flow
                const totalRewardAmount = BigInt(0); // Will be calculated in handleCompoundConfirm
                const market = compoundPoolSelection.market as any;
                const collateralPoolAddress = market?.addresses
                  ?.stabilityPoolCollateral as `0x${string}` | undefined;
                const sailPoolAddress = market?.addresses
                  ?.stabilityPoolLeveraged as `0x${string}` | undefined;

                const mappedAllocations = allocations
                  .map((a) => {
                    const poolId =
                      collateralPoolAddress &&
                      a.poolAddress.toLowerCase() ===
                        collateralPoolAddress.toLowerCase()
                        ? "collateral"
                        : sailPoolAddress &&
                            a.poolAddress.toLowerCase() ===
                              sailPoolAddress.toLowerCase()
                          ? "sail"
                          : null;
                    return poolId ? { poolId, percentage: a.percentage } : null;
                  })
                  .filter(Boolean) as Array<{
                  poolId: "collateral" | "sail";
                  percentage: number;
                }>;

                await handleCompoundConfirm(
                  compoundPoolSelection.market,
                  mappedAllocations,
                  totalRewardAmount
                );
              } catch (error: any) {
                // Show error in a simple alert or toast
                setTransactionProgress({
                  isOpen: true,
                  title: "Compounding Rewards",
                  steps: [
                    {
                      id: "error",
                      label: "Error",
                      status: "error",
                      error: error?.message || "An error occurred",
                    },
                  ],
                  currentStepIndex: 0,
                });
              }
            }}
            pools={compoundPoolSelection.pools}
            marketSymbol={
              compoundPoolSelection.market.peggedToken?.symbol ||
              compoundPoolSelection.market.id
            }
          />
        )}

        {compoundConfirmation && (
          <CompoundConfirmationModal
            isOpen={true}
            onClose={() => {
              setCompoundConfirmation(null);
              setIsCompounding(false);
            }}
            onConfirm={compoundConfirmation.onConfirm}
            steps={compoundConfirmation.steps}
            fees={compoundConfirmation.fees}
            feeErrors={compoundConfirmation.feeErrors}
          />
        )}

        {/* Early withdraw confirmation */}
        {earlyWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white shadow-xl max-w-md w-full p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[#1E4775] font-semibold">
                  Withdraw early?
                </h3>
                <button
                  onClick={() => setEarlyWithdrawModal(null)}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-[#1E4775]/80">
                Withdrawing now will incur the early withdrawal fee. The
                fee-free window opens in{" "}
                {formatTimeRemaining(Number(earlyWithdrawModal.start) * 1000)}
                {" "}
                and closes at{" "}
                {formatDateTime(
                  new Date(Number(earlyWithdrawModal.end) * 1000)
                )}
                .
              </p>
              <div className="text-xs text-[#1E4775]/70 mt-2">
                Fee:{" "}
                {(Number(earlyWithdrawModal.earlyWithdrawFee) / 1e16).toFixed(
                  2
                )}
                %
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setEarlyWithdrawModal(null)}
                  className="px-3 py-1 text-sm rounded-full border border-[#1E4775]/30 text-[#1E4775]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                    setWithdrawAmountModal({
                      poolAddress: earlyWithdrawModal.poolAddress,
                      poolType: earlyWithdrawModal.poolType,
                      useEarly: true,
                      symbol: earlyWithdrawModal.symbol,
                      maxAmount: earlyWithdrawModal.poolBalance || 0n,
                    });
                    setEarlyWithdrawModal(null);
                  }}
                  className="px-3 py-1 text-sm rounded-full bg-orange-500 text-white hover:bg-orange-600"
                >
                  Continue with fee
                </button>
              </div>
            </div>
          </div>
        )}

        {withdrawAmountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[#1E4775] font-semibold text-lg">
                  {withdrawAmountModal.useEarly
                    ? "Withdraw (fee applies)"
                    : "Withdraw"}
                </h3>
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className="text-[#1E4775]/60 hover:text-[#1E4775]"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-[#1E4775]">
                    Enter Amount
                  </label>
                  {withdrawAmountModal?.maxAmount !== undefined && (
                    <span className="text-sm text-[#1E4775]/70">
                      Balance: {formatToken(withdrawAmountModal.maxAmount)}
                      {" "}
                      {withdrawAmountModal.symbol || "pegged"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    value={withdrawAmountInput}
                    onChange={(e) => {
                      setWithdrawAmountInput(e.target.value);
                      setWithdrawAmountError(null);
                    }}
                    type="text"
                    placeholder="0.0"
                    className={`w-full h-14 px-4 pr-24 bg-white text-[#1E4775] border-2 ${
                      withdrawAmountError
                        ? "border-red-500"
                        : "border-[#1E4775]/30"
                    } focus:border-[#1E4775] focus:ring-2 focus:ring-[#1E4775]/20 focus:outline-none transition-all text-xl font-mono `}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!withdrawAmountModal?.maxAmount) return;
                      setWithdrawAmountInput(
                        formatEther(withdrawAmountModal.maxAmount)
                      );
                      setWithdrawAmountError(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-sm bg-[#FF8A7A] hover:bg-[#FF6B5A] text-white transition-colors disabled:bg-gray-300 disabled:text-gray-500 rounded-full font-medium"
                  >
                    MAX
                  </button>
                </div>
                {withdrawAmountError && (
                  <p className="mt-2 text-sm text-red-600">
                    {withdrawAmountError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-full border-2 border-[#1E4775]/30 text-[#1E4775] font-semibold hover:bg-[#1E4775]/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!withdrawAmountModal) return;
                    const raw = withdrawAmountInput.trim();
                    if (!raw) {
                      setWithdrawAmountError("Enter an amount to withdraw");
                      return;
                    }

                    let amountValue: bigint | undefined;
                    try {
                      amountValue = parseEther(raw);
                    } catch {
                      setWithdrawAmountError("Enter a valid amount");
                      return;
                    }

                    await handlePendingWithdraw(
                      withdrawAmountModal.poolAddress,
                      withdrawAmountModal.poolType,
                      withdrawAmountModal.useEarly,
                      amountValue
                    );

                    setWithdrawAmountModal(null);
                    setWithdrawAmountInput("");
                    setWithdrawAmountError(null);
                  }}
                  className={`flex-1 py-3 px-4 rounded-full font-semibold text-white transition-colors ${
                    withdrawAmountModal.useEarly
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-[#1E4775] hover:bg-[#17395F]"
                  }`}
                >
                  Confirm Withdraw
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Progress Modal */}
        {transactionProgress && (
          <TransactionProgressModal
            isOpen={transactionProgress.isOpen}
            onClose={() => {
              setTransactionProgress(null);
            }}
            title={transactionProgress.title}
            steps={transactionProgress.steps}
            currentStepIndex={transactionProgress.currentStepIndex}
            onCancel={() => {
              if (cancelOperationRef.current) {
                // Call the cancel handler for claim all or compound
                cancelOperationRef.current();
                cancelOperationRef.current = null;
              } else {
                setTransactionProgress(null);
              }
            }}
            canCancel={isClaimingAll || isCompounding}
          />
        )}

        {/* Contract Addresses Modal */}
        {contractAddressesModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setContractAddressesModal(null)}
          >
            <div
              className="bg-white p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1E4775]">
                  Contract Addresses
                </h2>
                <button
                  onClick={() => setContractAddressesModal(null)}
                  className="text-[#1E4775]/70 hover:text-[#1E4775]"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">Minter</div>
                  <SharedEtherscanLink
                    label=""
                    address={contractAddressesModal.minterAddress}
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Collateral Pool
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.stabilityPoolCollateral
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Sail Pool
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.stabilityPoolLeveraged
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">ha Token</div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.peggedToken
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Collateral Token
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.collateralToken
                    }
                  />
                </div>
                <div>
                  <div className="text-xs text-[#1E4775]/70 mb-1">
                    Price Oracle
                  </div>
                  <SharedEtherscanLink
                    label=""
                    address={
                      (contractAddressesModal.market as any).addresses
                        ?.collateralPrice
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

