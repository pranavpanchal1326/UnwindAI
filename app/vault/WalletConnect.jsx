// app/vault/WalletConnect.jsx
'use client'
// Minimal wallet connection UI for vault
// Used when user needs to sign blockchain transactions

import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'
import { useWalletConnection } from '@/lib/web3/useVault'

/**
 * WalletConnect
 * Shows wallet connection state and connect button
 * Used in DocumentVault component when blockchain tx needed
 */
export function WalletConnect({ onConnected }) {
  const {
    address,
    isConnected,
    isConnecting,
    isWrongNetwork,
    chainName,
    connectWallet
  } = useWalletConnection()

  // Already connected to correct network
  if (isConnected && !isWrongNetwork) {
    onConnected?.(address)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--success)'
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.02em'
          }}
        >
          {address
            ? `${address.slice(0, 6)}...${address.slice(-4)}`
            : 'Connected'}
        </span>
      </div>
    )
  }

  // Wrong network
  if (isConnected && isWrongNetwork) {
    return (
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: 'var(--warning-soft)',
          borderRadius: '8px'
        }}
        role="alert"
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--warning)',
            margin: 0
          }}
        >
          Please switch to Polygon Amoy in MetaMask.
          Currently on: {chainName || 'unknown network'}
        </p>
      </div>
    )
  }

  // Not connected
  return (
    <motion.button
      onClick={connectWallet}
      disabled={isConnecting}
      whileTap={{ scale: 0.98 }}
      transition={TRANSITIONS.standard}
      style={{
        padding: '10px 20px',
        backgroundColor: 'var(--accent)',
        border: 'none',
        borderRadius: '8px',
        cursor: isConnecting ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-general-sans)',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text-inverse)',
        opacity: isConnecting ? 0.6 : 1
      }}
      aria-busy={isConnecting}
      aria-label="Connect MetaMask wallet"
    >
      {isConnecting
        ? 'Connecting...'
        : 'Connect MetaMask'}
    </motion.button>
  )
}
