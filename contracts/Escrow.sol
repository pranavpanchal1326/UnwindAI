// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @dev Professional fee escrow contract
 * Holds MATIC payments for professional fees
 * Releases on milestone completion, not upfront
 *
 * Flow:
 * 1. User deposits fee into escrow
 * 2. Professional completes milestone
 * 3. Orchestrator verifies + releases payment
 * 4. If dispute: funds locked until resolved
 */
contract Escrow is Ownable, ReentrancyGuard {

    // ─── STRUCTS ──────────────────────────────────────────
    struct EscrowDeposit {
        bytes32  caseId;
        address  payer;          // User
        address  payee;          // Professional
        uint256  amount;         // In MATIC (wei)
        string   milestone;      // What triggers release
        bool     isReleased;
        bool     isRefunded;
        uint256  depositedAt;
        uint256  releasedAt;
    }

    // ─── STATE ────────────────────────────────────────────
    mapping(bytes32 => EscrowDeposit) public deposits;
    // depositId → EscrowDeposit

    mapping(bytes32 => bytes32[]) public caseDeposits;
    // caseId → list of depositIds

    uint256 public totalHeld;

    // ─── EVENTS ───────────────────────────────────────────
    event Deposited(
        bytes32 indexed depositId,
        bytes32 indexed caseId,
        address payer,
        address payee,
        uint256 amount,
        string  milestone
    );

    event Released(
        bytes32 indexed depositId,
        address payee,
        uint256 amount,
        uint256 timestamp
    );

    event Refunded(
        bytes32 indexed depositId,
        address payer,
        uint256 amount
    );

    // ─── CONSTRUCTOR ──────────────────────────────────────
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── FUNCTIONS ────────────────────────────────────────

    /**
     * @dev Create a new escrow deposit
     * Called when user agrees to professional fee
     */
    function deposit(
        bytes32 depositId,
        bytes32 caseId,
        address payee,
        string  calldata milestone
    )
        external
        payable
        nonReentrant
    {
        require(msg.value > 0, "Escrow: deposit amount required")
        ;
        require(
            deposits[depositId].payer == address(0),
            "Escrow: depositId already exists"
        );
        require(payee != address(0), "Escrow: invalid payee");

        deposits[depositId] = EscrowDeposit({
            caseId:      caseId,
            payer:       msg.sender,
            payee:       payee,
            amount:      msg.value,
            milestone:   milestone,
            isReleased:  false,
            isRefunded:  false,
            depositedAt: block.timestamp,
            releasedAt:  0
        });

        caseDeposits[caseId].push(depositId);
        totalHeld += msg.value;

        emit Deposited(
            depositId,
            caseId,
            msg.sender,
            payee,
            msg.value,
            milestone
        );
    }

    /**
     * @dev Release funds to professional on milestone completion
     * Only orchestrator can release
     */
    function release(bytes32 depositId)
        external
        onlyOwner
        nonReentrant
    {
        EscrowDeposit storage dep = deposits[depositId];

        require(
            dep.payer != address(0),
            "Escrow: deposit not found"
        );
        require(!dep.isReleased, "Escrow: already released");
        require(!dep.isRefunded, "Escrow: already refunded");

        dep.isReleased = true;
        dep.releasedAt = block.timestamp;
        totalHeld -= dep.amount;

        (bool success, ) = dep.payee.call{value: dep.amount}("");
        require(success, "Escrow: transfer failed");

        emit Released(
            depositId,
            dep.payee,
            dep.amount,
            block.timestamp
        );
    }

    /**
     * @dev Refund to user if professional fails
     */
    function refund(bytes32 depositId)
        external
        onlyOwner
        nonReentrant
    {
        EscrowDeposit storage dep = deposits[depositId];

        require(
            dep.payer != address(0),
            "Escrow: deposit not found"
        );
        require(!dep.isReleased, "Escrow: already released");
        require(!dep.isRefunded, "Escrow: already refunded");

        dep.isRefunded = true;
        totalHeld -= dep.amount;

        (bool success, ) = dep.payer.call{value: dep.amount}("");
        require(success, "Escrow: refund failed");

        emit Refunded(depositId, dep.payer, dep.amount);
    }

    /**
     * @dev Get total balance held in escrow
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
