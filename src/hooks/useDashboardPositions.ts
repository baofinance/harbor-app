"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useMemo } from "react";
import { getGraphUrl, getGraphHeaders, getSailPriceGraphUrlOptional } from "@/config/graph";
import { useAnchorLedgerMarks } from "@/hooks/useAnchorLedgerMarks";
import { buildDashboardAddressIndex } from "@/utils/dashboardPositionLabels";
import { markets, isMarketArchived } from "@/config/markets";
import { isMegaethMaidenVoyageMarket } from "@/utils/megaethMarket";

const USD_EPS = 0.005;

export type DashboardPositionRow = {
  id: string;
  category: "maiden_voyage" | "earn" | "leverage";
  marketLabel: string;
  detail: string;
  usd: number;
  href: "/genesis" | "/anchor" | "/sail";
};

const SAIL_POSITIONS_QUERY = `
  query DashboardUserSailPositions($userAddress: Bytes!) {
    userSailPositions(
      where: { user: $userAddress, balance_gt: "0" }
      first: 1000
    ) {
      id
      tokenAddress
      balanceUSD
      totalCostBasisUSD
      realizedPnLUSD
    }
  }
`;

function nonZeroUsd(usd: number): boolean {
  return Number.isFinite(usd) && usd > USD_EPS;
}

function nonZeroBalanceToken(balanceStr: string): boolean {
  try {
    const n = parseFloat(balanceStr || "0");
    return Number.isFinite(n) && n > 1e-12;
  } catch {
    return false;
  }
}

/** Genesis + user id for `userHarborMarks` (matches `useHarborMarks`). */
function userHarborMarksId(genesis: string, user: string): string {
  return `${genesis.toLowerCase()}-${user.toLowerCase()}`;
}

/** Some marks subgraph builds reject `id_in` on `userHarborMarks`; they return this-shaped error. */
function isUserHarborMarksIdInUnsupportedError(message: string): boolean {
  return (
    message.includes("id_in") ||
    message.includes("Unknown argument") ||
    message.includes("No value provided for required argument: `id`")
  );
}

type MvMarkRow = {
  id: string;
  contractAddress: string;
  currentDeposit?: string;
  currentDepositUSD?: string;
  genesisEnded?: boolean;
};

const DASHBOARD_MV_MARKS_FIELDS = `
  id
  contractAddress
  currentDeposit
  currentDepositUSD
  genesisEnded
`;

async function fetchDashboardMvMarks(graphUrl: string, ids: string[]): Promise<MvMarkRow[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const batchRes = await fetch(graphUrl, {
    method: "POST",
    headers: getGraphHeaders(graphUrl),
    body: JSON.stringify({
      query: `
        query DashboardMv($ids: [ID!]!) {
          userHarborMarks(where: { id_in: $ids }) {
            ${DASHBOARD_MV_MARKS_FIELDS}
          }
        }
      `,
      variables: { ids: uniqueIds },
    }),
  });
  const batchJson = (await batchRes.json()) as {
    errors?: Array<{ message?: string }>;
    data?: { userHarborMarks?: MvMarkRow[] };
  };

  if (batchJson.errors?.length) {
    const errMsg = batchJson.errors.map((e) => e.message).filter(Boolean).join("; ");
    if (!isUserHarborMarksIdInUnsupportedError(errMsg)) {
      throw new Error(errMsg || "Graph error");
    }

    const rows: MvMarkRow[] = [];
    await Promise.all(
      uniqueIds.map(async (id) => {
        const r = await fetch(graphUrl, {
          method: "POST",
          headers: getGraphHeaders(graphUrl),
          body: JSON.stringify({
            query: `
              query DashboardMvOne($id: ID!) {
                userHarborMarks(id: $id) {
                  ${DASHBOARD_MV_MARKS_FIELDS}
                }
              }
            `,
            variables: { id },
          }),
        });
        const j = (await r.json()) as {
          errors?: Array<{ message?: string }>;
          data?: { userHarborMarks?: MvMarkRow | null };
        };
        if (j.errors?.length) return;
        const m = j.data?.userHarborMarks;
        if (m?.id) rows.push(m);
      })
    );
    return rows;
  }

  return batchJson.data?.userHarborMarks ?? [];
}

