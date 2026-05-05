// lib/web3/contracts.js
// Contract addresses from deployment + ABI references
// ABIs are minimal — only functions we actually call

// Using relative import
import deployments from './deployments.json' assert { type: 'json' }

// ─── CONTRACT ADDRESSES ───────────────────────────────────
export const CONTRACT_ADDRESSES = {
  TrustVault:    deployments?.contracts?.TrustVault    || null,
  ProofTimeline: deployments?.contracts?.ProofTimeline || null,
  Escrow:        deployments?.contracts?.Escrow        || null,
  DeadManSwitch: deployments?.contracts?.DeadManSwitch || null
}

// ─── ABI FRAGMENTS — ONLY FUNCTIONS WE CALL ──────────────
// Full ABIs live in artifacts/ after hardhat compile
// These are minimal read/write fragments for wagmi hooks

export const TRUST_VAULT_ABI = [
  {
    name: 'registerDocument',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'documentId', type: 'bytes32' },
      { name: 'caseId',     type: 'bytes32' },
      { name: 'keyHash',    type: 'bytes32' },
      { name: 'ipfsCid',    type: 'string'  },
      { name: 'documentType', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'grantAccess',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'documentId',   type: 'bytes32' },
      { name: 'professional', type: 'address' },
      { name: 'role',         type: 'string'  }
    ],
    outputs: []
  },
  {
    name: 'revokeAccess',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'documentId',   type: 'bytes32' },
      { name: 'professional', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'hasValidAccess',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'documentId',   type: 'bytes32' },
      { name: 'professional', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getAccessLogLength',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'documentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'DocumentRegistered',
    type: 'event',
    inputs: [
      { name: 'documentId', type: 'bytes32', indexed: true },
      { name: 'caseId',     type: 'bytes32', indexed: true },
      { name: 'ipfsCid',    type: 'string',  indexed: false },
      { name: 'uploadedBy', type: 'address', indexed: false },
      { name: 'timestamp',  type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'AccessGranted',
    type: 'event',
    inputs: [
      { name: 'documentId',   type: 'bytes32', indexed: true },
      { name: 'professional', type: 'address', indexed: true },
      { name: 'role',         type: 'string',  indexed: false },
      { name: 'expiresAt',    type: 'uint256', indexed: false }
    ]
  }
]

export const PROOF_TIMELINE_ABI = [
  {
    name: 'recordEvent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'caseId',      type: 'bytes32' },
      { name: 'eventType',   type: 'string'  },
      { name: 'dataHash',    type: 'bytes32' },
      { name: 'description', type: 'string'  }
    ],
    outputs: []
  },
  {
    name: 'getTimelineLength',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'verifyEvent',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'caseId',          type: 'bytes32' },
      { name: 'index',           type: 'uint256' },
      { name: 'claimedDataHash', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'EventRecorded',
    type: 'event',
    inputs: [
      { name: 'caseId',    type: 'bytes32', indexed: true },
      { name: 'eventType', type: 'string',  indexed: false },
      { name: 'dataHash',  type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'eventIndex', type: 'uint256', indexed: false }
    ]
  }
]

export const DEAD_MAN_SWITCH_ABI = [
  {
    name: 'checkIn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: []
  },
  {
    name: 'isCaseFrozen',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getDaysSinceCheckIn',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getCaseStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: [
      { name: 'isFrozen',       type: 'bool'    },
      { name: 'daysSinceCheckIn', type: 'uint256' },
      { name: 'phase',          type: 'string'  }
    ]
  }
]
