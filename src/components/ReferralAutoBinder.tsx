"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useSignTypedData } from "wagmi";
import { buildReferralBindTypedData } from "@/lib/referralsTypedData";

const STORAGE_KEY = "harbor:referral:pendingCode";
const SETTINGS_CACHE_KEY = "harbor:referral:settings";

type ReferralStatus = "idle" | "pending" | "linking" | "linked" | "failed";

function normalizeCode(value: string | null): string | null {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export default function ReferralAutoBinder() {
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const inFlightRef = useRef(false);
  const lastAttemptRef = useRef<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ReferralStatus>("idle");
  const [message, setMessage] = useState("");
  const [bonusText, setBonusText] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [retryTick, setRetryTick] = useState(0);

  const refParam = normalizeCode(searchParams?.get("ref"));

  const formattedBonus = useMemo(() => {
    if (!bonusText) return "";
    return `Bonus: ${bonusText}`;
  }, [bonusText]);

  useEffect(() => {
    if (!refParam) return;
    try {
      localStorage.setItem(STORAGE_KEY, refParam);
    } catch {
      // Ignore storage failures (private mode, etc.)
    }
    setPendingCode(refParam);
    setStatus("pending");
    setVisible(true);
  }, [refParam]);

  useEffect(() => {
    if (!pendingCode) {
      try {
        const stored = normalizeCode(localStorage.getItem(STORAGE_KEY));
        if (stored) {
          setPendingCode(stored);
          setStatus("pending");
          setVisible(true);
        }
      } catch {
        // Ignore storage failures
      }
    }
  }, [pendingCode]);

  useEffect(() => {
    let active = true;
    const cached = (() => {
      try {
        return localStorage.getItem(SETTINGS_CACHE_KEY);
      } catch {
        return null;
      }
    })();

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          rebatePercent?: number;
          rebateMaxFees?: number;
          rebateMinFeeUsd?: number;
          payoutCurrency?: string;
        };
        const percent = Math.round((parsed.rebatePercent || 0) * 100);
        const maxFees = parsed.rebateMaxFees ?? 0;
        const minFee = parsed.rebateMinFeeUsd ?? 0;
        const currency = parsed.payoutCurrency || "ETH";
        const bonus = `${percent}% fee rebate (up to ${maxFees} ${currency}, min $${minFee})`;
        setBonusText(bonus);
      } catch {
        // Ignore cache parse errors
      }
    }

    (async () => {
      try {
        const res = await fetch("/api/referrals/settings", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        const settings = json?.settings;
        if (!settings || !active) return;
        const percent = Math.round((settings.rebatePercent || 0) * 100);
        const maxFees = settings.rebateMaxFees ?? 0;
        const minFee = settings.rebateMinFeeUsd ?? 0;
        const currency = settings.payoutCurrency || "ETH";
        const bonus = `${percent}% fee rebate (up to ${maxFees} ${currency}, min $${minFee})`;
        setBonusText(bonus);
        try {
          localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
        } catch {
          // Ignore storage failures
        }
      } catch {
        // Ignore settings fetch errors
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status === "pending" && pendingCode) {
      const bonusSuffix = formattedBonus ? ` ${formattedBonus}.` : "";
      if (!isConnected) {
        setMessage(
          `Referral code ${pendingCode} detected. Connect your wallet to link it.${bonusSuffix}`
        );
      } else {
        setMessage(`Ready to link referral ${pendingCode}.${bonusSuffix}`);
      }
    }
  }, [formattedBonus, isConnected, pendingCode, status]);

  useEffect(() => {
    if (!isConnected || !address) return;
    if (inFlightRef.current) return;

    if (!pendingCode) return;

    const attemptKey = `${address.toLowerCase()}:${pendingCode}`;
    if (lastAttemptRef.current === attemptKey) return;
    lastAttemptRef.current = attemptKey;

    inFlightRef.current = true;
    setStatus("linking");
    setMessage(`Linking referral ${pendingCode}...`);
    setVisible(true);
    (async () => {
      const bindingRes = await fetch(
        `/api/referrals/bind?address=${address}`,
        { cache: "no-store" }
      );
      const bindingJson = await bindingRes.json();
      if (bindingJson?.binding) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore storage failures
        }
        setStatus("linked");
        setMessage(
          `Referral already linked. ${formattedBonus || "Bonus applied."}`
        );
        return;
      }

      const nonceRes = await fetch(`/api/referrals/nonce?address=${address}`, {
        cache: "no-store",
      });
      const nonceJson = await nonceRes.json();
      if (!nonceRes.ok) {
        throw new Error(nonceJson?.error || "Failed to fetch nonce");
      }

      const typed = buildReferralBindTypedData({
        referred: address,
        code: pendingCode,
        nonce: nonceJson.nonce,
      });
      const signature = await signTypedDataAsync(typed as any);

      const bindRes = await fetch("/api/referrals/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referred: address,
          code: pendingCode,
          nonce: nonceJson.nonce,
          signature,
        }),
      });
      const bindJson = await bindRes.json();
      if (!bindRes.ok) {
        throw new Error(bindJson?.error || "Failed to bind referral");
      }

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage failures
      }
      setStatus("linked");
      setMessage(`Referral linked. ${formattedBonus || "Bonus applied."}`);
    })()
      .catch((err: any) => {
        const detail = err?.message ? ` ${err.message}` : "";
        setStatus("failed");
        setMessage(`Referral link failed.${detail}`);
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [
    address,
    formattedBonus,
    isConnected,
    pendingCode,
    retryTick,
    signTypedDataAsync,
  ]);

  if (!visible || status === "idle") {
    return null;
  }

  const statusStyles = {
    pending: "border-[#FFB4A5] text-white",
    linking: "border-[#FFB4A5] text-white",
    linked: "border-[#7AE5C4] text-white",
    failed: "border-[#FF8A7A] text-white",
  }[status];

  const showRetry = status === "failed" && pendingCode;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
      <div
        className={`flex flex-col gap-3 rounded-2xl border bg-[#163A62]/95 px-4 py-3 shadow-lg backdrop-blur ${statusStyles}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 text-sm leading-6">{message}</div>
          <button
            onClick={() => setVisible(false)}
            className="text-xs uppercase tracking-wide text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>
        {showRetry && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                lastAttemptRef.current = null;
                setStatus("pending");
                setVisible(true);
                setRetryTick((tick) => tick + 1);
              }}
              className="rounded-full bg-[#FF8A7A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#FF6B5A]"
            >
              Try again
            </button>
            {formattedBonus ? (
              <span className="text-xs text-white/80">{formattedBonus}</span>
            ) : null}
          </div>
        )}
        {status !== "failed" && formattedBonus ? (
          <div className="text-xs text-white/80">{formattedBonus}</div>
        ) : null}
      </div>
    </div>
  );
}
