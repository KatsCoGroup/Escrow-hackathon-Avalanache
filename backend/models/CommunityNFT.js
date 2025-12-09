const mongoose = require("mongoose");

const communityNFTSchema = new mongoose.Schema({
  tokenId: {
    type: Number,
    unique: true,
    required: true,
  },
  owner: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  mintedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["active", "revoked"],
    default: "active",
  },
  purchasePrice: {
    type: Number,
    default: 49.0,
  },
  txHash: String,
  isPromo: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("CommunityNFT", communityNFTSchema);