export function useDashboardPositions() {
  const { address, isConnected } = useAccount();
  const userLower = address?.toLowerCase() ?? "";

  const index = useMemo(() => buildDashboardAddressIndex(), []);

  const mvIds = useMemo(() => {
    if (!userLower) return [] as string[];
    return Object.entries(markets)
      .filter(([id, mkt]) => {
        const g = (mkt as { addresses?: { genesis?: string } }).addresses?.genesis;
        if (!g || g === "0x0000000000000000000000000000000000000000") return false;
        if ((mkt as { status?: string }).status === "coming-soon") return false;
        if (isMegaethMaidenVoyageMarket(id, mkt)) return false;
        return true;
      })
      .map(([, mkt]) =>
        userHarborMarksId(
          (mkt as { addresses: { genesis: string } }).addresses.genesis,
          userLower
        )
      );
  }, [userLower]);

  const {
    haBalances,
    poolDeposits,
    sailBalances,
    loading: anchorLoading,
    error: anchorError,
  } = useAnchorLedgerMarks({ enabled: isConnected && !!address });

  const {
    data: mvData,
    isLoading: mvLoading,
    error: mvError,
  } = useQuery({
    queryKey: ["dashboardMvPositions", getGraphUrl(), userLower, mvIds.join(",")],
    queryFn: async () => {
      const graphUrl = getGraphUrl();
      if (!graphUrl || mvIds.length === 0) {
        return { userHarborMarks: [] as Array<Record<string, unknown>> };
      }
      const userHarborMarks = await fetchDashboardMvMarks(graphUrl, mvIds);
      return { userHarborMarks };
    },
    enabled: isConnected && !!address && mvIds.length > 0,
    refetchInterval: 60_000,
    staleTime: 15_000,
    retry: 1,
  });

  const sailGraphUrl = getSailPriceGraphUrlOptional();
  const {
    data: sailData,
    isLoading: sailLoading,
    error: sailError,
  } = useQuery({
    queryKey: ["dashboardSailPositions", sailGraphUrl, userLower],
    queryFn: async () => {
      if (!sailGraphUrl || !address) {
        return { userSailPositions: [] as Array<Record<string, unknown>> };
      }
      const res = await fetch(sailGraphUrl, {
        method: "POST",
        headers: getGraphHeaders(sailGraphUrl),
        body: JSON.stringify({
          query: SAIL_POSITIONS_QUERY,
          variables: { userAddress: userLower },
        }),
      });
      const json = (await res.json()) as {
        errors?: Array<{ message?: string }>;
        data?: { userSailPositions?: Array<Record<string, unknown>> };
      };
      if (json.errors?.length) {
        throw new Error(json.errors.map((e) => e.message).join("; ") || "Sail graph error");
      }
      return json.data ?? { userSailPositions: [] };
    },
    enabled: isConnected && !!address && !!sailGraphUrl,
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 1,
  });

  const { maidenVoyageRows, archivedMaidenVoyageRows } = useMemo(() => {
    const raw = (mvData?.userHarborMarks ?? []) as Array<{
      id: string;
      contractAddress: string;
      currentDeposit?: string;
      currentDepositUSD?: string;
      genesisEnded?: boolean;
    }>;
    const active: DashboardPositionRow[] = [];
    const archived: DashboardPositionRow[] = [];
    for (const m of raw) {
      const dep = BigInt((m.currentDeposit as string) || "0");
      const usd = parseFloat(m.currentDepositUSD || "0");
      if (dep === 0n && !nonZeroUsd(usd)) continue;

      const genLower = String(m.contractAddress || "").toLowerCase();
      const meta = index.genesisByAddressLower.get(genLower);
      if (meta?.hideFromMvList) continue;

      const marketLabel = meta?.displayName ?? "Maiden Voyage";
      const phase = m.genesisEnded ? "Ended" : "Active";
      const row: DashboardPositionRow = {
        id: `mv-${m.id}`,
        category: "maiden_voyage",
        marketLabel,
        detail: `Genesis · ${phase}`,
        usd,
        href: "/genesis",
      };
      const mktCfg = meta?.marketId
        ? (markets as Record<string, unknown>)[meta.marketId]
        : undefined;
      if (isMarketArchived(mktCfg)) {
        archived.push(row);
      } else {
        active.push(row);
      }
    }
    const sortByUsd = (a: DashboardPositionRow, b: DashboardPositionRow) => b.usd - a.usd;
    return {
      maidenVoyageRows: active.sort(sortByUsd),
      archivedMaidenVoyageRows: archived.sort(sortByUsd),
    };
  }, [mvData, index.genesisByAddressLower]);

  const earnRows = useMemo((): DashboardPositionRow[] => {
    const rows: DashboardPositionRow[] = [];

    for (const b of haBalances) {
      if (!nonZeroUsd(b.balanceUSD) && !nonZeroBalanceToken(b.balance)) continue;
      const tok = b.tokenAddress.toLowerCase();
      const meta = index.haTokenByAddressLower.get(tok);
      const marketLabel = meta?.displayName ?? "Earn";
      const pegSym =
        meta &&
        (markets as Record<string, { peggedToken?: { symbol?: string } }>)[meta.marketId]
          ?.peggedToken?.symbol;
      rows.push({
        id: `ha-${b.id}`,
        category: "earn",
        marketLabel,
        detail: `${pegSym ?? "Anchored"} · wallet`,
        usd: b.balanceUSD,
        href: "/anchor",
      });
    }

    for (const d of poolDeposits) {
      if (!nonZeroUsd(d.balanceUSD) && !nonZeroBalanceToken(d.balance)) continue;
      const pool = d.poolAddress.toLowerCase();
      const meta = index.poolByAddressLower.get(pool);
      const marketLabel = meta?.displayName ?? "Earn";
      const role = meta?.roleLabel ?? (d.poolType === "sail" ? "Sail pool" : "Anchor pool");
      rows.push({
        id: `pool-${d.id}`,
        category: "earn",
        marketLabel,
        detail: `${role} · stability`,
        usd: d.balanceUSD,
        href: "/anchor",
      });
    }

    return rows.sort((a, b) => b.usd - a.usd);
  }, [haBalances, poolDeposits, index]);

  const leverageRows = useMemo((): DashboardPositionRow[] => {
    const raw = (sailData?.userSailPositions ?? []) as Array<{
      id: string;
      tokenAddress: string;
      balanceUSD?: string;
    }>;
    const rows: DashboardPositionRow[] = [];
    const tokensFromSailSubgraphRow = new Set<string>();

    for (const p of raw) {
      const usd = parseFloat(p.balanceUSD || "0");
      if (!nonZeroUsd(usd)) continue;
      const tok = String(p.tokenAddress || "").toLowerCase();
      const meta = index.leveragedTokenByAddressLower.get(tok);
      const marketLabel = meta?.displayName ?? "Sail";
      const levSym =
        meta &&
        (markets as Record<string, { leveragedToken?: { symbol?: string } }>)[meta.marketId]
          ?.leveragedToken?.symbol;
      rows.push({
        id: `lev-${p.id}`,
        category: "leverage",
        marketLabel,
        detail: `${levSym ?? "Leveraged"} · position`,
        usd,
        href: "/sail",
      });
      tokensFromSailSubgraphRow.add(tok);
    }

    // Sail hs-token balances from marks ledger (same source as Genesis); show under Sail, not Earn.
    // Skip when the Sail price subgraph already lists the same token (avoid duplicate lines / totals).
    for (const s of sailBalances) {
      if (!nonZeroUsd(s.balanceUSD) && !nonZeroBalanceToken(s.balance)) continue;
      const tok = s.tokenAddress.toLowerCase();
      if (tokensFromSailSubgraphRow.has(tok)) continue;
      const levMeta = index.leveragedTokenByAddressLower.get(tok);
      const haMeta = index.haTokenByAddressLower.get(tok);
      const meta = levMeta ?? haMeta;
      const marketLabel = meta?.displayName ?? "Sail";
      rows.push({
        id: `sailbal-${s.id}`,
        category: "leverage",
        marketLabel,
        detail: "Sail token · marks",
        usd: s.balanceUSD,
        href: "/sail",
      });
    }

    return rows.sort((a, b) => b.usd - a.usd);
  }, [sailData, sailBalances, index]);

  const sailSubgraphMessage = useMemo(() => {
    if (!isConnected || !address || sailGraphUrl || anchorLoading) return null;
    if (leverageRows.length > 0) return null;
    return "Sail price subgraph URL is not configured (add it to show position notional from the Sail indexer).";
  }, [isConnected, address, sailGraphUrl, anchorLoading, leverageRows.length]);

  const anchorErrorStr = anchorError ? String(anchorError) : null;
  const mvErrorStr = mvError ? (mvError as Error).message : null;
  const sailErrorStr = sailError ? (sailError as Error).message : null;

  return {
    maidenVoyageRows,
    archivedMaidenVoyageRows,
    earnRows,
    leverageRows,
    isLoading: {
      anchor: anchorLoading,
      maidenVoyage: mvLoading && mvIds.length > 0,
      leverage:
        (sailLoading && !!sailGraphUrl) ||
        anchorLoading,
    },
    errors: {
      anchor: anchorErrorStr,
      maidenVoyage: mvErrorStr,
      leverage: sailSubgraphMessage ?? sailErrorStr,
    },
  };
}
