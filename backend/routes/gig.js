const express = require("express");
const router = express.Router();
const Gig = require("../models/Gig");
const User = require("../models/User");
const { logPayment, checkFreeAccessEligibility } = require("../middleware/x402Handler");
const { 
  createGigOnChain, 
  assignWorkerOnChain, 
  submitWorkOnChain,
  approveAndPayOnChain,
  cancelGigOnChain
} = require("../services/escrowContract");


/**
 * Get all gigs with filters
 * GET /api/gigs
 * Query params: status, requiredBadge, featured, limit, skip
 */
router.get("/", async (req, res) => {
  try {
    const { status, requiredBadge, featured, limit = 20, skip = 0 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (requiredBadge) filter.requiredBadge = requiredBadge;
    if (featured === "true") {
      filter.featured = true;
      filter.featuredUntil = { $gt: new Date() };
    }

    const gigs = await Gig.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Gig.countDocuments(filter);

    res.json({
      success: true,
      gigs: gigs,
      total: total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    console.error("Error fetching gigs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching gigs",
      error: error.message,
    });
  }
});

/**
 * Get single gig
 * GET /api/gigs/:gigId
 */
router.get("/:gigId", async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      });
    }

    res.json({
      success: true,
      gig: gig,
    });
  } catch (error) {
    console.error("Error fetching gig:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching gig",
      error: error.message,
    });
  }
});


/**
 * Create new gig (Free)
 * POST /api/gigs
 */
router.post("/", async (req, res) => {
  try {
    const { employer, title, description, paymentAmount, requiredBadge, deadline, blockchainGigId, txHash } =
      req.body;

    // Validate input
    if (!employer || !/^0x[a-fA-F0-9]{40}$/.test(employer)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employer wallet address",
      });
    }

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!description || description.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be a positive number",
      });
    }

    // If frontend already created on-chain, accept provided ids; otherwise create on-chain here
    let onChain = null;
    if (blockchainGigId && txHash) {
      onChain = { gigId: Number(blockchainGigId), txHash };
    } else {
      try {
        onChain = await createGigOnChain(
          employer.toLowerCase(),
          null, // Open gig (no worker yet)
          paymentAmount
        );
      } catch (blockchainError) {
        console.error("❌ Blockchain gig creation failed:", blockchainError.message || blockchainError);
        return res.status(400).json({
          success: false,
          message: "Failed to create gig on-chain",
          error: blockchainError.message || "Unknown blockchain error",
        });
      }
    }

    // Persist only after chain succeeds
    const gig = new Gig({
      employer: employer.toLowerCase(),
      title,
      description,
      imageUrl: req.body.imageUrl || "",
      paymentAmount: paymentAmount.toString(),
      requiredBadge: requiredBadge || "",
      deadline: deadline || 7,
      status: "OPEN",
      blockchainGigId: onChain?.gigId,
      txHash: onChain?.txHash,
    });

    await gig.save();

    return res.status(201).json({
      success: true,
      message: "Gig created successfully on-chain",
      gig,
      blockchain: onChain,
    });
  } catch (error) {
    console.error("Error creating gig:", error);
    res.status(500).json({
      success: false,
      message: "Error creating gig",
      error: error.message,
    });
  }
});

/**
 * Update gig details (title/description/payment/badge/deadline/image)
 * PUT /api/gigs/:gigId
 * Requires employer wallet match with stored gig.employer
 */
router.put("/:gigId", async (req, res) => {
  try {
    const { gigId } = req.params;
    const { employer, title, description, paymentAmount, requiredBadge, deadline, imageUrl } = req.body;

    if (!employer || !/^0x[a-fA-F0-9]{40}$/.test(employer)) {
      return res.status(400).json({ success: false, message: "Invalid employer wallet address" });
    }

    let gig = await Gig.findById(gigId);
    if (!gig) {
      // Fallback: allow lookup by blockchainGigId
      const numericId = Number(gigId);
      if (!Number.isNaN(numericId)) {
        gig = await Gig.findOne({ blockchainGigId: numericId });
      }
    }
    if (!gig) {
      return res.status(404).json({ success: false, message: "Gig not found" });
    }

    if (gig.employer !== employer.toLowerCase()) {
      return res.status(403).json({ success: false, message: "Only the employer can edit this gig" });
    }

    if (gig.status === "COMPLETED" || gig.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Cannot edit a completed or cancelled gig" });
    }

    if (title !== undefined) gig.title = title;
    if (description !== undefined) gig.description = description;
    if (paymentAmount !== undefined) gig.paymentAmount = paymentAmount.toString();
    if (requiredBadge !== undefined) gig.requiredBadge = requiredBadge;
    if (deadline !== undefined) gig.deadline = deadline;
    if (imageUrl !== undefined) gig.imageUrl = imageUrl;

    await gig.save();

    return res.json({ success: true, gig });
  } catch (error) {
    console.error("Error updating gig:", error);
    res.status(500).json({ success: false, message: "Error updating gig", error: error.message });
  }
});

