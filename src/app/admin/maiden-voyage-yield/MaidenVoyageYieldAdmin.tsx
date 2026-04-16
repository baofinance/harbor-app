"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { isAddress, type Address } from "viem";
import { markets } from "@/config/markets";
import { getGraphHeaders, getGraphUrl } from "@/config/graph";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { buildMaidenVoyageYieldAdminMessage } from "@/lib/maidenVoyageYieldAdminAuth";
import type { MaidenVoyageDistributionEvent } from "@/lib/maidenVoyageYieldLedgerStore";
import { maidenVoyageYieldOwnerSharePercent } from "@/config/maidenVoyageYield";

type GraphParticipant = {
  user: string;
  maidenVoyageDepositCountedUSD: string;
  finalMaidenVoyageOwnershipShare: string;
  maidenVoyageBoostMultiplier: string;
  lastMaidenVoyageClaimUSD: string;
};

type GraphCampaign = {
  cap?: {
    cumulativeDepositsUSD: string;
    capUSD: string;
    capFilled: boolean;
  };
  yieldGlobal?: {
    cumulativeYieldUSD: string;
    cumulativeYieldFromCollateralUSD: string;
  };
};

const PARTICIPANTS_QUERY = `
  query MvYieldAdminPage($genesis: Bytes!, $skip: Int!, $capId: ID!) {
    maidenVoyageCapStatuses(first: 1, where: { id: $capId }) {
      cumulativeDepositsUSD
      capUSD
      capFilled
    }
    maidenVoyageYieldGlobals(first: 1, where: { id: $capId }) {
      cumulativeYieldUSD
      cumulativeYieldFromCollateralUSD
    }
    userHarborMarks_collection(
      first: 500
      skip: $skip
      where: { contractAddress: $genesis }
      orderBy: maidenVoyageDepositCountedUSD
      orderDirection: desc
    ) {
      user
      maidenVoyageDepositCountedUSD
      finalMaidenVoyageOwnershipShare
      maidenVoyageBoostMultiplier
      lastMaidenVoyageClaimUSD
    }
  }
`;

