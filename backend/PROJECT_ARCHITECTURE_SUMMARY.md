# ProjectX Architecture Summary

## Overview
ProjectX is a blockchain-based gig marketplace on Avalanche C-Chain that replaces traditional platforms like Upwork with:
- **x402 micropayments** (USDC) for platform fees ($0.02-$5.00 per action)
- **Smart contract escrow** (AVAX) for gig payments
- **NFT badges** for skill verification
- **Community NFT membership** ($49 one-time for VIP features)

---

## 1. SIMPLE FLOW EXPLANATION

### As a Worker (Job Seeker):
1. **Connect Wallet** → Choose membership tier
2. **Get Badge Verified** → Pay $5 USDC via x402 → Submit portfolio/GitHub
3. **Admin reviews** → Mints NFT badge on-chain
4. **Browse Gigs** → Filter by status (OPEN, ASSIGNED, SUBMITTED, COMPLETED)
5. **Apply to Gig** → Pay $0.02 USDC via x402 (or free if subscribed/NFT holder)
6. **Complete Work** → Submit work
7. **Get Paid** → AVAX released from escrow to wallet

### As an Employer (Job Poster):
1. **Connect Wallet** → Have AVAX for escrow + USDC for fees
2. **Post Gig (FREE)** → Create gig with title, description, payment amount, deadline, required badge
3. **Lock Payment** → Send AVAX to escrow smart contract
4. **Optionally Feature Gig** → Pay $0.50 USDC via x402 for 24h visibility
5. **Review Applications** → See worker profiles with badges
6. **Assign Worker** → Select winner
7. **Approve & Release** → Verify work quality → Release AVAX payment

### As Admin:
1. **Review Badge Verifications** → Check submitted portfolios/GitHub
2. **Mint NFT Badges** → Approve verification → Mint skill badge on-chain
3. **Monitor Revenue** → Track all x402 payments in USDC
4. **Resolve Disputes** → Arbitrate payment release decisions

---

## 2. RETHOUGHT ARCHITECTURE WITH X402 INTEGRATION

### Transaction Flow (Detailed Steps)

#### Step 1: Employer Posts Featured Gig
```
Frontend POST /api/gigs/featured
    ↓
Server responds HTTP 402 (Payment Required)
    ↓ [Payment details: $0.50 USDC]
User confirms in wallet modal
    ↓
x402 client signs payment (USDC.transferWithAuthorization)
    ↓
Ultravioleta facilitator verifies signature
    ↓
Facilitator submits on-chain (pays gas in AVAX, funds in USDC)
    ↓
Backend receives confirmation
    ↓
Backend responds HTTP 200 OK - Gig created & featured
Platform earned: +$0.50 USDC
```

#### Step 2: Employer Locks Payment in Escrow
```
Frontend calls escrowContract.createGig(workerAddress)
    ↓
User signs MetaMask transaction: { value: 0.5 AVAX, gas: ~50,000 }
    ↓
AVAX locked in smart contract
    ↓
Event emitted: GigCreated(gigId: 42, amount: 0.5 AVAX)
    ↓
Backend receives blockchain event
    ↓
Gig status: OPEN
Worker can now apply
```

#### Step 3: Worker Submits Work
```
Frontend calls escrowContract.submitWork(gigId: 42)
    ↓
Worker signs MetaMask transaction: { gas: ~30,000 }
    ↓
Smart contract updates status: ASSIGNED → SUBMITTED
    ↓
Event emitted: WorkSubmitted(gigId: 42)
    ↓
Employer notified - can now review work
```

#### Step 4: Employer Approves & Releases Payment
```
Frontend calls escrowContract.releasePayment(gigId: 42)
    ↓
Employer signs MetaMask transaction: { gas: ~50,000 }
    ↓
Smart contract transfers: 0.5 AVAX → worker wallet
    ↓
Status updated: SUBMITTED → COMPLETED
    ↓
Event emitted: PaymentReleased(gigId: 42, amount: 0.5 AVAX)
    ↓
Worker instantly receives 0.5 AVAX
```

