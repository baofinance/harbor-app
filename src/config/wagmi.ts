import { http, createConfig } from "@wagmi/core";
import { base, mainnet, arbitrum } from "wagmi/chains";
import { injected, metaMask, safe } from "wagmi/connectors";

const projectId = "513620ae374ee96b895eb92231eecb7f";

// Set up wagmi config for mainnet deployment
export const wagmi = createConfig({
  chains: [mainnet, base, arbitrum],
  connectors: [injected(), metaMask(), safe()],
  transports: {
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.llamarpc.com"
    ),
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
    ),
    [arbitrum.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"
    ),
  },
  ssr: true,
});
