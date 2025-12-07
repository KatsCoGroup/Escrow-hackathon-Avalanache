require("dotenv").config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Avalanche Fuji Testnet
const AVALANCHE_RPC_URL = process.env.AVALANCHE_RPC_URL;
const CHAIN_ID = process.env.CHAIN_ID;

// Smart Contracts (after deployment)
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;
const BADGE_CONTRACT_ADDRESS = process.env.BADGE_CONTRACT_ADDRESS;

// Admin Wallet (for minting badges)
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS;

// Database
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL; // Optional, for PostgreSQL
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// x402 (Optional - Post-MVP)
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL;
const X402_PAYMENT_ADDRESS = process.env.X402_PAYMENT_ADDRESS;
const X402_API_KEY = process.env.X402_API_KEY;
const USDC_TOKEN_ADDRESS = process.env.USDC_TOKEN_ADDRESS;

module.exports = {
  PORT,
  NODE_ENV,
  AVALANCHE_RPC_URL,
  CHAIN_ID,
  ESCROW_CONTRACT_ADDRESS,
  BADGE_CONTRACT_ADDRESS,
  ADMIN_PRIVATE_KEY,
  ADMIN_ADDRESS,
  MONGODB_URI,
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  X402_FACILITATOR_URL,
  X402_PAYMENT_ADDRESS,
  X402_API_KEY,
  USDC_TOKEN_ADDRESS,
};