### Final State Example (Creating + Featuring + Escrow + Completion)
- **Platform earned**: $0.50 USDC (x402 featured payment)
- **Worker earned**: 0.5 AVAX (escrow release)
- **Gas costs**: ~$0.003 total (paid by employer + worker)
- **Settlement speed**: < 10 seconds (blockchain)
- **vs Upwork**: Would charge $100 (20% of $500), takes 7-14 days

---

## 3. DATA MODELS & COLLECTIONS

### User Model
```javascript
{
  address: string,           // Wallet address (unique)
  displayName: string,
  bio: string,
  profileImage: string,      // URL
  badges: [
    {
      tokenId: number,       // From blockchain
      skillName: string,
      iconURI: string,
      level: "BEGINNER" | "INTERMEDIATE" | "EXPERT",
      issuedAt: timestamp
    }
  ],
  completedGigs: number,
  rating: number,           // 0-5 stars
  joinedAt: timestamp,
  subscription: {
    type: "none" | "monthly" | "community_nft",
    expiresAt: timestamp,
    autoRenew: boolean
  },
  communityNFT: {
    owns: boolean,
    tokenId: number,
    mintedAt: timestamp
  }
}
```

### Gig Model
```javascript
{
  _id: string,               // MongoDB ID
  blockchainGigId: number,   // From escrow contract
  employer: string,          // Wallet address
  worker: string,            // Wallet address (optional until assigned)
  title: string,
  description: string,
  paymentAmount: string,     // In AVAX
  requiredBadge: string,     // e.g., "Web Development"
  deadline: number,          // Days from creation
  status: "OPEN" | "ASSIGNED" | "SUBMITTED" | "COMPLETED",
  featured: boolean,
  featuredUntil: timestamp,  // 24h from feature purchase
  urgent: boolean,           // $1.00 x402 payment
  txHash: string,            // Escrow contract transaction
  createdAt: timestamp,
  completedAt: timestamp,
  applications: [
    {
      workerId: string,
      coverLetter: string,
      estimatedTime: number,
      appliedAt: timestamp
    }
  ]
}
```

### Badge Verification Model
```javascript
{
  _id: string,               // MongoDB ID (verificationId)
  userAddress: string,
  skillName: string,
  portfolioUrl: string,
  githubUrl: string,
  linkedinUrl: string,
  status: "pending" | "approved" | "rejected",
  submittedAt: timestamp,
  reviewedAt: timestamp,
  adminNotes: string,
  amount: 5.00,              // USDC paid
  txHash: string,            // x402 payment hash
  badgeTokenId: number       // Minted NFT token ID (after approval)
}
```

### Subscription Model
```javascript
{
  _id: string,
  userAddress: string,
  type: "monthly" | "community_nft",
  price: number,             // USDC (9.99 or 49.00)
  status: "active" | "expired" | "cancelled",
  startDate: timestamp,
  expiresAt: timestamp,
  autoRenew: boolean,
  txHash: string,            // x402 payment hash
  renewalDate: timestamp
}
```

### Revenue Tracking Model
```javascript
{
  _id: string,
  type: "featured_gig" | "urgent_gig" | "application_fee" | "badge_verification" | 
        "advanced_search" | "analytics" | "ai_match" | "subscription" | "community_nft",
  amount: number,            // USDC (decimal)
  currency: "USDC",
  description: string,
  gigId: string,             // If applicable
  userId: string,            // If applicable
  timestamp: timestamp,
  txHash: string,            // x402 transaction hash
  status: "confirmed" | "pending"
}
```

### Community NFT Model
```javascript
{
  _id: string,
  tokenId: number,           // From contract
  owner: string,             // Wallet address
  mintedAt: timestamp,
  status: "active" | "revoked",
  purchasePrice: 49.00,      // USDC
  txHash: string,
  isPromo: boolean           // Admin-minted for promotion
}
```

---

## 4. API ENDPOINTS REQUIRED

### PUBLIC ENDPOINTS (No Authentication)

#### Browse Gigs
```
GET /api/gigs
Query params:
  - status: OPEN | ASSIGNED | SUBMITTED | COMPLETED
  - requiredBadge: string (e.g., "Web Development")
  - featured: boolean
  - limit: number (default: 20)
  - skip: number (pagination)
Response: { success: true, gigs: [...], total: number }
```

