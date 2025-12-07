const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const CommunityNFT = require("../models/CommunityNFT");
const { logPayment } = require("../middleware/x402Handler");

/**
 * Get subscription pricing
 * GET /api/subscriptions/pricing
 */
router.get("/pricing", async (req, res) => {
  res.json({
    success: true,
    pricing: {
      monthly: {
        name: "Monthly Pro",
        price: 9.99,
        currency: "USDC",
        duration: "30 days",
        benefits: [
          "Free gig applications",
          "Free featured gig",
          "Priority support",
          "Advanced search filters",
        ],
      },
      community_nft: {
        name: "Community NFT",
        price: 49.0,
        currency: "USDC",
        duration: "Lifetime",
        benefits: [
          "All Monthly benefits",
          "Exclusive NFT membership",
          "Community access",
          "Lifetime free applications",
          "Custom badge",
        ],
      },
    },
  });
});

/**
 * Get user's subscription status
 * GET /api/subscriptions/:address
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

    const user = await User.findOne({ address: address.toLowerCase() });

    if (!user) {
      return res.json({
        success: true,
        subscription: { type: "none" },
      });
    }

    const subscription = user.subscription || { type: "none" };

    // Check if subscription is expired
    if (subscription.type !== "none" && subscription.expiresAt) {
      if (new Date(subscription.expiresAt) < new Date()) {
        subscription.type = "none";
      }
    }

    res.json({
      success: true,
      subscription: subscription,
      communityNFT: user.communityNFT || { owns: false },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription",
      error: error.message,
    });
  }
});

/**
 * Purchase monthly subscription (requires x402 payment)
 * POST /api/subscriptions/monthly/purchase
 */
router.post("/monthly/purchase", async (req, res) => {
  try {
    const { userAddress, paymentTxHash } = req.body;

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    if (!paymentTxHash) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "This action requires a payment of 9.99 USDC",
        payment: {
          amount: "9.99",
          currency: "USDC",
          description: "Monthly Pro Subscription",
          type: "subscription",
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

    // Create/Update subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    let subscription = await Subscription.findOne({
      userAddress: userAddress.toLowerCase(),
      type: "monthly",
      status: "active",
    });

    if (subscription) {
      // Extend existing subscription
      subscription.startDate = new Date();
      subscription.expiresAt = expiresAt;
      subscription.txHash = paymentTxHash;
    } else {
      // Create new subscription
      subscription = new Subscription({
        userAddress: userAddress.toLowerCase(),
        type: "monthly",
        price: 9.99,
        status: "active",
        expiresAt: expiresAt,
        txHash: paymentTxHash,
      });
    }

    await subscription.save();

    // Update user subscription
    await User.findOneAndUpdate(
      { address: userAddress.toLowerCase() },
      {
        $set: {
          subscription: {
            type: "monthly",
            expiresAt: expiresAt,
            autoRenew: false,
          },
        },
      },
      { upsert: true }
    );

    // Log payment
    try {
      await logPayment({
        type: "subscription",
        amount: 9.99,
        description: "Monthly Pro Subscription",
        userId: userAddress.toLowerCase(),
        txHash: paymentTxHash,
      });
    } catch (logError) {
      console.error("Error logging payment:", logError);
    }

    res.json({
      success: true,
      message: "Monthly subscription activated",
      subscription: {
        type: "monthly",
        expiresAt: expiresAt,
        autoRenew: false,
      },
    });
  } catch (error) {
    console.error("Error purchasing subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error purchasing subscription",
      error: error.message,
    });
  }
});

/**
 * Purchase community NFT (requires x402 payment)
 * POST /api/subscriptions/community-nft/purchase
 */
router.post("/community-nft/purchase", async (req, res) => {
  try {
    const { userAddress, paymentTxHash } = req.body;

    if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    if (!paymentTxHash) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "This action requires a payment of 49.00 USDC",
        payment: {
          amount: "49.00",
          currency: "USDC",
          description: "Community NFT Membership",
          type: "community_nft",
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

    // Check if user already owns NFT
    const existingNFT = await CommunityNFT.findOne({
      owner: userAddress.toLowerCase(),
      status: "active",
    });

    if (existingNFT) {
      return res.status(400).json({
        success: false,
        message: "You already own a Community NFT",
      });
    }

    // Create NFT record (in production, this would trigger actual NFT minting)
    const nextTokenId = (await CommunityNFT.countDocuments()) + 1;

    const nft = new CommunityNFT({
      tokenId: nextTokenId,
      owner: userAddress.toLowerCase(),
      purchasePrice: 49.0,
      txHash: paymentTxHash,
      status: "active",
    });

    await nft.save();

    // Update user
    await User.findOneAndUpdate(
      { address: userAddress.toLowerCase() },
      {
        $set: {
          communityNFT: {
            owns: true,
            tokenId: nextTokenId,
            mintedAt: new Date(),
          },
          subscription: {
            type: "community_nft",
            expiresAt: null,
            autoRenew: false,
          },
        },
      },
      { upsert: true }
    );

    // Log payment
    try {
      await logPayment({
        type: "community_nft",
        amount: 49.0,
        description: "Community NFT Membership",
        userId: userAddress.toLowerCase(),
        txHash: paymentTxHash,
      });
    } catch (logError) {
      console.error("Error logging payment:", logError);
    }

    res.json({
      success: true,
      message: "Community NFT purchased successfully",
      nft: {
        tokenId: nft.tokenId,
        owner: nft.owner,
        status: "active",
      },
      note: "NFT will be minted to your wallet shortly",
    });
  } catch (error) {
    console.error("Error purchasing Community NFT:", error);
    res.status(500).json({
      success: false,
      message: "Error purchasing Community NFT",
      error: error.message,
    });
  }
});

module.exports = router;
