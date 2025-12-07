# ProjectX API Quick Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints don't require auth. Admin endpoints require:
- Header: `x-admin-key: your-secret-admin-key`
- OR Query param: `?adminKey=your-secret-admin-key`

## Error Handling

### HTTP 402 Payment Required
When payment is needed:
```json
{
  "success": false,
  "code": "PAYMENT_REQUIRED",
  "message": "This action requires a payment of X USDC",
  "payment": {
    "amount": "0.50",
    "currency": "USDC",
    "description": "...",
    "type": "featured_gig|urgent_gig|application_fee|...",
    "facilitator": {
      "name": "Ultravioleta",
      "endpoint": "https://x402.ultravioleta.io",
      "chainId": "43113"
    }
  }
}
```

Response with payment tx hash:
```bash
# Add to request body or header
{
  "paymentTxHash": "0xabc123..."
}
# OR
curl ... -H "x-payment-txhash: 0xabc123..."
```

---

## GIGS API

### Browse Gigs
```
GET /gigs?status=OPEN&limit=20&skip=0
```
Filters: `status`, `requiredBadge`, `featured`

### Create Gig (FREE)
```
POST /gigs
{
  "employer": "0x...",
  "title": "Build a Website",
  "description": "Need a responsive website",
  "paymentAmount": "0.5",
  "requiredBadge": "Web Development",
  "deadline": 7
}
```

### Feature Gig ($0.50 USDC)
```
POST /gigs/{gigId}/feature
{
  "paymentTxHash": "0x..."  // Only if payment needed
}
```

### Mark Urgent ($1.00 USDC)
```
POST /gigs/{gigId}/urgent
{
  "paymentTxHash": "0x..."
}
```

### Apply to Gig ($0.02 USDC, FREE for subscribers)
```
POST /gigs/{gigId}/apply
{
  "workerId": "0x...",
  "coverLetter": "I can do this!",
  "estimatedTime": 3,
  "paymentTxHash": "0x..."  // If needed
}
```

### Assign Worker
```
POST /gigs/{gigId}/assign
{
  "workerId": "0x..."
}
```

### Update Gig Status
```
PATCH /gigs/{gigId}/status
{
  "status": "OPEN|ASSIGNED|SUBMITTED|COMPLETED|CANCELLED"
}
```

---

## USERS API

### Create/Update Profile
```
POST /users/profile
{
  "address": "0x...",
  "displayName": "John Doe",
  "bio": "Full-stack developer",
  "profileImage": "https://..."
}
```

### Get User Profile
```
GET /users/{address}
```

### Get Applied Gigs
```
GET /users/{address}/applied
```

### Get Posted Gigs
```
GET /users/{address}/gigs
```

### Get Completed Work
```
GET /users/{address}/completed
```

---

## BADGES API

### List Badge Types
```
GET /badges/types
```

Response:
```json
{
  "success": true,
  "badgeTypes": [
    "Web Development", "React", "Node.js", ...
  ]
}
```

### Get User Badges
```
GET /badges/{address}
```

### Submit Badge Verification ($5 USDC)
```
POST /badges/verify
{
  "userAddress": "0x...",
  "skillName": "React",
  "portfolioUrl": "https://...",
  "githubUrl": "https://github.com/...",
  "linkedinUrl": "https://linkedin.com/...",
  "paymentTxHash": "0x..."  // Required
}
```

### Check Verification Status
```
GET /badges/verification/{verificationId}
```

### Get Pending Verifications
```
GET /badges/{address}/pending
```

---

## SUBSCRIPTIONS API

### Get Pricing
```
GET /subscriptions/pricing
```

### Get User Subscription Status
```
GET /subscriptions/{address}
```

### Buy Monthly Pro ($9.99 USDC)
```
POST /subscriptions/monthly/purchase
{
  "userAddress": "0x...",
  "paymentTxHash": "0x..."  // Required
}
```