#### View Single Gig
```
GET /api/gigs/:gigId
Response: { success: true, gig: {...} }
```

#### View User Badges
```
GET /api/badges/:address
Response: { success: true, badges: [...] }
```

#### Badge Types List
```
GET /api/badges/types
Response: { success: true, badgeTypes: ["Web Development", "React", ...] }
```

#### Platform Stats
```
GET /api/stats
Response: {
  success: true,
  stats: {
    totalGigs: number,
    activeGigs: number,
    completedGigs: number,
    totalUsers: number,
    totalBadgesIssued: number,
    totalValueLocked: string (AVAX)
  }
}
```

#### Health Check
```
GET /health
Response: { status: "healthy", timestamp: string, network: "avalanche-fuji", x402: "enabled" }
```

---

### USER ENDPOINTS (Requires Wallet Connection & x402 Payments)

#### Create Gig (FREE)
```
POST /api/gigs
Body: {
  title: string,
  description: string,
  paymentAmount: string (AVAX),
  requiredBadge: string,
  deadline: number (days)
}
Response: { success: true, gigId: string, blockchainGigId: number }
```

#### Feature Gig ($0.50 USDC via x402)
```
POST /api/gigs/featured
X-PAYMENT: $0.50 USDC via x402 (middleware verifies)
Body: { gigId: string }
Response: { success: true, message: "Gig featured for 24h" }
```

#### Mark Gig Urgent ($1.00 USDC via x402)
```
POST /api/gigs/urgent
X-PAYMENT: $1.00 USDC via x402
Body: { gigId: string }
Response: { success: true, message: "Gig marked urgent" }
```

#### Apply to Gig ($0.02 USDC via x402, or free if subscriber/NFT)
```
POST /api/gigs/:gigId/apply
X-PAYMENT: $0.02 USDC via x402 (unless exempt)
Body: {
  coverLetter: string,
  estimatedTime: number (days)
}
Response: { success: true, applicationId: string }
```

#### Update Gig Status
```
PUT /api/gigs/:gigId
Body: {
  status: string,
  worker: string (address),
  txHash: string (escrow transaction)
}
Response: { success: true }
```

#### Get My Gigs (as Employer)
```
GET /api/users/:address/gigs/employer
Response: { success: true, gigs: [...] }
```

#### Get My Gigs (as Worker)
```
GET /api/users/:address/gigs/worker
Response: { success: true, gigs: [...] }
```

#### Create/Update User Profile
```
POST /api/users
Body: {
  address: string,
  displayName: string,
  bio: string,
  profileImage: string (URL)
}
Response: { success: true, message: "Profile updated" }
```

#### Get User Profile
```
GET /api/users/:address
Response: {
  success: true,
  user: {
    address: string,
    displayName: string,
    bio: string,
    badges: [...],
    completedGigs: number,
    rating: number,
    joinedAt: string
  }
}
```

---

### SUBSCRIPTION ENDPOINTS (x402 Payments)

#### Subscribe Monthly ($9.99/month via x402)
```
POST /api/subscriptions/monthly
X-PAYMENT: $9.99 USDC via x402 (recurring)
Body: { userAddress: string }
Response: {
  success: true,
  subscriptionId: string,
  expiresAt: string,
  autoRenew: true
}
```

#### Cancel Subscription
```
DELETE /api/subscriptions/:subscriptionId
Response: { success: true, message: "Subscription cancelled" }
```

#### Check Subscription Status
```
GET /api/subscriptions/:address/status
Response: {
  success: true,
  active: boolean,
  type: "none" | "monthly" | "community_nft",
  expiresAt: string | null
}
```

#### Buy Community NFT ($49 one-time via x402)
```
POST /api/community-nft/purchase
X-PAYMENT: $49 USDC via x402
Body: { userAddress: string }
Response: {
  success: true,
  tokenId: number,
  txHash: string,
  message: "Community NFT minted"
}
```

#### Check Community NFT Ownership
```
GET /api/community-nft/:address/owns
Response: {
  success: true,
  owns: boolean,
  tokenId: number | null
}
```

---

### BADGE VERIFICATION ENDPOINTS (x402 Payments)

