export const NETWORKS = ["mainnet", "arbitrum"] as const;

export type Network = (typeof NETWORKS)[number];