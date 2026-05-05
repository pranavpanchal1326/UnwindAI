// lib/web3/useVault.js
'use client'
// wagmi v2 hooks for TrustVault + ProofTimeline
// Reads use useReadContract, writes use useWriteContract

import {
  useReadContract,
  useWriteContract,
  useAccount,
  useConnect,
  useDisconnect,
  useWaitForTransactionReceipt
} from 'wagmi'
import { keccak256, toHex } from 'viem'
import {
  CONTRACT_ADDRESSES,
  TRUST_VAULT_ABI,
  PROOF_TIMELINE_ABI,
  DEAD_MAN_SWITCH_ABI
} from './contracts'
import { metaMask } from 'wagmi/connectors'

// ─── WALLET CONNECTION ────────────────────────────────────

/**
 * useWalletConnection
 * Manages MetaMask connection state
 * Used in vault upload flow and document access
 */
export function useWalletConnection() {
  const { address, isConnected, chain } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()

  const connectWallet = () => {
    connect({ connector: metaMask() })
  }

  const isWrongNetwork = isConnected && chain?.id !== 80002
  // 80002 = Polygon Amoy

  return {
    address,
    isConnected,
    isConnecting,
    isWrongNetwork,
    chainName: chain?.name || null,
    connectWallet,
    disconnect
  }
}

// ─── DOCUMENT REGISTRATION ────────────────────────────────

/**
 * useRegisterDocument
 * Registers an uploaded document on TrustVault contract
 * Called after successful IPFS upload + Supabase save
 */
export function useRegisterDocument() {
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed
  } = useWaitForTransactionReceipt({ hash: txHash })

  const registerDocument = ({
    documentId,  // bytes32 — keccak256 of doc UUID
    caseId,      // bytes32 — keccak256 of case UUID
    keyHash,     // bytes32 — keccak256 of encryption key
    ipfsCid,     // string
    documentType // string
  }) => {
    if (!CONTRACT_ADDRESSES.TrustVault) {
      console.error('TrustVault not deployed')
      return
    }

    writeContract({
      address: CONTRACT_ADDRESSES.TrustVault,
      abi:     TRUST_VAULT_ABI,
      functionName: 'registerDocument',
      args: [
        documentId,
        caseId,
        keyHash,
        ipfsCid,
        documentType
      ]
    })
  }

  return {
    registerDocument,
    txHash,
    isWriting,
    isConfirming,
    isConfirmed,
    writeError
  }
}

// ─── ACCESS VERIFICATION ─────────────────────────────────

/**
 * useCheckDocumentAccess
 * Reads hasValidAccess from TrustVault contract
 * Returns boolean — is professional access valid right now?
 */
export function useCheckDocumentAccess(
  documentId,
  professionalAddress
) {
  const enabled =
    !!documentId &&
    !!professionalAddress &&
    !!CONTRACT_ADDRESSES.TrustVault

  const { data, isLoading, error } = useReadContract({
    address:      CONTRACT_ADDRESSES.TrustVault,
    abi:          TRUST_VAULT_ABI,
    functionName: 'hasValidAccess',
    args:         [documentId, professionalAddress],
    query:        { enabled }
  })

  return {
    hasAccess: data === true,
    isLoading,
    error
  }
}

// ─── DEAD MAN SWITCH ─────────────────────────────────────

/**
 * useCaseStatus
 * Reads Dead Man Switch status from contract
 */
export function useCaseStatus(caseIdBytes32) {
  const { data, isLoading, error } = useReadContract({
    address:      CONTRACT_ADDRESSES.DeadManSwitch,
    abi:          DEAD_MAN_SWITCH_ABI,
    functionName: 'getCaseStatus',
    args:         [caseIdBytes32],
    query:        { enabled: !!caseIdBytes32 &&
                             !!CONTRACT_ADDRESSES.DeadManSwitch }
  })

  if (!data) return { isFrozen: false, daysSinceCheckIn: 0,
                      phase: 'active', isLoading }

  return {
    isFrozen:         data[0],
    daysSinceCheckIn: Number(data[1]),
    phase:            data[2],
    isLoading,
    error
  }
}

/**
 * useCheckIn
 * User checks in to reset Dead Man Switch timer
 */
export function useCheckIn() {
  const {
    writeContract,
    data: txHash,
    isPending: isWriting
  } = useWriteContract()

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed
  } = useWaitForTransactionReceipt({ hash: txHash })

  const checkIn = (caseIdBytes32) => {
    if (!CONTRACT_ADDRESSES.DeadManSwitch) return

    writeContract({
      address:      CONTRACT_ADDRESSES.DeadManSwitch,
      abi:          DEAD_MAN_SWITCH_ABI,
      functionName: 'checkIn',
      args:         [caseIdBytes32]
    })
  }

  return { checkIn, isWriting, isConfirming, isConfirmed, txHash }
}

// ─── PROOF TIMELINE ───────────────────────────────────────

/**
 * useTimelineLength
 * Reads number of events recorded for a case
 */
export function useTimelineLength(caseIdBytes32) {
  const { data, isLoading } = useReadContract({
    address:      CONTRACT_ADDRESSES.ProofTimeline,
    abi:          PROOF_TIMELINE_ABI,
    functionName: 'getTimelineLength',
    args:         [caseIdBytes32],
    query:        { enabled: !!caseIdBytes32 &&
                             !!CONTRACT_ADDRESSES.ProofTimeline }
  })

  return {
    length:    data ? Number(data) : 0,
    isLoading
  }
}

// ─── UTILITY HELPERS ─────────────────────────────────────

/**
 * uuidToBytes32
 * Converts a UUID string to bytes32 for contract calls
 * e.g. "abc123..." → 0xabc123...0000
 */
export function uuidToBytes32(uuid) {
  // Remove hyphens from UUID
  const hex = uuid.replace(/-/g, '')
  // Pad to 32 bytes (64 hex chars)
  return `0x${hex.padEnd(64, '0')}`
}

/**
 * stringToBytes32
 * Converts arbitrary string to bytes32 via keccak256
 */
export function stringToBytes32(str) {
  return keccak256(toHex(str))
}
