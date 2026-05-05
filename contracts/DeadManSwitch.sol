// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeadManSwitch
 * @dev On-chain enforcement of case freeze after inactivity
 *
 * From GAP-06:
 * "7d: check-in only. 21d: pause tasks.
 *  45d: freeze all access via smart contract."
 *
 * The 45-day freeze is enforced here — on-chain, immutable.
 * Supabase handles 7d and 21d — this contract handles 45d.
 *
 * When frozen:
 * - All professional access keys invalidated
 * - No new documents can be registered
 * - Case is frozen until user checks in
 */
contract DeadManSwitch is Ownable {

    // ─── CONSTANTS ────────────────────────────────────────
    uint256 public constant CHECKIN_WARNING  = 7 days;
    uint256 public constant PAUSE_THRESHOLD  = 21 days;
    uint256 public constant FREEZE_THRESHOLD = 45 days;

    // ─── STRUCTS ──────────────────────────────────────────
    struct CaseCheckIn {
        bytes32  caseId;
        address  userWallet;
        uint256  lastCheckIn;    // Block timestamp
        bool     isFrozen;
        uint256  frozenAt;
    }

    // ─── STATE ────────────────────────────────────────────
    mapping(bytes32 => CaseCheckIn) public cases;

    // ─── EVENTS ───────────────────────────────────────────
    event CaseRegistered(
        bytes32 indexed caseId,
        address userWallet,
        uint256 timestamp
    );

    event CheckedIn(
        bytes32 indexed caseId,
        address indexed user,
        uint256 timestamp
    );

    event CaseFrozen(
        bytes32 indexed caseId,
        uint256 inactiveDays,
        uint256 timestamp
    );

    event CaseUnfrozen(
        bytes32 indexed caseId,
        address indexed user,
        uint256 timestamp
    );

    // ─── CONSTRUCTOR ──────────────────────────────────────
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── FUNCTIONS ────────────────────────────────────────

    /**
     * @dev Register a case for Dead Man Switch monitoring
     * Called on intake completion
     */
    function registerCase(
        bytes32 caseId,
        address userWallet
    )
        external
        onlyOwner
    {
        require(
            cases[caseId].userWallet == address(0),
            "DMS: case already registered"
        );

        cases[caseId] = CaseCheckIn({
            caseId:      caseId,
            userWallet:  userWallet,
            lastCheckIn: block.timestamp,
            isFrozen:    false,
            frozenAt:    0
        });

        emit CaseRegistered(caseId, userWallet, block.timestamp);
    }

    /**
     * @dev User checks in — resets inactivity timer
     * Also unfreezes if currently frozen
     */
    function checkIn(bytes32 caseId) external {
        CaseCheckIn storage c = cases[caseId];

        require(
            c.userWallet != address(0),
            "DMS: case not registered"
        );
        require(
            msg.sender == c.userWallet || msg.sender == owner(),
            "DMS: not authorized"
        );

        bool wasFrozen = c.isFrozen;
        c.lastCheckIn = block.timestamp;
        c.isFrozen    = false;
        c.frozenAt    = 0;

        if (wasFrozen) {
            emit CaseUnfrozen(caseId, msg.sender, block.timestamp);
        }

        emit CheckedIn(caseId, msg.sender, block.timestamp);
    }

    /**
     * @dev Freeze a case after 45 days inactivity
     * Called by orchestrator cron when threshold exceeded
     */
    function freezeCase(bytes32 caseId) external onlyOwner {
        CaseCheckIn storage c = cases[caseId];

        require(
            c.userWallet != address(0),
            "DMS: case not registered"
        );
        require(!c.isFrozen, "DMS: already frozen");

        uint256 inactiveDays =
            (block.timestamp - c.lastCheckIn) / 1 days;

        require(
            inactiveDays >= 45,
            "DMS: 45 day threshold not reached"
        );

        c.isFrozen = true;
        c.frozenAt = block.timestamp;

        emit CaseFrozen(caseId, inactiveDays, block.timestamp);
    }

    /**
     * @dev Check if a case is currently frozen
     */
    function isCaseFrozen(bytes32 caseId)
        external
        view
        returns (bool)
    {
        return cases[caseId].isFrozen;
    }

    /**
     * @dev Get days since last check-in
     */
    function getDaysSinceCheckIn(bytes32 caseId)
        external
        view
        returns (uint256)
    {
        if (cases[caseId].userWallet == address(0)) return 0;
        return (block.timestamp - cases[caseId].lastCheckIn)
               / 1 days;
    }

    /**
     * @dev Get current DMS status for a case
     */
    function getCaseStatus(bytes32 caseId)
        external
        view
        returns (
            bool isFrozen,
            uint256 daysSinceCheckIn,
            string memory phase
        )
    {
        CaseCheckIn storage c = cases[caseId];

        if (c.userWallet == address(0)) {
            return (false, 0, "not_registered");
        }

        uint256 inactive =
            (block.timestamp - c.lastCheckIn) / 1 days;

        string memory currentPhase;
        if (c.isFrozen || inactive >= FREEZE_THRESHOLD / 1 days) {
            currentPhase = "frozen";
        } else if (inactive >= PAUSE_THRESHOLD / 1 days) {
            currentPhase = "paused";
        } else if (inactive >= CHECKIN_WARNING / 1 days) {
            currentPhase = "warning";
        } else {
            currentPhase = "active";
        }

        return (c.isFrozen, inactive, currentPhase);
    }
}
