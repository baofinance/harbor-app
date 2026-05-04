import { maidenVoyageYieldOwnerSharePercent } from "@/config/maidenVoyageYield";

type MaidenVoyageCapRow = {
  capUSD?: string;
  cumulativeDepositsUSD?: string;
  capFilled?: boolean;
} | null;

type MaidenVoyageCampaignResult = {
  genesisAddress?: string;
  data?: {
    cap?: MaidenVoyageCapRow;
  } | null;
};

type MaidenVoyageMarksRow = {
  genesisAddress?: string;
  data?: {
    userHarborMarks?: unknown;
  } | null;
};

export type GenesisDepositCapData = {
  useTokenCap: boolean;
  capCurrent: number;
  capTotal: number;
  progressPct: number;
  capFilled: boolean;
  capCurrentUsd: number;
  capTotalUsd: number;
  tokenCapAmount: number;
  collateralSymbol: string;
  ownershipShare: number;
  countedUsd: number;
  yieldRevSharePct: number | null;
};

function safeToNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getUserHarborMarks(
  marksResults: MaidenVoyageMarksRow[],
  genesisAddress?: string
): Record<string, unknown> | null {
  const matched = marksResults.find(
    (row) =>
      row.genesisAddress?.toLowerCase() === genesisAddress?.toLowerCase()
  );
  const userMarksData = matched?.data?.userHarborMarks;
  if (Array.isArray(userMarksData)) {
    return (userMarksData[0] as Record<string, unknown> | undefined) ?? null;
  }
  if (userMarksData && typeof userMarksData === "object") {
    return userMarksData as Record<string, unknown>;
  }
  return null;
}

export function getGenesisDepositCapData({
  marketId,
  genesisAddress,
  collateralSymbol,
  totalDepositsAmount,
  maidenVoyageCampaignResults,
  marksResults,
}: {
  marketId: string;
  genesisAddress?: string;
  collateralSymbol: string;
  totalDepositsAmount: number;
  maidenVoyageCampaignResults: MaidenVoyageCampaignResult[];
  marksResults: MaidenVoyageMarksRow[];
}): GenesisDepositCapData | null {
  const capResult = maidenVoyageCampaignResults.find(
    (row) =>
      row.genesisAddress?.toLowerCase() === genesisAddress?.toLowerCase()
  );
  const capRow = capResult?.data?.cap;
  const capUsd = safeToNumber(capRow?.capUSD);
  const cumulativeUsd = safeToNumber(capRow?.cumulativeDepositsUSD);

  const tokenCapAmount = marketId === "wsteth-usd-megaeth" ? 50 : 0;
  const useTokenCap = tokenCapAmount > 0;

  const capTotal = useTokenCap ? tokenCapAmount : capUsd;
  const capCurrent = useTokenCap ? totalDepositsAmount : cumulativeUsd;
  if (capTotal <= 0) return null;

  const progressPct = Math.min(100, (capCurrent / capTotal) * 100);
  const capFilled =
    (useTokenCap && capCurrent >= capTotal) || (!useTokenCap && !!capRow?.capFilled);

  const userMarks = getUserHarborMarks(marksResults, genesisAddress);
  const ownershipShare = safeToNumber(userMarks?.finalMaidenVoyageOwnershipShare);
  const countedUsd = safeToNumber(userMarks?.maidenVoyageDepositCountedUSD);

  return {
    useTokenCap,
    capCurrent,
    capTotal,
    progressPct,
    capFilled,
    capCurrentUsd: cumulativeUsd,
    capTotalUsd: capUsd,
    tokenCapAmount,
    collateralSymbol,
    ownershipShare,
    countedUsd,
    yieldRevSharePct: maidenVoyageYieldOwnerSharePercent(
      genesisAddress?.toLowerCase() ?? null
    ),
  };
}
