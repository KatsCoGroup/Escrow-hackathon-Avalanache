# Smart Contract Deployment & Testing Guide

## 📋 Prerequisites

### 1. System Requirements
- Node.js 18+ (check: `node --version`)
- npm 9+ (check: `npm --version`)
- Git

### 2. Install Dependencies

```bash
cd contracts
npm install
```

This installs:
- Hardhat (smart contract development)
- Hardhat Toolbox (includes ethers.js, chai for testing)
- dotenv (for environment variables)

---

## 🔐 STEP 1: Generate Wallet (Get Private Key)

The wallet generator creates a **new random wallet** with a private key for Fuji testnet.

### Run the Script

```bash
npm run generate-wallet
```

### Output Example

```
🔐 Generating new Avalanche Fuji testnet wallet...

✅ WALLET GENERATED SUCCESSFULLY

═══════════════════════════════════════════════════════
📍 ADDRESS (PUBLIC):
   0x......

🔑 PRIVATE KEY (KEEP SECRET!):
   0x...

📝 MNEMONIC (BACKUP):
   word1 word2 word3 ...
═══════════════════════════════════════════════════════

📋 NEXT STEPS:
   1. Copy the PRIVATE KEY above
   2. Export as environment variable...
```

⚠️ **IMPORTANT**: Save this private key somewhere safe (password manager). You'll need it for deployment.

---

## 💰 STEP 2: Get Test AVAX

The contract deployment requires gas fees paid in AVAX.

### Visit Faucet

1. Open: https://faucet.avax.network/
2. Select **Avalanche Fuji (C-Chain)**
3. Paste your **ADDRESS** from step 1
4. Request test AVAX (you get ~2 AVAX per request)

### Verify Balance

```bash
# Install curl if needed, then:
curl -X POST https://api.avax-test.network/ext/bc/C/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_getBalance",
    "params": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "latest"]
  }'
```

Response will show balance in wei. Divide by `10^18` to get AVAX amount.

---

## 🧪 STEP 3: Local Testing (No Funds Required)

Test the contract on your local machine with simulated accounts. **No gas or AVAX needed**.

### Run Full Test Suite

```bash
npm test
```

### Output Example

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
      ...
    7️⃣  Complete Workflow
      ✅ should handle complete gig lifecycle
        🔄 COMPLETE GIG LIFECYCLE:
           1. Employer creates gig with 0.1 AVAX payment...
              ✅ Gig created (status: OPEN)
           2. Employer assigns worker...
              ✅ Worker assigned (status: ASSIGNED)
           3. Worker submits completed work...
              ✅ Work submitted (status: SUBMITTED)
           4. Employer approves and releases payment...
              ✅ Payment released (status: COMPLETED)
              💰 Worker received: 0.1 AVAX

  48 passing (2.5s)
```

### Test with Verbose Output

```bash
npm run test:verbose
```

Shows detailed transaction logs and contract interactions.

---

## 🚀 STEP 4: Compile Contract

Compiles Solidity to bytecode and ABI.

```bash
npm run compile
```

Output:

```
Compiled 1 Solidity file successfully
```

Artifacts saved to `artifacts/` directory.

---

## 📝 STEP 5: Set Environment Variables

Create `.env` file in `contracts/` directory:

```bash
# Copy-paste your private key from Step 1
DEPLOYER_PRIVATE_KEY=0xabc123def456789...

# Optional - RPC is already in hardhat.config.js
# But can override here:
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

### Security Check

Verify `.env` is in `.gitignore` (already done):

```bash
cat .gitignore | grep ".env"
```

Should output:

```
.env
```

**Never commit `.env` to git!**

---

## 🌍 STEP 6: Deploy to Fuji Testnet

Now deploy the actual contract to Avalanche Fuji testnet.

### Run Deployment

```bash
npm run deploy:fuji
```

### Deployment Process

1. Connects to Fuji RPC using your private key
2. Compiles contract
3. Sends deployment transaction (costs ~0.01-0.05 AVAX in gas)
4. Waits for confirmation
5. Outputs contract address

### Example Output

```
Deploying Escrow contract to Avalanche Fuji testnet...
✅ Escrow contract deployed to: 0x1234567890123456789012345678901234567890

Update your backend/.env file:
ESCROW_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890

Verify on SnowTrace:
https://testnet.snowtrace.io/address/0x1234567890123456789012345678901234567890
```

### Verify Deployment

Open the SnowTrace URL (Avalanche block explorer) to see:
- Contract code
- Transactions
- Events

