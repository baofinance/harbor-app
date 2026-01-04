export const NETWORKS = ["mainnet", "arbitrum", "base"] as const;

export type Network = (typeof NETWORKS)[number];