#### Request Badge Verification ($5.00 via x402)
```
POST /api/badges/verify
X-PAYMENT: $5.00 USDC via x402
Body: {
  userAddress: string,
  skillName: string,
  portfolioUrl: string,
  githubUrl: string (optional),
  linkedinUrl: string (optional)
}
Response: {
  success: true,
  verificationId: string,
  message: "Verification request submitted. Review within 24h."
}
```

#### Check Verification Status
```
GET /api/badges/verify/:verificationId
Response: {
  success: true,
  status: "pending" | "approved" | "rejected",
  submittedAt: string,
  reviewedAt: string | null
}
```

---

### PREMIUM FEATURE ENDPOINTS (x402 Payments)

#### Advanced Search ($0.10 via x402)
```
POST /api/search/advanced
X-PAYMENT: $0.10 USDC via x402
Body: {
  keywords: string[],
  paymentRange: { min: number, max: number },
  badges: string[],
  location: string (optional),
  aiMatch: boolean
}
Response: { success: true, gigs: [...], matchScore: number }
```

#### Analytics Dashboard ($2.00/month via x402)
```
GET /api/analytics/earnings
X-PAYMENT: $2.00 USDC via x402 (monthly access)
Response: {
  success: true,
  earnings: {
    thisWeek: number,
    thisMonth: number,
    allTime: number,
    chart: [...]
  }
}
```

#### AI Gig Matching ($0.10 via x402)
```
POST /api/ai/match
X-PAYMENT: $0.10 USDC via x402
Body: {
  userAddress: string,
  preferences: {...}
}
Response: {
  success: true,
  recommendations: [...],
  matchScores: [...]
}
```

---

### BLOCKCHAIN INTERACTION ENDPOINTS

#### Verify Escrow Payment
```
POST /api/blockchain/verify-payment
Body: {
  txHash: string,
  gigId: string
}
Response: {
  success: true,
  blockchainGigId: number,
  paymentLocked: string (AVAX),
  message: "Payment verified"
}
```

#### Get Gig from Blockchain
```
GET /api/blockchain/gigs/:blockchainGigId
Response: {
  success: true,
  gig: {
    employer: string,
    worker: string,
    paymentAmount: string (AVAX),
    status: string,
    createdAt: number,
    completedAt: number
  }
}
```

#### Get Badge from Blockchain
```
GET /api/blockchain/badges/:tokenId
Response: {
  success: true,
  badge: {
    skillName: string,
    iconURI: string,
    holder: string,
    issuedAt: number,
    level: string
  }
}
```

---

### ADMIN ENDPOINTS (Authorization Required)

#### Mint Badge (Admin only)
```
POST /api/admin/badges/mint
Headers: { Authorization: "Bearer ADMIN_TOKEN" }
Body: {
  userAddress: string,
  skillName: string,
  iconURI: string,
  level: "BEGINNER" | "INTERMEDIATE" | "EXPERT"
}
Response: {
  success: true,
  tokenId: number,
  txHash: string
}
```

#### View Pending Verifications
```
GET /api/admin/verifications/pending
Response: {
  success: true,
  verifications: [...]
}
```

#### Approve Verification
```
POST /api/admin/verifications/:id/approve
Response: { success: true, badgeTokenId: number }
```

#### Reject Verification
```
POST /api/admin/verifications/:id/reject
Body: { reason: string }
Response: { success: true }
```

#### View Revenue
```
GET /api/admin/revenue
Query params:
  - period: "today" | "week" | "month" | "all"
Response: {
  success: true,
  revenue: {
    total: number,
    breakdown: {
      featuredGigs: number,
      badgeVerifications: number,
      subscriptions: number,
      payPerApply: number,
      communityNFT: number
    }
  }
}
```

#### Resolve Dispute
```
POST /api/admin/disputes/:disputeId/resolve
Body: {
  decision: "release_to_worker" | "refund_to_employer" | "split_50_50"
}
Response: { success: true, txHash: string }
```

#### Mint Community NFT (Promotional)
```
POST /api/admin/community-nft/mint
Body: {
  userAddress: string,
  reason: string (e.g., "Beta tester reward")
}
Response: { success: true, tokenId: number }
```

---