---

## 🔗 STEP 7: Connect Backend to Contract

Copy the deployed contract address and configure backend.

### 1. Update Backend `.env`

```bash
cd ../backend
```

Edit `.env`:

```
ESCROW_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
ADMIN_PRIVATE_KEY=0xabc123def456789...
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113
```

### 2. Restart Backend

```bash
npm install
npm start
```

Expected output:

```
✅ Escrow contract initialized: 0x123...
✅ Escrow event listener started: 0x123...
Server is running on port 3000
```

---

## ✅ STEP 8: Test End-to-End (API → Blockchain)

Now test that your backend creates gigs on the blockchain.

### 1. Create a Gig (Locks AVAX)

```bash
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "title": "Build landing page",
    "description": "React + Tailwind",
    "paymentAmount": "0.05",
    "deadline": 7
  }'
```

Response:

```json
{
  "success": true,
  "message": "Gig created successfully on blockchain",
  "gig": {
    "_id": "65abc...",
    "blockchainGigId": 1,
    "employer": "0x742d35...",
    "status": "OPEN",
    "paymentAmount": "0.05"
  },
  "blockchain": {
    "gigId": 1,
    "txHash": "0xdef456...",
    "blockNumber": 12345678
  }
}
```

### 2. Check Event Listener Logs

Backend should log:

```
📢 GigCreated event: gigId=1, employer=0x742d35...
✅ Updated gig 65abc... with blockchainGigId 1
```

This confirms:
- ✅ Transaction confirmed on Avalanche
- ✅ Event fired
- ✅ MongoDB updated with blockchainGigId

### 3. Verify on SnowTrace

Open: https://testnet.snowtrace.io/

Search for your contract address or transaction hash to see the gig on the blockchain.

---

## 🔧 Troubleshooting

### Issue: "Error: Invalid private key"
**Solution**: Ensure `DEPLOYER_PRIVATE_KEY` starts with `0x` and is 66 characters total.

### Issue: "Insufficient funds for gas"
**Solution**: Your wallet doesn't have enough AVAX. Request more from faucet.

### Issue: "Contract not configured" after backend restart
**Solution**: Check `.env` has:
- `ESCROW_CONTRACT_ADDRESS` (non-empty)
- `ADMIN_PRIVATE_KEY` (non-empty)
- Both on Fuji network (chainId 43113)

### Issue: "Event listener not started"
**Solution**: Ensure RPC is accessible:
```bash
curl https://api.avax-test.network/ext/bc/C/rpc
```

### Issue: "Cannot find module 'dotenv'"
**Solution**: npm didn't install devDependencies:
```bash
npm install --save-dev dotenv
```

---

## 📊 Monitoring & Debugging

### View Transaction Details

```bash
# Get latest gig transactions
curl http://localhost:3000/api/gigs

# Get specific gig with blockchain data
curl http://localhost:3000/api/gigs/<mongoId>
```

### Monitor Event Listener

Backend console should show:
- `📢 GigCreated event` - Gig created on-chain
- `✅ Updated gig` - MongoDB synced
- `❌ Error handling` - Any issues logged

### Check Backend Logs

```bash
# If running in background, check logs
pm2 logs  # if using PM2
# or restart and watch output:
npm start
```

---

## 🎯 Complete Workflow Checklist

- [ ] Step 1: Generated wallet & saved private key
- [ ] Step 2: Got test AVAX from faucet
- [ ] Step 3: Ran local tests (`npm test`)
- [ ] Step 4: Compiled contract (`npm run compile`)
- [ ] Step 5: Created `.env` with private key
- [ ] Step 6: Deployed to Fuji (`npm run deploy:fuji`)
- [ ] Step 7: Updated backend `.env` with contract address
- [ ] Step 8: Tested API end-to-end (created gig via API)

---

## 📚 Additional Resources

- **Avalanche Docs**: https://docs.avax.network/
- **Hardhat Docs**: https://hardhat.org/
- **ethers.js**: https://docs.ethers.org/
- **SnowTrace (Block Explorer)**: https://testnet.snowtrace.io/
- **Fuji Faucet**: https://faucet.avax.network/

---

## Next Steps (Optional)

1. **Mainnet Deployment**: Switch to Avalanche C-Chain (requires real AVAX)
2. **Upgradeable Contracts**: Implement proxy pattern for updates
3. **Audit**: Have contract audited before mainnet
4. **Frontend Integration**: Use ethers.js to interact from React app
5. **Monitoring**: Set up alerts for contract events

