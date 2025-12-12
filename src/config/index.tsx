import { createConfig, http } from"wagmi";
import { mainnet } from"wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from"wagmi/connectors";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

const connectors = [
 injected(),
 coinbaseWallet({ appName:"harbor" }),
 ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID })] : []),
];

export const wagmiConfig = createConfig({
 chains: [mainnet],
 connectors,
 transports: {
 [mainnet.id]: RPC_URL ? http(RPC_URL) : http(),
 },
});
