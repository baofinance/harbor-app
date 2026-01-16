"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { ConnectWallet } from "@/components/Wallet";
import {
  buildReferralBindTypedData,
  buildReferralCodeCreateTypedData,
} from "@/lib/referralsTypedData";
import { formatEther, formatUSD } from "@/utils/formatters";

type ReferralSummary = {
  codes: Array<{
    code: string;
    label: string;
    createdAt: number;
    active: boolean;
    usageCount: number;
  }>;
  binding: null | {
    referrer: string;
    code: string;
    status: string;
  };
  rebate: null | {
    usedCount: number;
    totalUsdE18: string;
    totalEthWei: string;
  };
  referrerTotals: null | {
    feeUsdE18: string;
    feeEthWei: string;
    yieldUsdE18: string;
    yieldEthWei: string;
    marksPoints: string;
  };
  settings: null | {
    rebateMaxFees: number;
    rebateMinFeeUsd: number;
  };
};

const parseUsdE18 = (value?: string | null) =>
  value ? Number(value) / 1e18 : 0;

export default function ReferralsPage() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [label, setLabel] = useState("");
  const [bindCode, setBindCode] = useState("");
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const referralLinkPrefix = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=`;
  }, []);

  const refresh = async () => {
    if (!address) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/referrals/summary?address=${address}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load summary");
      setSummary(json);
    } catch (err: any) {
      setMessage(err?.message || "Failed to load referral summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    refresh();
  }, [isConnected, address]);

  const handleCreateCode = async () => {
    if (!address) return;
    setLoading(true);
    setMessage(null);
    try {
      const nonceRes = await fetch(`/api/referrals/nonce?address=${address}`, {
        cache: "no-store",
      });
      const nonceJson = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceJson?.error || "Failed to get nonce");

      const typed = buildReferralCodeCreateTypedData({
        referrer: address,
        nonce: nonceJson.nonce,
        label: label.trim(),
      });
      const signature = await signTypedDataAsync(typed as any);

      const res = await fetch("/api/referrals/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrer: address,
          nonce: nonceJson.nonce,
          signature,
          label: label.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create code");
      setLabel("");
      await refresh();
      setMessage("Referral code created.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to create referral code");
    } finally {
      setLoading(false);
    }
  };

  const handleBindCode = async () => {
    if (!address || !bindCode.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const nonceRes = await fetch(`/api/referrals/nonce?address=${address}`, {
        cache: "no-store",
      });
      const nonceJson = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceJson?.error || "Failed to get nonce");

      const typed = buildReferralBindTypedData({
        referred: address,
        code: bindCode.trim(),
        nonce: nonceJson.nonce,
      });
      const signature = await signTypedDataAsync(typed as any);

      const res = await fetch("/api/referrals/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referred: address,
          nonce: nonceJson.nonce,
          signature,
          code: bindCode.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to bind referral");
      await refresh();
      setMessage("Referral code saved. It will activate on first deposit.");
    } catch (err: any) {
      setMessage(err?.message || "Failed to bind referral code");
    } finally {
      setLoading(false);
    }
  };

  const rebateUsd = parseUsdE18(summary?.rebate?.totalUsdE18);
  const rebateEth = summary?.rebate?.totalEthWei
    ? formatEther(BigInt(summary.rebate.totalEthWei))
    : "0";

  const referrerFeeUsd = parseUsdE18(summary?.referrerTotals?.feeUsdE18);
  const referrerYieldUsd = parseUsdE18(summary?.referrerTotals?.yieldUsdE18);
  const referrerTotalUsd = referrerFeeUsd + referrerYieldUsd;
  const referrerEth =
    summary?.referrerTotals?.feeEthWei && summary?.referrerTotals?.yieldEthWei
      ? formatEther(
          BigInt(summary.referrerTotals.feeEthWei) +
            BigInt(summary.referrerTotals.yieldEthWei)
        )
      : "0";

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1E4775]">Referrals</h1>
      </div>

      {!isConnected && (
        <div className="bg-white border border-[#1E4775]/10 p-6 rounded-lg text-sm text-gray-700">
          Connect your wallet to create and manage referral codes.
        </div>
      )}

      {isConnected && (
        <div className="space-y-6">
          <div className="bg-white border border-[#1E4775]/10 rounded-lg p-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1E4775]">
              Create a Code
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-1 rounded-full border border-[#1E4775]/20 bg-white px-4 py-2 text-sm text-[#1E4775] placeholder:text-[#1E4775]/40"
                placeholder="Label (optional, e.g. Twitter)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <button
                onClick={handleCreateCode}
                disabled={loading}
                className="px-5 py-2 rounded-full bg-[#FF8A7A] text-white text-sm font-medium hover:bg-[#FF6B5A] disabled:opacity-60"
              >
                {loading ? "Working..." : "Generate"}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Up to 10 active codes per wallet. Share links like
              {" "}
              <span className="font-mono">{referralLinkPrefix}CODE</span>.
            </p>
          </div>

          <div className="bg-white border border-[#1E4775]/10 rounded-lg p-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1E4775]">
              Your Codes
            </h2>
            {summary?.codes?.length ? (
              <div className="space-y-3">
                {summary.codes.map((code) => (
                  <div
                    key={code.code}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between border border-[#1E4775]/10 rounded-lg px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-[#1E4775]">
                        {code.code} {code.label ? `• ${code.label}` : ""}
                      </div>
                      <div className="text-xs text-gray-500">
                        Uses: {code.usageCount} • {code.active ? "Active" : "Inactive"}
                      </div>
                    </div>
                    {referralLinkPrefix && (
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <span className="text-xs text-gray-500">
                          {referralLinkPrefix}
                          {code.code}
                        </span>
                        <button
                          className="text-xs text-[#1E4775] underline"
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(`${referralLinkPrefix}${code.code}`)
                              .then(() => setMessage("Referral link copied."));
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No codes yet.</p>
            )}
          </div>

          <div className="bg-white border border-[#1E4775]/10 rounded-lg p-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#1E4775]">
              Apply a Referral Code
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="flex-1 rounded-full border border-[#1E4775]/20 bg-white px-4 py-2 text-sm text-[#1E4775] placeholder:text-[#1E4775]/40"
                placeholder="Enter code"
                value={bindCode}
                onChange={(e) => setBindCode(e.target.value)}
              />
              <button
                onClick={handleBindCode}
                disabled={loading}
                className="px-5 py-2 rounded-full bg-[#1E4775] text-white text-sm font-medium hover:bg-[#16365A] disabled:opacity-60"
              >
                {loading ? "Working..." : "Save Code"}
              </button>
            </div>
            {summary?.binding && (
              <p className="text-xs text-gray-500">
                Current code: {summary.binding.code} ({summary.binding.status})
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#1E4775]/10 rounded-lg p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1E4775]">
                Your Rebates
              </h3>
              <div className="mt-3 text-lg font-semibold text-[#1E4775]">
                {formatUSD(rebateUsd)} ({rebateEth} ETH)
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used {summary?.rebate?.usedCount ?? 0}/
                {summary?.settings?.rebateMaxFees ?? 3} eligible fees.
                Min fee ${summary?.settings?.rebateMinFeeUsd ?? 5}.
              </p>
            </div>

            <div className="bg-white border border-[#1E4775]/10 rounded-lg p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1E4775]">
                Referrer Earnings
              </h3>
              <div className="mt-3 text-lg font-semibold text-[#1E4775]">
                {formatUSD(referrerTotalUsd)} ({referrerEth} ETH)
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Marks earned: {summary?.referrerTotals?.marksPoints ?? "0"}
              </p>
            </div>
          </div>

          {message && (
            <div className="text-sm text-[#1E4775]">{message}</div>
          )}
        </div>
      )}
    </div>
  );
}
