# 🚀 Escrow Contract Deployment & Testing Guide

## Overview
Complete step-by-step guide to deploy the Escrow smart contract to Avalanche Fuji testnet and test it end-to-end.

---

## 📋 Prerequisites

Before you start, ensure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should be v18+
   npm --version   # Should be v9+
   ```

2. **Contract dependencies installed**
   ```bash
   cd contracts
   npm install
   ```

3. **Hardhat configured** (already done)
   - ✅ `hardhat.config.js` configured for Fuji testnet
   - ✅ Network settings: Chain ID 43113, RPC: `https://api.avax-test.network/ext/bc/C/rpc`

---

## 🔐 STEP 1: Generate a Wallet

Generate a new wallet with a private key for testnet deployments:

```bash
cd contracts
npm run generate-wallet
```

**Output will show:**
```
🔐 Generating new Avalanche Fuji testnet wallet...

✅ WALLET GENERATED SUCCESSFULLY

═══════════════════════════════════════════════════════
📍 ADDRESS (PUBLIC):
   0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

🔑 PRIVATE KEY (KEEP SECRET!):
   0xabc123...def456

📝 MNEMONIC (BACKUP):
   word1 word2 word3 ... word12
═══════════════════════════════════════════════════════
```

**Actions:**
1. ✅ Copy the **PRIVATE KEY** (keep it secret!)
2. ✅ Copy the **ADDRESS** (public wallet)
3. ✅ Save the **MNEMONIC** safely (recovery backup)

---

## 💰 STEP 2: Fund Your Wallet with Test AVAX

Your wallet needs AVAX for gas fees on testnet.

### Option A: Avalanche Faucet (Recommended)
1. Go to: https://faucet.avax.network/
2. Select **Avalanche Fuji** network (top dropdown)
3. Paste your **ADDRESS** from Step 1
4. Click **REQUEST 10 AVAX**
5. Wait 1-2 minutes for confirmation

### Option B: Check Balance
Verify you received AVAX:
```bash
curl -X POST https://api.avax-test.network/ext/bc/C/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["0xYOUR_ADDRESS_HERE", "latest"],
    "id": 1
  }' | jq '.result'
```

Should return something like: `0x8ac7230489e80000` (10 AVAX in hex)

---

## 🔧 STEP 3: Set Environment Variable

Export your private key so Hardhat can use it:

```bash
# Linux/Mac
export DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Verify it's set
echo $DEPLOYER_PRIVATE_KEY  # Should show: 0xabc123...
```

For **Windows (PowerShell)**:
```powershell
$env:DEPLOYER_PRIVATE_KEY="0xYOUR_PRIVATE_KEY_HERE"
```

---

## ✅ STEP 4: Verify Contract Compiles

Compile the Solidity contract:

```bash
cd contracts
npm run compile
```

**Expected output:**
```
Compiled 1 Solidity file successfully (evm target: paris)
```

---

## 🚀 STEP 5: Deploy to Fuji Testnet

Deploy the contract:

```bash
npm run deploy:fuji
```

**Expected output:**
```
Deploying Escrow contract to Avalanche Fuji testnet...
✅ Escrow contract deployed to: 0x1234567890abcdef...

Update your backend/.env file:
ESCROW_CONTRACT_ADDRESS=0x1234567890abcdef...

Verify on SnowTrace:
https://testnet.snowtrace.io/address/0x1234567890abcdef...
```

**Actions:**
1. ✅ Copy the contract address (starts with `0x`)
2. ✅ Open SnowTrace link to verify deployment
3. ✅ **Save the address** - you'll need it next

---

## 📝 STEP 6: Configure Backend

Update your backend `.env` file with the deployed contract address:

```bash
cd ../backend

# Edit .env file
nano .env
# or use your editor
```

Add these lines (or update existing):
```env
ESCROW_CONTRACT_ADDRESS=0x1234567890abcdef...   # From deployment
ADMIN_PRIVATE_KEY=0xYOUR_PRIVATE_KEY            # Same wallet
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113
```

**Verify changes:**
```bash
cat .env | grep ESCROW
# Should show: ESCROW_CONTRACT_ADDRESS=0x...
```

---

## 🧪 STEP 7: Test the Contract Locally

Test contract functionality on local hardhat network:

```bash
cd ../contracts

# Run full test suite
npm test

# Or run with verbose logging
npm run test:verbose
```

**Expected output:**
```
Escrow Contract - Full Test Suite
  1️⃣  Contract Deployment
    ✅ should deploy successfully
    ✅ should start with empty gig list
  
  2️⃣  Create Gig (Lock AVAX in Escrow)
    ✅ should create gig and lock payment
    ✅ should emit GigCreated event
    ✅ should fail if no payment sent
    ✅ should accept initial worker assignment
  
  3️⃣  Assign Worker
    ✅ should assign worker to open gig
    ✅ should emit WorkerAssigned event
    ✅ should reject non-employer assignment
  
  ... (more tests)

8 passing (3s)
```

---

## 🔗 STEP 8: Wire Backend and Contract

Now the backend can interact with the deployed contract. Restart the backend:

```bash
cd ../backend
npm install  # If needed
npm start
```

**Expected startup logs:**
```
✅ Escrow contract initialized: 0x1234567890abcdef...
✅ Escrow event listener started: 0x1234567890abcdef...
Server is running on port 3000
```

✅ **If you see both ✅ messages, the contract is properly wired!**

---

## 🧪 STEP 9: Test End-to-End Flow

Test creating a gig on-chain with backend API:

