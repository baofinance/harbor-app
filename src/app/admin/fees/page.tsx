"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { minterABI } from "@/abis/minter";
import { markets } from "@/config/markets";
import WalletButton from "@/components/WalletButton";

const WAD = 10n ** 18n;

type Band = {
  // upper bound collateral ratio for this band (e.g. 1.1x). The final band has no upper bound.
  upperBoundCR?: string; // optional for last band, in "x" units like "1.10"
  ratioPct: string; // fee/discount as percent, e.g. "2" or "-5" or "100" for disallow
};

type ActionKey =
  | "mintPegged"
  | "redeemPegged"
  | "mintLeveraged"
  | "redeemLeveraged";

type ActionBands = Record<ActionKey, Band[]>;

type IncentiveConfig = {
  collateralRatioBandUpperBounds: readonly bigint[];
  incentiveRatios: readonly bigint[]; // int256 onchain; viem accepts bigint
};

type MinterConfig = {
  mintPeggedIncentiveConfig: IncentiveConfig;
  redeemPeggedIncentiveConfig: IncentiveConfig;
  mintLeveragedIncentiveConfig: IncentiveConfig;
  redeemLeveragedIncentiveConfig: IncentiveConfig;
};

function parsePctToWad(pct: string): bigint {
  const s = pct.trim();
  if (!s) throw new Error("Missing ratio (%)");
  const neg = s.startsWith("-");
  const t = neg ? s.slice(1) : s;
  if (!t || t === ".") throw new Error("Invalid ratio (%)");

  const [i, f = ""] = t.split(".");
  if ((i && !/^\d+$/.test(i)) || (f && !/^\d+$/.test(f))) {
    throw new Error("Invalid ratio (%)");
  }
  const frac = (f + "0".repeat(18)).slice(0, 18);
  const wad = (BigInt(i || "0") * WAD + BigInt(frac)) / 100n; // percent => ratio
  return neg ? -wad : wad;
}

function parseCrToWad(cr: string): bigint {
  const s = cr.trim();
  if (!s) throw new Error("Missing upper bound CR");
  const [i, f = ""] = s.split(".");
  if ((i && !/^\d+$/.test(i)) || (f && !/^\d+$/.test(f))) {
    throw new Error("Invalid CR");
  }
  const frac = (f + "0".repeat(18)).slice(0, 18);
  return BigInt(i || "0") * WAD + BigInt(frac);
}

function wadToCrString(wad: bigint): string {
  const sign = wad < 0n ? "-" : "";
  const x = wad < 0n ? -wad : wad;
  const intPart = x / WAD;
  const frac = (x % WAD).toString().padStart(18, "0").slice(0, 4); // 4 dp
  const trimmed = frac.replace(/0+$/, "");
  return trimmed.length ? `${sign}${intPart.toString()}.${trimmed}` : `${sign}${intPart.toString()}`;
}

function wadToPctString(wad: bigint): string {
  // Special case: treat >= 100% as "100" (disallow)
  if (wad >= WAD) return "100";
  if (wad <= -WAD) return "-100";
  const sign = wad < 0n ? "-" : "";
  const x = wad < 0n ? -wad : wad;
  // pctWad = wad * 100
  const pctWad = x * 100n;
  const intPart = pctWad / WAD;
  const frac = (pctWad % WAD).toString().padStart(18, "0").slice(0, 4); // 4 dp
  const trimmed = frac.replace(/0+$/, "");
  return trimmed.length
    ? `${sign}${intPart.toString()}.${trimmed}`
    : `${sign}${intPart.toString()}`;
}

function buildIncentiveConfig(bands: Band[]): IncentiveConfig {
  if (bands.length < 1) {
    throw new Error("Need at least 1 band (including final open-ended band).");
  }

  const bounds: bigint[] = [];
  const ratios: bigint[] = [];

  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    ratios.push(parsePctToWad(b.ratioPct));

    const isLast = i === bands.length - 1;
    if (!isLast) {
      if (!b.upperBoundCR) throw new Error(`Missing upper bound CR for band ${i + 1}.`);
      bounds.push(parseCrToWad(b.upperBoundCR));
    } else {
      if (b.upperBoundCR) throw new Error("Last band should not have an upper bound.");
    }
  }

  return { collateralRatioBandUpperBounds: bounds, incentiveRatios: ratios };
}

type ValidationResult = { ok: boolean; errors: string[] };

