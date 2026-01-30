"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InfoTooltip from "@/components/InfoTooltip";
import { formatEther, formatUSD } from "@/utils/formatters";
import { toHex } from "viem";

type ApiResult = {
  message?: string;
  error?: string;
};

type PayoutEntry = {
  referrer: string;
  totalEthWei: string;
  totalUsdE18: string;
  eligible: boolean;
};

type RebateEntry = {
  user: string;
  totalEthWei: string;
  totalUsdE18: string;
  eligible: boolean;
};

export default function AdminReferralsPage() {
  const [adminKey, setAdminKey] = useState("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);
  const [payoutSummary, setPayoutSummary] = useState<{
    referrers: number;
    rebates: number;
    totalEthWei: bigint;
    totalUsdE18: bigint;
  } | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [sendingRewards, setSendingRewards] = useState(false);
  const [sendingRebates, setSendingRebates] = useState(false);
  const [settings, setSettings] = useState({
    rebatePercent: 25,
    rebateMaxFees: 3,
    rebateMinFeeUsd: 5,
    referrerFeeSharePercent: 5,
    referrerMarksSharePercent: 5,
    referrerYieldSharePercent: 5,
    maxActiveCodes: 10,
    minPayoutUsd: 100,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("harbor:adminKey");
      if (stored) {
        setAdminKey(stored);
        return;
      }
    } catch {
      // Ignore storage failures
    }

    if (!adminKey && process.env.NEXT_PUBLIC_REFERRAL_ADMIN_KEY) {
      setAdminKey(process.env.NEXT_PUBLIC_REFERRAL_ADMIN_KEY);
    }
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    try {
      localStorage.setItem("harbor:adminKey", adminKey);
    } catch {
      // Ignore storage failures
    }
  }, [adminKey]);

  const callAdmin = async (path: string, options?: RequestInit) => {
    setLoading(true);
    try {
      const res = await fetch(path, {
        ...(options || {}),
        headers: {
          ...(options?.headers || {}),
          Authorization: `Bearer ${adminKey}`,
        },
      });
      if (res.headers.get("content-type")?.includes("text/csv")) {
        const text = await res.text();
        setOutput(text.slice(0, 4000));
        return;
      }
      const json = (await res.json()) as ApiResult;
      setOutput(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setOutput(err?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const formatE18 = (value?: string | null) =>
    value ? formatUSD(Number(BigInt(value)) / 1e18) : "$0";
  const formatEthWei = (value?: string | null) =>
    value ? `${formatEther(BigInt(value))} ETH` : "0 ETH";

  const formattedOutput = useMemo(() => {
    if (!output) return "No output yet.";
    try {
      const parsed = JSON.parse(output);
      if (parsed?.payouts || parsed?.rebates) {
        const payouts = (parsed.payouts || []).map((p: any) => ({
          ...p,
          totalUsd: formatE18(p.totalUsdE18),
          totalEth: formatEthWei(p.totalEthWei),
        }));
        const rebates = (parsed.rebates || []).map((r: any) => ({
          ...r,
          totalUsd: formatE18(r.totalUsdE18),
          totalEth: formatEthWei(r.totalEthWei),
        }));
        return JSON.stringify({ ...parsed, payouts, rebates }, null, 2);
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return output;
    }
  }, [output]);

  const sendEthBatch = async (txs: Array<{ to: string; value: bigint }>) => {
    const ethereum = (window as any)?.ethereum;
    if (!ethereum?.request) {
      throw new Error("No injected wallet found (window.ethereum).");
    }
    if (txs.length === 0) {
      throw new Error("No eligible payouts.");
    }
    const calls = txs.map((t) => ({
      to: t.to,
      value: toHex(t.value),
      data: "0x",
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
      return typeof res === "string" ? res : "Sent batch via wallet_sendCalls.";
    } catch (err: any) {
      for (const t of txs) {
        await ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              to: t.to,
              value: toHex(t.value),
              data: "0x",
            },
          ],
        });
      }
      return "Sent transactions via eth_sendTransaction (one by one).";
    }
  };

  const sendReferrerRewards = async () => {
    if (!adminKey) {
      setOutput("Missing admin key.");
      return;
    }
    setSendingRewards(true);
    try {
      const res = await fetch("/api/referrals/earnings/payouts", {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to fetch payouts");
      }
      const json = await res.json();
      const payouts: PayoutEntry[] = json?.payouts || [];
      const txs = payouts
        .filter((p) => p.eligible && p.totalEthWei && p.referrer)
        .map((p) => ({
          to: p.referrer,
          value: BigInt(p.totalEthWei),
        }));
      const result = await sendEthBatch(txs);
      setOutput(result);
    } catch (err: any) {
      setOutput(err?.message || "Failed to send referrer rewards");
    } finally {
      setSendingRewards(false);
    }
  };

  const sendRebates = async () => {
    if (!adminKey) {
      setOutput("Missing admin key.");
      return;
    }
    setSendingRebates(true);
    try {
      const res = await fetch("/api/referrals/earnings/rebates", {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to fetch rebates");
      }
      const json = await res.json();
      const rebates: RebateEntry[] = json?.rebates || [];
      const txs = rebates
        .filter((r) => r.eligible && r.totalEthWei && r.user)
        .map((r) => ({
          to: r.user,
          value: BigInt(r.totalEthWei),
        }));
      const result = await sendEthBatch(txs);
      setOutput(result);
    } catch (err: any) {
      setOutput(err?.message || "Failed to send rebates");
    } finally {
      setSendingRebates(false);
    }
  };

  const runMonthlyBatch = async () => {
    if (!adminKey) {
      setOutput("Missing admin key.");
      return;
    }
    setRunningBatch(true);
    setOutput("Running yield sync...");
    await callAdmin("/api/referrals/yield/sync", { method: "POST" });
    setOutput("Running marks sync...");
    await callAdmin("/api/referrals/marks/sync", { method: "POST" });
    setOutput("Generating payouts...");
    await callAdmin("/api/referrals/earnings/payouts");
    await callAdmin("/api/referrals/earnings/last-run", { method: "POST" });
    await loadLastRun();
    setRunningBatch(false);
  };

  const runMonthlyBatchAndDownload = async () => {
    if (!adminKey) {
      setOutput("Missing admin key.");
      return;
    }
    setRunningBatch(true);
    await runMonthlyBatch();
    await exportBatch("csv");
    setRunningBatch(false);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportBatch = async (format: "csv" | "json") => {
    if (!adminKey) {
      setOutput("Missing admin key.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/referrals/earnings/export/batch?format=${format}`,
        {
          headers: { Authorization: `Bearer ${adminKey}` },
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to export batch");
      }
      const content = await res.text();
      const filename =
        format === "csv" ? "referral-batch.csv" : "referral-batch.json";
      const type = format === "csv" ? "text/csv" : "application/json";
      downloadFile(content, filename, type);
      setOutput(`Downloaded ${filename}`);
    } catch (err: any) {
      setOutput(err?.message || "Failed to export batch");
    } finally {
      setLoading(false);
    }
  };

  const exportReferrers = async (format: "csv" | "json") => {
    await exportGeneric(`/api/referrals/earnings/export?format=${format}`, `referrers.${format}`, format);
  };

  const exportRebates = async (format: "csv" | "json") => {
    await exportGeneric(`/api/referrals/earnings/export/rebates?format=${format}`, `rebates.${format}`, format);
  };

  const exportGeneric = async (path: string, filename: string, format: "csv" | "json") => {
    if (!adminKey) {
      setOutput("Missing admin key.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Export failed");
      }
      const content = await res.text();
      const type = format === "csv" ? "text/csv" : "application/json";
      downloadFile(content, filename, type);
      setOutput(`Downloaded ${filename}`);
    } catch (err: any) {
      setOutput(err?.message || "Export failed");
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutSummary = async () => {
    if (!adminKey) return;
    try {
      const [payoutRes, rebateRes] = await Promise.all([
        fetch("/api/referrals/earnings/payouts", {
          headers: { Authorization: `Bearer ${adminKey}` },
        }),
        fetch("/api/referrals/earnings/rebates", {
          headers: { Authorization: `Bearer ${adminKey}` },
        }),
      ]);
      if (!payoutRes.ok || !rebateRes.ok) return;
      const payoutsJson = await payoutRes.json();
      const rebatesJson = await rebateRes.json();
      const payouts = payoutsJson?.payouts || [];
      const rebates = rebatesJson?.rebates || [];
      let totalEthWei = 0n;
      let totalUsdE18 = 0n;
      for (const p of payouts) {
        if (!p.eligible) continue;
        totalEthWei += BigInt(p.totalEthWei || "0");
        totalUsdE18 += BigInt(p.totalUsdE18 || "0");
      }
      for (const r of rebates) {
        if (!r.eligible) continue;
        totalEthWei += BigInt(r.totalEthWei || "0");
        totalUsdE18 += BigInt(r.totalUsdE18 || "0");
      }
      setPayoutSummary({
        referrers: payouts.filter((p: any) => p.eligible).length,
        rebates: rebates.filter((r: any) => r.eligible).length,
        totalEthWei,
        totalUsdE18,
      });
    } catch {
      // ignore summary errors
    }
  };

  const loadLastRun = async () => {
    if (!adminKey) return;
    try {
      const res = await fetch("/api/referrals/earnings/last-run", {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setLastRun(json?.lastRun || null);
    } catch {
      // ignore
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referrals/settings", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load settings");
      const data = json?.settings || {};
      setSettings({
        rebatePercent: (Number(data.rebatePercent) || 0) * 100,
        rebateMaxFees: Number(data.rebateMaxFees) || 0,
        rebateMinFeeUsd: Number(data.rebateMinFeeUsd) || 0,
        referrerFeeSharePercent: (Number(data.referrerFeeSharePercent) || 0) * 100,
        referrerMarksSharePercent: (Number(data.referrerMarksSharePercent) || 0) * 100,
        referrerYieldSharePercent: (Number(data.referrerYieldSharePercent) || 0) * 100,
        maxActiveCodes: Number(data.maxActiveCodes) || 0,
        minPayoutUsd: Number(data.minPayoutUsd) || 0,
      });
    } catch (err: any) {
      setOutput(err?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!adminKey) {
      setOutput("Missing admin key.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        rebatePercent: settings.rebatePercent / 100,
        rebateMaxFees: settings.rebateMaxFees,
        rebateMinFeeUsd: settings.rebateMinFeeUsd,
        referrerFeeSharePercent: settings.referrerFeeSharePercent / 100,
        referrerMarksSharePercent: settings.referrerMarksSharePercent / 100,
        referrerYieldSharePercent: settings.referrerYieldSharePercent / 100,
        maxActiveCodes: settings.maxActiveCodes,
        minPayoutUsd: settings.minPayoutUsd,
      };
      const res = await fetch("/api/referrals/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save settings");
      setOutput("Settings saved.");
      await loadSettings();
    } catch (err: any) {
      setOutput(err?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    loadPayoutSummary();
    loadLastRun();
  }, [adminKey]);

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1E4775]">Referral Admin</h1>
        <Link href="/admin" className="text-sm text-[#1E4775] underline">
          Back to Admin
        </Link>
      </div>

      <div className="bg-white border border-[#1E4775]/10 rounded-lg p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#1E4775]">
            Admin Key
          </label>
          <input
            className="mt-2 w-full rounded-full border border-[#1E4775]/20 px-4 py-2 text-sm"
            placeholder="REFERRAL_ADMIN_KEY"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-[#1E4775]/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1E4775]">
              Program Settings
            </h2>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 rounded-full border border-[#1E4775]/30 text-xs text-[#1E4775]"
                disabled={loading}
                onClick={loadSettings}
              >
                <span className="inline-flex items-center gap-2">
                  Refresh
                  <InfoTooltip label="Reload referral settings from storage (use after changes are made elsewhere)." />
                </span>
              </button>
              <button
                className="px-3 py-1.5 rounded-full bg-[#1E4775] text-white text-xs"
                disabled={loading}
                onClick={saveSettings}
              >
                <span className="inline-flex items-center gap-2">
                  Save
                  <InfoTooltip label="Persist referral settings (percentages, limits, thresholds) used for calculations." />
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Rebate %</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.rebatePercent}
                onChange={(e) =>
                  setSettings({ ...settings, rebatePercent: Number(e.target.value) })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Rebate Max Fees</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.rebateMaxFees}
                onChange={(e) =>
                  setSettings({ ...settings, rebateMaxFees: Number(e.target.value) })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Rebate Min Fee ($)</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.rebateMinFeeUsd}
                onChange={(e) =>
                  setSettings({ ...settings, rebateMinFeeUsd: Number(e.target.value) })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Min Payout ($)</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.minPayoutUsd}
                onChange={(e) =>
                  setSettings({ ...settings, minPayoutUsd: Number(e.target.value) })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Referrer Fee %</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.referrerFeeSharePercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    referrerFeeSharePercent: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Referrer Yield %</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.referrerYieldSharePercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    referrerYieldSharePercent: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Referrer Marks %</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.referrerMarksSharePercent}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    referrerMarksSharePercent: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-gray-500">Max Active Codes</span>
              <input
                className="w-full rounded-full border border-[#1E4775]/20 px-3 py-1.5"
                type="number"
                value={settings.maxActiveCodes}
                onChange={(e) =>
                  setSettings({ ...settings, maxActiveCodes: Number(e.target.value) })
                }
              />
            </label>
          </div>
        </div>

        <div className="rounded-lg border border-[#1E4775]/10 p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1E4775]">
            Send Payouts
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-1.5 rounded-full bg-[#1E4775] text-white text-xs disabled:opacity-60"
              disabled={sendingRewards || loading}
              onClick={sendReferrerRewards}
            >
              Send Referrer Rewards
            </button>
            <button
              className="px-3 py-1.5 rounded-full bg-[#1E4775] text-white text-xs disabled:opacity-60"
              disabled={sendingRebates || loading}
              onClick={sendRebates}
            >
              Send Rebates
            </button>
            <span className="text-xs text-gray-500">
              Uses your connected wallet to batch-send ETH.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="px-4 py-2 rounded-full bg-[#1E4775] text-white text-sm"
            disabled={loading}
            onClick={() => callAdmin("/api/referrals/yield/sync", { method: "POST" })}
          >
            <span className="inline-flex items-center gap-2">
              Sync Yield
              <InfoTooltip label="Replays deposit/withdraw activity to update yield accruals. Run before payouts or after heavy deposit activity." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#1E4775] text-white text-sm"
            disabled={loading}
            onClick={() => callAdmin("/api/referrals/marks/sync", { method: "POST" })}
          >
            <span className="inline-flex items-center gap-2">
              Sync Marks
              <InfoTooltip label="Syncs marks events from the subgraph and applies referrer marks share. Run before payouts." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#1E4775] text-white text-sm"
            disabled={loading || runningBatch}
            onClick={runMonthlyBatch}
          >
            <span className="inline-flex items-center gap-2">
              {runningBatch ? "Running Batch..." : "Run Monthly Batch"}
              <InfoTooltip label="Runs yield sync + marks sync, then refreshes payout summary (no download)." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#1E4775] text-white text-sm"
            disabled={loading || runningBatch}
            onClick={runMonthlyBatchAndDownload}
          >
            <span className="inline-flex items-center gap-2">
              {runningBatch ? "Working..." : "Run Batch + Download"}
              <InfoTooltip label="Runs the monthly batch and downloads the combined payout CSV." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => callAdmin("/api/referrals/earnings/payouts")}
          >
            <span className="inline-flex items-center gap-2">
              View Payouts
              <InfoTooltip label="Preview eligible referrer payouts (fee + yield) with totals." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => callAdmin("/api/referrals/earnings/rebates")}
          >
            <span className="inline-flex items-center gap-2">
              View Rebates
              <InfoTooltip label="Preview eligible user rebates (fee rebates owed to referred users)." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => callAdmin("/api/referrals/earnings/export?format=csv")}
          >
            <span className="inline-flex items-center gap-2">
              Export CSV
              <InfoTooltip label="Preview referrer payout CSV in the output panel (no download)." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => exportBatch("csv")}
          >
            <span className="inline-flex items-center gap-2">
              Download Batch CSV
              <InfoTooltip label="Download combined referrer + rebate payout list for multisend." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => exportBatch("json")}
          >
            <span className="inline-flex items-center gap-2">
              Download Batch JSON
              <InfoTooltip label="Download combined payout list as JSON for scripts/tools." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => exportReferrers("csv")}
          >
            <span className="inline-flex items-center gap-2">
              Download Referrers CSV
              <InfoTooltip label="Download referrer-only payouts (fees + yield) as CSV." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => exportRebates("csv")}
          >
            <span className="inline-flex items-center gap-2">
              Download Rebates CSV
              <InfoTooltip label="Download rebates owed to referred users as CSV." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => exportReferrers("json")}
          >
            <span className="inline-flex items-center gap-2">
              Download Referrers JSON
              <InfoTooltip label="Download referrer-only payouts as JSON." />
            </span>
          </button>
          <button
            className="px-4 py-2 rounded-full bg-[#FF8A7A] text-white text-sm"
            disabled={loading}
            onClick={() => exportRebates("json")}
          >
            <span className="inline-flex items-center gap-2">
              Download Rebates JSON
              <InfoTooltip label="Download rebates owed to referred users as JSON." />
            </span>
          </button>
        </div>

        {(payoutSummary || lastRun) && (
          <div className="text-xs text-gray-600">
            {payoutSummary && (
              <>
                Eligible referrers: {payoutSummary.referrers} • Eligible rebates:{" "}
                {payoutSummary.rebates} • Total payout ETH:{" "}
                {Number(payoutSummary.totalEthWei) / 1e18} • Total payout USD:{" "}
                {Number(payoutSummary.totalUsdE18) / 1e18}
              </>
            )}
            {lastRun && (
              <>
                {" "}
                • Last run: {new Date(Number(lastRun)).toLocaleString()}
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-[#1E4775]/10 rounded-lg p-6 mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#1E4775]">
          Output
        </h2>
        <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap break-words">
          {formattedOutput}
        </pre>
      </div>
    </div>
  );
}