### Create a Gig (locks AVAX in escrow)
```bash
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "title": "Build a React Component",
    "description": "Create a reusable button component",
    "paymentAmount": "0.05",
    "deadline": 7
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Gig created successfully on blockchain",
  "gig": {
    "_id": "65abc123def456...",
    "blockchainGigId": 1,
    "employer": "0x742d...",
    "title": "Build a React Component",
    "status": "OPEN",
    "paymentAmount": "0.05",
    ...
  },
  "blockchain": {
    "gigId": 1,
    "txHash": "0xabc123...",
    "blockNumber": 12345678
  }
}
```

**Actions:**
1. ✅ Save the `_id` (MongoDB ID) - you'll need this
2. ✅ Save the `txHash` - check on SnowTrace
3. ✅ Note the `gigId` (contract ID)

### Verify on SnowTrace
```bash
# Open this URL in browser (replace txHash)
https://testnet.snowtrace.io/tx/0xabc123...
```

You should see:
- ✅ `To: 0x1234... (Escrow Contract)`
- ✅ `Value: 0.05 AVAX`
- ✅ Method: `createGig(...)`

---

## 📊 STEP 10: Check MongoDB

Verify the gig was created in MongoDB with blockchain ID:

```bash
# If using MongoDB Atlas, check in dashboard:
# Database > Escrow > gigs collection
# Look for document with blockchainGigId: 1
```

You should see:
```json
{
  "_id": "65abc...",
  "blockchainGigId": 1,        // ✅ Linked to contract
  "employer": "0x742d...",
  "status": "OPEN",
  "paymentAmount": "0.05",
  "createdAt": "2025-12-08T..."
}
```

---

## 🎯 STEP 11: Full Workflow Test

Test the complete gig lifecycle:

```bash
# 1. Create gig (from Step 9 above)
GIG_ID="65abc123def456..."  # MongoDB ID from response

# 2. Assign worker
curl -X POST http://localhost:3000/api/gigs/$GIG_ID/assign \
  -H "Content-Type: application/json" \
  -d '{ "workerId": "0x8f56c254a7d74e5b0a4f3a2d1e6f7c8b9a0d1e2f" }'

# 3. Submit work (from worker's wallet)
curl -X PATCH http://localhost:3000/api/gigs/$GIG_ID/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "SUBMITTED" }'

# 4. Approve & release payment (from employer's wallet)
curl -X PATCH http://localhost:3000/api/gigs/$GIG_ID/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "COMPLETED" }'
```

Each step should return a transaction hash (`txHash`) you can verify on SnowTrace.

---

## ✅ Verification Checklist

After deployment:

- [ ] Wallet generated with private key
- [ ] Wallet has Fuji testnet AVAX (from faucet)
- [ ] Contract compiled successfully
- [ ] Contract deployed to Fuji testnet
- [ ] Contract address in `backend/.env`
- [ ] Backend starts with ✅ "Escrow contract initialized"
- [ ] Backend starts with ✅ "Escrow event listener started"
- [ ] API creates gig and locks AVAX
- [ ] Transaction visible on SnowTrace
- [ ] MongoDB has `blockchainGigId` field populated
- [ ] Event listener logs show "GigCreated event"

---

## 🐛 Troubleshooting

### "Contract not initialized" warning
**Problem**: Backend shows warning that contract isn't configured
**Solution**: 
1. Check `ESCROW_CONTRACT_ADDRESS` is set in `.env`
2. Restart backend: `npm start`
3. Verify address is correct (should start with `0x` and be 42 chars)

### "Insufficient funds for gas"
**Problem**: Deployment fails with gas error
**Solution**:
1. Request more test AVAX from faucet: https://faucet.avax.network/
2. Check balance: `eth_getBalance` (Step 2)
3. Wait 2-3 minutes for faucet to process

### "Network timeout" during deploy
**Problem**: Deployment hangs or times out
**Solution**:
1. Check internet connection
2. Try again (Fuji sometimes has high load)
3. Increase timeout: `hardhat run ... --timeout 60000`

### Events not syncing to MongoDB
**Problem**: Created gig but `blockchainGigId` not populated
**Solution**:
1. Check backend logs for "Escrow event listener started"
2. Wait 10-20 seconds for event to be mined
3. Verify MongoDB connection is active
4. Check browser console for any API errors

### Tests crash or bus error
**Problem**: `npm test` crashes
**Solution**:
1. This can happen on systems with low memory
2. Just run `npm run compile` to verify contract is valid
3. Test via API instead (Step 9)

---

## 📚 Useful Links

- **Avalanche Faucet**: https://faucet.avax.network/
- **SnowTrace (Fuji Explorer)**: https://testnet.snowtrace.io/
- **Hardhat Docs**: https://hardhat.org/docs
- **Solidity Docs**: https://docs.soliditylang.org/
- **Escrow Contract ABI**: Generated in `artifacts/contracts/Escrow.sol/Escrow.json`

---

## 🎓 What's Happening Under the Hood

1. **Hardhat Compilation**: Converts Solidity → EVM bytecode
2. **Wallet Generation**: Creates random secp256k1 keypair
3. **Deployment**: Sends CreateContract tx to Fuji RPC
4. **Mining**: Fuji validators confirm tx (~2-3 seconds)
5. **Event Listener**: Backend watches for contract events
6. **MongoDB Sync**: Updates happen when events are detected
7. **Frontend**: Can now call backend API to trigger on-chain actions

---

## 🚀 Next Steps

Once deployment is complete:

1. **Test more scenarios**: Cancel gig, multiple workers, etc.
2. **Monitor gas costs**: Each transaction costs AVAX
3. **Plan mainnet deployment**: Use same steps for Avalanche C-Chain
4. **Add frontend UI**: Wire dashboard to API
5. **Security audit**: Before mainnet, audit contract

---

**✅ You're ready to deploy!** Follow the steps above in order.