function validateBands(action: ActionKey, bands: Band[]): ValidationResult {
  const errors: string[] = [];
  if (bands.length < 1) {
    return { ok: false, errors: ["Need at least 1 band (including final open-ended band)."] };
  }

  let cfg: IncentiveConfig | null = null;
  try {
    cfg = buildIncentiveConfig(bands);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { ok: false, errors };
  }

  const bounds = cfg.collateralRatioBandUpperBounds;
  const ratios = cfg.incentiveRatios;

  if (bounds.length + 1 !== ratios.length) {
    errors.push("bounds.length + 1 must equal ratios.length.");
  }

  // bounds strictly increasing, first bound >= 1.0
  for (let i = 0; i < bounds.length; i++) {
    if (i === 0 && bounds[i] < WAD) {
      errors.push("First upper bound must be >= 1.0x.");
    }
    if (i > 0 && bounds[i] <= bounds[i - 1]) {
      errors.push("Upper bounds must be strictly increasing.");
      break;
    }
  }

  const isDisallow = (r: bigint) => r === WAD;

  const requireFirstRowDepegOrDisallow = () => {
    const firstBound = bounds.length > 0 ? bounds[0] : null;
    const firstRatio = ratios[0];
    if (firstRatio !== WAD && firstBound !== WAD) {
      errors.push(
        "First row must be either upperBoundCR == 1.0x (depeg boundary) OR ratio == 100% (disallow)."
      );
    }
  };

  // ratio range checks
  for (let i = 0; i < ratios.length; i++) {
    const r = ratios[i];
    const disallow = isDisallow(r);
    if (disallow && i !== 0) {
      errors.push("If any ratio is exactly 100%, it must be the first row (disallow band).");
      break;
    }

    if (action === "mintPegged" || action === "redeemLeveraged") {
      // [0%, 100%]
      if (r < 0n || r > WAD) {
        errors.push("Ratios must be in [0%, 100%] for this action.");
        break;
      }
    } else {
      // (-100%, 100%), but allow 100% only as first-row disallow
      if (!disallow) {
        if (r <= -WAD || r >= WAD) {
          errors.push("Ratios must be in (-100%, 100%) for this action.");
          break;
        }
      }
    }
  }

  // First-row checks
  requireFirstRowDepegOrDisallow();

  return { ok: errors.length === 0, errors };
}

const ACTION_LABELS: Record<ActionKey, string> = {
  mintPegged: "Mint Pegged",
  redeemPegged: "Redeem Pegged",
  mintLeveraged: "Mint Leveraged",
  redeemLeveraged: "Redeem Leveraged",
};

const ACTION_HELP: Record<ActionKey, string> = {
  mintPegged: "Ratios in [0%, 100%]. First row must be CR≤1.0x or 100% disallow.",
  redeemPegged:
    "Ratios in (-100%, 100%). First row must be CR≤1.0x or 100% disallow.",
  mintLeveraged:
    "Ratios in (-100%, 100%). First row must be CR≤1.0x or 100% disallow.",
  redeemLeveraged:
    "Ratios in [0%, 100%]. First row must be CR≤1.0x or 100% disallow.",
};

function defaultBands(): ActionBands {
  const base: Band[] = [
    { upperBoundCR: "1.0", ratioPct: "100" }, // disallow/depeg band
    { ratioPct: "0" }, // open-ended
  ];
  return {
    mintPegged: JSON.parse(JSON.stringify(base)),
    redeemPegged: JSON.parse(JSON.stringify(base)),
    mintLeveraged: JSON.parse(JSON.stringify(base)),
    redeemLeveraged: JSON.parse(JSON.stringify(base)),
  };
}

function bandsFromConfig(c: IncentiveConfig): Band[] {
  const bounds = [...c.collateralRatioBandUpperBounds];
  const ratios = [...c.incentiveRatios];
  const bands: Band[] = [];
  for (let i = 0; i < ratios.length; i++) {
    const isLast = i === ratios.length - 1;
    bands.push({
      upperBoundCR: !isLast ? wadToCrString(bounds[i]) : undefined,
      ratioPct: wadToPctString(ratios[i]),
    });
  }
  return bands.length ? bands : [{ ratioPct: "0" }];
}

