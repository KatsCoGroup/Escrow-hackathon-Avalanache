# ProjectX Backend Setup Guide

## Prerequisites

- Node.js v18+ (you have v20.19.4 ✅)
- npm v8+
- MongoDB (local or Atlas cloud)

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

✅ Already done

### 2. Set Up MongoDB

#### Option A: MongoDB Atlas (Cloud) - RECOMMENDED

1. Go to [mongodb.com/cloud](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier M0)
4. Get connection string from "Connect" button
5. Update `.env` with your connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/projectx
```

#### Option B: Local MongoDB with Docker

If you prefer local development:

```bash
# Install Docker first, then:
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=example \
  mongo:latest

# Update .env:
MONGODB_URI=mongodb://root:example@localhost:27017/projectx?authSource=admin
```

#### Option C: Install MongoDB Locally (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

Then in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/projectx
```

---

## Configuration

### Required Environment Variables

Copy and update `.env` with your values:

```bash
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://your-user:your-pass@your-cluster.mongodb.net/projectx

# Blockchain (Avalanche C-Chain Testnet)
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113
ESCROW_CONTRACT_ADDRESS=0x...  # After contract deployment
BADGE_CONTRACT_ADDRESS=0x...   # After contract deployment

# Admin
ADMIN_SECRET_KEY=your-super-secret-admin-key

# x402 Payment (Optional - for production)
X402_FACILITATOR_ENDPOINT=https://x402.ultravioleta.io
X402_FACILITATOR_NAME=Ultravioleta
USDC_TOKEN_ADDRESS=0xA7D8d9ef8D0231B7734519e1FF2Aad7b4b3BAF44  # Fuji testnet
```

---

## Running the Server

### Development

```bash
# Terminal 1: Start MongoDB (if using local)
mongod

# Terminal 2: Start the backend
cd backend
npm run start
```

Expected output:
```
Server is running on port 3000
✅ MongoDB connected successfully
```

### Test the Connection

```bash
# In another terminal
curl http://localhost:3000/api/health

# Response:
# {"status":"ok","timestamp":"2025-12-07T..."}
```

---

## MongoDB Atlas Setup (Recommended)

### Step 1: Create Account
- Go to https://www.mongodb.com/cloud/atlas
- Sign up with email

### Step 2: Create Cluster
- Click "Create a Deployment"
- Choose "Free" tier
- Select your region
- Click "Create Deployment"
- Wait 2-3 minutes for setup

### Step 3: Create Database User
- Go to "Database Access"
- Click "Add New Database User"
- Username: `projectx_user`
- Password: Generate secure password
- Click "Add User"

### Step 4: Get Connection String
- Go to "Databases"
- Click "Connect" button
- Choose "Drivers" → "Node.js"
- Copy connection string
- Replace `<password>` and `<username>`
- Replace `myFirstDatabase` with `projectx`

Example:
```
mongodb+srv://projectx_user:your_password@cluster0.xxxxx.mongodb.net/projectx?retryWrites=true&w=majority
```

### Step 5: Update .env
```env
MONGODB_URI=mongodb+srv://projectx_user:your_password@cluster0.xxxxx.mongodb.net/projectx
```

---

## API Testing

### Create a Test User
```bash
curl -X POST http://localhost:3000/api/users/profile \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234567890123456789012345678901234567890",
    "displayName": "Test User",
    "bio": "Testing the API"
  }'
```

### Browse Gigs
```bash
curl http://localhost:3000/api/gigs
```

### Check Server Health
```bash
curl http://localhost:3000/api/health
```

---

## Troubleshooting

### Error: `Cannot connect to MongoDB`

**Solution 1: Check MONGODB_URI**
```bash
# Make sure your .env has correct format:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/projectx
# or
MONGODB_URI=mongodb://localhost:27017/projectx
```

**Solution 2: Verify MongoDB is Running**
```bash
# For local MongoDB:
sudo systemctl status mongodb

# For Docker:
docker ps | grep mongodb
```

**Solution 3: Check Network Access (Atlas)**
- Go to MongoDB Atlas → Network Access
- Add your IP address (0.0.0.0/0 for development)

### Error: `Port 3000 already in use`

```bash
# Kill the process using port 3000:
lsof -i :3000
kill -9 <PID>

# Or use a different port:
PORT=3001 npm start
```

### Error: `options useNewUrlParser are not supported`

✅ Already fixed in the codebase

---

## Project Structure

```
backend/
├── index.js                 # Main server file
├── config/
│   ├── db.js               # MongoDB connection
│   └── env.js              # Environment variables
├── models/                  # Mongoose schemas
│   ├── User.js
│   ├── Gig.js
│   ├── BadgeVerification.js
│   ├── Subscription.js
│   ├── RevenueTracking.js
│   └── CommunityNFT.js
├── middleware/
│   └── x402Handler.js      # HTTP 402 payment handler
├── routes/                  # API endpoints
│   ├── gig.js              # Gig marketplace
│   ├── user.js             # User profiles
│   ├── badge.js            # Badge verification
│   ├── subscription.js      # Subscriptions
│   ├── stats.js            # Analytics
│   └── admin.js            # Admin panel
├── .env                    # Environment config
└── package.json            # Dependencies
```

---

## Next Steps

1. ✅ Set up MongoDB (Atlas or local)
2. ✅ Update `.env` with your database URI
3. ✅ Run `npm install` (already done)
4. ✅ Start server with `npm start`
5. 🔄 Deploy blockchain contracts (hardhat/contracts/)
6. 🔄 Implement blockchain event listeners
7. 🔄 Build React frontend (coming soon)

---

## Support

For issues:
1. Check `SETUP_GUIDE.md` (you're reading it!)
2. Review `API_REFERENCE.md` for endpoint documentation
3. Check `IMPLEMENTATION_SUMMARY.md` for architecture details
4. Check logs in terminal for error messages

---

## Production Deployment

When deploying to production:

1. Use strong `ADMIN_SECRET_KEY`
2. Use MongoDB Atlas with IP whitelist
3. Set `NODE_ENV=production`
4. Use environment-specific .env files
5. Enable HTTPS
6. Set up rate limiting
7. Add request logging
8. Use PM2 or similar for process management

Example:
```bash
npm install -g pm2
pm2 start index.js --name "projectx-backend"
pm2 startup
pm2 save
```

