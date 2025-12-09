# ProjectX Backend - Complete Integration Guide

## 📋 Project Overview

ProjectX is a decentralized gig marketplace with:
- **Wallet-based authentication** (Ethereum addresses)
- **HTTP 402 Micropayments** via x402 protocol (USDC)
- **Free subscription tiers** for premium features
- **NFT-based skill badges** with admin verification
- **Escrow smart contracts** on Avalanche C-Chain
- **Revenue tracking** and analytics dashboard

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 16+ (Already installed ✓)
- MongoDB (Cloud via Atlas recommended)
- Git (for version control)

### 2. MongoDB Setup

**Easiest Option: MongoDB Atlas (Cloud)**

```bash
# 1. Visit https://www.mongodb.com/cloud/atlas
# 2. Create free account and M0 cluster
# 3. Get connection string: mongodb+srv://user:password@cluster.mongodb.net/projectx
# 4. Run setup script:

cd backend
chmod +x setup-mongodb.sh
./setup-mongodb.sh
# Paste your MongoDB Atlas connection string when prompted
```

### 3. Manual Configuration (if you prefer)

```bash
cd backend

# Edit .env file
nano .env

# Add your MongoDB Atlas URI:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/projectx
```

### 4. Start Server

```bash
npm start
```

Expected output:
```
✅ MongoDB connected successfully
🔗 Server running on http://localhost:3000
```

---

## 📁 Project Structure

```
backend/
├── config/
│   ├── db.js                    # MongoDB connection
│   └── env.js                   # Environment variables
├── middleware/
│   └── x402Handler.js           # HTTP 402 payment protocol
├── models/
│   ├── User.js                  # User profiles & subscriptions
│   ├── Gig.js                   # Gig listings & applications
│   ├── BadgeVerification.js     # Skill verification requests
│   ├── Subscription.js          # Monthly & NFT subscriptions
│   ├── RevenueTracking.js       # Payment logging
│   └── CommunityNFT.js          # NFT membership tracking
├── routes/
│   ├── gig.js                   # Gig marketplace (9 endpoints)
│   ├── user.js                  # User profiles (5 endpoints)
│   ├── badge.js                 # Badge system (6 endpoints)
│   ├── subscription.js          # Subscriptions (4 endpoints)
│   ├── stats.js                 # Analytics (4 groups)
│   └── admin.js                 # Admin panel (7 endpoints)
├── index.js                     # Main application entry
├── .env                         # Environment configuration
├── package.json                 # Dependencies
├── API_REFERENCE.md             # Complete API documentation
├── MONGODB_SETUP.md             # MongoDB installation guide
└── IMPLEMENTATION_SUMMARY.md    # Technical details
```

---

## 🔌 API Endpoints Summary

### Base URL
```
http://localhost:3000/api
```

### Main Features

**Gigs** (9 endpoints)
- Browse, create, feature, mark urgent, apply, assign, update status

**Users** (5 endpoints)
- Create profile, view profile, applied gigs, posted gigs, completed work

**Badges** (6 endpoints)
- List types, verify skill ($5 USDC), check status, admin approval

**Subscriptions** (4 endpoints)
- View pricing, buy monthly ($9.99), buy NFT ($49)

**Statistics** (4 groups)
- Overall stats, gig stats, revenue stats, user stats

**Admin** (7 endpoints)
- Review verifications, approve/reject badges, dashboard

### Example Requests

```bash
# Get all gigs
curl http://localhost:3000/api/gigs

# Create a gig
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0x1234567890123456789012345678901234567890",
    "title": "Build a Website",
    "description": "Need a responsive portfolio website",
    "paymentAmount": "0.5",
    "deadline": 7
  }'

# Get platform statistics
curl http://localhost:3000/api/stats

# Feature a gig (requires $0.50 USDC payment)
curl -X POST http://localhost:3000/api/gigs/abc123/feature \
  -H "Content-Type: application/json" \
  -d '{
    "paymentTxHash": "0x..."  # After user pays via wallet
  }'
```

See **API_REFERENCE.md** for complete endpoint documentation.

---

## 💳 Payment Flow (HTTP 402)

### How x402 Payments Work

1. **User initiates action** (e.g., feature gig)
   ```bash
   curl -X POST http://localhost:3000/api/gigs/{id}/feature
   ```

