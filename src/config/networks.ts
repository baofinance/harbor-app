export const NETWORKS = ["mainnet", "arbitrum", "base", "megaeth"] as const;

export type Network = (typeof NETWORKS)[number];