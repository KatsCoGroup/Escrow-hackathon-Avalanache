const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow Contract - Full Test Suite", () => {
  let escrow;
  let deployer, employer, worker, other;

  // Test fixture
  beforeEach(async () => {
    // Get signers
    [deployer, employer, worker, other] = await ethers.getSigners();

    // Deploy contract
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy();
    await escrow.waitForDeployment();

    console.log(`\n📍 Contract deployed to: ${await escrow.getAddress()}`);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Contract Deployment
  // ─────────────────────────────────────────────────────────────
  describe("1️⃣  Contract Deployment", () => {
    it("should deploy successfully", async () => {
      const address = await escrow.getAddress();
      expect(address).to.not.equal(ethers.ZeroAddress);
      console.log(`   ✅ Contract deployed at: ${address}`);
    });

    it("should start with empty gig list", async () => {
      const gigs = await escrow.getEmployerGigs(employer.address);
      expect(gigs.length).to.equal(0);
      console.log("   ✅ Gig list initialized empty");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Create Gig
  // ─────────────────────────────────────────────────────────────
  describe("2️⃣  Create Gig (Lock AVAX in Escrow)", () => {
    it("should create gig and lock payment", async () => {
      const paymentAmount = ethers.parseEther("0.1"); // 0.1 AVAX

      // Create gig
      const tx = await escrow
        .connect(employer)
        .createGig(ethers.ZeroAddress, { value: paymentAmount });

      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1); // Success

      console.log(`   ✅ Gig created (tx: ${receipt.hash})`);

      // Verify gig exists
      const gigs = await escrow.getEmployerGigs(employer.address);
      expect(gigs.length).to.equal(1);
      console.log(`   ✅ Gig ID: ${gigs[0]}`);
    });

    it("should emit GigCreated event", async () => {
      const paymentAmount = ethers.parseEther("0.05");

      await expect(
        escrow.connect(employer).createGig(worker.address, { value: paymentAmount })
      )
        .to.emit(escrow, "GigCreated")
        .withArgs(1, employer.address, worker.address, paymentAmount);

      console.log("   ✅ GigCreated event emitted correctly");
    });

    it("should fail if no payment sent", async () => {
      await expect(
        escrow.connect(employer).createGig(ethers.ZeroAddress, { value: 0 })
      ).to.be.revertedWith("Payment amount must be greater than 0");

      console.log("   ✅ Rejected zero payment correctly");
    });

    it("should accept initial worker assignment", async () => {
      const paymentAmount = ethers.parseEther("0.1");

      await escrow
        .connect(employer)
        .createGig(worker.address, { value: paymentAmount });

      const gig = await escrow.getGig(1);
      expect(gig.worker).to.equal(worker.address);
      expect(gig.status).to.equal(1); // ASSIGNED

      console.log("   ✅ Worker pre-assigned during creation");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Assign Worker
  // ─────────────────────────────────────────────────────────────
  describe("3️⃣  Assign Worker", () => {
    beforeEach(async () => {
      const paymentAmount = ethers.parseEther("0.1");
      await escrow
        .connect(employer)
        .createGig(ethers.ZeroAddress, { value: paymentAmount });
    });

    it("should assign worker to open gig", async () => {
      await escrow.connect(employer).assignWorker(1, worker.address);

      const gig = await escrow.getGig(1);
      expect(gig.worker).to.equal(worker.address);
      expect(gig.status).to.equal(1); // ASSIGNED

      console.log("   ✅ Worker assigned successfully");
    });

    it("should emit WorkerAssigned event", async () => {
      await expect(escrow.connect(employer).assignWorker(1, worker.address))
        .to.emit(escrow, "WorkerAssigned")
        .withArgs(1, worker.address);

      console.log("   ✅ WorkerAssigned event emitted");
    });

    it("should reject non-employer assignment", async () => {
      await expect(
        escrow.connect(other).assignWorker(1, worker.address)
      ).to.be.revertedWith("Only employer can assign worker");

      console.log("   ✅ Prevented non-employer from assigning");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Submit Work
  // ─────────────────────────────────────────────────────────────
  describe("4️⃣  Submit Work", () => {
    beforeEach(async () => {
      const paymentAmount = ethers.parseEther("0.1");
      await escrow
        .connect(employer)
        .createGig(worker.address, { value: paymentAmount });
    });

    it("should mark work as submitted", async () => {
      await escrow.connect(worker).submitWork(1);

      const gig = await escrow.getGig(1);
      expect(gig.status).to.equal(2); // SUBMITTED

      console.log("   ✅ Work submitted successfully");
    });

    it("should emit WorkSubmitted event", async () => {
      await expect(escrow.connect(worker).submitWork(1))
        .to.emit(escrow, "WorkSubmitted")
        .withArgs(1);

      console.log("   ✅ WorkSubmitted event emitted");
    });

    it("should reject submission from non-worker", async () => {
      await expect(escrow.connect(other).submitWork(1)).to.be.revertedWith(
        "Only assigned worker can submit work"
      );

      console.log("   ✅ Prevented non-worker from submitting");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Approve and Pay
  // ─────────────────────────────────────────────────────────────
  describe("5️⃣  Approve and Release Payment", () => {
    beforeEach(async () => {
      const paymentAmount = ethers.parseEther("0.1");
      await escrow
        .connect(employer)
        .createGig(worker.address, { value: paymentAmount });
      await escrow.connect(worker).submitWork(1);
    });

    it("should release payment to worker", async () => {
      const initialBalance = await ethers.provider.getBalance(worker.address);

      const tx = await escrow.connect(employer).approveAndPay(1);
      const receipt = await tx.wait();

      const finalBalance = await ethers.provider.getBalance(worker.address);
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      expect(finalBalance).to.be.gt(initialBalance);

      console.log(`   ✅ Payment released to worker`);
      console.log(`      Before: ${ethers.formatEther(initialBalance)} AVAX`);
      console.log(`      After:  ${ethers.formatEther(finalBalance)} AVAX`);
    });

    it("should emit PaymentReleased event", async () => {
      await expect(escrow.connect(employer).approveAndPay(1))
        .to.emit(escrow, "PaymentReleased")
        .withArgs(1, worker.address, ethers.parseEther("0.1"));

      console.log("   ✅ PaymentReleased event emitted");
    });

    it("should mark gig as completed", async () => {
      await escrow.connect(employer).approveAndPay(1);

      const gig = await escrow.getGig(1);
      expect(gig.status).to.equal(3); // COMPLETED
      expect(gig.completedAt).to.be.gt(0);

      console.log("   ✅ Gig marked as completed");
    });

    it("should reject approval from non-employer", async () => {
      await expect(escrow.connect(worker).approveAndPay(1)).to.be.revertedWith(
        "Only employer can approve"
      );

      console.log("   ✅ Prevented non-employer from approving");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Cancel Gig
  // ─────────────────────────────────────────────────────────────
  describe("6️⃣  Cancel Gig and Refund", () => {
    it("should refund employer on cancellation", async () => {
      const paymentAmount = ethers.parseEther("0.1");
      const initialBalance = await ethers.provider.getBalance(employer.address);

      const createTx = await escrow
        .connect(employer)
        .createGig(worker.address, { value: paymentAmount });
      const createReceipt = await createTx.wait();
      const createGasUsed = createReceipt.gasUsed * createReceipt.gasPrice;

      const cancelTx = await escrow.connect(employer).cancelGig(1);
      const cancelReceipt = await cancelTx.wait();
      const cancelGasUsed = cancelReceipt.gasUsed * cancelReceipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(employer.address);
      const totalGasUsed = createGasUsed + cancelGasUsed;

      // Balance should be: initial - totalGas (refund cancels out the sent payment)
      expect(finalBalance).to.be.closeTo(
        initialBalance - totalGasUsed,
        ethers.parseEther("0.001") // Allow 0.001 AVAX tolerance for rounding
      );

      console.log(`   ✅ Employer refunded on cancellation`);
    });

    it("should emit GigCancelled event", async () => {
      const paymentAmount = ethers.parseEther("0.1");
      await escrow
        .connect(employer)
        .createGig(worker.address, { value: paymentAmount });

      await expect(escrow.connect(employer).cancelGig(1))
        .to.emit(escrow, "GigCancelled")
        .withArgs(1);

      console.log("   ✅ GigCancelled event emitted");
    });

    it("should mark gig as cancelled", async () => {
      const paymentAmount = ethers.parseEther("0.1");
      await escrow
        .connect(employer)
        .createGig(worker.address, { value: paymentAmount });
      await escrow.connect(employer).cancelGig(1);

      const gig = await escrow.getGig(1);
      expect(gig.status).to.equal(4); // CANCELLED

      console.log("   ✅ Gig marked as cancelled");
    });

    it("should reject cancellation from non-employer", async () => {
      const paymentAmount = ethers.parseEther("0.1");
      await escrow
        .connect(employer)
        .createGig(worker.address, { value: paymentAmount });

      await expect(escrow.connect(other).cancelGig(1)).to.be.revertedWith(
        "Only employer can cancel"
      );

      console.log("   ✅ Prevented non-employer from cancelling");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 7: Full Workflow
  // ─────────────────────────────────────────────────────────────
  describe("7️⃣  Complete Workflow", () => {
    it("should handle complete gig lifecycle", async () => {
      console.log("\n   🔄 COMPLETE GIG LIFECYCLE:\n");

      // Step 1: Create
      console.log("      1. Employer creates gig with 0.1 AVAX payment...");
      const paymentAmount = ethers.parseEther("0.1");
      const createTx = await escrow
        .connect(employer)
        .createGig(ethers.ZeroAddress, { value: paymentAmount });
      await createTx.wait();
      console.log("         ✅ Gig created (status: OPEN)");

      // Step 2: Assign
      console.log("      2. Employer assigns worker...");
      await escrow.connect(employer).assignWorker(1, worker.address);
      console.log("         ✅ Worker assigned (status: ASSIGNED)");

      // Step 3: Submit
      console.log("      3. Worker submits completed work...");
      await escrow.connect(worker).submitWork(1);
      console.log("         ✅ Work submitted (status: SUBMITTED)");

      // Step 4: Approve & Pay
      console.log("      4. Employer approves and releases payment...");
      const initialWorkerBalance = await ethers.provider.getBalance(worker.address);
      const approveTx = await escrow.connect(employer).approveAndPay(1);
      await approveTx.wait();
      const finalWorkerBalance = await ethers.provider.getBalance(worker.address);
      console.log("         ✅ Payment released (status: COMPLETED)");
      console.log(
        `         💰 Worker received: ${ethers.formatEther(
          finalWorkerBalance - initialWorkerBalance
        )} AVAX\n`
      );

      // Verify final state
      const gig = await escrow.getGig(1);
      expect(gig.status).to.equal(3); // COMPLETED
      expect(gig.completedAt).to.be.gt(0);
      expect(finalWorkerBalance).to.be.gt(initialWorkerBalance);

      console.log("   ✅ WORKFLOW COMPLETE\n");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 8: Edge Cases
  // ─────────────────────────────────────────────────────────────
  describe("8️⃣  Edge Cases", () => {
    it("should prevent operations on non-existent gig", async () => {
      await expect(escrow.getGig(999)).to.be.reverted;
      console.log("   ✅ Rejected non-existent gig");
    });

    it("should handle multiple concurrent gigs", async () => {
      const amount1 = ethers.parseEther("0.05");
      const amount2 = ethers.parseEther("0.1");

      await escrow.connect(employer).createGig(worker.address, { value: amount1 });
      await escrow.connect(employer).createGig(other.address, { value: amount2 });

      const gigs = await escrow.getEmployerGigs(employer.address);
      expect(gigs.length).to.equal(2);

      console.log("   ✅ Multiple concurrent gigs supported");
    });

    it("should track worker gigs", async () => {
      const amount = ethers.parseEther("0.1");
      await escrow.connect(employer).createGig(worker.address, { value: amount });

      const workerGigs = await escrow.getWorkerGigs(worker.address);
      expect(workerGigs.length).to.equal(1);

      console.log("   ✅ Worker gig tracking works");
    });
  });
});
