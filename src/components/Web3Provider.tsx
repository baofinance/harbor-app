"use client";

import { WagmiProvider } from'wagmi'
import { wagmi as wagmiConfig} from'@/config/wagmi'
import { QueryClient, QueryClientProvider } from'@tanstack/react-query'

// Configure QueryClient with sensible defaults to reduce RPC requests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds (reduces refetches)
      staleTime: 30000,
      
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      
      // Don't refetch on window focus (big source of unnecessary requests)
      refetchOnWindowFocus: false,
      
      // Don't refetch on component remount (use cached data)
      refetchOnMount: false,
      
      // Reduce retries from 3 to 1 (faster failure, fewer requests)
      retry: 1,
      
      // Disable automatic refetch intervals by default
      // (specific queries can override this)
      refetchInterval: false,
    },
  },
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
 return <WagmiProvider config={wagmiConfig}>
 <QueryClientProvider client={queryClient}>
 {children}
 </QueryClientProvider>
 </WagmiProvider>;
}

