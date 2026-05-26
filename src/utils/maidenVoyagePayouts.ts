import { encodeFunctionData, parseUnits, type Address } from "viem";
import { markets } from "@/config/markets";
import { ERC20_ABI } from "@/abis/shared";
import type { AdminBatchCall } from "@/utils/adminBatchTx";

/** Minimum outstanding USD to include in an on-chain distribution batch. */
export const MAIDEN_VOYAGE_PAYOUT_MIN_OUTSTANDING_USD = 0.01;

export type MaidenVoyageParticipantRow = {
  wallet: string;
  poolShare: number;
  outstanding: number;
};

export type MaidenVoyageMarketForGenesis = {
  marketId: string;
  label: string;
  wrappedCollateralToken: Address;
  collateralSymbol: string;
  underlyingSymbol: string;
  pegTarget?: string;
  coinGeckoId?: string;
  collateralPriceOracle?: Address;
};

export type MaidenVoyagePayoutRow = MaidenVoyageParticipantRow & {
  amountWei: bigint;
  amountTokens: number;
};

export function findMarketByGenesis(
  genesis: string
): MaidenVoyageMarketForGenesis | null {
  const genesisLower = genesis.toLowerCase();
  for (const [marketId, m] of Object.entries(markets)) {
    const cfg = m as {
      name?: string;
      pegTarget?: string;
      coinGeckoId?: string;
      collateral?: { symbol?: string; underlyingSymbol?: string };
      addresses?: {
        genesis?: string;
        wrappedCollateralToken?: string;
        collateralPrice?: string;
      };
    };
    const g = cfg.addresses?.genesis;
    if (!g || g.toLowerCase() !== genesisLower) continue;
    const wrapped = cfg.addresses?.wrappedCollateralToken;
    if (!wrapped) return null;
    return {
      marketId,
      label: cfg.name || marketId,
      wrappedCollateralToken: wrapped as Address,
      collateralSymbol: cfg.collateral?.symbol || "collateral",
      underlyingSymbol:
        cfg.collateral?.underlyingSymbol ||
        cfg.collateral?.symbol ||
        "collateral",
      pegTarget: cfg.pegTarget,
      coinGeckoId: cfg.coinGeckoId,
      collateralPriceOracle: cfg.addresses?.collateralPrice as
        | Address
        | undefined,
    };
  }
  return null;
}

/** Floor USD outstanding to token wei at the given USD price per token. */
export function outstandingUsdToTokenWei(
  outstandingUsd: number,
  priceUsd: number,
  decimals: number
): bigint {
  if (!(outstandingUsd > 0) || !(priceUsd > 0) || !Number.isFinite(decimals)) {
    return 0n;
  }
  const tokens = outstandingUsd / priceUsd;
  const multiplier = 10 ** decimals;
  const floored = Math.floor(tokens * multiplier) / multiplier;
  if (floored <= 0) return 0n;
  return parseUnits(floored.toFixed(decimals), decimals);
}

export function buildMaidenVoyagePayoutRows(
  rows: MaidenVoyageParticipantRow[],
  collateralPriceUSD: number,
  decimals: number,
  minOutstandingUsd = MAIDEN_VOYAGE_PAYOUT_MIN_OUTSTANDING_USD
): MaidenVoyagePayoutRow[] {
  if (!(collateralPriceUSD > 0)) return [];
  const out: MaidenVoyagePayoutRow[] = [];
  for (const row of rows) {
    if (row.outstanding <= minOutstandingUsd) continue;
    const amountWei = outstandingUsdToTokenWei(
      row.outstanding,
      collateralPriceUSD,
      decimals
    );
    if (amountWei <= 0n) continue;
    const amountTokens = Number(amountWei) / 10 ** decimals;
    out.push({ ...row, amountWei, amountTokens });
  }
  return out;
}

export function sumPayoutWei(rows: MaidenVoyagePayoutRow[]): bigint {
  return rows.reduce((s, r) => s + r.amountWei, 0n);
}

export function sumPayoutUsd(rows: MaidenVoyagePayoutRow[]): number {
  return rows.reduce((s, r) => s + r.outstanding, 0);
}

export function buildMaidenVoyageTransferCalls(
  wrappedToken: Address,
  payoutRows: MaidenVoyagePayoutRow[],
  collateralSymbol: string
): AdminBatchCall[] {
  return payoutRows.map((row) => {
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [row.wallet as Address, row.amountWei],
    });
    return {
      to: wrappedToken,
      value: 0n,
      data,
      label: `MV yield • ${collateralSymbol} • transfer → ${row.wallet.slice(0, 6)}…${row.wallet.slice(-4)}`,
    };
  });
}