2. **Server returns HTTP 402 if payment needed**
   ```json
   {
     "success": false,
     "code": "PAYMENT_REQUIRED",
     "message": "Payment of 0.50 USDC required",
     "payment": {
       "amount": "0.50",
       "currency": "USDC",
       "type": "featured_gig",
       "facilitator": {
         "name": "Ultravioleta",
         "endpoint": "https://x402.ultravioleta.io"
       }
     }
   }
   ```

3. **Frontend shows payment modal**
   - User confirms payment in MetaMask
   - Receives transaction hash (0xabc123...)

4. **Retry with payment proof**
   ```bash
   curl -X POST http://localhost:3000/api/gigs/{id}/feature \
     -H "x-payment-txhash: 0xabc123..." \
     -d '{"paymentTxHash": "0xabc123..."}'
   ```

5. **Payment verified and action executed**
   ```json
   {
     "success": true,
     "message": "Gig featured successfully",
     "gig": {...},
     "featuredUntil": "2025-12-09T15:30:00Z"
   }
   ```

### Payment Amounts

| Feature | Cost | Free For |
|---------|------|----------|
| Post Gig | FREE | Everyone |
| Apply to Gig | $0.02 | Subscribers + NFT owners |
| Feature Gig | $0.50 | Subscribers + NFT owners |
| Mark Urgent | $1.00 | Subscribers + NFT owners |
| Verify Badge | $5.00 | - (Always paid) |
| Monthly Sub | $9.99 | - |
| NFT Member | $49.00 | - |

---

## 🔐 Authentication

### Wallet-Based Auth

Most endpoints work with wallet addresses. No traditional login needed:

```bash
# Set wallet address in request
curl -X GET http://localhost:3000/api/users/0x1234567890123456789012345678901234567890
```

### Admin Authentication

Protected admin endpoints require:

```bash
# Header option
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "x-admin-key: your-secret-admin-key"

# Query param option
curl "http://localhost:3000/api/admin/dashboard?adminKey=your-secret-admin-key"
```

Change `ADMIN_SECRET_KEY` in `.env` for production.

---

## 📊 Key Features

### 1. Gig Marketplace
- Post gigs (free)
- Browse with filters (status, required badge, featured)
- Apply with cover letter ($0.02 or free for subscribers)
- Get assigned work
- Submit completed work
- Mark gigs as urgent ($1.00)
- Feature gigs to top listings ($0.50)

### 2. Skill Badges
- 12+ skill categories (React, Node.js, Solidity, etc.)
- Submit verification with portfolio
- Admin review process
- Auto-mint NFT badge on approval
- Display badges on profile

### 3. Subscriptions
- **Monthly Pro** ($9.99/month)
  - Free applications
  - Free featured gig monthly
  - Priority support
  
- **Community NFT** ($49 one-time)
  - All monthly benefits
  - Lifetime free access
  - Exclusive membership NFT

### 4. Revenue Tracking
- Log all payments (9 types)
- Filter by date range
- Calculate revenue by feature
- Export analytics
- Dashboard for admins

### 5. Admin Dashboard
- Pending badge verifications
- Approval/rejection workflow
- Dispute resolution
- Platform statistics
- User management

---

## 🔗 Blockchain Integration Points

### Smart Contracts (Avalanche C-Chain)

**Escrow Contract** - Holds payment in escrow
- Event: `GigCreated` → Create gig in DB
- Event: `WorkSubmitted` → Update status to SUBMITTED
- Event: `PaymentReleased` → Complete gig, release payment

**Badge Contract** - Mints skill verification badges
- `mint(userAddress, skillName)` → Called on verification approval
- Stores tokenId in BadgeVerification

**Community NFT Contract** - Membership NFTs
- `mint(userAddress)` → Called on subscription purchase
- Grants lifetime free access

### Integration Status
- ✅ Fields ready (blockchainGigId, txHash)
- ✅ Payment amounts configured
- ⏳ Event listeners pending (next phase)
- ⏳ NFT minting stub ready for implementation

---

## 🛠 Development Workflow

### 1. Create a Gig
```bash
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0x...",
    "title": "...",
    "description": "...",
    "paymentAmount": "0.5",
    "deadline": 7
  }'
```

