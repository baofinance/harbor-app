import { defineChain } from "viem";
import { createPublicClient, http } from "viem";

// Get RPC URL from environment or use default
// Normalize localhost/127.0.0.1 to ensure consistency
const RPC_URL_ENV = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";
const ANVIL_RPC_URL = RPC_URL_ENV.replace("127.0.0.1", "localhost");

// Define local Anvil chain using viem's defineChain for proper wagmi compatibility
export const anvil = defineChain({
  id: 31337,
  name: "Anvil",
  network: "anvil",
  nativeCurrency: {
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [ANVIL_RPC_URL],
    },
    public: {
      http: [ANVIL_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Anvil Explorer",
      url: "",
    },
  },
  testnet: true,
});

// Create a standalone public client for Anvil that can be used for contract reads
// This ensures we always read from Anvil regardless of wallet connection
export const anvilPublicClient = createPublicClient({
  chain: anvil,
  transport: http(ANVIL_RPC_URL),
});
