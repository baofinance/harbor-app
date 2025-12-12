"use client";

import { WagmiProvider } from'wagmi'
import { wagmi as wagmiConfig} from'@/config/wagmi'
import { QueryClient, QueryClientProvider } from'@tanstack/react-query'

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
 return <WagmiProvider config={wagmiConfig}>
 <QueryClientProvider client={queryClient}>
 {children}
 </QueryClientProvider>
 </WagmiProvider>;
}

