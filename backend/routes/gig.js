const express = require("express");
const router = express.Router();
const Gig = require("../models/Gig");
const Application = require("../models/Application");

async function getNextGigId() {
  const last = await Gig.findOne().sort({ gigId: -1 }).select("gigId").lean();
  return last ? parseInt(last.gigId) + 1 : 1;
}

// POST /api/gigs
router.post("/", async (req, res) => {
  const { title, description, paymentAmount, requiredBadge, employer } =
    req.body;

  // Validation
  if (!title || title.trim() === "") {
    return res.status(400).json({
      success: false,
      gigId: "",
      message: "Title cannot be empty.",
    });
  }

  const parsedPaymentAmount = parseFloat(paymentAmount);
  if (isNaN(parsedPaymentAmount) || parsedPaymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      gigId: "",
      message: "Payment amount must be a positive number.",
    });
  }

  // Store in database
  const nextGigId = await getNextGigId();
  const newGig = new Gig({
    gigId: nextGigId,
    title,
    description,
    paymentAmount,
    requiredBadge,
    employer,
    status: "PENDING_BLOCKCHAIN",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await newGig.save();

  res.json({
    success: true,
    gigId: nextGigId,
    message: "Gig created. Now lock payment on blockchain.",
  });
});

// GET /api/gigs
router.get("/", async (req, res) => {
  try {
    const gigs = await Gig.find().select(
      "gigId title paymentAmount requiredBadge employer status createdAt",
    );
    res.json({
      success: true,
      gigs: gigs,
      total: gigs.length,
    });
  } catch (error) {
    console.error("Error fetching gigs:", error);
    res.status(500).json({
      success: false,
      gigs: [],
      total: 0,
      message: "Failed to retrieve gigs.",
    });
  }
});

// GET /api/gigs/:gigId
router.get("/:gigId", async (req, res) => {
  const { gigId } = req.params;
  try {
    const gig = await Gig.findOne({ gigId: parseInt(gigId) }).select(
      "gigId title description paymentAmount requiredBadge employer worker status blockchainGigId createdAt",
    );

    if (!gig) {
      return res.status(404).json({
        success: false,
        gig: null,
        message: "Gig not found.",
      });
    }

    res.json({
      success: true,
      gig: gig,
    });
  } catch (error) {
    console.error(`Error fetching gig ${gigId}:`, error);
    res.status(500).json({
      success: false,
      gig: null,
      message: "Failed to retrieve gig.",
    });
  }
});

// PUT /api/gigs/:gigId
router.put("/:gigId", async (req, res) => {
  const { gigId } = req.params;
  const { status, worker, blockchainGigId, txHash } = req.body;

  try {
    const gig = await Gig.findOne({ gigId: parseInt(gigId) });

    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found.",
      });
    }

    if (status) gig.status = status;
    if (worker) gig.worker = worker;
    if (blockchainGigId) gig.blockchainGigId = blockchainGigId;

    await gig.save();

    res.json({
      success: true,
      message: `Gig updated to ${gig.status}`,
    });
  } catch (error) {
    console.error(`Error updating gig ${gigId}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to update gig.",
    });
  }
});

// POST /api/gigs/:gigId/apply
router.post("/:gigId/apply", async (req, res) => {
  const { gigId } = req.params;
  const { worker, coverLetter } = req.body;

  try {
    // Exists
    const gig = await Gig.findOne({ gigId: parseInt(gigId) });
    if (!gig) {
      return res.status(404).json({
        success: false,
        message: "Gig not found.",
      });
    }

    if (!worker || worker.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Worker address cannot be empty.",
      });
    }

    const newApplication = new Application({
      gigId: parseInt(gigId),
      worker,
      coverLetter,
      status: "PENDING",
    });

    await newApplication.save();

    res.status(201).json({
      success: true,
      message: "Application submitted",
    });
  } catch (error) {
    console.error(`Error submitting application for gig ${gigId}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to submit application.",
    });
  }
});

module.exports = router;
