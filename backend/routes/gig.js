const express = require("express");
const router = express.Router();
const { supabase } = require("../config/db");

async function getNextGigId() {
  const { data, error } = await supabase
    .from("gigs")
    .select("gig_id")
    .order("gig_id", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching next gig ID:", error);
    throw new Error("Failed to retrieve next gig ID.");
  }

  return data && data.length > 0 ? parseInt(data[0].gig_id) + 1 : 1;
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

  try {
    const nextGigId = await getNextGigId();
    const { data, error } = await supabase.from("gigs").insert([
      {
        gig_id: nextGigId,
        title,
        description,
        payment_amount: paymentAmount,
        required_badge: requiredBadge,
        employer,
        status: "PENDING_BLOCKCHAIN",
      },
    ]);

    if (error) {
      console.error("Error creating gig:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create gig.",
      });
    }

    res.status(201).json({
      success: true,
      gigId: nextGigId,
      message: "Gig created. Now lock payment on blockchain.",
    });
  } catch (error) {
    console.error("Error creating gig:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create gig.",
    });
  }
});

// GET /api/gigs
router.get("/", async (req, res) => {
  try {
    const { data: gigs, error } = await supabase
      .from("gigs")
      .select(
        "gig_id, title, payment_amount, required_badge, employer, status, created_at",
      );

    if (error) {
      console.error("Error fetching gigs:", error);
      return res.status(500).json({
        success: false,
        gigs: [],
        total: 0,
        message: "Failed to retrieve gigs.",
      });
    }

    res.json({
      success: true,
      gigs: gigs.map((gig) => ({
        gigId: gig.gig_id,
        title: gig.title,
        paymentAmount: gig.payment_amount,
        requiredBadge: gig.required_badge,
        employer: gig.employer,
        status: gig.status,
        createdAt: gig.created_at,
      })),
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
    const { data: gig, error } = await supabase
      .from("gigs")
      .select(
        "gig_id, title, description, payment_amount, required_badge, employer, worker, status, blockchain_gig_id, created_at",
      )
      .eq("gig_id", parseInt(gigId))
      .single();

    if (error && error.code !== "PGRST116") {
      console.error(`Error fetching gig ${gigId}:`, error);
      return res.status(500).json({
        success: false,
        gig: null,
        message: "Failed to retrieve gig.",
      });
    }

    if (!gig) {
      return res.status(404).json({
        success: false,
        gig: null,
        message: "Gig not found.",
      });
    }

    res.json({
      success: true,
      gig: {
        gigId: gig.gig_id,
        title: gig.title,
        description: gig.description,
        paymentAmount: gig.payment_amount,
        requiredBadge: gig.required_badge,
        employer: gig.employer,
        worker: gig.worker,
        status: gig.status,
        blockchainGigId: gig.blockchain_gig_id,
        createdAt: gig.created_at,
      },
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
  const { status, worker, blockchainGigId } = req.body;

  try {
    const updateData = {};
    if (status) updateData.status = status;
    if (worker) updateData.worker = worker;
    if (blockchainGigId) updateData.blockchain_gig_id = blockchainGigId;

    const { data, error } = await supabase
      .from("gigs")
      .update(updateData)
      .eq("gig_id", parseInt(gigId))
      .select(); 

    if (error) {
      console.error(`Error updating gig ${gigId}:`, error);
      return res.status(500).json({
        success: false,
        message: "Failed to update gig.",
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Gig not found.",
      });
    }

    res.json({
      success: true,
      message: `Gig updated to ${data[0].status}`,
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
    // Check if gig exists
    const { data: gig, error: gigError } = await supabase
      .from("gigs")
      .select("gig_id")
      .eq("gig_id", parseInt(gigId))
      .single();

    if (gigError && gigError.code !== "PGRST116") {
      console.error(`Error checking gig existence for ${gigId}:`, gigError);
      return res.status(500).json({
        success: false,
        message: "Failed to check gig existence.",
      });
    }

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

    const { data, error } = await supabase.from("applications").insert([
      {
        gig_id: parseInt(gigId),
        worker,
        cover_letter: coverLetter,
        status: "PENDING",
      },
    ]);

    if (error) {
      console.error(`Error submitting application for gig ${gigId}:`, error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit application.",
      });
    }

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
