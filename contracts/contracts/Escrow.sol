// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Escrow {
    // === State Variables ===
    enum GigStatus {
        OPEN,
        // Gig posted, no worker yet
        ASSIGNED, // Worker assigned, payment locked
        SUBMITTED, // Worker marked work complete
        COMPLETED, // Employer approved, payment released
        CANCELLED, // Gig cancelled by employer or worker
        RESOLVED // Gig resolved by employer or worker
    }

    struct Gig {
        uint256 gigId;
        address employer;
        address worker;
        uint256 paymentAmount;
        GigStatus status;
        uint256 createdAt;
        uint256 completedAt;
    }

    // === State Variables ===
    uint256 private gigCounter; // Counter for generating unique gig IDs
    mapping(uint256 => Gig) public gigs; // Stores Gig structs by gigId

    // === Events ===
    event GigCreated(
        uint256 indexed gigId,
        address indexed employer,
        address worker,
        uint256 amount
    );
    event WorkerAssigned(uint256 indexed gigId, address indexed worker);
    event WorkSubmitted(uint256 indexed gigId);
    event PaymentReleased(
        uint256 indexed gigId,
        address indexed worker,
        uint256 amount
    );
    event GigCancelled(uint256 indexed gigId);

    // TODO: constructor
    constructor() {
        gigCounter = 0; // Initialize gig counter
    }

    function createGig(address _worker) public payable {
        require(msg.value > 0, "Payment amount must be greater than 0");
        require(
            msg.sender != address(0),
            "Employer cannot be the zero address"
        );
        if (_worker != address(0)) {
            require(_worker != msg.sender, "Worker cannot be the employer");
        }

        gigCounter++;
        uint256 currentGigId = gigCounter;

        GigStatus initialStatus = (_worker != address(0))
            ? GigStatus.ASSIGNED
            : GigStatus.OPEN;

        gigs[currentGigId] = Gig({
            gigId: currentGigId,
            employer: msg.sender,
            worker: _worker,
            paymentAmount: msg.value,
            status: initialStatus,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit GigCreated(currentGigId, msg.sender, _worker, msg.value);
    }
}
