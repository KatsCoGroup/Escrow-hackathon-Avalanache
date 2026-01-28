# Quick Start Guide - Full Stack Application

## Prerequisites
- Node.js 18+ installed
- MongoDB account (Atlas or local)
- MetaMask or Core Wallet browser extension
- Git

## Setup Instructions

### 1. Clone & Install

```bash
# Navigate to project root
cd /home/samcl/Project@Samcl/Escrow-hackathon-Avalanache

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../Aura-link-front-end
npm install
```

### 2. Configure Environment Variables

#### Backend (.env)
The backend `.env` file is already configured. Verify these settings:
```bash
cd backend
cat .env
```

Key variables:
- `PORT=3000`
- `MONGODB_URI=mongodb+srv://...` (already set)
- `AVALANCHE_RPC_URL` (already set)
- `ESCROW_CONTRACT_ADDRESS` (already set)

#### Frontend (.env)
```bash
cd ../Aura-link-front-end

# For local development, the .env file should contain:
echo "VITE_API_URL=http://localhost:3000" > .env
```

### 3. Start the Applications

#### Terminal 1 - Backend
```bash
cd backend
npm start
```
Expected output:
```
Server is running on port 3000
MongoDB Connected
Contract initialized
Event listener started
```

#### Terminal 2 - Frontend
```bash
cd Aura-link-front-end
npm run dev
```
Expected output:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 4. Access the Application

1. Open browser: `http://localhost:5173`
2. Connect your wallet (MetaMask/Core)
3. Create your profile (first time users)
4. Start using the platform!

## Verification Checklist

- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] MongoDB connection successful
- [ ] Wallet connected
- [ ] Can view gigs list
- [ ] Can create/view user profile
- [ ] Can apply to gigs
- [ ] Can view applicants (as employer)

## Common Issues & Solutions

### Issue: CORS Error
**Solution:** Ensure backend is running and CORS is properly configured in `backend/index.js`

### Issue: Cannot connect to MongoDB
**Solution:** Check `MONGODB_URI` in backend `.env` file

### Issue: Gigs not loading
**Solution:** 
1. Check browser console for errors
2. Verify backend API is accessible: `curl http://localhost:3000/health`
3. Check frontend .env has correct `VITE_API_URL`

### Issue: Wallet not connecting
**Solution:**
1. Ensure MetaMask/Core extension is installed
2. Switch to Avalanche C-Chain network
3. Refresh the page

## Production Deployment

### Backend (Already deployed)
- URL: `https://aura-link-back-end-ixrn.onrender.com`
- Status: Check `/health` endpoint

### Frontend
For production build:
```bash
cd Aura-link-front-end

# Update .env.production
echo "VITE_API_URL=https://aura-link-back-end-ixrn.onrender.com" > .env.production

# Build
npm run build

# The dist/ folder contains production files
```

Deploy `dist/` folder to:
- Vercel
- Netlify
- GitHub Pages
- Or any static hosting service

## Testing the Integration

### 1. Test User Flow
```bash
# Open http://localhost:5173
# Connect wallet
# Create profile with:
# - Display name
# - Bio
# - Profile image URL
```

### 2. Test Gig Listing
```bash
# The dashboard should show gigs from backend
# Check browser console - should see API call to /api/gigs
```

### 3. Test Gig Application
```bash
# Click on a gig
# Fill out application form
# Submit
# Check backend logs for POST /api/gigs/:id/apply
```

### 4. Test Applicants View
```bash
# As a gig creator (employer)
# Click "View Applicants"
# Should see list of applicants
# Can assign worker
```

## API Testing with cURL

Test backend endpoints directly:

```bash
# Health check
curl http://localhost:3000/health

# Get all gigs
curl http://localhost:3000/api/gigs

# Get user profile (replace ADDRESS)
curl http://localhost:3000/api/users/0xYourAddress

# Create gig
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0xYourAddress",
    "title": "Test Gig",
    "description": "Test description",
    "paymentAmount": "100",
    "deadline": 7
  }'
```

## Development Workflow

1. **Make changes to backend:**
   - Edit files in `backend/`
   - Restart server: `Ctrl+C` then `npm start`

2. **Make changes to frontend:**
   - Edit files in `Aura-link-front-end/src/`
   - Vite will auto-reload (hot module replacement)

3. **Database changes:**
   - Models are in `backend/models/`
   - MongoDB will auto-sync schema

## Additional Resources

- Backend API Reference: `backend/API_REFERENCE.md`
- Integration Guide: `INTEGRATION_COMPLETE.md`
- Blockchain Integration: `backend/BLOCKCHAIN_INTEGRATION.md`
- Smart Contracts: `contracts/README.md`

## Support

If you encounter issues:
1. Check console logs (both browser and terminal)
2. Verify environment variables
3. Ensure MongoDB is accessible
4. Test API endpoints with cURL
5. Check CORS configuration

Happy coding! 🚀
