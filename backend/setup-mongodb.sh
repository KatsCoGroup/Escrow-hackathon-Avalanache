#!/bin/bash

# ProjectX MongoDB Atlas Quick Setup

echo "=========================================="
echo "MongoDB Atlas Quick Setup"
echo "=========================================="
echo ""
echo "This script will help you configure MongoDB Atlas connection."
echo ""
echo "Prerequisites:"
echo "1. Go to https://www.mongodb.com/cloud/atlas"
echo "2. Create a free account"
echo "3. Create a cluster (M0 is free)"
echo "4. Create a database user"
echo "5. Add your IP to Network Access (0.0.0.0/0 for development)"
echo ""

read -p "Enter your MongoDB Atlas connection string: " MONGODB_URI

if [[ ! "$MONGODB_URI" =~ "mongodb+srv://" ]]; then
  echo "❌ Error: Invalid connection string (should start with mongodb+srv://)"
  exit 1
fi

# Read current .env file or create new one
if [ -f ".env" ]; then
  # Backup existing .env
  cp .env .env.backup
  echo "📦 Backed up existing .env to .env.backup"
  
  # Replace MONGODB_URI in existing .env
  sed -i "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|" .env
else
  # Create new .env
  cat > .env << EOF
# MongoDB Configuration
MONGODB_URI=$MONGODB_URI

# Server Configuration
PORT=3000
NODE_ENV=development

# Admin Authentication
ADMIN_SECRET_KEY=your-secret-admin-key-change-this

# Blockchain Configuration
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
ESCROW_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
BADGE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
COMMUNITY_NFT_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# x402 Payment Configuration
X402_FACILITATOR_ENDPOINT=https://x402.ultravioleta.io
X402_FACILITATOR_NAME=Ultravioleta
USDC_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000

# API Keys (if using external services)
BLOCKCHAIN_API_KEY=your-api-key-here

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
EOF
fi

echo "✅ MongoDB URI configured in .env"
echo ""
echo "Starting server..."
echo ""

npm start
