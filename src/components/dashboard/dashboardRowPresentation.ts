/** Fallback when market config does not expose a token symbol. */
export function iconSymbolFromMarketLabel(marketLabel: string): string {
  const trimmed = marketLabel.trim();
  if (!trimmed) return "ETH";
  const first = trimmed.split(/\s*[-·]\s*/)[0]?.trim();
  return first || trimmed;
}

export function statusLabelFromDetail(detail: string): string {
  const parts = detail.split("·").map((p) => p.trim());
  return parts[parts.length - 1] || detail;
}

export type DashboardStatusTone = "ended" | "active" | "neutral";

export function genesisStatusFromEnded(genesisEnded: boolean): {
  statusTone: DashboardStatusTone;
  statusLabel: string;
  phase: string;
} {
  const phase = genesisEnded ? "Ended" : "Active";
  return {
    statusTone: genesisEnded ? "ended" : "active",
    statusLabel: phase,
    phase,
  };
}
