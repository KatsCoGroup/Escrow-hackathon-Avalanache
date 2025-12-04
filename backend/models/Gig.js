const mongoose = require("mongoose");

const gigSchema = new mongoose.Schema(
  {
    gigId: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    paymentAmount: {
      type: String,
      required: true,
    },
    requiredBadge: {
      type: String,
      required: true,
    },
    employer: {
      type: String, // Store as string for blockchain address
      required: true,
    },
    worker: {
      type: String, // Store as string for blockchain address
      default: null,
    },
    status: {
      type: String,
      enum: [
        "PENDING_BLOCKCHAIN",
        "OPEN",
        "ASSIGNED",
        "SUBMITTED",
        "COMPLETED",
      ],
      default: "PENDING_BLOCKCHAIN",
    },
    blockchainGigId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Handles createdAt and updatedAt
  },
);

const Gig = mongoose.model("Gig", gigSchema);
module.exports = Gig;
