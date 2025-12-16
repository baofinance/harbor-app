import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { safeConnector } from "./safeConnector";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Mainnet RPC URL - use environment variable or default to public RPC
const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/uGl5kuD60tnGFHRmkevK1iYQuIQKmh1n";

const connectors = [
  safeConnector(), // Safe connector - will only be active in Safe iframe
  injected(), // This will automatically detect injected providers like MetaMask
  coinbaseWallet({ appName: "harbor" }),
 ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID })] : []),
];

export const wagmiConfig = createConfig({
 chains: [mainnet],
 connectors,
 transports: {
    [mainnet.id]: http(MAINNET_RPC_URL),
 },
  ssr: true,
});
