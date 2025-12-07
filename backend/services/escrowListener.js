/**
 * Escrow Contract Event Listener Service
 * 
 * Listens for events from the Escrow smart contract and syncs them to MongoDB
 */

const { ethers } = require("ethers");
const Gig = require("../models/Gig");
const User = require("../models/User");

// Load environment variables
const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL;
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;

// Escrow contract ABI (only events)
const ESCROW_ABI = [
  "event GigCreated(uint256 indexed gigId, address indexed employer, address worker, uint256 amount)",
  "event WorkerAssigned(uint256 indexed gigId, address indexed worker)",
  "event WorkSubmitted(uint256 indexed gigId)",
  "event PaymentReleased(uint256 indexed gigId, address indexed worker, uint256 amount)",
  "event GigCancelled(uint256 indexed gigId)"
];

let provider;
let contract;
let isListening = false;

/**
 * Map contract status enum to backend status string
 */
const STATUS_MAP = {
  0: "OPEN",
  1: "ASSIGNED",
  2: "SUBMITTED",
  3: "COMPLETED",
  4: "CANCELLED",
  5: "RESOLVED"
};

/**
 * Initialize the event listener
 */
async function startEventListener() {
  if (!AVALANCHE_RPC_URL || !ESCROW_CONTRACT_ADDRESS) {
    console.warn("⚠️  Escrow event listener not started. Set AVALANCHE_RPC_URL and ESCROW_CONTRACT_ADDRESS in .env");
    return false;
  }

  if (isListening) {
    console.warn("⚠️  Event listener already running");
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL);
    contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);

    // Set up event listeners
    setupEventListeners();

    isListening = true;
    console.log("✅ Escrow event listener started:", ESCROW_CONTRACT_ADDRESS);
    return true;
  } catch (error) {
    console.error("❌ Failed to start event listener:", error.message);
    return false;
  }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Listen for GigCreated event
  contract.on("GigCreated", async (gigId, employer, worker, amount, event) => {
    try {
      console.log(`📢 GigCreated event: gigId=${gigId}, employer=${employer}, worker=${worker}`);

      const paymentAmount = ethers.formatEther(amount);
      const blockchainGigId = Number(gigId);

      // Find or create gig in MongoDB
      // First try to find by employer + recent timestamp (in case frontend created it first)
      let gig = await Gig.findOne({
        employer: employer.toLowerCase(),
        blockchainGigId: { $exists: false },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Within last 5 minutes
      }).sort({ createdAt: -1 });

      if (gig) {
        // Update existing gig with blockchain ID
        gig.blockchainGigId = blockchainGigId;
        gig.status = worker === ethers.ZeroAddress ? "OPEN" : "ASSIGNED";
        gig.worker = worker === ethers.ZeroAddress ? undefined : worker.toLowerCase();
        await gig.save();
        console.log(`✅ Updated gig ${gig._id} with blockchainGigId ${blockchainGigId}`);
      } else {
        // Create new gig from blockchain event
        gig = await Gig.create({
          blockchainGigId,
          employer: employer.toLowerCase(),
          worker: worker === ethers.ZeroAddress ? undefined : worker.toLowerCase(),
          paymentAmount,
          status: worker === ethers.ZeroAddress ? "OPEN" : "ASSIGNED",
          title: `Gig #${blockchainGigId}`,
          description: "Created on-chain",
        });
        console.log(`✅ Created new gig from blockchain: ${gig._id}`);
      }
    } catch (error) {
      console.error("❌ Error handling GigCreated event:", error);
    }
  });

  // Listen for WorkerAssigned event
  contract.on("WorkerAssigned", async (gigId, worker, event) => {
    try {
      console.log(`📢 WorkerAssigned event: gigId=${gigId}, worker=${worker}`);

      const blockchainGigId = Number(gigId);
      const gig = await Gig.findOne({ blockchainGigId });

      if (gig) {
        gig.worker = worker.toLowerCase();
        gig.status = "ASSIGNED";
        await gig.save();
        console.log(`✅ Updated gig ${gig._id} - worker assigned`);
      } else {
        console.warn(`⚠️  Gig with blockchainGigId ${blockchainGigId} not found in database`);
      }
    } catch (error) {
      console.error("❌ Error handling WorkerAssigned event:", error);
    }
  });

  // Listen for WorkSubmitted event
  contract.on("WorkSubmitted", async (gigId, event) => {
    try {
      console.log(`📢 WorkSubmitted event: gigId=${gigId}`);

      const blockchainGigId = Number(gigId);
      const gig = await Gig.findOne({ blockchainGigId });

      if (gig) {
        gig.status = "SUBMITTED";
        await gig.save();
        console.log(`✅ Updated gig ${gig._id} - work submitted`);
      } else {
        console.warn(`⚠️  Gig with blockchainGigId ${blockchainGigId} not found in database`);
      }
    } catch (error) {
      console.error("❌ Error handling WorkSubmitted event:", error);
    }
  });

  // Listen for PaymentReleased event
  contract.on("PaymentReleased", async (gigId, worker, amount, event) => {
    try {
      console.log(`📢 PaymentReleased event: gigId=${gigId}, worker=${worker}, amount=${ethers.formatEther(amount)}`);

      const blockchainGigId = Number(gigId);
      const gig = await Gig.findOne({ blockchainGigId });

      if (gig) {
        gig.status = "COMPLETED";
        gig.completedAt = new Date();
        await gig.save();
        console.log(`✅ Updated gig ${gig._id} - payment released, gig completed`);

        // Update worker's earnings
        await User.findOneAndUpdate(
          { walletAddress: worker.toLowerCase() },
          { $inc: { totalEarnings: parseFloat(ethers.formatEther(amount)) } }
        );
      } else {
        console.warn(`⚠️  Gig with blockchainGigId ${blockchainGigId} not found in database`);
      }
    } catch (error) {
      console.error("❌ Error handling PaymentReleased event:", error);
    }
  });

  // Listen for GigCancelled event
  contract.on("GigCancelled", async (gigId, event) => {
    try {
      console.log(`📢 GigCancelled event: gigId=${gigId}`);

      const blockchainGigId = Number(gigId);
      const gig = await Gig.findOne({ blockchainGigId });

      if (gig) {
        gig.status = "CANCELLED";
        await gig.save();
        console.log(`✅ Updated gig ${gig._id} - gig cancelled`);
      } else {
        console.warn(`⚠️  Gig with blockchainGigId ${blockchainGigId} not found in database`);
      }
    } catch (error) {
      console.error("❌ Error handling GigCancelled event:", error);
    }
  });

  // Handle provider errors
  provider.on("error", (error) => {
    console.error("❌ Provider error:", error);
    // Attempt to reconnect
    setTimeout(() => {
      console.log("🔄 Attempting to reconnect event listener...");
      stopEventListener();
      startEventListener();
    }, 5000);
  });
}

/**
 * Stop the event listener
 */
function stopEventListener() {
  if (contract) {
    contract.removeAllListeners();
    console.log("🛑 Escrow event listener stopped");
  }
  isListening = false;
}

/**
 * Check if listener is active
 */
function isListenerActive() {
  return isListening;
}

module.exports = {
  startEventListener,
  stopEventListener,
  isListenerActive,
};
