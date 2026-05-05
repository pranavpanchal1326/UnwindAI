// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProofTimeline
 * @dev Immutable chronological evidence trail for a case
 *
 * From demo script: "ProofTimeline on Polygon"
 *
 * Records significant case events on-chain:
 * - Document uploads
 * - Professional assignments
 * - Decision milestones
 * - Settlement agreements
 *
 * Once recorded, events cannot be modified or deleted.
 * This creates a tamper-proof timeline admissible in court.
 */
contract ProofTimeline is Ownable {

    // ─── STRUCTS ──────────────────────────────────────────
    struct TimelineEvent {
        bytes32  caseId;
        string   eventType;
        bytes32  dataHash;    // Hash of event data — never raw data
        string   description; // Plain text description
        uint256  timestamp;
        address  recordedBy;
    }

    // ─── STATE ────────────────────────────────────────────
    // caseId → ordered list of events
    mapping(bytes32 => TimelineEvent[]) public timelines;

    // Global event counter
    uint256 public totalEvents;

    // ─── EVENTS ───────────────────────────────────────────
    event EventRecorded(
        bytes32 indexed caseId,
        string  eventType,
        bytes32 dataHash,
        uint256 timestamp,
        uint256 eventIndex
    );

    // ─── CONSTRUCTOR ──────────────────────────────────────
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── FUNCTIONS ────────────────────────────────────────

    /**
     * @dev Record a case event on the timeline
     * Data hash is a SHA-256 hash of the full event data
     * Actual data stored in Supabase — only hash on-chain
     */
    function recordEvent(
        bytes32 caseId,
        string  calldata eventType,
        bytes32 dataHash,
        string  calldata description
    )
        external
        onlyOwner
    {
        require(
            bytes(eventType).length > 0,
            "ProofTimeline: eventType cannot be empty"
        );

        uint256 eventIndex = timelines[caseId].length;

        timelines[caseId].push(TimelineEvent({
            caseId:      caseId,
            eventType:   eventType,
            dataHash:    dataHash,
            description: description,
            timestamp:   block.timestamp,
            recordedBy:  msg.sender
        }));

        totalEvents++;

        emit EventRecorded(
            caseId,
            eventType,
            dataHash,
            block.timestamp,
            eventIndex
        );
    }

    /**
     * @dev Get number of events in a case timeline
     */
    function getTimelineLength(bytes32 caseId)
        external
        view
        returns (uint256)
    {
        return timelines[caseId].length;
    }

    /**
     * @dev Get a specific timeline event
     */
    function getEvent(bytes32 caseId, uint256 index)
        external
        view
        returns (TimelineEvent memory)
    {
        require(
            index < timelines[caseId].length,
            "ProofTimeline: index out of bounds"
        );
        return timelines[caseId][index];
    }

    /**
     * @dev Verify an event by checking data hash
     * Provides cryptographic proof of event integrity
     */
    function verifyEvent(
        bytes32 caseId,
        uint256 index,
        bytes32 claimedDataHash
    )
        external
        view
        returns (bool)
    {
        if (index >= timelines[caseId].length) return false;
        return timelines[caseId][index].dataHash == claimedDataHash;
    }
}