## 5. BACKEND IMPLEMENTATION CHECKLIST

### Phase 1: Core Setup
- [ ] Initialize Hono server with TypeScript
- [ ] Setup MongoDB connection and models
- [ ] Configure environment variables (.env)
- [ ] Implement error handling middleware
- [ ] Setup CORS for frontend integration

### Phase 2: x402 Integration
- [ ] Install x402-hono middleware
- [ ] Configure Ultravioleta facilitator URL
- [ ] Setup payment verification for routes:
  - [ ] POST /api/gigs/featured ($0.50)
  - [ ] POST /api/gigs/urgent ($1.00)
  - [ ] POST /api/gigs/:gigId/apply ($0.02)
  - [ ] POST /api/badges/verify ($5.00)
  - [ ] POST /api/subscriptions/monthly ($9.99)
  - [ ] POST /api/community-nft/purchase ($49.00)
  - [ ] POST /api/search/advanced ($0.10)
  - [ ] GET /api/analytics/earnings ($2.00)
  - [ ] POST /api/ai/match ($0.10)
- [ ] Implement payment confirmation logic
- [ ] Add revenue tracking to MongoDB

### Phase 3: Gig Management
- [ ] Implement GET /api/gigs (with filtering & pagination)
- [ ] Implement GET /api/gigs/:gigId
- [ ] Implement POST /api/gigs (create gig)
- [ ] Implement POST /api/gigs/featured (with x402)
- [ ] Implement POST /api/gigs/urgent (with x402)
- [ ] Implement PUT /api/gigs/:gigId (update status)
- [ ] Implement POST /api/gigs/:gigId/apply (with x402)
- [ ] Implement GET /api/users/:address/gigs/employer
- [ ] Implement GET /api/users/:address/gigs/worker

### Phase 4: User & Badge Management
- [ ] Implement POST /api/users (create/update profile)
- [ ] Implement GET /api/users/:address (get profile)
- [ ] Implement GET /api/badges/:address (read from blockchain)
- [ ] Implement GET /api/badges/types
- [ ] Implement POST /api/badges/verify (with x402)
- [ ] Implement GET /api/badges/verify/:verificationId

### Phase 5: Subscription & NFT
- [ ] Implement POST /api/subscriptions/monthly (with x402)
- [ ] Implement DELETE /api/subscriptions/:subscriptionId
- [ ] Implement GET /api/subscriptions/:address/status
- [ ] Implement POST /api/community-nft/purchase (with x402)
- [ ] Implement GET /api/community-nft/:address/owns
- [ ] Implement subscription expiration checker (cron job)
- [ ] Implement NFT membership exemption logic for fees

### Phase 6: Blockchain Integration
- [ ] Setup ethers.js for blockchain interaction
- [ ] Implement contract interaction utilities
- [ ] Implement POST /api/blockchain/verify-payment
- [ ] Implement GET /api/blockchain/gigs/:blockchainGigId
- [ ] Implement GET /api/blockchain/badges/:tokenId
- [ ] Setup event listener for smart contract events
- [ ] Implement status sync between DB and blockchain

### Phase 7: Admin Features
- [ ] Implement admin authentication (Bearer token)
- [ ] Implement POST /api/admin/badges/mint
- [ ] Implement GET /api/admin/verifications/pending
- [ ] Implement POST /api/admin/verifications/:id/approve
- [ ] Implement POST /api/admin/verifications/:id/reject
- [ ] Implement GET /api/admin/revenue
- [ ] Implement POST /api/admin/disputes/:disputeId/resolve
- [ ] Implement POST /api/admin/community-nft/mint

### Phase 8: Analytics & Monitoring
- [ ] Implement GET /api/stats
- [ ] Implement GET /api/health
- [ ] Setup revenue dashboard queries
- [ ] Implement logging for all transactions
- [ ] Setup monitoring alerts for failed payments

### Phase 9: Testing & Deployment
- [ ] Unit tests for all endpoints
- [ ] Integration tests with x402 middleware
- [ ] Integration tests with blockchain
- [ ] Load testing for payment endpoints
- [ ] Security audit for payment flows
- [ ] Environment configuration (Fuji testnet)
- [ ] Deployment to Railway.app or similar

