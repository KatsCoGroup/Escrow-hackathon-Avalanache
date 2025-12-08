/**
 * Escrow Contract Event Listener Service
 * 
 * Listens for events from the Escrow smart contract and syncs them to MongoDB
 */

const { ethers } = require("ethers");
const Gig = require("../models/Gig");
const User = require("../models/User");
const { AVALANCHE_RPC_URL, ESCROW_CONTRACT_ADDRESS } = require("../config/env");

// Load environment variables from config

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
let pollingInterval;
let lastProcessedBlock = null;

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
 * Initialize the event listener (using polling for better RPC compatibility)
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
    // Use a more permissive provider configuration for public RPC endpoints
    provider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL, undefined, {
      staticNetwork: true, // Skip network detection for better compatibility
    });
    contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);

    // Get current block to start polling from (with retry logic)
    try {
      lastProcessedBlock = await provider.getBlockNumber();
    } catch (blockError) {
      console.warn("⚠️  Could not get initial block number, starting from latest");
      lastProcessedBlock = 0;
    }

    // Start polling for events (every 12 seconds to match Avalanche C-Chain block time)
    pollingInterval = setInterval(pollForEvents, 12000);

    isListening = true;
    console.log("✅ Escrow event listener started:", ESCROW_CONTRACT_ADDRESS);
    return true;
  } catch (error) {
    console.error("❌ Failed to start event listener:", error.message);
    return false;
  }
}

/**
 * Poll for new events instead of using WebSocket filters
 */
async function pollForEvents() {
  try {
    const currentBlock = await provider.getBlockNumber();
    
    if (currentBlock <= lastProcessedBlock) {
      return; // No new blocks
    }

    // Query events from last processed block to current block
    const events = await contract.queryFilter("*", lastProcessedBlock + 1, currentBlock);
    
    // Process each event
    for (const event of events) {
      await handleEvent(event);
    }

    lastProcessedBlock = currentBlock;
  } catch (error) {
    console.error("@TODO Error polling for events:", error.message);
  }
}

/**
 * Handle individual events
 */
async function handleEvent(event) {
  try {
    switch (event.eventName || event.event) {
      case "GigCreated":
        await handleGigCreated(event);
        break;
      case "WorkerAssigned":
        await handleWorkerAssigned(event);
        break;
      case "WorkSubmitted":
        await handleWorkSubmitted(event);
        break;
      case "PaymentReleased":
        await handlePaymentReleased(event);
        break;
      case "GigCancelled":
        await handleGigCancelled(event);
        break;
    }
  } catch (error) {
    console.error(`❌ Error handling ${event.eventName || event.event} event:`, error);
  }
}

/**
 * Handle GigCreated event
 */
async function handleGigCreated(event) {
  const [gigId, employer, worker, amount] = event.args;
  console.log(`📢 GigCreated event: gigId=${gigId}, employer=${employer}, worker=${worker}`);

  const paymentAmount = ethers.formatEther(amount);
  const blockchainGigId = Number(gigId);

  // Find or create gig in MongoDB
  let gig = await Gig.findOne({
    employer: employer.toLowerCase(),
    blockchainGigId: { $exists: false },
    createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  }).sort({ createdAt: -1 });

  if (gig) {
    gig.blockchainGigId = blockchainGigId;
    gig.status = worker === ethers.ZeroAddress ? "OPEN" : "ASSIGNED";
    gig.worker = worker === ethers.ZeroAddress ? undefined : worker.toLowerCase();
    await gig.save();
    console.log(`✅ Updated gig ${gig._id} with blockchainGigId ${blockchainGigId}`);
  } else {
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
}

/**
 * Handle WorkerAssigned event
 */
async function handleWorkerAssigned(event) {
  const [gigId, worker] = event.args;
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
}

/**
 * Handle WorkSubmitted event
 */
async function handleWorkSubmitted(event) {
  const [gigId] = event.args;
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
}

/**
 * Handle PaymentReleased event
 */
async function handlePaymentReleased(event) {
  const [gigId, worker, amount] = event.args;
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
}

/**
 * Handle GigCancelled event
 */
async function handleGigCancelled(event) {
  const [gigId] = event.args;
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
}

/**
 * Stop the event listener
 */
function stopEventListener() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
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
