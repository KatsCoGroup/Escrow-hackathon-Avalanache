# ProjectX - Decentralized Gig Marketplace with x402 Micropayments

**Status:** Backend API Complete (40+ endpoints) | Ready for Blockchain Integration & Frontend

A blockchain-powered gig marketplace featuring HTTP 402 micropayments, skill badges, and subscription tiers.

---

## 🎯 Project Overview

ProjectX enables:
- **Peer-to-peer job listings** with skill-based matching
- **Micropayments** via HTTP 402 protocol (USDC on Avalanche)
- **Free features** for subscribers and NFT holders
- **Skill verification** with admin-reviewed NFT badges
- **Escrow payments** via smart contracts on Avalanche C-Chain
- **Revenue transparency** with complete payment tracking

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (Atlas cloud recommended)

### 1. Setup MongoDB

**Fastest Option: MongoDB Atlas**
```bash
cd backend
chmod +x setup-mongodb.sh
./setup-mongodb.sh
# Paste your MongoDB Atlas connection string from https://mongodb.com/cloud/atlas
```

**Manual Option:**
```bash
cd backend
nano .env
# Add: MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/projectx
```

See `backend/MONGODB_SETUP.md` for detailed instructions.

### 2. Install & Start

```bash
cd backend
npm install
npm start
```

Expected output:
```
✅ MongoDB connected successfully
🔗 Server running on http://localhost:3000
```

### 3. Test API

```bash
# Get all gigs
curl http://localhost:3000/api/gigs

# Get platform stats
curl http://localhost:3000/api/stats

# See all endpoints in backend/API_REFERENCE.md
```

---

## 📋 What's Included

### ✅ Backend API (Complete)
- **40+ REST endpoints** (gigs, users, badges, subscriptions, stats, admin)
- **HTTP 402 payment protocol** for micropayments
- **6 MongoDB collections** with complete schemas
- **Free access system** for subscribers & NFT holders
- **Admin dashboard** for badge verification
- **Revenue tracking** for all payment types

### 📚 Documentation
| File | Purpose |
|------|---------|
| `backend/API_REFERENCE.md` | Complete API endpoint docs |
| `backend/INTEGRATION_GUIDE.md` | High-level project overview |
| `backend/BUILD_STATUS.md` | Component checklist |
| `backend/MONGODB_SETUP.md` | Database setup guide |
| `backend/IMPLEMENTATION_SUMMARY.md` | Technical details |

---

## 💳 How It Works

### Gig Marketplace
- Post gigs (jobs) - **FREE**
- Browse available gigs - **FREE**
- Apply to gigs - **$0.02 or FREE for subscribers**
- Feature gigs - **$0.50 or FREE for subscribers**
- Mark urgent - **$1.00 or FREE for subscribers**
- USDC-based payments via Ultravioleta
- Free access for subscribers
- Payment logging and analytics

### 🏆 Skill Badges
- Submit badge verification (photos, portfolio)
- Admin review system
- NFT badge minting on approval
- Badge-gated gigs

### 📅 Subscriptions
- Monthly Pro ($9.99/month)
- Community NFT ($49 one-time)
- Free marketplace features

### 📊 Analytics
- Revenue tracking
- Gig statistics
- User statistics
- Platform metrics

### 👨‍💼 Admin Panel
- Badge verification review
- User management
- Revenue reports
- Platform statistics

---

## 🏗️ Architecture

```
ProjectX
├── frontend/              # React UI (coming soon)
├── backend/               # Node.js + Express API
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── middleware/       # x402 handler
│   └── config/           # Database & env setup
├── contracts/            # Solidity smart contracts
│   ├── Escrow.sol        # Payment escrow
│   ├── Badge.sol         # Skill badges
│   └── CommunityNFT.sol  # Membership NFT
└── docs/
    ├── SETUP_GUIDE.md    # Installation & config
    ├── API_REFERENCE.md  # Complete API docs
    └── IMPLEMENTATION_SUMMARY.md # Technical details
```

---

## 🔌 API Endpoints

### Gigs
- `GET /api/gigs` - Browse all gigs
- `POST /api/gigs` - Create gig (FREE)
- `POST /api/gigs/:id/feature` - Feature gig ($0.50)
- `POST /api/gigs/:id/urgent` - Mark urgent ($1.00)
- `POST /api/gigs/:id/apply` - Apply to gig ($0.02 or FREE)
- `POST /api/gigs/:id/assign` - Assign worker
- `PATCH /api/gigs/:id/status` - Update status

### Users
- `POST /api/users/profile` - Create/update profile
- `GET /api/users/:address` - Get profile
- `GET /api/users/:address/applied` - Applied gigs
- `GET /api/users/:address/gigs` - Posted gigs
- `GET /api/users/:address/completed` - Completed work

### Badges
- `GET /api/badges/types` - List badge types
- `POST /api/badges/verify` - Submit verification ($5.00)
- `GET /api/badges/:address` - User badges

### Subscriptions
- `GET /api/subscriptions/pricing` - Get pricing
- `POST /api/subscriptions/monthly/purchase` - Buy monthly ($9.99)
- `POST /api/subscriptions/community-nft/purchase` - Buy NFT ($49)

