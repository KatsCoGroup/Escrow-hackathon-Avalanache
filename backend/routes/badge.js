const express = require("express");
const router = express.Router();
const User = require("../models/User");
const BadgeVerification = require("../models/BadgeVerification");
const { logPayment } = require("../middleware/x402Handler");

// Badge types/skills
const BADGE_TYPES = [
  "Web Development",
  "React",
  "Node.js",
  "Python",
  "Smart Contracts",
  "Solidity",
  "UI/UX Design",
  "DevOps",
  "Data Science",
  "Mobile Development",
  "Blockchain",
  "Cloud Architecture",
];

/**
 * Get all badge types
 * GET /api/badges/types
 */
router.get("/types", async (req, res) => {
  res.json({
    success: true,
    badgeTypes: BADGE_TYPES,
  });
});

/**
 * Get user's badges
 * GET /api/badges/:address
 */
router.get("/:address", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const user = await User.findOne({
      address: address.toLowerCase(),
    });

    if (!user) {
      return res.json({
        success: true,
        badges: [],
      });
    }

    res.json({
      success: true,
      badges: user.badges || [],
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching badges",
      error: error.message,
    });
  }
});

/**
 * Submit badge verification (requires x402 payment)
 * POST /api/badges/verify
 * Requires payment of 5 USDC via x402
 */
router.post("/verify", async (req, res) => {
  try {
    const {
      userAddress,
      skillName,
      portfolioUrl,
      githubUrl,
      linkedinUrl,
      paymentTxHash,
    } = req.body;

    // Validate input
    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    if (!skillName || !BADGE_TYPES.includes(skillName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid skill. Must be one of: ${BADGE_TYPES.join(", ")}`,
      });
    }

    // Check if user already has this badge
    const user = await User.findOne({ address: userAddress.toLowerCase() });
    if (user && user.badges) {
      const hasBadge = user.badges.some((b) => b.skillName === skillName);
      if (hasBadge) {
        return res.status(400).json({
          success: false,
          message: "You already have this badge",
        });
      }
    }

    // Check if payment was provided
    if (!paymentTxHash) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "This action requires a payment of 5 USDC",
        payment: {
          amount: "5.00",
          currency: "USDC",
          description: `Badge Verification for ${skillName}`,
          type: "badge_verification",
          facilitator: {
            name: "Ultravioleta",
            endpoint:
              process.env.X402_FACILITATOR_URL ||
              "https://x402.ultravioleta.io",
            chainId: process.env.CHAIN_ID || "43113",
          },
        },
      });
    }

    // Create verification record
    const verification = new BadgeVerification({
      userAddress: userAddress.toLowerCase(),
      skillName,
      portfolioUrl: portfolioUrl || "",
      githubUrl: githubUrl || "",
      linkedinUrl: linkedinUrl || "",
      txHash: paymentTxHash,
      status: "pending",
    });

    await verification.save();

    // Log payment
    try {
      await logPayment({
        type: "badge_verification",
        amount: 5.0,
        description: `Badge Verification for ${skillName}`,
        userId: userAddress.toLowerCase(),
        txHash: paymentTxHash,
      });
    } catch (logError) {
      console.error("Error logging payment:", logError);
    }

    res.json({
      success: true,
      message: "Badge verification submitted successfully",
      verificationId: verification._id,
      status: "pending",
      estimatedTime: "1-2 business days",
    });
  } catch (error) {
    console.error("Error submitting badge verification:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting badge verification",
      error: error.message,
    });
  }
});

/**
 * Get verification status
 * GET /api/badges/verification/:verificationId
 */
router.get("/verification/:verificationId", async (req, res) => {
  try {
    const verification = await BadgeVerification.findById(
      req.params.verificationId
    );

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    res.json({
      success: true,
      verification: verification,
    });
  } catch (error) {
    console.error("Error fetching verification:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching verification",
      error: error.message,
    });
  }
});

/**
 * Get user's pending verifications
 * GET /api/badges/:address/pending
 */
router.get("/:address/pending", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const pending = await BadgeVerification.find({
      userAddress: address.toLowerCase(),
      status: "pending",
    });

    res.json({
      success: true,
      pending: pending,
      count: pending.length,
    });
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending verifications",
      error: error.message,
    });
  }
});

module.exports = router;