### Buy Community NFT ($49.00 USDC)
```
POST /subscriptions/community-nft/purchase
{
  "userAddress": "0x...",
  "paymentTxHash": "0x..."  // Required
}
```

---

## STATISTICS API

### Overall Stats
```
GET /stats
```

### Gig Statistics
```
GET /stats/gigs
```

### Revenue Statistics
```
GET /stats/revenue?days=30
```

### User Statistics
```
GET /stats/users
```

---

## ADMIN API

### Get Pending Verifications
```
GET /admin/verifications/pending
```
Headers: `x-admin-key: secret`

### Get Specific Verification
```
GET /admin/verifications/{verificationId}
```

### Approve Badge Verification
```
POST /admin/verifications/{verificationId}/approve
{
  "adminNotes": "Portfolio looks great!"
}
```

### Reject Badge Verification
```
POST /admin/verifications/{verificationId}/reject
{
  "adminNotes": "Need more portfolio examples",
  "refundReason": "Insufficient portfolio"
}
```

### Get All Verifications (with filters)
```
GET /admin/verifications?status=pending&skillName=React&limit=50
```

### Admin Dashboard
```
GET /admin/dashboard
```

---

## Common Wallet Address Format

Must be valid Ethereum address:
```
0x1234567890123456789012345678901234567890
```

- Starts with `0x`
- Followed by 40 hexadecimal characters
- Case-insensitive

---

## Payment Flow Example

### 1. Try to Feature a Gig (Without Payment)
```bash
curl -X POST http://localhost:3000/api/gigs/abc123/feature \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:
```json
{
  "success": false,
  "code": "PAYMENT_REQUIRED",
  "message": "...",
  "payment": {
    "amount": "0.50",
    "currency": "USDC",
    ...
  }
}
```

### 2. User Confirms Payment in Wallet
- Frontend shows modal
- User confirms tx in MetaMask
- Gets tx hash: `0xabc123...`

### 3. Retry with Payment
```bash
curl -X POST http://localhost:3000/api/gigs/abc123/feature \
  -H "Content-Type: application/json" \
  -H "x-payment-txhash: 0xabc123..." \
  -d '{
    "paymentTxHash": "0xabc123..."
  }'
```

Response:
```json
{
  "success": true,
  "message": "Gig featured successfully",
  "gig": {...},
  "featuredUntil": "2025-12-09T..."
}
```

---

## Response Format

All responses follow this format:

```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": {}  // Varies by endpoint
}
```

---

## Subscription Benefits

### Monthly ($9.99/month)
- FREE gig applications
- FREE featured gig per month
- Priority support
- Advanced search filters

### Community NFT ($49 one-time)
- ALL Monthly benefits
- Exclusive NFT membership
- Community access
- Lifetime free applications
- Custom badge

### Free Access
- Free gig posting
- Browse gigs (unlimited)
- View badges
- View platform statistics

---

## Testing Endpoints Locally

### 1. Create a User
```bash
curl -X POST http://localhost:3000/api/users/profile \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234567890123456789012345678901234567890",
    "displayName": "Test User",
    "bio": "Testing"
  }'
```

### 2. Create a Gig
```bash
curl -X POST http://localhost:3000/api/gigs \
  -H "Content-Type: application/json" \
  -d '{
    "employer": "0x1234567890123456789012345678901234567890",
    "title": "Test Gig",
    "description": "Test Description",
    "paymentAmount": "0.5",
    "deadline": 7
  }'
```

### 3. Browse Gigs
```bash
curl http://localhost:3000/api/gigs
```

### 4. Check Stats
```bash
curl http://localhost:3000/api/stats
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 402 | Payment Required |
| 403 | Unauthorized |
| 404 | Not Found |
| 500 | Server Error |

---

## Rate Limiting

Currently disabled. Production should implement:
- 100 requests per minute per IP
- 1000 requests per minute per API key
- 10,000 requests per day per user

---

## CORS

Enabled for all origins. In production, restrict to:
```
ALLOWED_ORIGINS=https://projectx.com,https://app.projectx.com
```
