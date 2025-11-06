"use client";

import { useMemo, useState, useEffect } from "react";
import { useContractReads } from "wagmi";
import { markets } from "../config/markets";

interface GenesisROICalculatorProps {
  marketId: string;
  rewardTokenSymbol: string;
  rewardPoolAmountDefault: number; // default total rewards for genesis (token units)
  totalDeposits: bigint | undefined; // 18 decimals (stETH)
  userDeposit: bigint | undefined; // 18 decimals (stETH)
  collateralSymbol: string;
}

const chainlinkOracleABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ type: "int256", name: "" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function GenesisROICalculator({
  marketId,
  rewardTokenSymbol,
  rewardPoolAmountDefault,
  totalDeposits,
  userDeposit,
  collateralSymbol,
}: GenesisROICalculatorProps) {
  const [mounted, setMounted] = useState(false);
  const [rewardPoolTokens, setRewardPoolTokens] = useState<number>(
    Math.max(0, rewardPoolAmountDefault)
  );
  const [fdvPreset, setFdvPreset] = useState<"bear" | "base" | "bull">("bull");
  const [fdvCustom, setFdvCustom] = useState<number | "">(50000000); // 50m default

  useEffect(() => setMounted(true), []);

  const oracleAddress = markets[marketId as keyof typeof markets].addresses
    .priceOracle as `0x${string}`;

  const { data: oracleData } = useContractReads({
    contracts: [
      {
        address: oracleAddress,
        abi: chainlinkOracleABI,
        functionName: "decimals",
      },
      {
        address: oracleAddress,
        abi: chainlinkOracleABI,
        functionName: "latestAnswer",
      },
    ],
    // Avoid SSR issues
    query: { enabled: mounted && !!oracleAddress },
  });

  const stEthPriceUSD = useMemo(() => {
    if (!oracleData?.[0]?.result || !oracleData?.[1]?.result) return undefined;
    const decimals = Number(oracleData[0].result as unknown as number);
    const raw = oracleData[1].result as unknown as bigint;
    const price = Number(raw) / 10 ** decimals;
    return price; // in USD
  }, [oracleData]);

  const totalDepositsStEth = useMemo(() => {
    return Number(totalDeposits ?? 0n) / 1e18;
  }, [totalDeposits]);

  const userDepositStEth = useMemo(() => {
    return Number(userDeposit ?? 0n) / 1e18;
  }, [userDeposit]);

  const fdvUSD = useMemo(() => {
    if (fdvPreset === "bear") return 10000000; // 10m
    if (fdvPreset === "base") return 25000000; // 25m
    if (fdvPreset === "bull") return 50000000; // 50m
    return 50000000;
  }, [fdvPreset]);

  const fdvEffective = useMemo(() => {
    const custom =
      typeof fdvCustom === "number" && !Number.isNaN(fdvCustom)
        ? fdvCustom
        : undefined;
    return custom && custom > 0 ? custom : fdvUSD;
  }, [fdvCustom, fdvUSD]);

  const roiPercent = useMemo(() => {
    const maxSupply = 100_000_000; // B2
    const B1 = Math.max(0, rewardPoolTokens);
    const B2 = maxSupply;
    const B3 = Math.max(0, totalDepositsStEth);
    const B4 = Math.max(0, userDepositStEth);
    const B5 = Math.max(0, fdvEffective);
    const B6 = Math.max(0, stEthPriceUSD ?? 0);
    if (B3 === 0 || B4 === 0 || B6 === 0) return 0;
    const roi = ((B1 * (B4 / B3) * (B5 / B2)) / (B4 * B6)) * 100;
    return roi;
  }, [
    rewardPoolTokens,
    totalDepositsStEth,
    userDepositStEth,
    fdvEffective,
    stEthPriceUSD,
  ]);

  return (
    <div className="w-full">
      <div className="mb-3">
        <div className="font-semibold font-mono text-white">ROI Calculator</div>
        <div className="text-xs text-white/60">
          Based on your deposit share and FDV assumptions
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className=" p-3">
          <div className="text-white/60 text-xs mb-1">Reward Pool Tokens</div>
          <div className="flex items-center gap-4">
            <input
              type="number"
              className="w-full bg-white/5 text-white text-sm px-3 py-2  focus:outline-white/20"
              value={rewardPoolTokens}
              min={0}
              onChange={(e) => setRewardPoolTokens(Number(e.target.value))}
            />
            <span className="text-xs text-white/60">{rewardTokenSymbol}</span>
          </div>
        </div>
        <div className=" p-3">
          <div className="text-white/60 text-xs mb-1">FDV Presets</div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFdvPreset("bear")}
              className={`px-3 py-1 text-xs outline outline-1 ${
                fdvPreset === "bear"
                  ? "bg-harbor text-white outline-harbor"
                  : "text-white/70 outline-white/20 hover:outline-white/20"
              }`}
            >
              Bear $10m
            </button>
            <button
              onClick={() => setFdvPreset("base")}
              className={`px-3 py-1 text-xs outline outline-1 ${
                fdvPreset === "base"
                  ? "bg-harbor text-white outline-harbor"
                  : "text-white/70 outline-white/20 hover:outline-white/20"
              }`}
            >
              Base $25m
            </button>
            <button
              onClick={() => setFdvPreset("bull")}
              className={`px-3 py-1 text-xs outline outline-1 ${
                fdvPreset === "bull"
                  ? "bg-harbor text-white outline-harbor"
                  : "text-white/70 outline-white/20 hover:outline-white/20"
              }`}
            >
              Bull $50m
            </button>
          </div>
          <div className="mt-2 text-xs text-white/60">or set a custom FDV</div>
          <div className="mt-1">
            <div className="flex items-center gap-4">
              <span className="text-white/70 text-xs">$</span>
              <input
                type="number"
                className="w-full bg-white/5 text-white text-sm px-3 py-2  focus:outline-white/20"
                value={fdvCustom}
                min={0}
                onChange={(e) => {
                  const v = e.target.value;
                  setFdvCustom(v === "" ? "" : Number(v));
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
        <div className=" p-3">
          <div className="text-white/60">Max Supply</div>
          <div className="text-white font-mono">100,000,000</div>
        </div>
        <div className=" p-3">
          <div className="text-white/60">Total Deposits</div>
          <div className="text-white font-mono">
            {totalDepositsStEth.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}{" "}
            {collateralSymbol}
          </div>
        </div>
        <div className=" p-3">
          <div className="text-white/60">Your Deposit</div>
          <div className="text-white font-mono">
            {userDepositStEth.toLocaleString(undefined, {
              maximumFractionDigits: 4,
            })}{" "}
            {collateralSymbol}
          </div>
        </div>
        <div className=" p-3">
          <div className="text-white/60">stETH Price</div>
          <div className="text-white font-mono">
            {stEthPriceUSD
              ? `$${stEthPriceUSD.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}`
              : "-"}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className=" p-3">
          <div className="text-white/60">Your Share of Rewards</div>
          <div className="text-white font-mono">
            {(() => {
              const pool = Math.max(0, totalDepositsStEth);
              const you = Math.max(0, userDepositStEth);
              const share = pool > 0 ? (you / pool) * 100 : 0;
              return `${share.toFixed(2)}%`;
            })()}
          </div>
        </div>
        <div className=" p-3">
          <div className="text-white/60">FDV Used</div>
          <div className="text-white font-mono">
            ${fdvEffective.toLocaleString()}
          </div>
        </div>
        <div className=" p-3">
          <div className="text-white/60">Estimated ROI</div>
          <div className="text-white font-mono text-lg">
            {Number.isFinite(roiPercent) ? `${roiPercent.toFixed(0)}%` : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
