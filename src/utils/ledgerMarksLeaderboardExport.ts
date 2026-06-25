import { getAddress } from "viem";

export type CampaignLeaderboardExportRow = {
  address: string;
  totalMarks: number;
  marksPerDay: number;
  bonusMarks: number;
};

export type AnchorSailLeaderboardExportRow = {
  address: string;
  totalMarks: number;
  anchorMarks: number;
  sailMarks: number;
  marksPerDay: number;
};

const OVERVIEW_NAMES = {
  "launch-maiden-voyage": "Maiden voyage launch",
  "euro-maiden-voyage": "Maiden voyage euro",
  "metals-maiden-voyage": "Maiden voyage metals",
  "anchor-and-sail": "Anchor and Sail",
} as const;

type CampaignId = keyof typeof OVERVIEW_NAMES;

function normalizeAddress(address: string): string {
  try {
    return getAddress(address);
  } catch {
    return address.toLowerCase();
  }
}

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

export function downloadLedgerMarksLeaderboardJson(
  params:
    | {
        tab: "campaigns";
        campaignId: Exclude<CampaignId, "anchor-and-sail">;
        sortBy: string;
        sortDirection: "asc" | "desc";
        rows: CampaignLeaderboardExportRow[];
      }
    | {
        tab: "anchor-sail";
        sortBy: string;
        sortDirection: "asc" | "desc";
        rows: AnchorSailLeaderboardExportRow[];
      }
): void {
  const overviewId =
    params.tab === "anchor-sail" ? "anchor-and-sail" : params.campaignId;
  const overview = OVERVIEW_NAMES[overviewId];

  const entries =
    params.tab === "campaigns"
      ? params.rows.map((row, index) => ({
          rank: index + 1,
          address: normalizeAddress(row.address),
          totalMarks: row.totalMarks,
          marksPerDay: row.marksPerDay,
          bonusMarks: row.bonusMarks,
        }))
      : params.rows.map((row, index) => ({
          rank: index + 1,
          address: normalizeAddress(row.address),
          totalMarks: row.totalMarks,
          anchorMarks: row.anchorMarks,
          sailMarks: row.sailMarks,
          marksPerDay: row.marksPerDay,
        }));

  const payload = {
    overview,
    overviewId,
    tab: params.tab === "campaigns" ? "maiden-voyage-2.0" : "anchor-and-sail",
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    exportedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ledger-marks-leaderboard-${slugify(overview)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
