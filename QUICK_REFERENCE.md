# ⚡ Quick Reference Card

## 📌 Commands You'll Need

```bash
# Generate wallet (do this first)
cd contracts && npm run generate-wallet

# Compile contract (always works)
npm run compile

# Deploy to Fuji testnet
export DEPLOYER_PRIVATE_KEY=0x...
npm run deploy:fuji

# Run local tests
npm test

# Start backend server
cd ../backend && npm start
```

---

## 📝 Configuration Checklist

```
contracts/
  ✅ hardhat.config.js - Fuji network configured
  ✅ package.json - Scripts for deploy, test, wallet
  ✅ scripts/generate-wallet.js - Creates test wallet
  ✅ scripts/deploy.js - Deploys to Fuji
  ✅ test/Escrow.test.js - Full test suite

backend/
  ✅ .env - Add ESCROW_CONTRACT_ADDRESS + ADMIN_PRIVATE_KEY
  ✅ services/escrowContract.js - Blockchain writes
  ✅ services/escrowListener.js - Event listener
  ✅ routes/gig.js - API endpoints
  ✅ index.js - Initializes services

root/
  ✅ DEPLOYMENT_GUIDE.md - Step-by-step guide
  ✅ SETUP_COMPLETE.md - This guide
```

---

## 🔑 Step-by-Step Deploy

### 1️⃣ Wallet (2 min)
```bash
npm run generate-wallet
# Save: ADDRESS, PRIVATE_KEY, MNEMONIC
```

### 2️⃣ AVAX (2 min)
Go to https://faucet.avax.network/ → paste ADDRESS → get 10 AVAX

### 3️⃣ Deploy (1 min)
```bash
export DEPLOYER_PRIVATE_KEY=0x...
npm run deploy:fuji
# Save: CONTRACT_ADDRESS
```

### 4️⃣ Configure (1 min)
```bash
# Edit backend/.env, add:
ESCROW_CONTRACT_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
```

### 5️⃣ Start (30 sec)
```bash
cd backend && npm start
# See: ✅ Escrow contract initialized
```

### 6️⃣ Test (30 sec)
```bash
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0x...",
    "title": "Test",
    "description": "Test gig",
    "paymentAmount": "0.01",
    "deadline": 7
  }'
# Check response has: blockchain.txHash, blockchain.gigId
```

---

## 🔗 Important URLs

| Purpose | URL |
|---------|-----|
| Faucet | https://faucet.avax.network/ |
| Explorer | https://testnet.snowtrace.io/ |
| RPC Endpoint | https://api.avax-test.network/ext/bc/C/rpc |
| Hardhat Docs | https://hardhat.org/docs |

---

## 📊 File Sizes

```
SETUP_COMPLETE.md ................. 8.3 KB
DEPLOYMENT_GUIDE.md ............... 11 KB
backend/BLOCKCHAIN_INTEGRATION.md . 11 KB
backend/services/escrowContract.js . 7.1 KB
backend/services/escrowListener.js . 7.3 KB
contracts/scripts/generate-wallet.js 3.2 KB
contracts/test/Escrow.test.js ...... 16 KB
contracts/scripts/deploy.js ........ 708 B
contracts/hardhat.config.js ........ 627 B
```

**Total: ~65 KB of code + docs**

---

## ✅ Success Indicators

You're on track if you see:
- ✅ "Compiled 1 Solidity file successfully"
- ✅ "Escrow contract deployed to: 0x..."
- ✅ "Escrow contract initialized: 0x..."
- ✅ "Escrow event listener started: 0x..."
- ✅ API returns `blockchain.txHash` when creating gig

---

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| "DEPLOYER_PRIVATE_KEY not set" | `export DEPLOYER_PRIVATE_KEY=0x...` |
| "Insufficient funds for gas" | Request more AVAX from faucet |
| "Contract not configured" | Check ESCROW_CONTRACT_ADDRESS in .env |
| "Network timeout" | Retry deploy (Fuji can be slow) |
| "Module not found" | Run `npm install` in contracts folder |

---

## 📖 Where to Read

- **Getting started?** → Read `DEPLOYMENT_GUIDE.md`
- **How it works?** → Read `BLOCKCHAIN_INTEGRATION.md`
- **Quick overview?** → Read `SETUP_COMPLETE.md`
- **Code reference?** → Check `backend/services/*.js`

---

## 🎯 What's Next

1. Deploy contract to Fuji ← **YOU ARE HERE**
2. Test end-to-end workflow
3. Monitor transactions on SnowTrace
4. Add frontend UI
5. Deploy to mainnet (later)

---

**Total setup time: ~10 minutes**
**Hardest part: Waiting for faucet + network confirmations**
