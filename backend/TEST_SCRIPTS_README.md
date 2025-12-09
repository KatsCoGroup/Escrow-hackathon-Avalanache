# API Test Scripts

This directory contains comprehensive test scripts for the backend API.

## Scripts

### 1. `test-api.sh`
Complete API test suite covering all endpoints:
- User profiles
- Gig lifecycle (create, apply, assign, complete)
- Badge verification system
- Subscriptions and NFT
- Admin functions
- Platform statistics

### 2. `test-existing-gig.sh`
Full blockchain gig lifecycle test with on-chain escrow:
- Uses existing gig with blockchain integration
- Tests worker assignment on-chain
- Tests work submission
- Tests payment release from escrow contract

## Setup

### Prerequisites
- Backend server running on `http://localhost:3000`
- MongoDB connected
- `jq` installed for JSON parsing: `sudo apt install jq`
- Funded wallet on Avalanche Fuji testnet (for blockchain tests)

### Configure Environment Variables

Before running the scripts, set your credentials:

```bash
# Set your admin API key (from backend/.env)
export ADMIN_KEY="your-admin-api-key-here"

# Set wallet address(es) for testing
export ADMIN_WALLET="0xYourWalletAddress"
export EMPLOYER="0xYourEmployerAddress"
export WORKER="0xYourWorkerAddress"
```

**Note:** You can use the same address for all three if testing with a single wallet.

## Running the Tests

### Test All APIs
```bash
chmod +x test-api.sh
./test-api.sh
```

### Test Blockchain Gig Lifecycle
```bash
chmod +x test-existing-gig.sh
./test-existing-gig.sh
```

## Security

⚠️ **NEVER commit actual credentials to git**
- Use environment variables for all sensitive data
- The scripts will fail with helpful messages if credentials are not set
- Example credentials in this README are placeholders only

## What Gets Tested

### Database Operations
- User CRUD
- Gig management
- Application tracking
- Badge verification workflow
- Revenue tracking
- Statistics aggregation

### Blockchain Operations (Fuji Testnet)
- Escrow contract interaction
- AVAX payment locking
- Worker assignment transactions
- Payment release from escrow
- On-chain event tracking

## Troubleshooting

### "insufficient funds" error
- Your wallet needs test AVAX from https://faucet.avax.network/
- Use smaller payment amounts (0.05-0.1 AVAX)

### RPC errors
- Ensure `AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc` in `.env`
- Check that `CHAIN_ID=43113` (Fuji testnet)

### Authentication errors
- Verify `ADMIN_API_KEY` matches between `.env` and your `$ADMIN_KEY`
- Check wallet address format (0x + 40 hex characters)
