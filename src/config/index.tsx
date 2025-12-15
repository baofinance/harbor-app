import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Mainnet RPC URL - use environment variable or default to public RPC
const MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.llamarpc.com";

const connectors = [
  injected(), // This will automatically detect Safe's injected provider
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
