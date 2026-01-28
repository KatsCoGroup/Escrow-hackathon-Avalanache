const mongoose = require("mongoose");

const gigSchema = new mongoose.Schema({
  blockchainGigId: {
    type: Number,
    unique: true,
    sparse: true,
  },
  employer: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  worker: {
    type: String,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
    sparse: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  paymentAmount: {
    type: String,
    required: true,
  },
  requiredBadge: {
    type: String,
    default: "",
  },
  deadline: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["OPEN", "ASSIGNED", "SUBMITTED", "COMPLETED", "CANCELLED"],
    default: "OPEN",
  },
  featured: {
    type: Boolean,
    default: false,
  },
  featuredUntil: Date,
  urgent: {
    type: Boolean,
    default: false,
  },
  txHash: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  applications: [
    {
      workerId: String,
      coverLetter: String,
      estimatedTime: Number,
      appliedAt: Date,
    },
  ],
});

module.exports = mongoose.model("Gig", gigSchema);
