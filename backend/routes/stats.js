const express = require("express");
const router = express.Router();
const Gig = require("../models/Gig");
const User = require("../models/User");
const RevenueTracking = require("../models/RevenueTracking");
const CommunityNFT = require("../models/CommunityNFT");

/**
 * Get platform statistics
 * GET /api/stats
 */
router.get("/", async (req, res) => {
  try {
    const stats = {
      gigs: {
        total: await Gig.countDocuments(),
        open: await Gig.countDocuments({ status: "OPEN" }),
        assigned: await Gig.countDocuments({ status: "ASSIGNED" }),
        submitted: await Gig.countDocuments({ status: "SUBMITTED" }),
        completed: await Gig.countDocuments({ status: "COMPLETED" }),
        cancelled: await Gig.countDocuments({ status: "CANCELLED" }),
      },
      users: {
        total: await User.countDocuments(),
      },
      badges: {
        total: await User.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: { $size: "$badges" } },
            },
          },
        ]).then((r) => (r[0] ? r[0].total : 0)),
      },
      nfts: {
        communityNFTsSold: await CommunityNFT.countDocuments({ status: "active" }),
      },
      revenue: {
        total: await RevenueTracking.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]).then((r) => (r[0] ? r[0].total : 0)),
        byType: await RevenueTracking.aggregate([
          {
            $group: {
              _id: "$type",
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ]),
      },
    };

    res.json({
      success: true,
      stats: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
});

/**
 * Get gig statistics
 * GET /api/stats/gigs
 */
router.get("/gigs", async (req, res) => {
  try {
    const gigStats = {
      totalCreated: await Gig.countDocuments(),
      byStatus: {
        open: await Gig.countDocuments({ status: "OPEN" }),
        assigned: await Gig.countDocuments({ status: "ASSIGNED" }),
        submitted: await Gig.countDocuments({ status: "SUBMITTED" }),
        completed: await Gig.countDocuments({ status: "COMPLETED" }),
        cancelled: await Gig.countDocuments({ status: "CANCELLED" }),
      },
      featured: {
        total: await Gig.countDocuments({ featured: true }),
        active: await Gig.countDocuments({
          featured: true,
          featuredUntil: { $gt: new Date() },
        }),
      },
      avgPayment: await Gig.aggregate([
        {
          $group: {
            _id: null,
            avgAmount: {
              $avg: { $toDouble: "$paymentAmount" },
            },
          },
        },
      ]).then((r) => (r[0] ? r[0].avgAmount : 0)),
    };

    res.json({
      success: true,
      gigStats: gigStats,
    });
  } catch (error) {
    console.error("Error fetching gig stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching gig statistics",
      error: error.message,
    });
  }
});

/**
 * Get revenue statistics
 * GET /api/stats/revenue
 */
router.get("/revenue", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const revenue = await RevenueTracking.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$type",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      success: true,
      period: `Last ${days} days`,
      totalRevenue: totalRevenue,
      byType: revenue,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error fetching revenue stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching revenue statistics",
      error: error.message,
    });
  }
});

/**
 * Get user statistics
 * GET /api/stats/users
 */
router.get("/users", async (req, res) => {
  try {
    const userStats = {
      total: await User.countDocuments(),
      withBadges: await User.countDocuments({ "badges.0": { $exists: true } }),
      withSubscriptions: await User.countDocuments({
        "subscription.type": { $ne: "none" },
      }),
      withNFT: await User.countDocuments({ "communityNFT.owns": true }),
    };

    res.json({
      success: true,
      userStats: userStats,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
      error: error.message,
    });
  }
});

module.exports = router;
