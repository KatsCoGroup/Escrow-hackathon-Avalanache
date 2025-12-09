/**
 * Escrow Contract Interaction Service
 * 
 * Provides functions to interact with the Escrow smart contract on Avalanche
 */

const { ethers } = require("ethers");
const { AVALANCHE_RPC_URL, ESCROW_CONTRACT_ADDRESS, ADMIN_PRIVATE_KEY } = require("../config/env");

// Load environment variables from config

// Escrow contract ABI (minimal - only the functions we need)
const ESCROW_ABI = [
  "function createGig(address _worker) public payable returns (uint256)",
  "function assignWorker(uint256 _gigId, address _worker) public",
  "function submitWork(uint256 _gigId) public",
  "function approveAndPay(uint256 _gigId) public",
  "function cancelGig(uint256 _gigId) public",
  "function getGig(uint256 _gigId) public view returns (tuple(uint256 gigId, address employer, address worker, uint256 paymentAmount, uint8 status, uint256 createdAt, uint256 completedAt))",
  "event GigCreated(uint256 indexed gigId, address indexed employer, address worker, uint256 amount)",
  "event WorkerAssigned(uint256 indexed gigId, address indexed worker)",
  "event WorkSubmitted(uint256 indexed gigId)",
  "event PaymentReleased(uint256 indexed gigId, address indexed worker, uint256 amount)",
  "event GigCancelled(uint256 indexed gigId)"
];

let provider;
let contract;
let signer;

/**
 * Initialize the contract connection
 */
function initializeContract() {
  if (!AVALANCHE_RPC_URL || !ESCROW_CONTRACT_ADDRESS) {
    console.warn("⚠️  Escrow contract not configured. Set AVALANCHE_RPC_URL and ESCROW_CONTRACT_ADDRESS in .env");
    return false;
  }

  try {
    // Use a more permissive provider configuration for public RPC endpoints
    provider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL, undefined, {
      staticNetwork: true, // Skip network detection for better compatibility
    });
    
    if (ADMIN_PRIVATE_KEY) {
      signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
      contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
    } else {
      contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);
    }
    
    console.log("✅ Escrow contract initialized:", ESCROW_CONTRACT_ADDRESS);
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize escrow contract:", error.message);
    return false;
  }
}

/**
 * Create a gig on-chain (locks payment in escrow)
 * @param {string} employerAddress - Employer wallet address
 * @param {string} workerAddress - Worker address (or 0x0 for open gig)
 * @param {string} paymentAmount - Payment amount in AVAX
 * @returns {Promise<{gigId: number, txHash: string}>}
 */
async function createGigOnChain(employerAddress, workerAddress, paymentAmount) {
  if (!contract) {
    throw new Error("Contract not initialized");
  }

  try {
    // If we have a signer, use it; otherwise, this is read-only
    if (!signer) {
      throw new Error("No signer configured. Set ADMIN_PRIVATE_KEY in .env");
    }

    const worker = workerAddress || ethers.ZeroAddress;
    const value = ethers.parseEther(paymentAmount.toString());

    const tx = await contract.createGig(worker, { value });
    const receipt = await tx.wait();

    // Extract gigId from GigCreated event
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === "GigCreated";
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error("GigCreated event not found in transaction");
    }

    const parsedEvent = contract.interface.parseLog(event);
    const gigId = Number(parsedEvent.args.gigId);

    return {
      gigId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("Error creating gig on-chain:", error);
    throw error;
  }
}

/**
 * Assign worker to a gig on-chain
 * @param {number} gigId - Blockchain gig ID
 * @param {string} workerAddress - Worker wallet address
 * @returns {Promise<{txHash: string}>}
 */
async function assignWorkerOnChain(gigId, workerAddress) {
  if (!contract || !signer) {
    throw new Error("Contract or signer not initialized");
  }

  try {
    const tx = await contract.assignWorker(gigId, workerAddress);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("Error assigning worker on-chain:", error);
    throw error;
  }
}

/**
 * Submit work on-chain
 * @param {number} gigId - Blockchain gig ID
 * @param {string} workerAddress - Worker wallet address (for signing)
 * @returns {Promise<{txHash: string}>}
 */
async function submitWorkOnChain(gigId, workerAddress) {
  if (!contract) {
    throw new Error("Contract not initialized");
  }

  try {
    // Worker needs to sign this transaction
    // In production, frontend would call this directly
    // For now, we use admin signer as placeholder
    const tx = await contract.submitWork(gigId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("Error submitting work on-chain:", error);
    throw error;
  }
}

/**
 * Approve work and release payment on-chain
 * @param {number} gigId - Blockchain gig ID
 * @returns {Promise<{txHash: string}>}
 */
async function approveAndPayOnChain(gigId) {
  if (!contract || !signer) {
    throw new Error("Contract or signer not initialized");
  }

  try {
    const tx = await contract.approveAndPay(gigId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("Error approving and paying on-chain:", error);
    throw error;
  }
}

/**
 * Cancel gig and refund employer on-chain
 * @param {number} gigId - Blockchain gig ID
 * @returns {Promise<{txHash: string}>}
 */
async function cancelGigOnChain(gigId) {
  if (!contract || !signer) {
    throw new Error("Contract or signer not initialized");
  }

  try {
    const tx = await contract.cancelGig(gigId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("Error cancelling gig on-chain:", error);
    throw error;
  }
}

/**
 * Get gig details from contract
 * @param {number} gigId - Blockchain gig ID
 * @returns {Promise<object>} Gig data from contract
 */
async function getGigFromChain(gigId) {
  if (!contract) {
    throw new Error("Contract not initialized");
  }

  try {
    const gig = await contract.getGig(gigId);
    return {
      gigId: Number(gig.gigId),
      employer: gig.employer,
      worker: gig.worker,
      paymentAmount: ethers.formatEther(gig.paymentAmount),
      status: gig.status, // 0=OPEN, 1=ASSIGNED, 2=SUBMITTED, 3=COMPLETED, 4=CANCELLED
      createdAt: Number(gig.createdAt),
      completedAt: Number(gig.completedAt),
    };
  } catch (error) {
    console.error("Error fetching gig from chain:", error);
    throw error;
  }
}

module.exports = {
  initializeContract,
  createGigOnChain,
  assignWorkerOnChain,
  submitWorkOnChain,
  approveAndPayOnChain,
  cancelGigOnChain,
  getGigFromChain,
  getContract: () => contract,
  getProvider: () => provider,
};
