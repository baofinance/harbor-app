import { http, createConfig } from "@wagmi/core";
import { base, mainnet, arbitrum } from "wagmi/chains";
import { injected, metaMask, safe, walletConnect } from "wagmi/connectors";
import { anvil } from "@/config/anvil";
import { shouldUseAnvil } from "@/config/environment";

const projectId = "513620ae374ee96b895eb92231eecb7f";

// Get RPC URL from environment or use default for Anvil
const ANVIL_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

// Determine which chains to include based on environment
const useAnvil = shouldUseAnvil();
const chains = useAnvil
  ? [anvil, mainnet, base, arbitrum] // Anvil first for local dev
  : [mainnet, base, arbitrum]; // Mainnet first for production

// Set up wagmi config
export const wagmi = createConfig({
  chains,
  connectors: [injected(), metaMask(), safe()],
  transports: {
    ...(useAnvil ? { [anvil.id]: http(ANVIL_RPC_URL) } : {}),
    [mainnet.id]: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [arbitrum.id]: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
  },
  ssr: true, // Enable SSR support
});
