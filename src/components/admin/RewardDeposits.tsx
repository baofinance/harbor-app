"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { encodeFunctionData, isAddress, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { markets } from "@/config/markets";
import { TREASURY_SAFE_ADDRESS } from "@/config/treasury";
import { ERC20_ABI } from "@/config/contracts";
import { stabilityPoolABI } from "@/abis/stabilityPool";

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

function poolKindLabel(kind: PoolKind) {
  return kind === "collateral" ? "Anchor Pool" : "Sail Pool";
}

function truncate(addr: string) {
  if (!addr) return addr;
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {});
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

function RewardDepositRow({
  pool,
  onChange,
}: {
  pool: PoolEntry;
  onChange: (key: string, row: RowComputed) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [rewardTokenInput, setRewardTokenInput] = useState("");
  const [amountRaw, setAmountRaw] = useState("");

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

  return (
    <div className="bg-black/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white font-geo text-base">
            {pool.marketName} • {poolKindLabel(pool.poolKind)}
          </div>
          <div className="text-white/60 text-xs font-mono">
            {pool.poolAddress}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-white/70 whitespace-nowrap">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Include
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
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
            <span className={needsApprove ? "text-amber-300" : "text-green-400"}>
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
  );
}

export default function RewardDeposits() {
  const pools = useMemo(() => buildPoolEntries(), []);
  const [rows, setRows] = useState<Record<string, RowComputed>>({});

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
    const out: Array<{ to: `0x${string}`; value: string; data: `0x${string}`; label: string }> =
      [];

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
          value: "0",
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
          value: "0",
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
        value: "0",
        data,
        label: `${r.pool.marketName} • ${poolKindLabel(
          r.pool.poolKind
        )} • depositReward(${truncate(r.rewardToken)}, ${r.amountRaw})`,
      });
    }

    return out;
  }, [selectedRows]);

  const safeTxBuilderJson = useMemo(() => {
    return JSON.stringify(
      {
        version: "1.0",
        chainId: "1",
        createdAt: Date.now(),
        meta: {
          name: "Harbor: Stability Pool Reward Deposit",
          description:
            "Generated by Harbor admin UI. Execute from the treasury Safe.",
        },
        transactions: txs.map((t) => ({
          to: t.to,
          value: t.value,
          data: t.data,
        })),
      },
      null,
      2
    );
  }, [txs]);

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
            This page generates Safe-ready tx calldata (it does not submit onchain
            txs from your connected wallet).
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

      <div className="mt-4 space-y-3">
        {pools.map((p) => (
          <RewardDepositRow key={p.key} pool={p} onChange={onRowChange} />
        ))}
      </div>

      <div className="mt-4 bg-black/10 p-4">
        <div className="text-white font-geo text-base mb-2">
          Generated transactions ({txs.length})
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
      </div>
    </div>
  );
}

