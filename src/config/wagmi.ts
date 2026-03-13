import { http, createConfig } from "@wagmi/core";
import { base, mainnet, arbitrum } from "wagmi/chains";
import { injected, metaMask, safe } from "wagmi/connectors";
import { MAINNET_RPC_URL, megaethChain, MEGAETH_RPC_URL } from "./rpc";

const projectId = "513620ae374ee96b895eb92231eecb7f";

// Set up wagmi config for mainnet deployment (mainnet uses proxy when USE_RPC_PROXY=true)
export const wagmi = createConfig({
  chains: [mainnet, base, arbitrum, megaethChain],
  connectors: [injected(), metaMask(), safe()],
  transports: {
    [mainnet.id]: http(MAINNET_RPC_URL),
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
    ),
    [arbitrum.id]: http(
      process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc"
    ),
    [megaethChain.id]: http(
      MEGAETH_RPC_URL || "https://rpc.megaeth.org"
    ),
  },
  ssr: true,
});