export function MaidenVoyageYieldAdmin() {
  const { isAdmin } = useAdminAccess();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const genesisOptions = useMemo(() => {
    return Object.entries(markets)
      .map(([id, m]) => {
        const g = (m as { addresses?: { genesis?: string }; name?: string })
          .addresses?.genesis;
        if (!g || !isAddress(g)) return null;
        return {
          id,
          label: (m as { name?: string }).name || id,
          genesis: g as Address,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, []);

  const [genesis, setGenesis] = useState<Address | "">("");
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<GraphParticipant[]>([]);
  const [campaign, setCampaign] = useState<GraphCampaign | null>(null);

  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [paidByWallet, setPaidByWallet] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<MaidenVoyageDistributionEvent[]>([]);
  const [storeMode, setStoreMode] = useState<string>("");

  const [batchWallets, setBatchWallets] = useState("");
  const [batchAmount, setBatchAmount] = useState("");
  const [batchTx, setBatchTx] = useState("");
  const [batchNotes, setBatchNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!genesis && genesisOptions[0]) {
      setGenesis(genesisOptions[0].genesis);
    }
  }, [genesis, genesisOptions]);

  const fetchParticipants = useCallback(async () => {
    if (!genesis || !isAddress(genesis)) return;
    setLoadingGraph(true);
    setGraphError(null);
    const graphUrl = getGraphUrl();
    const capId = genesis.toLowerCase();
    try {
      const all: GraphParticipant[] = [];
      let skip = 0;
      let capSet = false;
      for (;;) {
        const res = await fetch(graphUrl, {
          method: "POST",
          headers: getGraphHeaders(graphUrl),
          body: JSON.stringify({
            query: PARTICIPANTS_QUERY,
            variables: {
              genesis: genesis.toLowerCase(),
              skip,
              capId,
            },
          }),
        });
        const json = await res.json();
        if (json.errors?.length) {
          throw new Error(
            json.errors.map((e: { message?: string }) => e.message).join("; ")
          );
        }
        const d = json.data;
        if (!capSet) {
          const cap = Array.isArray(d.maidenVoyageCapStatuses)
            ? d.maidenVoyageCapStatuses[0]
            : undefined;
          const yieldGlobal = Array.isArray(d.maidenVoyageYieldGlobals)
            ? d.maidenVoyageYieldGlobals[0]
            : undefined;
          setCampaign({
            cap: cap || undefined,
            yieldGlobal: yieldGlobal || undefined,
          });
          capSet = true;
        }
        const chunk = (d.userHarborMarks_collection ||
          []) as GraphParticipant[];
        all.push(...chunk);
        if (chunk.length < 500) break;
        skip += 500;
      }
      setParticipants(all);
    } catch (e: unknown) {
      setGraphError(e instanceof Error ? e.message : "GraphQL failed");
      setParticipants([]);
      setCampaign(null);
    } finally {
      setLoadingGraph(false);
    }
  }, [genesis]);

  useEffect(() => {
    void fetchParticipants();
  }, [fetchParticipants]);

  const signAndPost = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!genesis || !address) throw new Error("Connect wallet and pick genesis");
      const ts = Math.floor(Date.now() / 1000);
      const message = buildMaidenVoyageYieldAdminMessage(genesis, ts);
      const signature = await signMessageAsync({ message });
      return fetch("/api/admin/maiden-voyage-yield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          genesis,
          adminAddress: address,
          signature,
          timestamp: ts,
        }),
      });
    },
    [genesis, address, signMessageAsync]
  );

  const loadLedger = useCallback(async () => {
    if (!genesis) return;
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const res = await signAndPost({ action: "ledger" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setPaidByWallet(json.ledger?.paidByWallet || {});
      setEvents(json.ledger?.events || []);
      setStoreMode(json.store || "");
    } catch (e: unknown) {
      setLedgerError(e instanceof Error ? e.message : "Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  }, [signAndPost, genesis]);

  const saveDistribution = useCallback(async () => {
    if (!genesis) return;
    const lines = batchWallets
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const amt = Number(batchAmount);
    if (!lines.length || !Number.isFinite(amt) || amt <= 0) {
      setLedgerError("Enter wallet(s) and a positive amount");
      return;
    }
    const bad = lines.find((w) => !isAddress(w));
    if (bad) {
      setLedgerError(`Invalid address: ${bad}`);
      return;
    }
    setSaving(true);
    setLedgerError(null);
    try {
      const distributions = lines.map((wallet) => ({
        wallet,
        amountUSD: amt,
        txHash: batchTx.trim() || undefined,
        notes: batchNotes.trim() || undefined,
      }));
      const res = await signAndPost({ action: "record", distributions });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setPaidByWallet(json.ledger?.paidByWallet || {});
      setEvents(json.ledger?.events || []);
      setStoreMode(json.store || "");
      setBatchWallets("");
      setBatchAmount("");
    } catch (e: unknown) {
      setLedgerError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    signAndPost,
    genesis,
    batchWallets,
    batchAmount,
    batchTx,
    batchNotes,
  ]);

  const cumulativeYield = parseFloat(
    campaign?.yieldGlobal?.cumulativeYieldUSD || "0"
  );

  const rows = useMemo(() => {
    const withWeights = participants.map((p) => {
      const share = parseFloat(p.finalMaidenVoyageOwnershipShare || "0");
      const boost = parseFloat(p.maidenVoyageBoostMultiplier || "1");
      const weight = share * boost;
      return { p, share, boost, weight };
    });

    const totalWeight = withWeights.reduce((s, r) => s + r.weight, 0);
    const totalShare = withWeights.reduce((s, r) => s + r.share, 0);

    return withWeights
      .map(({ p, share, boost, weight }) => {
        const poolShare =
          totalWeight > 0
            ? weight / totalWeight
            : totalShare > 0
              ? share / totalShare
              : 0;
        const attributed =
          totalWeight > 0
            ? (cumulativeYield * weight) / totalWeight
            : cumulativeYield * share;
        const w = p.user.toLowerCase();
        const paid = parseFloat(paidByWallet[w] || "0");
        const outstanding = attributed - paid;
        return {
          wallet: p.user,
          share,
          poolShare,
          boost,
          weight,
          attributed,
          paid,
          outstanding,
        };
      })
      .filter((r) => r.share > 0 || r.paid > 0);
  }, [participants, cumulativeYield, paidByWallet]);

  const protocolOwnerPct =
    genesis && isAddress(genesis)
      ? maidenVoyageYieldOwnerSharePercent(genesis.toLowerCase())
      : null;

  if (!isAdmin) {
    return (
      <div className="bg-zinc-900/50 p-6 text-center rounded-md">
        <h2 className="text-2xl font-medium text-white mb-2 font-geo">
          Access Denied
        </h2>
        <p className="text-white/70">
          Only the Genesis owner wallet (per app config) can open this tool.
          Recorded payouts are keyed by each market&apos;s genesis address; API
          calls require a signature from that market&apos;s on-chain owner.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 p-4 sm:p-6 rounded-md">
        <h2 className="text-lg font-medium text-white font-geo mb-2">
          Subgraph + ledger
        </h2>
        <p className="text-xs text-white/60 mb-4">
          <strong className="text-white/80">Ownership %</strong> is cap ownership at
          genesis end (<code className="text-white/80">finalMaidenVoyageOwnershipShare</code>
          ). <strong className="text-white/80">Pool share %</strong> is how attributed
          yield splits among participants:{" "}
          <code className="text-white/80">(ownership × boost) / Σ(ownership × boost)</code>
          , so pool shares sum to 100% of this table&apos;s attributed pool (the{" "}
          <code className="text-white/80">cumulativeYieldUSD</code> total for this genesis).
          {protocolOwnerPct != null ? (
            <>
              {" "}
              Protocol revenue routing to this maiden pool is{" "}
              <code className="text-white/80">{protocolOwnerPct}%</code> of the relevant
              fee stream (see subgraph config); that is separate from the 100% split below.
            </>
          ) : null}{" "}
          <code className="text-white/80">Boost</code> is the ve-style retention multiplier.
          Outstanding = attributed − cumulative paid (this ledger).
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-white/60 mb-1">Genesis</label>
            <select
              value={genesis}
              onChange={(e) => setGenesis(e.target.value as Address)}
              className="bg-zinc-950 px-3 py-2 text-white text-sm min-w-[240px]"
            >
              {genesisOptions.map((o) => (
                <option key={o.id} value={o.genesis}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void fetchParticipants()}
            disabled={loadingGraph}
            className="py-2 px-4 bg-harbor text-white text-sm disabled:opacity-50"
          >
            {loadingGraph ? "Refreshing…" : "Refresh Graph"}
          </button>
          <button
            type="button"
            onClick={() => void loadLedger()}
            disabled={ledgerLoading || !isConnected}
            className="py-2 px-4 bg-zinc-700 text-white text-sm disabled:opacity-50"
          >
            {ledgerLoading ? "Loading…" : "Sign & load ledger"}
          </button>
        </div>
        {graphError && (
          <p className="text-red-400 text-sm mt-2">{graphError}</p>
        )}
        {campaign?.cap && (
          <div className="mt-4 text-sm text-white/80 grid sm:grid-cols-2 gap-2">
            <div>
              Cap fill: {campaign.cap.cumulativeDepositsUSD} /{" "}
              {campaign.cap.capUSD} USD
              {campaign.cap.capFilled ? " (filled)" : ""}
            </div>
            <div>
              Pool cumulative yield:{" "}
              {campaign.yieldGlobal?.cumulativeYieldUSD ?? "0"} USD
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/50 p-4 sm:p-6 rounded-md">
        <h2 className="text-lg font-medium text-white font-geo mb-3">
          Record distribution
        </h2>
        <p className="text-xs text-white/60 mb-3">
          Same USD amount is applied to each listed wallet. Uses your wallet
          signature (must be on-chain owner of selected genesis).
          {storeMode ? ` Store: ${storeMode}.` : ""}
        </p>
        {ledgerError && (
          <p className="text-red-400 text-sm mb-2">{ledgerError}</p>
        )}
        <div className="grid gap-3">
          <textarea
            value={batchWallets}
            onChange={(e) => setBatchWallets(e.target.value)}
            placeholder="Wallets (space, comma, or newline separated)"
            rows={3}
            className="w-full bg-zinc-950 px-3 py-2 text-white text-sm font-mono"
          />
          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              value={batchAmount}
              onChange={(e) => setBatchAmount(e.target.value)}
              placeholder="Amount USD (each)"
              className="bg-zinc-950 px-3 py-2 text-white text-sm w-40"
            />
            <input
              value={batchTx}
              onChange={(e) => setBatchTx(e.target.value)}
              placeholder="Tx hash (optional)"
              className="flex-1 min-w-[200px] bg-zinc-950 px-3 py-2 text-white text-sm font-mono"
            />
          </div>
          <input
            value={batchNotes}
            onChange={(e) => setBatchNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="bg-zinc-950 px-3 py-2 text-white text-sm"
          />
          <button
            type="button"
            onClick={() => void saveDistribution()}
            disabled={saving || !isConnected}
            className="py-2 px-4 bg-blue-600 text-white text-sm w-fit disabled:opacity-50"
          >
            {saving ? "Signing…" : "Sign & record"}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 p-4 sm:p-6 rounded-md overflow-x-auto">
        <h2 className="text-lg font-medium text-white font-geo mb-3">
          Participants
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/60 border-b border-white/10">
              <th className="py-2 pr-3">Wallet</th>
              <th className="py-2 pr-3">Ownership %</th>
              <th className="py-2 pr-3">Pool share %</th>
              <th className="py-2 pr-3 text-right">Attributed</th>
              <th className="py-2 pr-3 text-right">Paid</th>
              <th className="py-2 pr-3 text-right">Outstanding</th>
              <th className="py-2 pr-3 text-right">Weight</th>
              <th className="py-2 text-right">Boost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.wallet} className="border-t border-white/5">
                <td className="py-2 pr-3 font-mono text-xs text-white/90">
                  {r.wallet}
                </td>
                <td className="py-2 pr-3 text-white">
                  {(r.share * 100).toFixed(4)}%
                </td>
                <td className="py-2 pr-3 text-white">
                  {(r.poolShare * 100).toFixed(4)}%
                </td>
                <td className="py-2 pr-3 text-right font-mono">
                  {r.attributed.toFixed(2)}
                </td>
                <td className="py-2 pr-3 text-right font-mono">
                  {r.paid.toFixed(2)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-amber-200">
                  {r.outstanding.toFixed(2)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-white/70">
                  {r.weight.toFixed(6)}
                </td>
                <td className="py-2 text-right font-mono">
                  {r.boost.toFixed(2)}×
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loadingGraph && (
          <p className="text-white/50 text-sm mt-2">
            No rows with ownership or prior payouts. Deploy the new subgraph
            schema or refresh after indexing.
          </p>
        )}
      </div>

      {events.length > 0 && (
        <div className="bg-zinc-900/50 p-4 sm:p-6 rounded-md">
          <h2 className="text-lg font-medium text-white font-geo mb-3">
            Recent batches
          </h2>
          <ul className="space-y-2 text-xs font-mono text-white/80">
            {events.slice(0, 20).map((ev) => (
              <li key={ev.id}>
                {ev.createdAt} — {ev.wallet} — {ev.amountUSD} USD
                {ev.txHash ? ` — ${ev.txHash}` : ""}
                {ev.notes ? ` — ${ev.notes}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
