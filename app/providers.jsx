// app/providers.jsx
// Client-side providers for wagmi v2 + React Query
// Wrapped around the app in layout.jsx

'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider }
  from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/web3/wagmi'

// Create QueryClient outside component — stable reference
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   30 * 1000,  // 30 seconds
      retry:       2,
      refetchOnWindowFocus: false
    }
  }
})

export function Web3Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
