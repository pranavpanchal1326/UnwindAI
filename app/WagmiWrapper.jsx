// app/WagmiWrapper.jsx
'use client'

import { WagmiProvider } from 'wagmi'
import { wagmiConfig } from '@/lib/web3/wagmi'

export default function WagmiWrapper({ children, onError }) {
  try {
    return (
      <WagmiProvider config={wagmiConfig}>
        {children}
      </WagmiProvider>
    )
  } catch (err) {
    console.warn('[WagmiWrapper] Failed:', err.message)
    onError?.()
    return children
  }
}
