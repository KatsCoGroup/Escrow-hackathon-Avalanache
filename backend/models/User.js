const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  address: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/,
  },
  displayName: {
    type: String,
    default: "",
  },
  bio: {
    type: String,
    default: "",
  },
  profileImage: {
    type: String,
    default: "",
  },
  badges: [
    {
      tokenId: Number,
      skillName: String,
      iconURI: String,
      level: {
        type: String,
        enum: ["BEGINNER", "INTERMEDIATE", "EXPERT"],
      },
      issuedAt: Date,
    },
  ],
  completedGigs: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  subscription: {
    type: {
      type: String,
      enum: ["none", "monthly", "community_nft"],
      default: "none",
    },
    expiresAt: Date,
    autoRenew: Boolean,
  },
  communityNFT: {
    owns: {
      type: Boolean,
      default: false,
    },
    tokenId: Number,
    mintedAt: Date,
  },
});

module.exports = mongoose.model("User", userSchema);
