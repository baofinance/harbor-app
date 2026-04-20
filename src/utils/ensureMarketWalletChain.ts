type SwitchChainFn = (args: { chainId: number }) => unknown | Promise<unknown>;

type EnsureMarketWalletChainParams = {
  isConnected: boolean;
  connectedChainId?: number;
  marketChainId?: number;
  switchChain: SwitchChainFn;
  onSwitchRejected?: (error: unknown) => void;
};

/**
 * Ensures the connected wallet is on the target market chain.
 * Returns true when no switch is needed or the switch succeeds.
 */
export async function ensureMarketWalletChain({
  isConnected,
  connectedChainId,
  marketChainId = 1,
  switchChain,
  onSwitchRejected,
}: EnsureMarketWalletChainParams): Promise<boolean> {
  if (!isConnected) return true;
  if (connectedChainId === marketChainId) return true;

  try {
    await switchChain({ chainId: marketChainId });
    return true;
  } catch (error) {
    onSwitchRejected?.(error);
    return false;
  }
}
