// app/providers.jsx
'use client'
// Client-side providers: wagmi + React Query
// Defensive: if wagmi config fails, children still render

import { useState } from 'react'
import { QueryClient, QueryClientProvider }
  from '@tanstack/react-query'

// Create QueryClient outside component — stable reference
// Prevents recreation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30 * 1000,
      retry:               2,
      refetchOnWindowFocus: false
    }
  }
})

export function Web3Providers({ children }) {
  // Defensive Web3 loading — if wagmi config fails
  // (e.g. missing env vars) the app still renders
  const [wagmiError, setWagmiError] = useState(false)

  if (wagmiError) {
    // Wagmi failed — render without blockchain features
    // App works in DEMO_MODE without wallet connection
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  // Try to load wagmi — catch any config errors
  try {
    const WagmiProviderWrapper = require('./WagmiWrapper').default
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProviderWrapper onError={() => setWagmiError(true)}>
          {children}
        </WagmiProviderWrapper>
      </QueryClientProvider>
    )
  } catch {
    // wagmi not available — render without
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}