/**
 * Feature a gig (requires x402 payment of $0.50 USDC for 24h)
 * POST /api/gigs/:gigId/feature
 */
router.post("/:gigId/feature", async (req, res) => {
  try {
    const { paymentTxHash } = req.body;
    const gig = await Gig.findById(req.params.gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      });
    }

    // Check if user qualifies for free featuring
    const isFree = await checkFreeAccessEligibility(gig.employer);

    if (!isFree && !paymentTxHash) {
      // Need payment
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "This action requires a payment of 0.50 USDC for 24h visibility",
        payment: {
          amount: "0.50",
          currency: "USDC",
          description: `Feature Gig: ${gig.title}`,
          type: "featured_gig",
          gigId: req.params.gigId,
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

    // Update gig with feature
    const featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + 1); // 24h from now

    gig.featured = true;
    gig.featuredUntil = featuredUntil;
    await gig.save();

    // Log payment if not free
    if (!isFree && paymentTxHash) {
      try {
        await logPayment({
          type: "featured_gig",
          amount: 0.5,
          description: `Feature Gig: ${gig.title}`,
          gigId: req.params.gigId,
          userId: gig.employer,
          txHash: paymentTxHash,
        });
      } catch (logError) {
        console.error("Error logging payment:", logError);
      }
    }

    res.json({
      success: true,
      message: isFree ? "Gig featured (free - subscription/NFT benefit)" : "Gig featured successfully",
      gig: gig,
      featuredUntil: featuredUntil,
    });
  } catch (error) {
    console.error("Error featuring gig:", error);
    res.status(500).json({
      success: false,
      message: "Error featuring gig",
      error: error.message,
    });
  }
});

/**
 * Mark gig as urgent (requires x402 payment of $1.00 USDC)
 * POST /api/gigs/:gigId/urgent
 */
router.post("/:gigId/urgent", async (req, res) => {
  try {
    const { paymentTxHash } = req.body;
    const gig = await Gig.findById(req.params.gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      });
    }

    // Check if user qualifies for free urgent marking
    const isFree = await checkFreeAccessEligibility(gig.employer);

    if (!isFree && !paymentTxHash) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "This action requires a payment of 1.00 USDC to mark gig as urgent",
        payment: {
          amount: "1.00",
          currency: "USDC",
          description: `Mark as Urgent: ${gig.title}`,
          type: "urgent_gig",
          gigId: req.params.gigId,
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

    gig.urgent = true;
    await gig.save();

    if (!isFree && paymentTxHash) {
      try {
        await logPayment({
          type: "urgent_gig",
          amount: 1.0,
          description: `Mark as Urgent: ${gig.title}`,
          gigId: req.params.gigId,
          userId: gig.employer,
          txHash: paymentTxHash,
        });
      } catch (logError) {
        console.error("Error logging payment:", logError);
      }
    }

    res.json({
      success: true,
      message: isFree ? "Gig marked as urgent (free - subscription/NFT benefit)" : "Gig marked as urgent",
      gig: gig,
    });
  } catch (error) {
    console.error("Error marking gig as urgent:", error);
    res.status(500).json({
      success: false,
      message: "Error marking gig as urgent",
      error: error.message,
    });
  }
});

/**
 * Apply to gig (requires x402 payment of $0.02 USDC, free for subscribers/NFT holders)
 * POST /api/gigs/:gigId/apply
 */
