const mongoose = require("mongoose");

const badgeVerificationSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  skillName: {
    type: String,
    required: true,
  },
  portfolioUrl: String,
  githubUrl: String,
  linkedinUrl: String,
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: Date,
  adminNotes: String,
  amount: {
    type: Number,
    default: 5.0,
  },
  txHash: String,
  badgeTokenId: Number,
});

module.exports = mongoose.model("BadgeVerification", badgeVerificationSchema);
