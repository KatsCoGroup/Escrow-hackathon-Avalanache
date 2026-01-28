# Frontend-Backend Integration Guide

## Overview
This document describes the complete integration between the Aura Link frontend and backend, removing all mock data and establishing live API connections.

## Changes Made

### 1. API Service Layer (`/src/services/api.ts`)
Created a centralized API service that handles all backend communication:
- **User API**: Profile management, fetching user data
- **Gig API**: Create, fetch, apply, assign, submit, approve, cancel gigs
- **Badge API**: Verify and fetch user badges
- **Stats API**: Platform and user statistics

**Key Features:**
- Type-safe API calls with TypeScript interfaces
- Centralized error handling
- Environment-based URL configuration
- Support for 402 Payment Required responses

### 2. Environment Configuration
Created environment files for different deployment scenarios:

- `.env` - Development (points to `http://localhost:3000`)
- `.env.local` - Local override
- `.env.production` - Production (points to deployed backend)

**Usage:**
```bash
# Development
npm run dev

# Production build
npm run build
```

### 3. Updated Components

#### User Authentication (`/src/hooks/use-user-auth.tsx`)
- Removed hardcoded API calls
- Now uses `userAPI` from service layer
- Properly handles user creation and profile fetching
- Better error handling for 404 (new user) vs other errors

#### Dashboard (`/src/components/CryptoDashboard/index.tsx`)
- Removed mock gig data
- Fetches real gigs from backend via `gigAPI.getGigs()`
- Displays loading states and error messages
- Passes proper gigId to child components

#### Gig Card (`/src/components/CryptoDashboard/GigCard.tsx`)
- Updated props to accept `gigId` (string) instead of `id` (number)
- Added title display
- Correctly identifies employer vs applicant actions

#### Gig Application (`/src/components/CryptoDashboard/GigApplication.tsx`)
- Removed hardcoded API URL
- Uses `gigAPI.applyToGig()` from service layer
- Handles 402 Payment Required responses
- Supports x402 payment flow

#### Gig Applicants (`/src/components/CryptoDashboard/GigApplicants.tsx`)
- Removed mock applicant data
- Fetches real applicants from backend
- Displays real wallet addresses and cover letters
- Implements worker assignment via `gigAPI.assignWorker()`
- Shows loading and error states

### 4. Backend CORS Configuration (`backend/index.js`)
Updated CORS settings to allow frontend origins:
- Local development ports (5173, 4173, 3000)
- Production URLs (Vercel, Render)
- Environment-based custom URLs
- Proper headers and methods support

## API Endpoints Used

### User Endpoints
- `GET /api/users/:address` - Get user profile
- `POST /api/users/profile` - Create/update user profile
- `GET /api/users/:address/applied` - Get user's applied gigs
- `GET /api/users/:address/gigs` - Get user's posted gigs

### Gig Endpoints
- `GET /api/gigs` - List all gigs (with optional filters)
- `GET /api/gigs/:gigId` - Get single gig details
- `POST /api/gigs` - Create new gig
- `POST /api/gigs/:gigId/apply` - Apply to a gig
- `POST /api/gigs/:gigId/assign` - Assign worker to gig
- `POST /api/gigs/:gigId/submit` - Submit work
- `POST /api/gigs/:gigId/approve` - Approve and pay
- `POST /api/gigs/:gigId/cancel` - Cancel gig

### Badge Endpoints
- `GET /api/badges/user/:address` - Get user's badges
- `POST /api/badges/verify` - Verify badge ownership

### Stats Endpoints
- `GET /api/stats/platform` - Get platform statistics
- `GET /api/stats/user/:address` - Get user statistics

## Type Definitions

All API types are defined in `/src/services/api.ts`:
- `User` - User profile structure
- `Gig` - Gig details and status
- `GigsResponse` - Paginated gigs response
- `UserResponse` - User API response
- `ApiResponse<T>` - Generic API response wrapper

## Running the Application

### Development Setup

1. **Backend:**
```bash
cd backend
npm install
npm start
# Runs on http://localhost:3000
```

2. **Frontend:**
```bash
cd Aura-link-front-end
npm install
npm run dev
# Runs on http://localhost:5173
```

### Production Deployment

1. **Backend:**
   - Deployed on Render: `https://aura-link-back-end-ixrn.onrender.com`
   - MongoDB Atlas connected
   - Environment variables configured

2. **Frontend:**
   - Update `.env.production` with backend URL
   - Build: `npm run build`
   - Deploy to Vercel or similar

## Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000  # or production URL
```

### Backend (.env)
```bash
PORT=3000
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=http://localhost:5173  # Optional custom frontend URL
# ... other blockchain and service configs
```

## Testing the Integration

1. **Connect Wallet**: Use MetaMask or Core wallet
2. **Create Profile**: First-time users will be prompted to create a profile
3. **View Gigs**: All gigs are fetched from MongoDB
4. **Apply to Gig**: Submit application with cover letter
5. **View Applicants** (as employer): See real applicants and assign workers
6. **Blockchain Integration**: Gigs sync with smart contract events

## Mock Data Removed

All mock data has been removed from:
- ✅ User profiles (now fetched from backend)
- ✅ Gig listings (now fetched from backend)
- ✅ Gig applicants (now fetched from backend)
- ✅ Applications (now submitted to backend)

The Markets component still uses static crypto price data as that's not part of the core gig platform functionality.

## Error Handling

The integration includes proper error handling:
- Network errors
- 404 Not Found (e.g., new user)
- 402 Payment Required (for paid features)
- 500 Server errors
- Validation errors

All errors are logged to console and displayed to users appropriately.

## Next Steps

To extend the integration:
1. Add gig creation form (uses `gigAPI.createGig()`)
2. Add work submission UI (uses `gigAPI.submitWork()`)
3. Add gig approval UI (uses `gigAPI.approveGig()`)
4. Implement stats dashboard (uses `statsAPI`)
5. Add badge verification UI (uses `badgeAPI`)

## Troubleshooting

### CORS Errors
- Ensure backend is running
- Check frontend URL is in backend's allowed origins
- Clear browser cache

### API Connection Issues
- Verify `VITE_API_URL` in frontend .env
- Check backend is accessible at the URL
- Test backend health: `GET /health`

### Authentication Issues
- Ensure wallet is connected
- Check wallet address is lowercase in both frontend and backend
- Verify MongoDB connection

## Support

For issues or questions:
- Check browser console for errors
- Check backend logs
- Verify MongoDB connection
- Ensure all environment variables are set correctly