router.post("/:gigId/apply", async (req, res) => {
  try {
    const { workerId, coverLetter, estimatedTime, paymentTxHash } = req.body;

    if (!workerId || !/^0x[a-fA-F0-9]{40}$/.test(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker address",
      });
    }

    const gig = await Gig.findById(req.params.gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      });
    }

    // Check if worker already applied
    const alreadyApplied = gig.applications.some(
      (app) => app.workerId.toLowerCase() === workerId.toLowerCase()
    );

    if (alreadyApplied) {
      return res.status(400).json({
        success: false,
        message: "You have already applied to this gig",
      });
    }

    // Check if application is free for this user
    const isFree = await checkFreeAccessEligibility(workerId);

    if (!isFree && !paymentTxHash) {
      return res.status(402).json({
        success: false,
        code: "PAYMENT_REQUIRED",
        message: "This action requires a payment of 0.02 USDC",
        payment: {
          amount: "0.02",
          currency: "USDC",
          description: `Apply to Gig: ${gig.title}`,
          type: "application_fee",
          gigId: req.params.gigId,
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

    // Add application
    gig.applications.push({
      workerId: workerId.toLowerCase(),
      coverLetter: coverLetter || "",
      estimatedTime: estimatedTime || 0,
      appliedAt: new Date(),
    });

    await gig.save();

    if (!isFree && paymentTxHash) {
      try {
        await logPayment({
          type: "application_fee",
          amount: 0.02,
          description: `Apply to Gig: ${gig.title}`,
          gigId: req.params.gigId,
          userId: workerId,
          txHash: paymentTxHash,
        });
      } catch (logError) {
        console.error("Error logging payment:", logError);
      }
    }

    res.json({
      success: true,
      message: isFree ? "Applied successfully (free - subscription/NFT benefit)" : "Applied successfully",
      application: {
        workerId: workerId,
        appliedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error applying to gig:", error);
    res.status(500).json({
      success: false,
      message: "Error applying to gig",
      error: error.message,
    });
  }
});

/**
 * Assign worker to gig
 * POST /api/gigs/:gigId/assign
 */
router.post("/:gigId/assign", async (req, res) => {
  try {
    const { workerId } = req.body;

    if (!workerId || !/^0x[a-fA-F0-9]{40}$/.test(workerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid worker address",
      });
    }

    const gig = await Gig.findById(req.params.gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      });
    }

    // Check if worker applied
    const application = gig.applications.find(
      (app) => app.workerId.toLowerCase() === workerId.toLowerCase()
    );

    if (!application) {
      return res.status(400).json({
        success: false,
        message: "Worker has not applied to this gig",
      });
    }

    gig.worker = workerId.toLowerCase();
    gig.status = "ASSIGNED";
    await gig.save();

    // Try to assign worker on blockchain if gigId exists
    let blockchainResult = null;
    if (gig.blockchainGigId) {
      try {
        blockchainResult = await assignWorkerOnChain(gig.blockchainGigId, workerId.toLowerCase());
      } catch (blockchainError) {
        console.warn("⚠️  Blockchain assignment failed:", blockchainError.message);
      }
    }

    res.json({
      success: true,
      message: "Worker assigned successfully",
      gig: gig,
      blockchain: blockchainResult,
    });
  } catch (error) {
    console.error("Error assigning worker:", error);
    res.status(500).json({
      success: false,
      message: "Error assigning worker",
      error: error.message,
    });
  }
});

/**
 * Update gig status
 * PATCH /api/gigs/:gigId/status
 */
router.patch("/:gigId/status", async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ["OPEN", "ASSIGNED", "SUBMITTED", "COMPLETED", "CANCELLED"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const gig = await Gig.findById(req.params.gigId);

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found",
      });
    }

    gig.status = status;
    if (status === "COMPLETED") {
      gig.completedAt = new Date();
    }

    await gig.save();

    // Try to update blockchain status if gigId exists
    let blockchainResult = null;
    if (gig.blockchainGigId) {
      try {
        switch (status) {
          case "SUBMITTED":
            blockchainResult = await submitWorkOnChain(gig.blockchainGigId);
            break;
          case "COMPLETED":
            blockchainResult = await approveAndPayOnChain(gig.blockchainGigId);
            break;
          case "CANCELLED":
            blockchainResult = await cancelGigOnChain(gig.blockchainGigId);
            break;
        }
      } catch (blockchainError) {
        console.warn("⚠️  Blockchain status update failed:", blockchainError.message);
      }
    }

    res.json({
      success: true,
      message: "Gig status updated",
      gig: gig,
      blockchain: blockchainResult,
    });
  } catch (error) {
    console.error("Error updating gig status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating gig status",
      error: error.message,
    });
  }
});

module.exports = router;