---

## 6. REVENUE MODEL

### x402 Micropayments (USDC on Avalanche)

| Action | Price | Est. Monthly Users | Monthly Revenue |
|--------|-------|-------------------|-----------------|
| Featured Gig (24h) | $0.50 | 100 → 5,000 | $50 → $2,500 |
| Urgent Gig Badge | $1.00 | 50 → 2,000 | $50 → $2,000 |
| Apply to Gig | $0.02 | 5,000 → 250,000 | $100 → $5,000 |
| Badge Verification | $5.00 | 50 → 2,000 | $250 → $10,000 |
| Advanced Search | $0.10 | varies | - |
| Analytics Access | $2.00/month | 100 → 1,000 | $200 → $2,000 |
| AI Gig Matching | $0.10 | varies | - |
| Community NFT | $49 (one-time) | varies | $2,000+ |
| Monthly Subscription | $9.99/month | varies | $1,000+ |

**Conservative (Month 1-3)**: $650/month
**At Scale (Month 12)**: $34,500/month (~$414k/year)

---

## 7. TECHNOLOGY STACK

### Backend
- **Framework**: Hono (lightweight HTTP server)
- **Language**: JavaScript/TypeScript
- **Database**: MongoDB
- **Blockchain**: ethers.js (for contract interaction)
- **Payments**: x402-hono middleware (x402 micropayments)
- **Environment**: Node.js

### Smart Contracts
- **Escrow Contract**: Lock/release AVAX for gig payments
- **Badge NFT Contract**: ERC-721 for skill verification
- **Community NFT Contract**: ERC-721 (non-transferable soulbound)

### Frontend
- **Framework**: React
- **Web3**: wagmi + RainbowKit (wallet connection)
- **Chain**: Avalanche C-Chain (mainnet & Fuji testnet)
- **Payment UI**: x402-client for payment modals

### Network
- **Mainnet**: Avalanche C-Chain
- **Testnet**: Avalanche Fuji

---

## 8. KEY COMPETITIVE ADVANTAGES

| Feature | Upwork (Traditional) | ProjectX (Avalanche) |
|---------|----------------------|----------------------|
| **Commission** | 20% ($100 on $500) | $0.50 micropayment |
| **Settlement** | 7-14 days | < 10 seconds |
| **Skill Verification** | Text reviews (fakeable) | NFT badges (verifiable) |
| **Payment Method** | Credit card (2.9% fee) | USDC via x402 (0% fee) |
| **Escrow** | Platform holds funds | Smart contract (trustless) |
| **Geographic Limits** | Yes (payment rails) | No (global blockchain) |
| **Platform Risk** | High (can freeze) | Low (code is law) |

---

## 9. MEMBERSHIP TIERS

### Free Tier
- Browse & view gigs: **Unlimited**
- Apply to gigs: **$0.02 per apply**
- Best for: Casual users (1-10 applies/month)

### Monthly Subscription ($9.99/month)
- Browse & view gigs: **Unlimited**
- Apply to gigs: **Unlimited**
- Community Discord: **Yes**
- Best for: Regular users (50+ applies/month)

### Community NFT ($49 one-time)
- Browse & view gigs: **Unlimited**
- Apply to gigs: **Unlimited**
- Premium gigs: **Yes**
- Voting rights: **Yes**
- Early access: **Yes**
- Monthly free featured gig: **Yes ($0.50 value)**
- Priority support (24h): **Yes**
- Custom badge: **"Community Member"**
- Best for: Power users (daily usage) - pays for itself in ~5 months

---

## 10. IMPLEMENTATION PRIORITY

### MVP (Minimum Viable Product) - 1 Day
1. ✅ Deploy Escrow + Badge contracts to Fuji
2. ✅ Setup Hono server with x402-hono
3. ✅ Implement core endpoints (browse, create, apply)
4. ✅ x402 payment for featured gigs
5. ✅ Blockchain verification
6. ✅ Live demo in < 2 minutes

### Phase 1 (Week 1)
- All public endpoints
- All user endpoints
- Admin badge minting
- Revenue tracking

### Phase 2 (Week 2-3)
- Subscription system
- Community NFT
- Badge verification workflow
- Advanced search & AI matching

