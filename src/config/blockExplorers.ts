/**
 * Block explorer base URLs per chain.
 * Used for contract address and transaction links.
 */
export const BLOCK_EXPLORERS: Record<
  number,
  { baseUrl: string; name: string }
> = {
  1: { baseUrl: "https://etherscan.io", name: "Etherscan" },
  42161: { baseUrl: "https://arbiscan.io", name: "Arbiscan" },
  8453: { baseUrl: "https://basescan.org", name: "Basescan" },
  4326: { baseUrl: "https://mega.etherscan.io", name: "Mega Etherscan" },
  // Monad mainnet – update chainId when official ID is known
  10143: { baseUrl: "https://monadscan.com", name: "Monadscan" },
};

const DEFAULT_CHAIN_ID = 1;

export function getBlockExplorerConfig(chainId?: number | null) {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  return BLOCK_EXPLORERS[id] ?? BLOCK_EXPLORERS[DEFAULT_CHAIN_ID];
}

/** URL for a contract address on the chain's block explorer */
export function getBlockExplorerAddressUrl(
  address: string,
  chainId?: number | null
): string {
  const { baseUrl } = getBlockExplorerConfig(chainId);
  return `${baseUrl}/address/${address}`;
}

/** URL for a transaction on the chain's block explorer */
export function getBlockExplorerTxUrl(
  txHash: string,
  chainId?: number | null
): string {
  const { baseUrl } = getBlockExplorerConfig(chainId);
  return `${baseUrl}/tx/${txHash}`;
}
