const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    gigId: {
      type: Number, // Reference to the gigId from the Gig model
      required: true,
    },
    worker: {
      type: String, // Blockchain address of the worker
      required: true,
    },
    coverLetter: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  },
);

const Application = mongoose.model("Application", applicationSchema);
module.exports = Application;
