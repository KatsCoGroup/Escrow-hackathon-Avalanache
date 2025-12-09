const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  type: {
    type: String,
    enum: ["monthly", "community_nft"],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled"],
    default: "active",
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  txHash: String,
  renewalDate: Date,
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
