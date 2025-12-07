const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Gig = require("../models/Gig");

/**
 * Get or create user profile
 * POST /api/users/profile
 */
router.post("/profile", async (req, res) => {
  try {
    const { address, displayName, bio, profileImage } = req.body;

    // Validate wallet address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    let user = await User.findOne({ address: address.toLowerCase() });

    if (!user) {
      user = new User({
        address: address.toLowerCase(),
        displayName: displayName || "",
        bio: bio || "",
        profileImage: profileImage || "",
      });
      await user.save();
    } else {
      // Update profile if provided
      if (displayName) user.displayName = displayName;
      if (bio) user.bio = bio;
      if (profileImage) user.profileImage = profileImage;
      await user.save();
    }

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error in /profile:", error);
    res.status(500).json({
      success: false,
      message: "Error managing profile",
      error: error.message,
    });
  }
});

/**
 * Get user by address
 * GET /api/users/:address
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
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Error in GET /:address:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
});

/**
 * Get user's applied gigs
 * GET /api/users/:address/applied
 */
router.get("/:address/applied", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const gigs = await Gig.find({
      "applications.workerId": address.toLowerCase(),
    });

    res.json({
      success: true,
      appliedGigs: gigs,
      count: gigs.length,
    });
  } catch (error) {
    console.error("Error in GET /:address/applied:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching applied gigs",
      error: error.message,
    });
  }
});

/**
 * Get user's posted gigs
 * GET /api/users/:address/gigs
 */
router.get("/:address/gigs", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const gigs = await Gig.find({
      employer: address.toLowerCase(),
    });

    res.json({
      success: true,
      postedGigs: gigs,
      count: gigs.length,
    });
  } catch (error) {
    console.error("Error in GET /:address/gigs:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posted gigs",
      error: error.message,
    });
  }
});

/**
 * Get user's completed work
 * GET /api/users/:address/completed
 */
router.get("/:address/completed", async (req, res) => {
  try {
    const { address } = req.params;

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet address",
      });
    }

    const completedGigs = await Gig.find({
      worker: address.toLowerCase(),
      status: "COMPLETED",
    });

    res.json({
      success: true,
      completedGigs: completedGigs,
      count: completedGigs.length,
    });
  } catch (error) {
    console.error("Error in GET /:address/completed:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching completed gigs",
      error: error.message,
    });
  }
});

module.exports = router;