### Stats
- `GET /api/stats` - Overall statistics
- `GET /api/stats/gigs` - Gig metrics
- `GET /api/stats/revenue` - Revenue data
- `GET /api/stats/users` - User metrics

### Admin
- `GET /api/admin/verifications/pending` - Pending reviews
- `POST /api/admin/verifications/:id/approve` - Approve verification
- `POST /api/admin/verifications/:id/reject` - Reject verification
- `GET /api/admin/dashboard` - Admin dashboard

See [API_REFERENCE.md](./backend/API_REFERENCE.md) for complete details.

---

## 💰 Pricing Model

| Action | Price | Free For |
|--------|-------|----------|
| Post Gig | FREE | Everyone |
| Feature Gig | $0.50 USDC | Monthly & NFT holders |
| Mark Urgent | $1.00 USDC | Monthly & NFT holders |
| Apply to Gig | $0.02 USDC | Monthly & NFT holders |
| Verify Badge | $5.00 USDC | Everyone |
| Monthly Pro | $9.99 | N/A |
| Community NFT | $49.00 | N/A |

---

## 🔑 Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/projectx
# or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/projectx

# Blockchain
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
ESCROW_CONTRACT_ADDRESS=0x...
BADGE_CONTRACT_ADDRESS=0x...

# Admin
ADMIN_SECRET_KEY=your-secret-key

# x402
X402_FACILITATOR_ENDPOINT=https://x402.ultravioleta.io
```

See [SETUP_GUIDE.md](./backend/SETUP_GUIDE.md) for detailed setup instructions.

---

## 🧪 Testing Endpoints

### Create User
```bash
curl -X POST http://localhost:3000/api/users/profile \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234567890123456789012345678901234567890",
    "displayName": "John Doe"
  }'
```

### Create Gig
```bash
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0x1234567890123456789012345678901234567890",
    "title": "Build a Website",
    "description": "Need a React site",
    "paymentAmount": "0.5",
    "deadline": 7
  }'
```

### Browse Gigs
```bash
curl http://localhost:3000/api/gigs?status=OPEN
```

### Check Health
```bash
curl http://localhost:3000/api/health
```

See [API_REFERENCE.md](./backend/API_REFERENCE.md) for more examples.

---

## 📚 Documentation

- **[SETUP_GUIDE.md](./backend/SETUP_GUIDE.md)** - Installation & configuration
- **[API_REFERENCE.md](./backend/API_REFERENCE.md)** - Complete API documentation
- **[IMPLEMENTATION_SUMMARY.md](./backend/IMPLEMENTATION_SUMMARY.md)** - Architecture & implementation details
- **[PROJECT_ARCHITECTURE_SUMMARY.md](./backend/PROJECT_ARCHITECTURE_SUMMARY.md)** - Original design document

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 5
- **Database**: MongoDB 
- **ORM**: Mongoose 9
- **Blockchain**: ethers.js 6
- **Logging**: Morgan

### Smart Contracts
- **Language**: Solidity
- **Network**: Avalanche C-Chain (Fuji Testnet)
- **Framework**: Hardhat
- **Payments**: USDC ERC-20

### Deployment
- **Backend**: Docker + Docker Compose
- **Database**: MongoDB Atlas (recommended)
- **Frontend**: React 18+ (coming soon)

---

## 📦 Dependencies

```json
{
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "ethers": "^6.16.0",
  "express": "^5.2.1",
  "mongoose": "^9.0.0",
  "morgan": "^1.10.1"
}
```

---

## 🔒 Security

- ✅ Wallet address validation (Ethereum format)
- ✅ Admin secret key authentication
- ✅ CORS enabled (adjust for production)
- ✅ Environment variables for sensitive data
- ✅ MongoDB connection with authentication
- 🔄 Rate limiting (coming soon)
- 🔄 Request signing (for production)

**Before Production:**
- [ ] Change `ADMIN_SECRET_KEY`
- [ ] Set up IP whitelist for MongoDB
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Set `NODE_ENV=production`
- [ ] Use strong admin authentication

---

## 🚢 Deployment

### Heroku
```bash
# Create app
heroku create projectx-backend

# Set environment variables
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set ADMIN_SECRET_KEY=your-key

# Deploy
git push heroku main
```

### AWS / Google Cloud
See deployment guides in the docs folder.

### Docker
```bash
# Build image
docker build -t projectx-backend ./backend

# Run container
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://... \
  projectx-backend
```

---

## 📈 Next Steps

- [ ] Deploy smart contracts to Avalanche Fuji testnet
- [ ] Implement blockchain event listeners
- [ ] Build React frontend components
- [ ] Set up webhook handling for x402 payments
- [ ] Create mobile app
- [ ] Launch on Avalanche mainnet

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 💬 Support

- 📖 Read the docs in `backend/` folder
- 💡 Check API_REFERENCE.md for endpoint details
- 🐛 Report issues on GitHub
- 📧 Contact: support@projectx.io

---

## 🎉 Status

**Backend**: ✅ Complete (40+ API endpoints)
**Smart Contracts**: 🔄 In Progress
**Frontend**: 🔄 Coming Soon
**Testing**: 🔄 In Progress

Last Updated: December 7, 2025
