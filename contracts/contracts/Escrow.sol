// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Escrow {
    // === State Variables ===
    enum GigStatus {
        OPEN, // Gig posted, no worker yet
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

    constructor() {
        gigCounter = 0; // Initialize gig counter
    }

    // === Functions ===
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

    function assignWorker(uint256 _gigId, address _worker) public {
        Gig storage gig = gigs[_gigId];

        require(gig.gigId != 0, "Gig does not exist");
        require(gig.status == GigStatus.OPEN, "Gig is not in OPEN status");
        require(
            msg.sender == gig.employer,
            "Only the employer can assign a worker"
        );
        require(_worker != address(0), "Worker address cannot be zero");
        require(
            gig.worker == address(0),
            "Worker already assigned to this gig"
        );

        gig.worker = _worker;
        gig.status = GigStatus.ASSIGNED;

        emit WorkerAssigned(_gigId, _worker);
    }

    function submitWork(uint256 _gigId) public {
        Gig storage gig = gigs[_gigId];

        require(gig.gigId != 0, "Gig does not exist");
        require(
            gig.status == GigStatus.ASSIGNED,
            "Gig is not in ASSIGNED status"
        );
        require(
            msg.sender == gig.worker,
            "Only the assigned worker can submit work"
        );
        gig.status = GigStatus.SUBMITTED;
        gig.completedAt = block.timestamp;

        emit WorkSubmitted(_gigId);
    }

    function approveAndPay(uint256 _gigId) public {
        Gig storage gig = gigs[_gigId];

        require(gig.gigId != 0, "Gig does not exist");
        require(
            gig.status == GigStatus.SUBMITTED,
            "Gig is not in SUBMITTED status"
        );
        require(
            msg.sender == gig.employer,
            "Only the employer can approve and pay"
        );

        (bool success, ) = payable(gig.worker).call{value: gig.paymentAmount}(
            ""
        );
        require(success, "Payment transfer failed");

        gig.status = GigStatus.COMPLETED;
        gig.completedAt = block.timestamp;

        emit PaymentReleased(_gigId, gig.worker, gig.paymentAmount);
    }

    function cancelGig(uint256 _gigId) public {
        Gig storage gig = gigs[_gigId];

        require(gig.gigId != 0, "Gig does not exist");
        require(
            gig.status != GigStatus.COMPLETED &&
                gig.status != GigStatus.CANCELLED &&
                gig.status != GigStatus.RESOLVED &&
                gig.status != GigStatus.SUBMITTED,
            "Gig cannot be cancelled in its current status"
        );
        require(
            msg.sender == gig.employer || msg.sender == gig.worker,
            "Only the employer or worker can cancel the gig"
        );

        (bool success, ) = payable(gig.employer).call{value: gig.paymentAmount}(
            ""
        );
        require(success, "Refund to employer failed");

        gig.status = GigStatus.CANCELLED;

        emit GigCancelled(_gigId);
    }

    function getGig(uint _gigId) public view returns (Gig memory) {
        return gigs[_gigId];
    }

    function getEmployerGigs(
        address _employer
    ) public view returns (uint256[] memory) {
        uint256[] memory employerGigIds = new uint256[](gigCounter);
        uint256 currentCount = 0;
        for (uint256 i = 1; i <= gigCounter; i++) {
            if (gigs[i].employer == _employer) {
                employerGigIds[currentCount] = i;
                currentCount++;
            }
        }
        uint256[] memory result = new uint256[](currentCount);
        for (uint256 i = 0; i < currentCount; i++) {
            result[i] = employerGigIds[i];
        }
        return result;
    }

    function getWorkerGigs(
        address _worker
    ) public view returns (uint256[] memory) {
        uint256[] memory workerGigIds = new uint256[](gigCounter);
        uint256 currentCount = 0;
        for (uint256 i = 1; i <= gigCounter; i++) {
            if (gigs[i].worker == _worker) {
                workerGigIds[currentCount] = i;
                currentCount++;
            }
        }
        uint256[] memory result = new uint256[](currentCount);
        for (uint256 i = 0; i < currentCount; i++) {
            result[i] = workerGigIds[i];
        }
        return result;
    }
}