export default function AdminFeesPage() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string>(() => {
    const ids = Object.keys(markets);
    return ids[0] ?? "";
  });
  const [activeAction, setActiveAction] = useState<ActionKey>("mintPegged");
  const [bandsByAction, setBandsByAction] = useState<ActionBands>(() => defaultBands());
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const marketOptions = useMemo(() => {
    return Object.entries(markets)
      .filter(([, m]) => (m as any)?.addresses?.minter)
      .map(([id, m]) => ({
        id,
        name: (m as any)?.name ?? id,
        minter: (m as any)?.addresses?.minter as `0x${string}`,
      }));
  }, []);

  const selectedMarket = useMemo(() => {
    return marketOptions.find((m) => m.id === selectedMarketId) ?? marketOptions[0];
  }, [marketOptions, selectedMarketId]);

  const minterAddress = selectedMarket?.minter;

  const { data: owner } = useReadContract({
    address: minterAddress,
    abi: minterABI,
    functionName: "owner",
    query: { enabled: !!minterAddress },
  });

  const {
    data: currentConfigRaw,
    refetch: refetchConfig,
    isFetching: isFetchingConfig,
    error: configError,
  } = useReadContract({
    address: minterAddress,
    abi: minterABI,
    functionName: "config",
    query: { enabled: !!minterAddress },
  });

  const isOwner =
    !!address &&
    !!owner &&
    String(owner).toLowerCase() === String(address).toLowerCase();

  const validation = useMemo(() => {
    const perAction: Record<ActionKey, ValidationResult> = {
      mintPegged: validateBands("mintPegged", bandsByAction.mintPegged),
      redeemPegged: validateBands("redeemPegged", bandsByAction.redeemPegged),
      mintLeveraged: validateBands("mintLeveraged", bandsByAction.mintLeveraged),
      redeemLeveraged: validateBands("redeemLeveraged", bandsByAction.redeemLeveraged),
    };
    const allErrors = (Object.keys(perAction) as ActionKey[])
      .flatMap((k) => perAction[k].errors.map((e) => `${ACTION_LABELS[k]}: ${e}`));
    return { perAction, allErrors, ok: allErrors.length === 0 };
  }, [bandsByAction]);

  const { writeContract, isPending, data: txHash, error: txError } = useWriteContract();

  const onLoadCurrent = async () => {
    const res = await refetchConfig();
    const cfg = res.data as any;
    if (!cfg) return;
    const next: ActionBands = {
      mintPegged: bandsFromConfig(cfg.mintPeggedIncentiveConfig),
      redeemPegged: bandsFromConfig(cfg.redeemPeggedIncentiveConfig),
      mintLeveraged: bandsFromConfig(cfg.mintLeveragedIncentiveConfig),
      redeemLeveraged: bandsFromConfig(cfg.redeemLeveragedIncentiveConfig),
    };
    setBandsByAction(next);
    setLastLoadedAt(Date.now());
  };

  const onSubmit = () => {
    if (!minterAddress) return;
    const newConfig: MinterConfig = {
      mintPeggedIncentiveConfig: buildIncentiveConfig(bandsByAction.mintPegged),
      redeemPeggedIncentiveConfig: buildIncentiveConfig(bandsByAction.redeemPegged),
      mintLeveragedIncentiveConfig: buildIncentiveConfig(bandsByAction.mintLeveraged),
      redeemLeveragedIncentiveConfig: buildIncentiveConfig(bandsByAction.redeemLeveraged),
    };

    writeContract({
      address: minterAddress,
      abi: minterABI,
      functionName: "updateConfig",
      args: [newConfig as any],
    });
  };

  const activeBands = bandsByAction[activeAction];
  const activeValidation = validation.perAction[activeAction];

  const updateBand = (idx: number, patch: Partial<Band>) => {
    setBandsByAction((prev) => {
      const copy = { ...prev };
      const list = [...copy[activeAction]];
      list[idx] = { ...list[idx], ...patch };
      copy[activeAction] = list;
      return copy;
    });
  };

  const addBand = () => {
    setBandsByAction((prev) => {
      const copy = { ...prev };
      const list = [...copy[activeAction]];
      if (list.length === 0) return copy;
      // Insert before last band (open-ended)
      list.splice(Math.max(0, list.length - 1), 0, { upperBoundCR: "", ratioPct: "0" });
      copy[activeAction] = list;
      return copy;
    });
  };

  const removeBand = (idx: number) => {
    setBandsByAction((prev) => {
      const copy = { ...prev };
      const list = [...copy[activeAction]];
      if (list.length <= 1) return copy;
      // Never allow removing the last open-ended band
      const lastIdx = list.length - 1;
      if (idx === lastIdx) return copy;
      list.splice(idx, 1);
      copy[activeAction] = list;
      return copy;
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
        <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
          <div className="mb-6">
            <h1 className="text-4xl font-medium font-geo text-left text-white">
              ADMIN / FEES
            </h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white max-w-[1300px] mx-auto font-sans relative">
      <main className="container mx-auto px-4 sm:px-10 pt-[6rem] pb-6 relative z-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-4xl font-medium font-geo text-left text-white">
            ADMIN / FEES
          </h1>
          <Link href="/admin">
            <button className="py-2 px-4 bg-white/10 text-white font-medium hover:bg-white/15 transition-colors">
              Back to Admin
            </button>
          </Link>
        </div>

        {!isConnected ? (
          <div className="bg-zinc-900/50 p-6 text-center">
            <p className="mb-4 text-white/70">
              Please connect your wallet to access admin functions
            </p>
            <div className="inline-block">
              <WalletButton />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-zinc-900/50 p-4 sm:p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
                <div className="flex-1">
                  <div className="text-white/70 text-xs mb-1">Market</div>
                  <select
                    className="w-full bg-zinc-900/50 px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    value={selectedMarketId}
                    onChange={(e) => setSelectedMarketId(e.target.value)}
                  >
                    {marketOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {minterAddress && (
                    <div className="text-white/50 text-xs mt-1 font-mono">
                      Minter: {minterAddress}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onLoadCurrent}
                    disabled={!minterAddress || isFetchingConfig}
                    className="py-2 px-4 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetchingConfig ? "Loading..." : "Load current config"}
                  </button>
                  <button
                    onClick={() => setBandsByAction(defaultBands())}
                    className="py-2 px-4 bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="text-white/60 text-xs">
                {configError
                  ? `Config read error: ${
                      configError instanceof Error
                        ? configError.message
                        : String(configError)
                    }`
                  : currentConfigRaw
                  ? "Config loaded from chain (use the button to populate the editor)."
                  : "No config loaded yet."}
                {lastLoadedAt && (
                  <span className="ml-2">
                    (populated {new Date(lastLoadedAt).toLocaleTimeString()})
                  </span>
                )}
              </div>

              <div className="text-white/60 text-xs">
                Connected wallet:{" "}
                <span className="font-mono">{String(address)}</span>
                {owner && (
                  <>
                    {" "}
                    • Owner: <span className="font-mono">{String(owner)}</span>{" "}
                    •{" "}
                    <span className={isOwner ? "text-green-400" : "text-red-400"}>
                      {isOwner ? "Owner connected" : "Not owner"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/50 p-4 sm:p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {(Object.keys(ACTION_LABELS) as ActionKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveAction(k)}
                    className={`py-2 px-3 text-sm font-medium transition-colors ${
                      activeAction === k
                        ? "bg-harbor text-white"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {ACTION_LABELS[k]}
                  </button>
                ))}
              </div>

              <div className="text-white/70 text-xs mb-4">
                {ACTION_HELP[activeAction]}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/70">
                      <th className="text-left py-2 pr-4">Collateral Ratio (x)</th>
                      <th className="text-left py-2 pr-4">Ratio (%)</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBands.map((b, idx) => {
                      const isLast = idx === activeBands.length - 1;
                      return (
                        <tr key={idx} className="border-t border-white/10">
                          <td className="py-2 pr-4">
                            {isLast ? (
                              <span className="text-white/70">
                                CR &gt; last bound
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-white/60 text-xs">
                                  CR ≤
                                </span>
                                <input
                                  value={b.upperBoundCR ?? ""}
                                  onChange={(e) =>
                                    updateBand(idx, {
                                      upperBoundCR: e.target.value,
                                    })
                                  }
                                  placeholder="e.g. 1.10"
                                  className="w-32 bg-zinc-900/50 px-2 py-1 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono"
                                />
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              value={b.ratioPct}
                              onChange={(e) =>
                                updateBand(idx, { ratioPct: e.target.value })
                              }
                              placeholder="e.g. 2 or -5 or 100"
                              className="w-32 bg-zinc-900/50 px-2 py-1 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono"
                            />
                          </td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => removeBand(idx)}
                                disabled={isLast || activeBands.length <= 1}
                                className="py-1 px-2 bg-white/10 text-white hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  onClick={addBand}
                  className="py-2 px-3 bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                >
                  Add band
                </button>
                <div className="text-right text-xs">
                  {!activeValidation.ok && (
                    <div className="text-red-300">
                      {activeValidation.errors[0]}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-4 sm:p-6 space-y-3">
              <div className="text-white/70 text-sm font-medium">
                Validation
              </div>
              {validation.ok ? (
                <div className="text-green-400 text-sm">All actions valid.</div>
              ) : (
                <ul className="text-red-300 text-xs space-y-1 list-disc pl-5">
                  {validation.allErrors.slice(0, 12).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {validation.allErrors.length > 12 && (
                    <li>…and {validation.allErrors.length - 12} more</li>
                  )}
                </ul>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={onSubmit}
                  disabled={!minterAddress || !validation.ok || !isOwner || isPending}
                  className="py-2 px-4 bg-harbor text-white font-medium hover:bg-harbor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Submitting..." : "Update config (1 tx)"}
                </button>
                {txHash && (
                  <a
                    className="text-white/70 text-xs underline"
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View tx
                  </a>
                )}
              </div>
              {txError && (
                <div className="text-red-300 text-xs">
                  {txError instanceof Error ? txError.message : String(txError)}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


