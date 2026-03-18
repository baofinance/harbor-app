import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
// Temporarily disabled due to Next.js 15 build issue with @noble/curves
// import { coinbaseWallet } from "wagmi/connectors";
import { safeConnector } from "./safeConnector";
import { MAINNET_RPC_URL, megaethChain, MEGAETH_RPC_URL } from "./rpc";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  safeConnector(), // Safe connector - will only be active in Safe iframe
  injected(), // This will automatically detect injected providers like MetaMask
  // Temporarily disabled due to Next.js 15 build issue with @noble/curves in ox package
  // coinbaseWallet({ appName: "harbor" }),
 ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID })] : []),
];

export const wagmiConfig = createConfig({
  chains: [mainnet, megaethChain],
  connectors,
  transports: {
    [mainnet.id]: http(MAINNET_RPC_URL),
    [megaethChain.id]: http(MEGAETH_RPC_URL || "https://rpc.megaeth.org"),
  },
  ssr: true,
});
