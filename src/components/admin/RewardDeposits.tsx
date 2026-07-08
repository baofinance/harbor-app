"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { encodeFunctionData, formatUnits, isAddress, parseUnits, toHex } from "viem";
import { useAccount, useContractReads, useReadContract } from "wagmi";
import SafeAppsSDK from "@safe-global/safe-apps-sdk";
import { markets } from "@/config/markets";
import { TREASURY_SAFE_ADDRESS } from "@/config/treasury";
import { ERC20_ABI } from "@/config/contracts";
import { stabilityPoolABI } from "@/abis/stabilityPool";
import { useAdminRewardTokenPrices } from "@/hooks/useAdminRewardTokenPrices";
import {
  isHaDepositTokenSymbol,
  isPrimaryRewardTokenSymbol,
} from "@/utils/adminRewardTokenPrices";
import { MINTER_ABI, WRAPPED_PRICE_ORACLE_ABI } from "@/abis/shared";
import { useFxSAVEAPR } from "@/hooks/useFxSAVEAPR";
import { useWstETHAPR } from "@/hooks/useWstETHAPR";
import {
  computeCollateralYieldRewards,
  formatRewardTokenAmount,
  poolTvlSplitPercentages,
} from "@/utils/collateralYieldRewardCalc";
import {
  buildSafeTxBuilderJson,
  copyToClipboard,
  isSafeContext,
  proposeSafeBatch,
  type AdminBatchCall,
  type SafeInfo,
} from "@/utils/adminBatchTx";

type PoolKind = "collateral" | "leveraged";

type PoolEntry = {
  key: string;
  marketId: string;
  marketName: string;
  poolKind: PoolKind;
  poolAddress: `0x${string}`;
};

type RowComputed = {
  pool: PoolEntry;
  enabled: boolean;
  rewardToken: `0x${string}` | null;
  amountRaw: string;
  decimals: number | null;
  amountParsed: bigint | null;
  tokenSymbol: string | null;
  safeBalance: bigint | null;
  safeAllowance: bigint | null;
  isActiveRewardToken: boolean | null;
  poolOwner: `0x${string}` | null;
  canDeposit: boolean | null;
  needsRegister: boolean | null;
  needsApprove: boolean | null;
};

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

function poolKindLabel(kind: PoolKind) {
  return kind === "collateral" ? "Anchor Pool" : "Sail Pool";
}

