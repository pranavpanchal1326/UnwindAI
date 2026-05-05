// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TrustVault
 * @dev Document access control and IPFS hash registry
 *
 * From document: "Every access logged on Polygon blockchain
 * — immutable and timestamped"
 * "Professional access keys auto-expire in 48 hours"
 *
 * Stores:
 * 1. IPFS CID → case mapping (encrypted blob registry)
 * 2. Professional access grants with 48h expiry
 * 3. Immutable access log
 *
 * Never stores:
 * - Raw document content
 * - Encryption keys
 * - Personal identifying information
 */
contract TrustVault is Ownable, ReentrancyGuard {

    // ─── CONSTANTS ────────────────────────────────────────
    uint256 public constant ACCESS_DURATION = 48 hours;

    // ─── STRUCTS ──────────────────────────────────────────
    struct DocumentRecord {
        bytes32  caseId;          // Hashed case ID
        bytes32  keyHash;         // Hash of encryption key (not key itself)
        string   ipfsCid;         // IPFS Content ID
        string   documentType;    // Category
        address  uploadedBy;      // User wallet address
        uint256  uploadedAt;      // Block timestamp
        bool     isActive;        // Soft delete flag
    }

    struct AccessGrant {
        address  professional;    // Professional wallet address
        string   role;            // Professional role
        uint256  grantedAt;       // When access was granted
        uint256  expiresAt;       // Always grantedAt + 48h
        bool     isRevoked;       // User can revoke early
    }

    struct AccessLogEntry {
        address  actor;           // Who performed action
        string   action;          // 'granted'|'revoked'|'accessed'|'denied'
        uint256  timestamp;       // Block timestamp
        string   role;            // Role of actor
    }

    // ─── STATE ────────────────────────────────────────────
    // documentId → DocumentRecord
    mapping(bytes32 => DocumentRecord) public documents;

    // documentId → list of access grants
    mapping(bytes32 => AccessGrant[]) public accessGrants;

    // documentId → immutable access log
    mapping(bytes32 => AccessLogEntry[]) public accessLogs;

    // caseId → list of document IDs
    mapping(bytes32 => bytes32[]) public caseDocuments;

    // ─── EVENTS ───────────────────────────────────────────
    event DocumentRegistered(
        bytes32 indexed documentId,
        bytes32 indexed caseId,
        string  ipfsCid,
        address uploadedBy,
        uint256 timestamp
    );

    event AccessGranted(
        bytes32 indexed documentId,
        address indexed professional,
        string  role,
        uint256 expiresAt
    );

    event AccessRevoked(
        bytes32 indexed documentId,
        address indexed professional,
        address indexed revokedBy,
        uint256 timestamp
    );

    event AccessLogged(
        bytes32 indexed documentId,
        address indexed actor,
        string  action,
        uint256 timestamp
    );

    // ─── CONSTRUCTOR ──────────────────────────────────────
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── FUNCTIONS ────────────────────────────────────────

    /**
     * @dev Register an encrypted document on-chain
     * Called after IPFS upload — records CID permanently
     * Only orchestrator wallet can register (owner)
     */
    function registerDocument(
        bytes32 documentId,
        bytes32 caseId,
        bytes32 keyHash,
        string  calldata ipfsCid,
        string  calldata documentType
    )
        external
        onlyOwner
        nonReentrant
    {
        require(
            bytes(documents[documentId].ipfsCid).length == 0,
            "TrustVault: document already registered"
        );
        require(
            bytes(ipfsCid).length > 0,
            "TrustVault: IPFS CID cannot be empty"
        );

        documents[documentId] = DocumentRecord({
            caseId:       caseId,
            keyHash:      keyHash,
            ipfsCid:      ipfsCid,
            documentType: documentType,
            uploadedBy:   msg.sender,
            uploadedAt:   block.timestamp,
            isActive:     true
        });

        caseDocuments[caseId].push(documentId);

        // Log registration
        accessLogs[documentId].push(AccessLogEntry({
            actor:     msg.sender,
            action:    "registered",
            timestamp: block.timestamp,
            role:      "user"
        }));

        emit DocumentRegistered(
            documentId,
            caseId,
            ipfsCid,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @dev Grant 48-hour access to a professional
     * Called when user approves access request
     */
    function grantAccess(
        bytes32 documentId,
        address professional,
        string  calldata role
    )
        external
        onlyOwner
        nonReentrant
    {
        require(
            documents[documentId].isActive,
            "TrustVault: document not found or deleted"
        );

        uint256 expiresAt = block.timestamp + ACCESS_DURATION;

        accessGrants[documentId].push(AccessGrant({
            professional: professional,
            role:         role,
            grantedAt:    block.timestamp,
            expiresAt:    expiresAt,
            isRevoked:    false
        }));

        // Immutable access log entry
        accessLogs[documentId].push(AccessLogEntry({
            actor:     msg.sender,
            action:    "access_granted",
            timestamp: block.timestamp,
            role:      role
        }));

        emit AccessGranted(
            documentId,
            professional,
            role,
            expiresAt
        );
    }

    /**
     * @dev Revoke professional access before expiry
     * User can revoke at any time
     */
    function revokeAccess(
        bytes32 documentId,
        address professional
    )
        external
        onlyOwner
        nonReentrant
    {
        AccessGrant[] storage grants = accessGrants[documentId];

        for (uint i = 0; i < grants.length; i++) {
            if (grants[i].professional == professional &&
                !grants[i].isRevoked) {
                grants[i].isRevoked = true;

                accessLogs[documentId].push(AccessLogEntry({
                    actor:     msg.sender,
                    action:    "access_revoked",
                    timestamp: block.timestamp,
                    role:      grants[i].role
                }));

                emit AccessRevoked(
                    documentId,
                    professional,
                    msg.sender,
                    block.timestamp
                );
                break;
            }
        }
    }

    /**
     * @dev Check if a professional has valid access
     * Checks expiry AND revocation status
     */
    function hasValidAccess(
        bytes32 documentId,
        address professional
    )
        external
        view
        returns (bool)
    {
        AccessGrant[] storage grants = accessGrants[documentId];

        for (uint i = 0; i < grants.length; i++) {
            if (grants[i].professional == professional &&
                !grants[i].isRevoked &&
                block.timestamp < grants[i].expiresAt) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get all documents for a case
     */
    function getCaseDocuments(bytes32 caseId)
        external
        view
        returns (bytes32[] memory)
    {
        return caseDocuments[caseId];
    }

    /**
     * @dev Get access log length for a document
     */
    function getAccessLogLength(bytes32 documentId)
        external
        view
        returns (uint256)
    {
        return accessLogs[documentId].length;
    }

    /**
     * @dev Get specific access log entry
     */
    function getAccessLogEntry(
        bytes32 documentId,
        uint256 index
    )
        external
        view
        returns (AccessLogEntry memory)
    {
        require(
            index < accessLogs[documentId].length,
            "TrustVault: index out of bounds"
        );
        return accessLogs[documentId][index];
    }
}
