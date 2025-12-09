/**
 * x402 Payment Handler Middleware
 * 
 * Handles HTTP 402 Payment Required responses for x402 micropayments
 * Integrates with Ultravioleta x402 facilitator for USDC payments
 */

const { ethers } = require("ethers");
const RevenueTracking = require("../models/RevenueTracking");
const User = require("../models/User");

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://x402.ultravioleta.io";
const FACILITATOR_API_KEY = process.env.X402_API_KEY || "";
const FACILITATOR_PAYMENT_ADDRESS = (process.env.X402_PAYMENT_ADDRESS || "").toLowerCase();
const USDC_TOKEN_ADDRESS = (process.env.USDC_TOKEN_ADDRESS || "").toLowerCase();
const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL || "";
const CHAIN_ID = process.env.CHAIN_ID || "43113";

let provider;
if (AVALANCHE_RPC_URL) {
  provider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL, Number(CHAIN_ID));
}

/**
 * Generate HTTP 402 Payment Required response
 * @param {number} amount - Payment amount in USDC
 * @param {string} description - Payment description
 * @param {string} type - Revenue type (featured_gig, subscription, etc)
 * @returns {object} Response object for HTTP 402
 */
function generatePaymentRequired(amount, description, type) {
  return {
    status: 402,
    statusText: "Payment Required",
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      success: false,
      code: "PAYMENT_REQUIRED",
      message: `This action requires a payment of ${amount} USDC`,
      payment: {
        amount: amount.toString(),
        currency: "USDC",
        description: description,
        type: type,
        facilitator: {
          name: "Ultravioleta",
          endpoint: FACILITATOR_URL,
          chainId: CHAIN_ID,
        },
      },
    },
  };
}

/**
 * Verify x402 payment signature
 * In production, this would verify with Ultravioleta facilitator
 * @param {string} txHash - Transaction hash
 * @param {string} paymentType - Type of payment
 * @returns {Promise<boolean>}
 */
async function verifyWithFacilitator(txHash, paymentType, amount) {
  if (!FACILITATOR_URL || !FACILITATOR_API_KEY) return null;

  try {
    const res = await fetch(`${FACILITATOR_URL}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": FACILITATOR_API_KEY,
      },
      body: JSON.stringify({ txHash, paymentType, amount, chainId: CHAIN_ID }),
    });

    if (!res.ok) {
      console.error("Facilitator verify failed:", res.status, res.statusText);
      return false;
    }

    const data = await res.json();
    return !!data?.verified;
  } catch (error) {
    console.error("Facilitator verification error:", error.message);
    return false;
  }
}

async function verifyOnChainUSDC(txHash, amount) {
  if (!provider || !USDC_TOKEN_ADDRESS || !FACILITATOR_PAYMENT_ADDRESS) return null;
  if (!txHash) return false;

  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return false;

    const transferTopic = ethers.id("Transfer(address,address,uint256)");
    const targetAmount = ethers.parseUnits(amount.toString(), 6); // USDC has 6 decimals

    for (const log of receipt.logs) {
      if (!log.address || log.address.toLowerCase() !== USDC_TOKEN_ADDRESS) continue;
      if (!log.topics || log.topics[0] !== transferTopic) continue;

      const from = ethers.getAddress(`0x${log.topics[1].slice(26)}`);
      const to = ethers.getAddress(`0x${log.topics[2].slice(26)}`);
      const value = ethers.getBigInt(log.data);

      if (to.toLowerCase() === FACILITATOR_PAYMENT_ADDRESS && value === targetAmount) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("On-chain verification error:", error.message);
    return false;
  }
}

/**
 * Verify x402 payment signature
 * First tries facilitator API, then on-chain USDC transfer to facilitator address.
 * @param {string} txHash - Transaction hash
 * @param {string} paymentType - Type of payment
 * @param {number|string} amount - Expected USDC amount
 * @returns {Promise<boolean>}
 */
async function verifyPayment(txHash, paymentType, amount) {
  try {
    if (!txHash || txHash.length < 10) return false;

    // Step 1: Facilitator API
    const facilitatorResult = await verifyWithFacilitator(txHash, paymentType, amount);
    if (facilitatorResult === true) {
      return true;
    }

    // Step 2: On-chain USDC transfer check (if configured)
    const onChainResult = await verifyOnChainUSDC(txHash, amount);
    if (onChainResult === true) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Payment verification error:", error);
    return false;
  }
}

/**
 * Log x402 payment to revenue tracking
 * @param {object} data - Payment data
 * @returns {Promise<object>} Created revenue record
 */
async function logPayment(data) {
  try {
    const revenue = new RevenueTracking({
      type: data.type,
      amount: data.amount,
      currency: "USDC",
      description: data.description,
      gigId: data.gigId || null,
      userId: data.userId || null,
      txHash: data.txHash,
      status: "confirmed",
    });

    return await revenue.save();
  } catch (error) {
    console.error("Error logging payment:", error);
    throw error;
  }
}

/**
 * Check if user qualifies for free action (subscription or NFT holder)
 * @param {string} userAddress - User wallet address
 * @returns {Promise<boolean>}
 */
async function checkFreeAccessEligibility(userAddress) {
  try {
    const user = await User.findOne({ address: userAddress.toLowerCase() });

    if (!user) {
      return false;
    }

    // Check if has active subscription
    if (
      user.subscription &&
      user.subscription.type !== "none" &&
      user.subscription.expiresAt &&
      new Date(user.subscription.expiresAt) > new Date()
    ) {
      return true;
    }

    // Check if owns community NFT
    if (user.communityNFT && user.communityNFT.owns) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking free access:", error);
    return false;
  }
}

/**
 * Middleware to handle x402 payment requirement
 * Usage: app.use(requirePayment({ amount: 0.50, type: 'featured_gig' }))
 */
function requireX402Payment(paymentConfig) {
  return async (req, res, next) => {
    const { amount, type, description } = paymentConfig;
    const userAddress = req.body.employer || req.body.userAddress || req.query.address;

    // Check if user is eligible for free access
    if (userAddress) {
      const isFree = await checkFreeAccessEligibility(userAddress);
      if (isFree) {
        return next();
      }
    }

    // Check if payment was already made
    const txHash = req.headers["x-payment-txhash"] || req.body.paymentTxHash;

    if (txHash) {
      const isValid = await verifyPayment(txHash, type, amount);
      if (isValid) {
        // Log the payment
        await logPayment({
          type,
          amount,
          description,
          userId: userAddress,
          txHash,
        });
        return next();
      }
    }

    // Send 402 Payment Required
    const paymentResponse = generatePaymentRequired(amount, description, type);
    return res.status(402).json(paymentResponse.body);
  };
}

module.exports = {
  generatePaymentRequired,
  verifyPayment,
  logPayment,
  checkFreeAccessEligibility,
  requireX402Payment,
};