function truncate(addr: string) {
  if (!addr) return addr;
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function buildPoolEntries(): PoolEntry[] {
  return Object.entries(markets)
    .filter(([marketId, m]) => {
      const addrs = (m as any)?.addresses;
      const spC = addrs?.stabilityPoolCollateral;
      const spL = addrs?.stabilityPoolLeveraged;
      // Filter out placeholder markets (0x0 pools)
      return (
        typeof spC === "string" &&
        typeof spL === "string" &&
        spC.toLowerCase() !== "0x0000000000000000000000000000000000000000" &&
        spL.toLowerCase() !== "0x0000000000000000000000000000000000000000"
      );
    })
    .flatMap(([marketId, m]) => {
      const addrs = (m as any).addresses as any;
      const marketName = (m as any).name ?? marketId;
      const collateral = addrs.stabilityPoolCollateral as `0x${string}`;
      const leveraged = addrs.stabilityPoolLeveraged as `0x${string}`;

      return [
        {
          key: `${marketId}:collateral`,
          marketId,
          marketName,
          poolKind: "collateral" as const,
          poolAddress: collateral,
        },
        {
          key: `${marketId}:leveraged`,
          marketId,
          marketName,
          poolKind: "leveraged" as const,
          poolAddress: leveraged,
        },
      ];
    });
}

type MarketGroup = {
  marketId: string;
  marketName: string;
  anchorPool: PoolEntry;
  sailPool: PoolEntry;
  minterAddress: `0x${string}` | null;
  wrappedCollateralToken: `0x${string}` | null;
  collateralPriceOracle: `0x${string}` | null;
  collateralSymbol: string;
  rewardTokenSymbol: string;
};

function buildMarketGroups(pools: PoolEntry[]): MarketGroup[] {
  const byMarket = new Map<string, PoolEntry[]>();
  for (const pool of pools) {
    const list = byMarket.get(pool.marketId) ?? [];
    list.push(pool);
    byMarket.set(pool.marketId, list);
  }

  return Array.from(byMarket.entries())
    .map(([marketId, marketPools]) => {
      const anchorPool = marketPools.find((p) => p.poolKind === "collateral");
      const sailPool = marketPools.find((p) => p.poolKind === "leveraged");
      if (!anchorPool || !sailPool) return null;

      const market = markets[marketId as keyof typeof markets] as
        | (typeof markets)[keyof typeof markets]
        | undefined;
      if (!market) return null;

      const addresses = (market as { addresses?: Record<string, string> }).addresses;
      const collateral = (market as { collateral?: { symbol?: string } }).collateral;

      return {
        marketId,
        marketName: anchorPool.marketName,
        anchorPool,
        sailPool,
        minterAddress: (addresses?.minter as `0x${string}` | undefined) ?? null,
        wrappedCollateralToken:
          (addresses?.wrappedCollateralToken as `0x${string}` | undefined) ?? null,
        collateralPriceOracle:
          (addresses?.collateralPrice as `0x${string}` | undefined) ?? null,
        collateralSymbol: collateral?.symbol?.toLowerCase() ?? "",
        rewardTokenSymbol: collateral?.symbol ?? "reward",
      };
    })
    .filter((g): g is MarketGroup => g != null);
}

function MarketCollateralYieldPanel({
  group,
  depositTokenPrices,
  rewardTokenPrices,
  apyPct,
  onApplyAmounts,
}: {
  group: MarketGroup;
  depositTokenPrices: TokenPriceMap;
  rewardTokenPrices: TokenPriceMap;
  apyPct: number | null;
  onApplyAmounts: (anchorAmount: string, sailAmount: string) => void;
}) {
  const [anchorSplitInput, setAnchorSplitInput] = useState("");
  const [sailSplitInput, setSailSplitInput] = useState("");
  const [splitTouched, setSplitTouched] = useState(false);

  const minterQuery = useReadContract({
    address: group.minterAddress ?? undefined,
    abi: MINTER_ABI,
    functionName: "collateralTokenBalance",
    query: { enabled: !!group.minterAddress },
  });

  const anchorSupplyQuery = useReadContract({
    address: group.anchorPool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "totalAssetSupply",
    query: { enabled: !!group.anchorPool.poolAddress },
  });

  const sailSupplyQuery = useReadContract({
    address: group.sailPool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "totalAssetSupply",
    query: { enabled: !!group.sailPool.poolAddress },
  });

  const anchorAssetQuery = useReadContract({
    address: group.anchorPool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "ASSET_TOKEN",
    query: { enabled: !!group.anchorPool.poolAddress },
  });

  const rewardPeriodQuery = useReadContract({
    address: group.anchorPool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "REWARD_PERIOD_LENGTH",
    query: { enabled: !!group.anchorPool.poolAddress },
  });

  const wrappedRateQuery = useReadContract({
    address: group.collateralPriceOracle ?? undefined,
    abi: WRAPPED_PRICE_ORACLE_ABI,
    functionName: "latestAnswer",
    query: { enabled: !!group.collateralPriceOracle },
  });

  const anchorAssetAddress =
    (anchorAssetQuery.data as `0x${string}` | undefined) ?? null;

  const depositPriceStr = anchorAssetAddress
    ? depositTokenPrices[anchorAssetAddress.toLowerCase()] ?? ""
    : "";
  const depositPrice = depositPriceStr.trim()
    ? parseFloat(depositPriceStr)
    : null;

  const rewardTokenAddress = group.wrappedCollateralToken;
  const rewardPriceStr = rewardTokenAddress
    ? rewardTokenPrices[rewardTokenAddress.toLowerCase()] ?? ""
    : "";
  const rewardPrice = rewardPriceStr.trim() ? parseFloat(rewardPriceStr) : null;

  const isFxMarket =
    group.collateralSymbol === "fxsave" || group.collateralSymbol === "fxusd";
  const isWstMarket =
    group.collateralSymbol === "wsteth" || group.collateralSymbol === "steth";

  const collateralValueUsd = useMemo(() => {
    const balance = minterQuery.data as bigint | undefined;
    if (balance == null) return null;
    const underlyingEq = Number(balance) / 1e18;
    if (!Number.isFinite(underlyingEq) || underlyingEq <= 0) return 0;

    if (isFxMarket) {
      return underlyingEq;
    }

    if (isWstMarket) {
      const oracle = wrappedRateQuery.data as
        | readonly [bigint, bigint, bigint, bigint]
        | undefined;
      const maxWrappedRate = oracle?.[3];
      const wrappedRateNum = maxWrappedRate ? Number(maxWrappedRate) / 1e18 : 0;
      const wstAmount =
        wrappedRateNum > 0 ? underlyingEq / wrappedRateNum : underlyingEq;
      if (rewardPrice != null && rewardPrice > 0) {
        return wstAmount * rewardPrice;
      }
      return null;
    }

    if (rewardPrice != null && rewardPrice > 0) {
      return underlyingEq * rewardPrice;
    }
    return null;
  }, [
    minterQuery.data,
    isFxMarket,
    isWstMarket,
    wrappedRateQuery.data,
    rewardPrice,
  ]);

  const wrappedCollateralTokens = useMemo(() => {
    const balance = minterQuery.data as bigint | undefined;
    if (balance == null) return null;
    const underlyingEq = Number(balance) / 1e18;
    if (!Number.isFinite(underlyingEq) || underlyingEq <= 0) return 0;

    const oracle = wrappedRateQuery.data as
      | readonly [bigint, bigint, bigint, bigint]
      | undefined;
    const maxWrappedRate = oracle?.[3];
    const wrappedRateNum = maxWrappedRate ? Number(maxWrappedRate) / 1e18 : 0;

    if (isFxMarket || isWstMarket) {
      return wrappedRateNum > 0 ? underlyingEq / wrappedRateNum : null;
    }

    return underlyingEq;
  }, [minterQuery.data, isFxMarket, isWstMarket, wrappedRateQuery.data]);

  const apySourceLabel = isWstMarket
    ? "wstETH"
    : isFxMarket
    ? "fxSAVE"
    : group.rewardTokenSymbol;

  const anchorTvlUsd = useMemo(() => {
    const supply = anchorSupplyQuery.data as bigint | undefined;
    if (supply == null || depositPrice == null || depositPrice <= 0) return null;
    return (Number(supply) / 1e18) * depositPrice;
  }, [anchorSupplyQuery.data, depositPrice]);

  const sailTvlUsd = useMemo(() => {
    const supply = sailSupplyQuery.data as bigint | undefined;
    if (supply == null || depositPrice == null || depositPrice <= 0) return null;
    return (Number(supply) / 1e18) * depositPrice;
  }, [sailSupplyQuery.data, depositPrice]);

  const defaultSplit = useMemo(() => {
    if (anchorTvlUsd == null || sailTvlUsd == null) return null;
    return poolTvlSplitPercentages(anchorTvlUsd, sailTvlUsd);
  }, [anchorTvlUsd, sailTvlUsd]);

  useEffect(() => {
    if (splitTouched || !defaultSplit) return;
    setAnchorSplitInput(defaultSplit.anchorPct.toFixed(1));
    setSailSplitInput(defaultSplit.sailPct.toFixed(1));
  }, [defaultSplit, splitTouched]);

  const periodDays = useMemo(() => {
    const sec = rewardPeriodQuery.data as bigint | undefined;
    if (!sec || sec === 0n) return 7;
    return Number(sec) / (24 * 60 * 60);
  }, [rewardPeriodQuery.data]);

  const anchorSplitPct = anchorSplitInput.trim()
    ? parseFloat(anchorSplitInput)
    : null;
  const sailSplitPct = sailSplitInput.trim() ? parseFloat(sailSplitInput) : null;

  const yieldResult = useMemo(() => {
    if (collateralValueUsd == null) return { error: "Loading collateral value…" };
    if (apyPct == null || apyPct <= 0) {
      return { error: `Set ${apySourceLabel} APY above.` };
    }
    if (rewardPrice == null || rewardPrice <= 0) {
      return { error: `Set ${group.rewardTokenSymbol} reward token price above.` };
    }
    if (depositPrice == null || depositPrice <= 0) {
      return {
        error:
          "Set the Anchor deposit token (e.g. haEUR) price above for TVL split.",
      };
    }
    if (anchorSplitPct == null || sailSplitPct == null) {
      return { error: "Set Anchor and Sail split percentages." };
    }

    return computeCollateralYieldRewards({
      collateralValueUsd,
      apyPct,
      periodDays,
      rewardTokenPriceUsd: rewardPrice,
      anchorSplitPct,
      sailSplitPct,
    });
  }, [
    collateralValueUsd,
    apyPct,
    rewardPrice,
    depositPrice,
    anchorSplitPct,
    sailSplitPct,
    periodDays,
    group.rewardTokenSymbol,
    apySourceLabel,
  ]);

  const canApply =
    yieldResult &&
    !("error" in yieldResult) &&
    yieldResult.anchorRewardTokens > 0 &&
    yieldResult.sailRewardTokens > 0;

  const formatUsd = (n: number | null | undefined) =>
    n == null || !Number.isFinite(n)
      ? "—"
      : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="p-3 bg-black/25 border border-white/10 rounded">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-white/80 text-xs font-medium">
          Collateral yield → pool rewards ({periodDays.toFixed(0)}-day period)
        </div>
        <div className="text-white/50 text-xs">
          APY source:{" "}
          <span className="text-white/80">
            {apySourceLabel}
            {apyPct != null ? ` (${apyPct.toFixed(2)}%)` : ""}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-white/70 mb-3">
        <div>
          Yield generating collateral:{" "}
          <span className="text-white/90">${formatUsd(collateralValueUsd)}</span>
          {wrappedCollateralTokens != null && wrappedCollateralTokens > 0 ? (
            <span className="text-white/50">
              {" "}
              ({wrappedCollateralTokens.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              {group.rewardTokenSymbol})
            </span>
          ) : null}
        </div>
        <div>
          Anchor pool TVL:{" "}
          <span className="text-white/90">${formatUsd(anchorTvlUsd)}</span>
          {defaultSplit ? (
            <span className="text-white/50"> ({defaultSplit.anchorPct.toFixed(1)}%)</span>
          ) : null}
        </div>
        <div>
          Sail pool TVL:{" "}
          <span className="text-white/90">${formatUsd(sailTvlUsd)}</span>
          {defaultSplit ? (
            <span className="text-white/50"> ({defaultSplit.sailPct.toFixed(1)}%)</span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <div className="text-white/70 text-xs mb-1">Anchor split (%)</div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={anchorSplitInput}
            onChange={(e) => {
              setSplitTouched(true);
              setAnchorSplitInput(e.target.value);
            }}
            className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
          />
        </div>
        <div className="w-28">
          <div className="text-white/70 text-xs mb-1">Sail split (%)</div>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={sailSplitInput}
            onChange={(e) => {
              setSplitTouched(true);
              setSailSplitInput(e.target.value);
            }}
            className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
          />
        </div>
        {defaultSplit ? (
          <button
            type="button"
            className="py-2 px-3 bg-white/10 text-white text-xs hover:bg-white/15 transition-colors"
            onClick={() => {
              setSplitTouched(false);
              setAnchorSplitInput(defaultSplit.anchorPct.toFixed(1));
              setSailSplitInput(defaultSplit.sailPct.toFixed(1));
            }}
          >
            Use TVL split
          </button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        {"error" in yieldResult ? (
          <span className="text-amber-300">{yieldResult.error}</span>
        ) : (
          <>
            <span className="text-white/70">
              Period yield:{" "}
              <span className="text-white/90">
                ${formatUsd(yieldResult.periodYieldUsd)}
              </span>
            </span>
            <span className="text-white/70">
              Total:{" "}
              <span className="text-white/90">
                {formatRewardTokenAmount(yieldResult.totalRewardTokens)}{" "}
                {group.rewardTokenSymbol}
              </span>
            </span>
            <span className="text-white/70">
              Anchor:{" "}
              <span className="text-white/90">
                {formatRewardTokenAmount(yieldResult.anchorRewardTokens)}{" "}
                {group.rewardTokenSymbol}
              </span>
            </span>
            <span className="text-white/70">
              Sail:{" "}
              <span className="text-white/90">
                {formatRewardTokenAmount(yieldResult.sailRewardTokens)}{" "}
                {group.rewardTokenSymbol}
              </span>
            </span>
            <button
              type="button"
              disabled={!canApply}
              className="py-1.5 px-3 bg-white/15 text-white text-xs font-medium hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => {
                if (!canApply || "error" in yieldResult) return;
                onApplyAmounts(
                  formatRewardTokenAmount(yieldResult.anchorRewardTokens),
                  formatRewardTokenAmount(yieldResult.sailRewardTokens)
                );
              }}
            >
              Set reward amounts
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export type TokenPriceMap = Record<string, string>;

type AmountInjection = {
  amount: string;
  nonce: number;
  enable?: boolean;
};

function RewardDepositRow({
  pool,
  onChange,
  depositTokenPrices,
  rewardTokenPrices,
  amountInjection,
}: {
  pool: PoolEntry;
  onChange: (key: string, row: RowComputed) => void;
  depositTokenPrices: TokenPriceMap;
  rewardTokenPrices: TokenPriceMap;
  amountInjection?: AmountInjection | null;
}) {
  const [enabled, setEnabled] = useState(false);
  const [rewardTokenInput, setRewardTokenInput] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [targetAprInput, setTargetAprInput] = useState("");

  const poolOwnerQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "owner",
    query: { enabled: !!pool.poolAddress },
  });

  const rewardDepositorRoleQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "REWARD_DEPOSITOR_ROLE",
    query: { enabled: !!pool.poolAddress },
  });

  const hasDepositorRoleQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "hasRole",
    args: [
      (rewardDepositorRoleQuery.data ?? 0n) as bigint,
      TREASURY_SAFE_ADDRESS,
    ],
    query: {
      enabled: !!pool.poolAddress && rewardDepositorRoleQuery.data !== undefined,
    },
  });

  const activeRewardTokensQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "activeRewardTokens",
    query: { enabled: !!pool.poolAddress },
  });

  // If the user hasn't entered anything yet, default to the first active reward token.
  useEffect(() => {
    if (rewardTokenInput) return;
    const list = activeRewardTokensQuery.data as `0x${string}`[] | undefined;
    if (!list || list.length === 0) return;
    setRewardTokenInput(list[0]);
  }, [activeRewardTokensQuery.data, rewardTokenInput]);

  const rewardToken = useMemo(() => {
    if (!rewardTokenInput) return null;
    if (!isAddress(rewardTokenInput)) return null;
    return rewardTokenInput as `0x${string}`;
  }, [rewardTokenInput]);

  const tokenSymbolQuery = useReadContract({
    address: rewardToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!rewardToken },
  });

  const decimalsQuery = useReadContract({
    address: rewardToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!rewardToken },
  });

  const safeBalanceQuery = useReadContract({
    address: rewardToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [TREASURY_SAFE_ADDRESS],
    query: { enabled: !!rewardToken },
  });

  const safeAllowanceQuery = useReadContract({
    address: rewardToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [TREASURY_SAFE_ADDRESS, pool.poolAddress],
    query: { enabled: !!rewardToken },
  });

  const isActiveRewardTokenQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "isActiveRewardToken",
    args: [rewardToken ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!rewardToken && !!pool.poolAddress },
  });

  // Target APR calculator: pool TVL and period
  const totalAssetSupplyQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "totalAssetSupply",
    query: { enabled: !!pool.poolAddress && enabled },
  });
  const rewardPeriodLengthQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "REWARD_PERIOD_LENGTH",
    query: { enabled: !!pool.poolAddress && enabled },
  });
  const assetTokenQuery = useReadContract({
    address: pool.poolAddress,
    abi: stabilityPoolABI,
    functionName: "ASSET_TOKEN",
    query: { enabled: !!pool.poolAddress && enabled },
  });

  const assetTokenAddress = (assetTokenQuery.data as `0x${string}` | undefined) ?? null;

  const assetDecimalsQuery = useReadContract({
    address: assetTokenAddress ?? undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!assetTokenAddress },
  });

  const assetDecimals = useMemo(() => {
    const d = assetDecimalsQuery.data as number | undefined;
    return typeof d === "number" ? d : null;
  }, [assetDecimalsQuery.data]);

  const decimals = useMemo(() => {
    const d = decimalsQuery.data as number | undefined;
    return typeof d === "number" ? d : null;
  }, [decimalsQuery.data]);

  const amountParsed = useMemo(() => {
    if (!amountRaw) return null;
    if (decimals == null) return null;
    try {
      return parseUnits(amountRaw, decimals);
    } catch {
      return null;
    }
  }, [amountRaw, decimals]);

  const poolOwner = (poolOwnerQuery.data as `0x${string}` | undefined) ?? null;
  const tokenSymbol = (tokenSymbolQuery.data as string | undefined) ?? null;
  const safeBalance = (safeBalanceQuery.data as bigint | undefined) ?? null;
  const safeAllowance = (safeAllowanceQuery.data as bigint | undefined) ?? null;
  const isActiveRewardToken =
    (isActiveRewardTokenQuery.data as boolean | undefined) ?? null;

  const canDeposit = useMemo(() => {
    if (!poolOwner) return null;
    const isOwner =
      poolOwner.toLowerCase() === TREASURY_SAFE_ADDRESS.toLowerCase();
    const hasRole = (hasDepositorRoleQuery.data as boolean | undefined) ?? false;
    return isOwner || hasRole;
  }, [poolOwner, hasDepositorRoleQuery.data]);

  const needsRegister = useMemo(() => {
    if (!rewardToken) return null;
    if (isActiveRewardToken == null) return null;
    return !isActiveRewardToken;
  }, [rewardToken, isActiveRewardToken]);

  const needsApprove = useMemo(() => {
    if (!rewardToken) return null;
    if (safeAllowance == null) return null;
    if (amountParsed == null) return null;
    return safeAllowance < amountParsed;
  }, [rewardToken, safeAllowance, amountParsed]);

  const targetAprResult = useMemo(() => {
    const targetApr = targetAprInput.trim() ? parseFloat(targetAprInput) : null;
    const depositPriceStr = assetTokenAddress
      ? (depositTokenPrices[assetTokenAddress.toLowerCase()] ?? "")
      : "";
    const rewardPriceStr = rewardToken
      ? (rewardTokenPrices[rewardToken.toLowerCase()] ?? "")
      : "";
    const depositPrice = depositPriceStr.trim() ? parseFloat(depositPriceStr) : null;
    const rewardPrice = rewardPriceStr.trim() ? parseFloat(rewardPriceStr) : null;

    if (targetApr == null || targetApr <= 0) return null;

    const totalSupply = totalAssetSupplyQuery.data as bigint | undefined;
    const periodSec = rewardPeriodLengthQuery.data as bigint | undefined;

    if (totalSupply == null || totalSupply === undefined) return { error: "Loading pool data…" };
    if (totalSupply === 0n) return { error: "Pool has no TVL; cannot compute required amount." };
    if (!periodSec || periodSec === 0n) return { error: "Unknown reward period length." };
    if (assetDecimals == null) return { error: "Loading asset decimals…" };
    if (decimals == null) return { error: "Select a reward token to compute amount." };
    if (depositPrice == null || depositPrice <= 0) return { error: "Set deposit token price above." };
    if (rewardPrice == null || rewardPrice <= 0) return { error: "Set reward token price above." };

    const tvlHuman = Number(totalSupply) / 10 ** assetDecimals;
    const depositValueUSD = tvlHuman * depositPrice;
    const periodSeconds = Number(periodSec);
    const rewardValueUSD =
      (targetApr / 100) * depositValueUSD * (periodSeconds / SECONDS_PER_YEAR);
    const rewardAmountHuman = rewardValueUSD / rewardPrice;
    const rewardAmountRaw = BigInt(
      Math.round(rewardAmountHuman * 10 ** decimals)
    );
    const requiredAmountFormatted = formatUnits(rewardAmountRaw, decimals);

    return {
      rewardAmountRaw,
      requiredAmountFormatted,
      rewardAmountHuman,
    };
  }, [
    targetAprInput,
    depositTokenPrices,
    rewardTokenPrices,
    assetTokenAddress,
    rewardToken,
    totalAssetSupplyQuery.data,
    rewardPeriodLengthQuery.data,
    assetDecimals,
    decimals,
  ]);

  const rowComputed: RowComputed = useMemo(
    () => ({
      pool,
      enabled,
      rewardToken,
      amountRaw,
      decimals,
      amountParsed,
      tokenSymbol,
      safeBalance,
      safeAllowance,
      isActiveRewardToken,
      poolOwner,
      canDeposit,
      needsRegister,
      needsApprove,
    }),
    [
      pool,
      enabled,
      rewardToken,
      amountRaw,
      decimals,
      amountParsed,
      tokenSymbol,
      safeBalance,
      safeAllowance,
      isActiveRewardToken,
      poolOwner,
      canDeposit,
      needsRegister,
      needsApprove,
    ]
  );

  useEffect(() => {
    onChange(pool.key, rowComputed);
  }, [pool.key, rowComputed, onChange]);

  useEffect(() => {
    if (!amountInjection) return;
    setAmountRaw(amountInjection.amount);
    if (amountInjection.enable) setEnabled(true);
  }, [amountInjection?.nonce]);

  return (
    <div className="bg-black/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <label className="flex items-center gap-2 text-xs text-white/70 whitespace-nowrap pt-[2px]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Include
          </label>

          <div className="min-w-0">
            <div className="text-white font-geo text-base">
              {pool.marketName} • {poolKindLabel(pool.poolKind)}
            </div>
            <div className="text-white/60 text-xs font-mono">
              {pool.poolAddress}
            </div>
          </div>
        </div>
      </div>

      {enabled ? (
        <div className="mt-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-7">
              <div className="text-white/70 text-xs mb-1">Reward token</div>
              <input
                value={rewardTokenInput}
                onChange={(e) => setRewardTokenInput(e.target.value.trim())}
                placeholder="0x…"
                className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono text-xs"
              />
            </div>
            <div className="md:col-span-5">
              <div className="text-white/70 text-xs mb-1">Amount</div>
              <input
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                placeholder={tokenSymbol ? `Amount (${tokenSymbol})` : "Amount"}
                className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
              />
            </div>
          </div>

          {/* Target APR → required deposit (uses prices set above) */}
          <div className="mt-4 p-3 bg-black/20 border border-white/10 rounded">
            <div className="text-white/80 text-xs font-medium mb-2">
              Target APR → required deposit (this period)
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-32">
                <div className="text-white/70 text-xs mb-1">Target APR (%)</div>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={targetAprInput}
                  onChange={(e) => setTargetAprInput(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full bg-zinc-900/50 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
                />
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                {targetAprResult?.error ? (
                  <span className="text-amber-300 text-xs">{targetAprResult.error}</span>
                ) : targetAprResult?.requiredAmountFormatted != null ? (
                  <>
                    <span className="text-white/90 text-xs">
                      Required: {targetAprResult.requiredAmountFormatted} {tokenSymbol ?? ""}
                    </span>
                    <button
                      type="button"
                      className="py-1.5 px-3 bg-white/15 text-white text-xs font-medium hover:bg-white/20 transition-colors"
                      onClick={() =>
                        setAmountRaw(targetAprResult.requiredAmountFormatted ?? "")
                      }
                    >
                      Use this amount
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/70">
            <span>
              Token:{" "}
              <span className="text-white/90">
                {tokenSymbol ?? (rewardToken ? truncate(rewardToken) : "—")}
              </span>
              {decimals != null ? (
                <span className="text-white/50"> • {decimals} decimals</span>
              ) : null}
            </span>
            <span>
              Pool owner:{" "}
              <span className="text-white/90 font-mono">
                {poolOwner ? truncate(poolOwner) : "—"}
              </span>
            </span>
            <span>
              Safe is owner/role:{" "}
              <span className={canDeposit ? "text-green-400" : "text-red-300"}>
                {canDeposit == null ? "…" : canDeposit ? "YES" : "NO"}
              </span>
            </span>
            <span>
              Active token:{" "}
              <span
                className={
                  isActiveRewardToken ? "text-green-400" : "text-red-300"
                }
              >
                {isActiveRewardToken == null
                  ? "…"
                  : isActiveRewardToken
                  ? "YES"
                  : "NO"}
              </span>
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/70">
            <span>
              Safe balance:{" "}
              <span className="text-white/90">
                {safeBalance == null ? "…" : safeBalance.toString()}
              </span>
            </span>
            <span>
              Allowance to pool:{" "}
              <span className="text-white/90">
                {safeAllowance == null ? "…" : safeAllowance.toString()}
              </span>
            </span>
            {needsApprove != null ? (
              <span>
                Needs approve:{" "}
                <span
                  className={needsApprove ? "text-amber-300" : "text-green-400"}
                >
                  {needsApprove ? "YES" : "NO"}
                </span>
              </span>
            ) : null}
            {needsRegister != null ? (
              <span>
                Needs register:{" "}
                <span
                  className={needsRegister ? "text-amber-300" : "text-green-400"}
                >
                  {needsRegister ? "YES" : "NO"}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function RewardDeposits() {
  const { address: connectedAddress } = useAccount();
  const pools = useMemo(() => buildPoolEntries(), []);
  const marketGroups = useMemo(() => buildMarketGroups(pools), [pools]);
  const [rows, setRows] = useState<Record<string, RowComputed>>({});
  const [amountInjections, setAmountInjections] = useState<
    Record<string, AmountInjection>
  >({});
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositResult, setDepositResult] = useState<string | null>(null);
  const [safeInfo, setSafeInfo] = useState<{
    safeAddress: `0x${string}`;
    chainId: number;
  } | null>(null);

  const { data: fxSAVEApy } = useFxSAVEAPR(true);
  const { data: wstETHApy } = useWstETHAPR(true);

  // Global token prices (set once at top): key = token address lowercase
  const [depositTokenPrices, setDepositTokenPrices] = useState<TokenPriceMap>({});
  const [rewardTokenPrices, setRewardTokenPrices] = useState<TokenPriceMap>({});
  const [showAddAnotherReward, setShowAddAnotherReward] = useState(false);
  const [extraRewardTokenAddresses, setExtraRewardTokenAddresses] = useState<
    string[]
  >([]);
  const [extraRewardPicker, setExtraRewardPicker] = useState("");
  const [fxSAVEApyInput, setFxSAVEApyInput] = useState("");
  const [wstETHApyInput, setWstETHApyInput] = useState("");
  const [apyDefaultsApplied, setApyDefaultsApplied] = useState(false);

  useEffect(() => {
    if (apyDefaultsApplied) return;
    if (fxSAVEApy == null && wstETHApy == null) return;
    if (fxSAVEApy != null) {
      setFxSAVEApyInput((fxSAVEApy * 100).toFixed(2));
    }
    if (wstETHApy != null) {
      setWstETHApyInput((wstETHApy * 100).toFixed(2));
    }
    setApyDefaultsApplied(true);
  }, [fxSAVEApy, wstETHApy, apyDefaultsApplied]);

  const fxSAVEApyPct = fxSAVEApyInput.trim()
    ? parseFloat(fxSAVEApyInput)
    : null;
  const wstETHApyPct = wstETHApyInput.trim()
    ? parseFloat(wstETHApyInput)
    : null;

  const applyMarketRewardAmounts = useCallback(
    (group: MarketGroup, anchorAmount: string, sailAmount: string) => {
      const nonce = Date.now();
      setAmountInjections((prev) => ({
        ...prev,
        [group.anchorPool.key]: {
          amount: anchorAmount,
          nonce,
          enable: true,
        },
        [group.sailPool.key]: {
          amount: sailAmount,
          nonce,
          enable: true,
        },
      }));
    },
    []
  );

  const marketApyPct = useCallback(
    (group: MarketGroup) => {
      const sym = group.collateralSymbol;
      if (sym === "fxsave" || sym === "fxusd") return fxSAVEApyPct;
      if (sym === "wsteth" || sym === "steth") return wstETHApyPct;
      return fxSAVEApyPct;
    },
    [fxSAVEApyPct, wstETHApyPct]
  );

  // Discover unique deposit tokens (ASSET_TOKEN per pool) and reward tokens (activeRewardTokens)
  const poolTokenReads = useContractReads({
    contracts: pools.flatMap((p) => [
      {
        address: p.poolAddress,
        abi: stabilityPoolABI,
        functionName: "ASSET_TOKEN" as const,
      },
      {
        address: p.poolAddress,
        abi: stabilityPoolABI,
        functionName: "activeRewardTokens" as const,
      },
    ]),
    query: { enabled: pools.length > 0 },
  });

  const { uniqueDepositTokens, uniqueRewardTokens } = useMemo(() => {
    const data = poolTokenReads.data;
    if (!data || data.length !== pools.length * 2) {
      return { uniqueDepositTokens: [] as string[], uniqueRewardTokens: [] as string[] };
    }
    const depositSet = new Set<string>();
    const rewardSet = new Set<string>();
    for (let i = 0; i < pools.length; i++) {
      const assetRes = data[i * 2]?.result;
      const rewardList = data[i * 2 + 1]?.result as `0x${string}`[] | undefined;
      const assetAddr =
        typeof assetRes === "string"
          ? assetRes
          : (assetRes as { token?: string })?.token;
      if (assetAddr) {
        depositSet.add(assetAddr.toLowerCase());
      }
      if (rewardList && Array.isArray(rewardList)) {
        rewardList.forEach((a: string) => rewardSet.add(a.toLowerCase()));
      }
    }
    return {
      uniqueDepositTokens: Array.from(depositSet),
      uniqueRewardTokens: Array.from(rewardSet),
    };
  }, [poolTokenReads.data, pools.length]);

  const allUniqueTokens = useMemo(
    () => [...new Set([...uniqueDepositTokens, ...uniqueRewardTokens])],
    [uniqueDepositTokens, uniqueRewardTokens]
  );

  const tokenSymbolReads = useContractReads({
    contracts: allUniqueTokens.map((addr) => ({
      address: addr as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "symbol" as const,
    })),
    query: { enabled: allUniqueTokens.length > 0 },
  });

  const tokenSymbolByAddress = useMemo(() => {
    const data = tokenSymbolReads.data;
    const map: Record<string, string> = {};
    allUniqueTokens.forEach((addr, i) => {
      const sym = data?.[i]?.result;
      map[addr] = typeof sym === "string" ? sym : truncate(addr);
    });
    return map;
  }, [tokenSymbolReads.data, allUniqueTokens]);

  const primaryRewardTokens = useMemo(
    () =>
      uniqueRewardTokens.filter((addr) =>
        isPrimaryRewardTokenSymbol(tokenSymbolByAddress[addr] ?? ""),
      ),
    [uniqueRewardTokens, tokenSymbolByAddress],
  );

  const extraRewardTokenCandidates = useMemo(
    () =>
      uniqueRewardTokens.filter(
        (addr) =>
          !isPrimaryRewardTokenSymbol(tokenSymbolByAddress[addr] ?? "") &&
          !extraRewardTokenAddresses.includes(addr),
      ),
    [uniqueRewardTokens, tokenSymbolByAddress, extraRewardTokenAddresses],
  );

  const {
    suggestedDepositPrices,
    suggestedRewardPrices,
    isLoading: isLoadingPrices,
  } = useAdminRewardTokenPrices({
    depositTokenAddresses: uniqueDepositTokens,
    rewardTokenAddresses: uniqueRewardTokens,
    tokenSymbolByAddress,
    enabled: allUniqueTokens.length > 0,
  });

  useEffect(() => {
    if (isLoadingPrices) return;

    setDepositTokenPrices((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [addr, price] of Object.entries(suggestedDepositPrices)) {
        if (!prev[addr]?.trim() && price) {
          next[addr] = price;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setRewardTokenPrices((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [addr, price] of Object.entries(suggestedRewardPrices)) {
        if (!prev[addr]?.trim() && price) {
          next[addr] = price;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [suggestedDepositPrices, suggestedRewardPrices, isLoadingPrices]);

  const handleRefreshPrices = useCallback(() => {
    setDepositTokenPrices((prev) => {
      const next = { ...prev };
      for (const [addr, price] of Object.entries(suggestedDepositPrices)) {
        if (price) next[addr] = price;
      }
      return next;
    });
    setRewardTokenPrices((prev) => {
      const next = { ...prev };
      for (const [addr, price] of Object.entries(suggestedRewardPrices)) {
        if (price) next[addr] = price;
      }
      return next;
    });
  }, [suggestedDepositPrices, suggestedRewardPrices]);

  const handleAddExtraRewardToken = useCallback(() => {
    if (!extraRewardPicker) return;
    setExtraRewardTokenAddresses((prev) =>
      prev.includes(extraRewardPicker) ? prev : [...prev, extraRewardPicker],
    );
    setExtraRewardPicker("");
  }, [extraRewardPicker]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isSafeContext()) return;
      try {
        const sdk = new SafeAppsSDK();
        const info = await sdk.safe.getInfo();
        if (!mounted) return;
        setSafeInfo({
          safeAddress: info.safeAddress as `0x${string}`,
          chainId: info.chainId,
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onRowChange = useCallback((key: string, row: RowComputed) => {
    setRows((prev) => {
      const next = { ...prev, [key]: row };
      return next;
    });
  }, []);

  const selectedRows = useMemo(() => {
    return Object.values(rows).filter((r) => r.enabled);
  }, [rows]);

  const txs = useMemo(() => {
    const out: AdminBatchCall[] = [];

    for (const r of selectedRows) {
      if (!r.rewardToken || !r.amountParsed || r.amountParsed <= 0n) continue;

      // If token isn't active, include a register tx first (optional but safest).
      if (r.needsRegister) {
        const data = encodeFunctionData({
          abi: stabilityPoolABI,
          functionName: "registerRewardToken",
          args: [r.rewardToken],
        });
        out.push({
          to: r.pool.poolAddress,
          value: 0n,
          data,
          label: `${r.pool.marketName} • ${poolKindLabel(r.pool.poolKind)} • registerRewardToken(${truncate(
            r.rewardToken
          )})`,
        });
      }

      // Approve if needed
      if (r.needsApprove) {
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [r.pool.poolAddress, r.amountParsed],
        });
        out.push({
          to: r.rewardToken,
          value: 0n,
          data,
          label: `${r.pool.marketName} • approve(${poolKindLabel(
            r.pool.poolKind
          )}, ${r.amountRaw})`,
        });
      }

      // Deposit reward
      const data = encodeFunctionData({
        abi: stabilityPoolABI,
        functionName: "depositReward",
        args: [r.rewardToken, r.amountParsed],
      });
      out.push({
        to: r.pool.poolAddress,
        value: 0n,
        data,
        label: `${r.pool.marketName} • ${poolKindLabel(
          r.pool.poolKind
        )} • depositReward(${truncate(r.rewardToken)}, ${r.amountRaw})`,
      });
    }

    return out;
  }, [selectedRows]);

  const safeTxBuilderJson = useMemo(
    () =>
      buildSafeTxBuilderJson(txs, {
        name: "Harbor: Stability Pool Reward Deposit",
        description:
          "Generated by Harbor admin UI. Execute from the treasury Safe.",
      }),
    [txs]
  );

  const handleDeposit = async () => {
    setDepositError(null);
    setDepositResult(null);
    if (txs.length === 0) {
      setDepositError("No transactions generated.");
      return;
    }

    if (safeInfo) {
      const res = await proposeSafeBatch(txs, safeInfo as SafeInfo);
      if (!res.ok) {
        setDepositError(res.error);
        return;
      }
      setDepositResult(
        res.safeTxHash
          ? `Proposed Safe transaction: ${res.safeTxHash}`
          : "Proposed Safe transaction."
      );
      return;
    }

    const ethereum = (window as any)?.ethereum;
    if (!ethereum?.request) {
      setDepositError("No injected wallet found (window.ethereum).");
      return;
    }

    // Preferred: EIP-5792 batch request (single wallet prompt if supported).
    const calls = txs.map((t) => ({
      to: t.to,
      data: t.data,
      value: toHex(t.value),
    }));

    try {
      const res = await ethereum.request({
        method: "wallet_sendCalls",
        params: [
          {
            version: "1.0",
            chainId: "0x1",
            calls,
          },
        ],
      });
      setDepositResult(
        typeof res === "string" ? res : "Sent batch via wallet_sendCalls."
      );
      return;
    } catch (e: any) {
      // Fallback: send txs one-by-one (will require multiple confirmations).
      try {
        for (const t of txs) {
          await ethereum.request({
            method: "eth_sendTransaction",
            params: [
              {
                to: t.to,
                data: t.data,
                value: toHex(t.value),
              },
            ],
          });
        }
        setDepositResult("Sent transactions via eth_sendTransaction (one by one).");
        return;
      } catch (e2: any) {
        const msg =
          e2?.message ??
          e?.message ??
          "Wallet rejected or does not support batch sending.";
        setDepositError(String(msg));
      }
    }
  };

  return (
    <div id="reward-deposits" className="bg-zinc-900/50 p-4 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white mb-1 font-geo">
            Stability Pool Reward Deposits
          </h2>
          <div className="text-white/70 text-xs">
            Treasury Safe:{" "}
            <span className="font-mono text-white/90">
              {TREASURY_SAFE_ADDRESS}
            </span>
          </div>
          <div className="text-white/50 text-xs mt-1">
            {safeInfo
              ? `Safe context: ${safeInfo.safeAddress} (chainId ${safeInfo.chainId})`
              : `Connected wallet: ${connectedAddress ?? "—"}. (Not in Safe context)`}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="py-2 px-4 bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
            onClick={() => copyToClipboard(safeTxBuilderJson)}
            disabled={txs.length === 0}
          >
            Copy Safe JSON
          </button>
          <button
            className="py-2 px-4 bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
            onClick={() =>
              copyToClipboard(
                txs.map((t) => `${t.label}\nTO: ${t.to}\nDATA: ${t.data}\n`).join("\n")
              )
            }
            disabled={txs.length === 0}
          >
            Copy calldata list
          </button>
        </div>
      </div>

      {/* Set each token price once (used by target APR calculator in each row) */}
      <div className="mt-4 p-4 bg-black/20 border border-white/10 rounded space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-white font-geo text-base">Token prices (USD)</div>
          <div className="flex items-center gap-2">
            {isLoadingPrices ? (
              <span className="text-white/50 text-xs">Loading prices…</span>
            ) : null}
            <button
              type="button"
              className="py-1.5 px-3 bg-white/10 text-white text-xs font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
              onClick={handleRefreshPrices}
              disabled={isLoadingPrices}
            >
              Refresh prices
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-white/70 text-xs font-medium mb-2">
              Deposit tokens (pool assets)
            </div>
            <div className="space-y-2">
              {uniqueDepositTokens.length === 0 ? (
                <div className="text-white/50 text-xs">Loading…</div>
              ) : (
                uniqueDepositTokens.map((addr) => {
                  const symbol = tokenSymbolByAddress[addr] ?? truncate(addr);
                  const isAutoHa =
                    isHaDepositTokenSymbol(symbol) &&
                    !!suggestedDepositPrices[addr] &&
                    depositTokenPrices[addr] === suggestedDepositPrices[addr];
                  return (
                    <div key={addr} className="flex items-center gap-2">
                      <label className="text-white/90 text-xs w-28 shrink-0">
                        {symbol}
                        {isAutoHa ? (
                          <span className="ml-1 text-white/40">(auto)</span>
                        ) : null}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={depositTokenPrices[addr] ?? ""}
                        onChange={(e) =>
                          setDepositTokenPrices((prev) => ({
                            ...prev,
                            [addr]: e.target.value,
                          }))
                        }
                        placeholder="Price"
                        className="flex-1 max-w-[120px] bg-zinc-900/50 px-3 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <div className="text-white/70 text-xs font-medium mb-2">
              Reward tokens
            </div>
            <div className="space-y-2">
              {uniqueRewardTokens.length === 0 ? (
                <div className="text-white/50 text-xs">Loading…</div>
              ) : primaryRewardTokens.length === 0 ? (
                <div className="text-white/50 text-xs">
                  No fxSAVE or wstETH reward tokens found on active pools.
                </div>
              ) : (
                primaryRewardTokens.map((addr) => {
                  const symbol = tokenSymbolByAddress[addr] ?? truncate(addr);
                  const isAuto =
                    !!suggestedRewardPrices[addr] &&
                    rewardTokenPrices[addr] === suggestedRewardPrices[addr];
                  return (
                    <div key={addr} className="flex items-center gap-2">
                      <label className="text-white/90 text-xs w-28 shrink-0">
                        {symbol}
                        {isAuto ? (
                          <span className="ml-1 text-white/40">(auto)</span>
                        ) : null}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={rewardTokenPrices[addr] ?? ""}
                        onChange={(e) =>
                          setRewardTokenPrices((prev) => ({
                            ...prev,
                            [addr]: e.target.value,
                          }))
                        }
                        placeholder="Price"
                        className="flex-1 max-w-[120px] bg-zinc-900/50 px-3 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={showAddAnotherReward}
                onChange={(e) => setShowAddAnotherReward(e.target.checked)}
              />
              Add another reward token
            </label>

            {showAddAnotherReward ? (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <select
                    value={extraRewardPicker}
                    onChange={(e) => setExtraRewardPicker(e.target.value)}
                    className="min-w-[10rem] bg-zinc-900/50 px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
                  >
                    <option value="">Select token…</option>
                    {extraRewardTokenCandidates.map((addr) => (
                      <option key={addr} value={addr}>
                        {tokenSymbolByAddress[addr] ?? truncate(addr)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="py-1.5 px-3 bg-white/10 text-white text-xs font-medium hover:bg-white/15 transition-colors disabled:opacity-50"
                    onClick={handleAddExtraRewardToken}
                    disabled={!extraRewardPicker}
                  >
                    Add
                  </button>
                </div>
                {extraRewardTokenAddresses.map((addr) => (
                  <div key={addr} className="flex items-center gap-2">
                    <label className="text-white/90 text-xs w-28 shrink-0">
                      {tokenSymbolByAddress[addr] ?? truncate(addr)}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={rewardTokenPrices[addr] ?? ""}
                      onChange={(e) =>
                        setRewardTokenPrices((prev) => ({
                          ...prev,
                          [addr]: e.target.value,
                        }))
                      }
                      placeholder="Price"
                      className="flex-1 max-w-[120px] bg-zinc-900/50 px-3 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
                    />
                    <button
                      type="button"
                      className="text-white/50 text-xs hover:text-white/80"
                      onClick={() =>
                        setExtraRewardTokenAddresses((prev) =>
                          prev.filter((a) => a !== addr),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <div className="text-white/70 text-xs font-medium mb-2">
            Wrapped collateral APY (%)
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-white/90 text-xs w-16 shrink-0">fxSAVE</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={fxSAVEApyInput}
                onChange={(e) => setFxSAVEApyInput(e.target.value)}
                placeholder="e.g. 3.61"
                className="w-28 bg-zinc-900/50 px-3 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-white/90 text-xs w-16 shrink-0">wstETH</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={wstETHApyInput}
                onChange={(e) => setWstETHApyInput(e.target.value)}
                placeholder="e.g. 3.2"
                className="w-28 bg-zinc-900/50 px-3 py-1.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 text-xs"
              />
            </div>
          </div>
          <div className="text-white/50 text-xs mt-2">
            Used by the collateral yield calculator below. Defaults from DeFiLlama;
            override manually if needed.
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {marketGroups.map((group) => (
          <div
            key={group.marketId}
            className="border border-white/10 bg-black/10 rounded overflow-hidden"
          >
            <div className="px-4 py-2 bg-black/20 border-b border-white/10">
              <div className="text-white font-geo text-base">{group.marketName}</div>
            </div>
            <div className="px-4 py-3">
              <MarketCollateralYieldPanel
                group={group}
                depositTokenPrices={depositTokenPrices}
                rewardTokenPrices={rewardTokenPrices}
                apyPct={marketApyPct(group)}
                onApplyAmounts={(anchorAmount, sailAmount) =>
                  applyMarketRewardAmounts(group, anchorAmount, sailAmount)
                }
              />
            </div>
            <RewardDepositRow
              pool={group.anchorPool}
              onChange={onRowChange}
              depositTokenPrices={depositTokenPrices}
              rewardTokenPrices={rewardTokenPrices}
              amountInjection={amountInjections[group.anchorPool.key]}
            />
            <div className="border-t border-white/10" />
            <RewardDepositRow
              pool={group.sailPool}
              onChange={onRowChange}
              depositTokenPrices={depositTokenPrices}
              rewardTokenPrices={rewardTokenPrices}
              amountInjection={amountInjections[group.sailPool.key]}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 bg-black/10 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-white font-geo text-base">
            Generated transactions ({txs.length})
          </div>
          <button
            className="py-2 px-4 bg-harbor text-white font-medium hover:bg-harbor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              txs.length === 0 ||
              (safeInfo
                ? safeInfo.chainId !== 1 ||
                  safeInfo.safeAddress.toLowerCase() !==
                    TREASURY_SAFE_ADDRESS.toLowerCase()
                : false)
            }
            onClick={handleDeposit}
            title={
              safeInfo
                ? "Propose the batch as a Safe transaction"
                : "Send the batch from your connected wallet (EOA)"
            }
          >
            Deposit
          </button>
        </div>
        {txs.length === 0 ? (
          <div className="text-white/60 text-sm">
            Select at least one pool and enter a valid reward token + amount.
          </div>
        ) : (
          <div className="space-y-3">
            {txs.map((t, i) => (
              <div key={i} className="border border-white/10 p-3">
                <div className="text-white/90 text-sm mb-1">{t.label}</div>
                <div className="text-white/60 text-xs font-mono break-all">
                  to: {t.to}
                </div>
                <div className="text-white/60 text-xs font-mono break-all">
                  data: {t.data}
                </div>
              </div>
            ))}
          </div>
        )}
        {depositResult ? (
          <div className="mt-3 text-green-400 text-xs">{depositResult}</div>
        ) : null}
        {depositError ? (
          <div className="mt-3 text-red-300 text-xs">{depositError}</div>
        ) : null}
      </div>
    </div>
  );
}

