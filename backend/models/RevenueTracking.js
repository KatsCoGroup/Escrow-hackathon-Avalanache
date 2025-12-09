const mongoose = require("mongoose");

const revenueTrackingSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "featured_gig",
      "urgent_gig",
      "application_fee",
      "badge_verification",
      "advanced_search",
      "analytics",
      "ai_match",
      "subscription",
      "community_nft",
    ],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: "USDC",
  },
  description: String,
  gigId: String,
  userId: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  txHash: String,
  status: {
    type: String,
    enum: ["confirmed", "pending"],
    default: "pending",
  },
});

module.exports = mongoose.model("RevenueTracking", revenueTrackingSchema);