### Phase 3 (Month 2)
- Dispute resolution
- Advanced analytics
- Email notifications
- Mobile app exploration

### Phase 4+ (Future)
- Custom Avalanche L1 (Subnet)
- Badge-holder validators
- Governance tokens
- Cross-chain bridge

---

## 11. ENVIRONMENT VARIABLES

### Backend (.env)
```bash
# Server
PORT=3000
NODE_ENV=development

# Avalanche Fuji Testnet
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113

# Smart Contracts (after deployment)
ESCROW_CONTRACT_ADDRESS=0x...
BADGE_CONTRACT_ADDRESS=0x...
COMMUNITY_NFT_ADDRESS=0x...
USDC_CONTRACT_ADDRESS=0x5425890298aed601595a70AB815c96711a31Bc65

# x402 Configuration
X402_PAYMENT_ADDRESS=0x...  # Your wallet (receives USDC)
X402_FACILITATOR_URL=https://facilitator.ultravioletadao.xyz

# Admin Wallet
ADMIN_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...

# Database
MONGODB_URI=mongodb://localhost:27017/projectx
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
VITE_AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
VITE_CHAIN_ID=43113
VITE_ESCROW_ADDRESS=0x...
VITE_BADGE_ADDRESS=0x...
VITE_COMMUNITY_NFT_ADDRESS=0x...
```

---

## 12. DEPLOYMENT CHECKLIST

### Smart Contracts
- [ ] Deploy Escrow to Fuji
- [ ] Deploy Badge NFT to Fuji
- [ ] Deploy Community NFT to Fuji
- [ ] Verify contracts on Snowtrace
- [ ] Test all functions on testnet
- [ ] Document contract addresses

### Backend
- [ ] Setup MongoDB
- [ ] Configure environment variables
- [ ] Deploy to Railway.app / AWS
- [ ] Setup error tracking (Sentry)
- [ ] Setup monitoring & logging
- [ ] Test all x402 payment flows
- [ ] Verify blockchain event listeners

### Frontend
- [ ] Build production bundle
- [ ] Deploy to Vercel
- [ ] Configure environment variables
- [ ] Test wallet connections
- [ ] Test all user flows
- [ ] Performance optimization

### Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment guide
- [ ] Contributor guide
- [ ] Video demo (< 2 minutes)
- [ ] Pitch deck (5 slides max)

---

## 13. FUTURE VISION: CUSTOM AVALANCHE L1

### Why a Custom L1?
Currently on **Avalanche C-Chain** (shared EVM):
- ❌ Competing for blockspace
- ❌ Generic gas pricing
- ❌ Limited customization

### ProjectX L1 (Avalanche Subnet)
- **Consensus**: Badge-holder validators (PoS)
- **Gas Token**: PROJECT (issued on L1)
- **Fee Structure**: 0.01 PROJECT per tx
- **Custom Features**:
  - Native escrow opcodes (cheaper)
  - Badge verification at protocol level
  - Dispute resolution in consensus
  - x402 settlement gasless

### Badge-Holder Validators
- Only users with verified badges can validate
- "Skin in the game" - lose badges if malicious
- Earn validation rewards in PROJECT token
- KYC validators for enterprise gigs

### Timeline
- **Month 1-3**: Prove product-market fit on C-Chain
- **Month 4-6**: Design L1 tokenomics + validator requirements
- **Month 7-9**: Deploy testnet L1, migrate contracts
- **Month 10-12**: Mainnet launch, onboard validators

---

## Summary

This architecture provides:

1. **Low fees** - $0.02-$5.00 instead of 20% commissions
2. **Fast settlement** - < 10 seconds instead of 7-14 days
3. **Trustless escrow** - Smart contract instead of platform holding funds
4. **Verifiable skills** - NFT badges instead of text reviews
5. **Global access** - No geographic payment restrictions
6. **Sustainable revenue** - x402 micropayments scale profitably
7. **Future scalability** - Path to custom L1 with badge-holder validators

The backend is ready to implement these flows using Hono, x402-hono, MongoDB, and ethers.js. All endpoints are documented, data models are defined, and the revenue model is validated.