### 2. Apply to Gig (as Worker)
```bash
# No payment needed if subscribed
curl -X POST http://localhost:3000/api/gigs/{gigId}/apply \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "0x...",
    "coverLetter": "I can do this!",
    "estimatedTime": 3
  }'
```

### 3. Assign Worker (as Employer)
```bash
curl -X POST http://localhost:3000/api/gigs/{gigId}/assign \
  -H "Content-Type: application/json" \
  -d '{"workerId": "0x..."}'
```

### 4. Submit Work & Update Status
```bash
curl -X PATCH http://localhost:3000/api/gigs/{gigId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SUBMITTED",
    "workSubmissionLink": "https://github.com/..."
  }'
```

### 5. Release Payment (via blockchain)
- Employer confirms work quality
- Calls Escrow contract to release payment
- Gig marked as COMPLETED

---

## 📈 Next Steps

### Phase 1: Setup Complete ✅
- [x] MongoDB models created
- [x] x402 payment middleware
- [x] 40+ API endpoints
- [x] Admin dashboard
- [x] Documentation

### Phase 2: Blockchain Integration (Pending)
- [ ] Implement event listeners for Escrow contract
- [ ] Integrate with Ultravioleta x402 API (real verification)
- [ ] Add NFT minting service
- [ ] Test with Hardhat

### Phase 3: Frontend (Next)
- [ ] React components for gig marketplace
- [ ] MetaMask wallet integration
- [ ] Payment UI with x402 modal
- [ ] User dashboard

### Phase 4: Production
- [ ] Deploy backend to AWS/Heroku
- [ ] Deploy frontend to Vercel
- [ ] Setup CI/CD pipeline
- [ ] Security audit
- [ ] Launch on mainnet

---

## 🚨 Troubleshooting

### MongoDB Connection Failed
```
❌ MongoDB connection failed: connect ECONNREFUSED
```
**Solution:** 
- Check `.env` has correct MONGODB_URI
- Run `./setup-mongodb.sh` and get Atlas connection string
- Verify MongoDB is running (Atlas is always running)

### Port 3000 Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Invalid Wallet Address
```
❌ Error: Invalid Ethereum address format
```
**Solution:**
- Must start with `0x`
- Followed by 40 hex characters
- Example: `0x1234567890123456789012345678901234567890`

### HTTP 402 Not Triggering
```
Payment should be required but it's accepting the request
```
**Solution:**
- User must NOT have active subscription
- User must NOT own Community NFT
- Check x402Handler.js checkFreeAccessEligibility()

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `API_REFERENCE.md` | Complete API endpoint documentation |
| `MONGODB_SETUP.md` | MongoDB installation & configuration |
| `IMPLEMENTATION_SUMMARY.md` | Technical implementation details |
| `INTEGRATION_GUIDE.md` | This file - high-level overview |
| `setup-mongodb.sh` | Automated MongoDB Atlas setup script |

---

## 💡 Tips & Best Practices

### 1. Use Consistent Wallet Addresses
- Always use same wallet for employer/worker throughout flow
- Format: `0x` + 40 lowercase hex characters

### 2. Test Payment Flow
- First test without payment (should get HTTP 402)
- Then test with payment transaction hash
- Check RevenueTracking for logged payments

### 3. Admin Operations
- Always use correct `x-admin-key` header
- For production, use strong random key: `openssl rand -hex 32`
- Rotate keys periodically

### 4. Monitor Logs
```bash
# Watch server logs in real-time
npm start 2>&1 | tee server.log

# Filter for errors
grep "❌" server.log
```

### 5. Database Queries
```bash
# Connect to MongoDB Atlas in terminal
mongosh "mongodb+srv://user:password@cluster.mongodb.net/projectx"

# View collections
show collections

# Count gigs
db.gigs.countDocuments()

# Find gigs by employer
db.gigs.find({"employer": "0x..."})
```

---

## 🤝 Support

For issues or questions:
1. Check troubleshooting section
2. Review API_REFERENCE.md for endpoint details
3. Check IMPLEMENTATION_SUMMARY.md for technical info
4. Check server logs: `tail -f server.log`

---

## 📝 License & Credits

ProjectX - Decentralized Gig Marketplace with x402 Micropayments

Built with:
- Express.js - HTTP framework
- MongoDB - Database
- Mongoose - ODM
- ethers.js - Blockchain interaction
- Avalanche C-Chain - Smart contracts

