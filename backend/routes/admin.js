const express = require("express");
const router = express.Router();
const BadgeVerification = require("../models/BadgeVerification");
const User = require("../models/User");
const Gig = require("../models/Gig");

// In production, add proper authentication middleware
// For now, we use a simple API key check
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "admin-secret";
const ADMIN_WALLET_WHITELIST = (process.env.ADMIN_WALLET_WHITELIST || "0x5af67b388c8df3b7204a013b9e02659f81daf34e")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

/**
 * Middleware to verify admin access
 */
const verifyAdmin = (req, res, next) => {
  const apiKey = req.headers["x-admin-key"] || req.query.adminKey;
  const adminWallet = (req.headers["x-admin-wallet"] || req.query.adminWallet || "").toLowerCase();
  const walletAllowed = adminWallet && ADMIN_WALLET_WHITELIST.includes(adminWallet);

  if (apiKey !== ADMIN_API_KEY && !walletAllowed) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  req.adminWallet = walletAllowed ? adminWallet : null;
  next();
};

// Apply admin verification to all routes
router.use(verifyAdmin);

/**
 * Get all pending badge verifications
 * GET /api/admin/verifications/pending
 */
router.get("/verifications/pending", async (req, res) => {
  try {
    const pending = await BadgeVerification.find({
      status: "pending",
    }).sort({ submittedAt: -1 });

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

/**
 * Get verification by ID
 * GET /api/admin/verifications/:verificationId
 */
router.get("/verifications/:verificationId", async (req, res) => {
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
 * Approve badge verification and mint NFT badge
 * POST /api/admin/verifications/:verificationId/approve
 */
router.post("/verifications/:verificationId/approve", async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { adminNotes } = req.body;

    const verification = await BadgeVerification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    if (verification.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending verifications can be approved",
      });
    }

    // Update verification
    verification.status = "approved";
    verification.reviewedAt = new Date();
    verification.adminNotes = adminNotes || "";

    // In production, mint NFT badge on blockchain
    // For now, generate a mock token ID
    verification.badgeTokenId = Math.floor(Math.random() * 1000000);

    await verification.save();

    // Add badge to user's profile
    let user = await User.findOne({
      address: verification.userAddress,
    });

    if (!user) {
      user = new User({
        address: verification.userAddress,
      });
    }

    user.badges = user.badges || [];
    user.badges.push({
      tokenId: verification.badgeTokenId,
      skillName: verification.skillName,
      iconURI: `https://api.projectx.io/badges/${verification.skillName.toLowerCase().replace(/ /g, "-")}.svg`,
      level: "INTERMEDIATE",
      issuedAt: new Date(),
    });

    await user.save();

    res.json({
      success: true,
      message: "Badge verification approved",
      verification: verification,
      note: "Badge NFT will be minted on-chain",
    });
  } catch (error) {
    console.error("Error approving verification:", error);
    res.status(500).json({
      success: false,
      message: "Error approving verification",
      error: error.message,
    });
  }
});

/**
 * Reject badge verification
 * POST /api/admin/verifications/:verificationId/reject
 */
router.post("/verifications/:verificationId/reject", async (req, res) => {
  try {
    const { verificationId } = req.params;
    const { adminNotes, refundReason } = req.body;

    const verification = await BadgeVerification.findById(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification not found",
      });
    }

    if (verification.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending verifications can be rejected",
      });
    }

    // Update verification
    verification.status = "rejected";
    verification.reviewedAt = new Date();
    verification.adminNotes = adminNotes || refundReason || "";

    await verification.save();

    res.json({
      success: true,
      message: "Badge verification rejected",
      verification: verification,
      note: `User should be refunded ${verification.amount} USDC. Reason: ${refundReason || "Verification not approved"}`,
    });
  } catch (error) {
    console.error("Error rejecting verification:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting verification",
      error: error.message,
    });
  }
});

/**
 * Get all verifications with filters
 * GET /api/admin/verifications
 */
router.get("/verifications", async (req, res) => {
  try {
    const { status, skillName, limit = 50, skip = 0 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (skillName) filter.skillName = skillName;

    const verifications = await BadgeVerification.find(filter)
      .sort({ submittedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await BadgeVerification.countDocuments(filter);

    res.json({
      success: true,
      verifications: verifications,
      total: total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    console.error("Error fetching verifications:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching verifications",
      error: error.message,
    });
  }
});

/**
 * Get admin dashboard stats
 * GET /api/admin/dashboard
 */
router.get("/dashboard", async (req, res) => {
  try {
    const [pendingCount, approvedCount, rejectedCount, userCount, projectOwners, skillOwners, gigCounts, skillStatusCounts, projectStatusCounts] = await Promise.all([
      BadgeVerification.countDocuments({ status: "pending" }),
      BadgeVerification.countDocuments({ status: "approved" }),
      BadgeVerification.countDocuments({ status: "rejected" }),
      User.countDocuments({}),
      User.countDocuments({ "projects.0": { $exists: true } }),
      User.countDocuments({ "skills.0": { $exists: true } }),
      Gig.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $unwind: { path: "$skillRequests", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$skillRequests.status", count: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $unwind: { path: "$projects", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$projects.status", count: { $sum: 1 } } },
      ]),
    ]);

    const normalizeCounts = (arr, keys) => {
      const map = Object.fromEntries(keys.map((k) => [k, 0]));
      arr.forEach((entry) => {
        if (entry?._id && map.hasOwnProperty(entry._id)) {
          map[entry._id] = entry.count;
        }
      });
      map.total = keys.reduce((sum, k) => sum + map[k], 0);
      return map;
    };

    const skillCounts = normalizeCounts(skillStatusCounts, ["pending", "approved", "rejected"]);
    const projectCounts = normalizeCounts(projectStatusCounts, ["pending", "approved", "rejected"]);
    const gigCountsMap = normalizeCounts(gigCounts, ["OPEN", "ASSIGNED", "SUBMITTED", "COMPLETED", "CANCELLED"]);

    res.json({
      success: true,
      dashboard: {
        verifications: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          total: pendingCount + approvedCount + rejectedCount,
        },
        skills: skillCounts,
        projects: projectCounts,
        users: {
          total: userCount,
          withProjects: projectOwners,
          withSkills: skillOwners,
        },
        gigs: gigCountsMap,
        access: {
          viaWallet: Boolean(req.adminWallet),
          adminWallet: req.adminWallet,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
});

module.exports = router;
