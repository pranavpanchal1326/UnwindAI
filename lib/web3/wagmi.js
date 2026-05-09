// lib/web3/wagmi.js
// wagmi v2 config for Polygon Amoy Testnet
// Note: wagmi v2 uses Viem under the hood

import { createConfig, http } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { metaMask, walletConnect } from 'wagmi/connectors'

// Polygon Amoy is included in wagmi/chains
// chainId: 80002

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  connectors: (typeof window !== 'undefined' && process.env.DEMO_MODE !== 'true') ? [
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
                 || 'demo_project_id'
    })
  ] : [],


  ssr: true,
  transports: {
    [polygonAmoy.id]: http(
      process.env.POLYGON_RPC_URL ||
      'https://rpc-amoy.polygon.technology'
    )
  }
})


export { polygonAmoy }
