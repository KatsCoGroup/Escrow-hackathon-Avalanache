# Blockchain Integration Guide

## Overview

The backend now has full bidirectional integration with the Escrow smart contract on Avalanche Fuji testnet. This enables:

1. **Contract Interaction**: Backend can create gigs, assign workers, submit work, release payments, and cancel gigs on-chain
2. **Event Listening**: Backend automatically syncs contract events to MongoDB in real-time
3. **Dual State**: Gigs exist both on-chain (immutable escrow) and off-chain (rich marketplace data)

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Frontend      │         │     Backend      │         │  Escrow.sol     │
│                 │────────▶│                  │────────▶│  (Avalanche)    │
│                 │         │  MongoDB + API   │         │                 │
│                 │◀────────│                  │◀────────│  Event Emitter  │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                    │                             │
                                    │                             │
                                    ▼                             ▼
                            escrowContract.js              escrowListener.js
                            (Write to chain)               (Listen to events)
```

## Services

### 1. `services/escrowContract.js` - Contract Interaction

**Purpose**: Send transactions to the Escrow contract

**Functions**:
- `initializeContract()` - Initialize provider and signer
- `createGigOnChain(employer, worker, amount)` - Create gig with AVAX payment locked in escrow
- `assignWorkerOnChain(gigId, worker)` - Assign worker to existing gig
- `submitWorkOnChain(gigId)` - Worker marks work as complete
- `approveAndPayOnChain(gigId)` - Employer approves and releases AVAX to worker
- `cancelGigOnChain(gigId)` - Cancel gig and refund employer
- `getGigFromChain(gigId)` - Read gig details from contract

**Requirements**:
- `ESCROW_CONTRACT_ADDRESS` - Deployed contract address
- `ADMIN_PRIVATE_KEY` - Wallet private key with AVAX for gas
- `AVALANCHE_RPC_URL` - RPC endpoint (Fuji testnet)

### 2. `services/escrowListener.js` - Event Monitoring

**Purpose**: Listen for contract events and sync to MongoDB

**Event Handlers**:
- `GigCreated` → Create/update Gig with `blockchainGigId`
- `WorkerAssigned` → Update Gig status to `ASSIGNED`
- `WorkSubmitted` → Update Gig status to `SUBMITTED`
- `PaymentReleased` → Update Gig status to `COMPLETED`, update worker earnings
- `GigCancelled` → Update Gig status to `CANCELLED`

**Auto-reconnection**: Handles provider errors and reconnects automatically

## Setup Instructions

### 1. Deploy Escrow Contract

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network fuji
```

Copy the deployed contract address.

### 2. Configure Environment Variables

Update `backend/.env`:

```env
# Escrow Contract
ESCROW_CONTRACT_ADDRESS=0x1234...abcd  # From deployment
ADMIN_PRIVATE_KEY=0xabc...def          # Wallet with AVAX for gas

# Already configured
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113
```

### 3. Get Test AVAX

Visit [Avalanche Fuji Faucet](https://faucet.avax.network/) and get test AVAX for your admin wallet.

### 4. Start Backend

```bash
cd backend
npm install
npm start
```

You should see:
```
✅ Escrow contract initialized: 0x1234...abcd
✅ Escrow event listener started: 0x1234...abcd
```

## Integration Points

### POST /api/gigs (Create Gig)

**Before**: Only created gig in MongoDB
**After**: 
1. Creates gig in MongoDB
2. Calls `createGigOnChain()` to lock payment in escrow
3. Returns blockchain transaction details
4. Event listener updates MongoDB with `blockchainGigId` when transaction confirms

**Request**:
```json
{
  "employer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "title": "Build landing page",
  "description": "Need React developer",
  "paymentAmount": "0.1",
  "deadline": 7
}
```

**Response**:
```json
{
  "success": true,
  "message": "Gig created successfully on blockchain",
  "gig": { ... },
  "blockchain": {
    "gigId": 1,
    "txHash": "0xabc123...",
    "blockNumber": 12345678
  }
}
```

### POST /api/gigs/:gigId/assign (Assign Worker)

**Before**: Only updated MongoDB
**After**:
1. Updates MongoDB status to `ASSIGNED`
2. Calls `assignWorkerOnChain()` if `blockchainGigId` exists
3. Event listener confirms update when transaction confirms

### PATCH /api/gigs/:gigId/status (Update Status)

**Before**: Only updated MongoDB
**After**:
- `SUBMITTED` → Calls `submitWorkOnChain()`
- `COMPLETED` → Calls `approveAndPayOnChain()` (releases AVAX to worker)
- `CANCELLED` → Calls `cancelGigOnChain()` (refunds employer)

## Data Model

### MongoDB Gig Document

```javascript
{
  _id: ObjectId("..."),
  blockchainGigId: 1,              // Links to contract gigId
  employer: "0x742d35...",
  worker: "0x8f56c2...",
  title: "Build landing page",
  description: "Need React developer",
  paymentAmount: "0.1",            // AVAX amount
  status: "ASSIGNED",              // OPEN|ASSIGNED|SUBMITTED|COMPLETED|CANCELLED
  requiredBadge: "verified-dev",
  deadline: 7,
  featured: false,
  urgent: false,
  applications: [],
  createdAt: ISODate("..."),
  completedAt: null
}
```

### Smart Contract Gig Struct

```solidity
struct Gig {
  uint256 gigId;
  address employer;
  address worker;
  uint256 paymentAmount;  // AVAX in wei
  GigStatus status;       // 0=OPEN, 1=ASSIGNED, 2=SUBMITTED, 3=COMPLETED, 4=CANCELLED
  uint256 createdAt;
  uint256 completedAt;
}
```

## Flow Examples

### Complete Gig Lifecycle

1. **Employer creates gig**:
   - Frontend → `POST /api/gigs` with `paymentAmount: "0.1"`
   - Backend creates MongoDB document
   - Backend calls `createGigOnChain()` → locks 0.1 AVAX in contract
   - Contract emits `GigCreated(gigId=1, employer, worker=0x0, amount=0.1)`
   - Event listener updates MongoDB: `blockchainGigId: 1`

2. **Worker applies**:
   - Frontend → `POST /api/gigs/1/apply` with `workerId: "0x8f56..."`
   - Backend adds to `applications[]` array in MongoDB (off-chain only)

3. **Employer assigns worker**:
   - Frontend → `POST /api/gigs/1/assign` with `workerId: "0x8f56..."`
   - Backend updates MongoDB: `worker: "0x8f56...", status: "ASSIGNED"`
   - Backend calls `assignWorkerOnChain(1, "0x8f56...")`
   - Contract emits `WorkerAssigned(gigId=1, worker=0x8f56...)`
   - Event listener confirms MongoDB update

4. **Worker submits work**:
   - Frontend → `PATCH /api/gigs/1/status` with `status: "SUBMITTED"`
   - Backend updates MongoDB: `status: "SUBMITTED"`
   - Backend calls `submitWorkOnChain(1)`
   - Contract emits `WorkSubmitted(gigId=1)`

5. **Employer approves**:
   - Frontend → `PATCH /api/gigs/1/status` with `status: "COMPLETED"`
   - Backend updates MongoDB: `status: "COMPLETED"`
   - Backend calls `approveAndPayOnChain(1)`
   - Contract transfers 0.1 AVAX to worker
   - Contract emits `PaymentReleased(gigId=1, worker=0x8f56..., amount=0.1)`
   - Event listener confirms completion and updates worker earnings

## Error Handling

### Blockchain Transaction Failures

If on-chain transaction fails (e.g., insufficient gas, network error):
- MongoDB gig is still created/updated
- API returns success with `blockchain.error` field
- Frontend can retry blockchain operation separately
- Event listener will sync when transaction eventually succeeds

Example:
```json
{
  "success": true,
  "message": "Gig created in database. Lock payment on blockchain separately.",
  "gig": { ... },
  "blockchain": {
    "error": "Insufficient funds for gas"
  }
}
```

### Event Listener Downtime

If backend crashes or listener stops:
- On-chain state remains correct (escrow still holds funds)
- When listener restarts, it catches up with past events
- Use `getGigFromChain(gigId)` to manually sync specific gigs

## Testing

### Test Contract Interaction

```javascript
const { createGigOnChain } = require('./services/escrowContract');

// Create gig with 0.05 AVAX payment
const result = await createGigOnChain(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',  // employer
  null,                                          // no worker yet
  '0.05'                                         // payment amount
);

console.log('Gig created:', result.gigId, result.txHash);
```

### Test Event Listener

1. Start backend: `npm start`
2. Watch logs for event messages:
   ```
   📢 GigCreated event: gigId=1, employer=0x742d35...
   ✅ Updated gig 65abc... with blockchainGigId 1
   ```
3. Create gig via frontend or curl
4. Verify MongoDB document has `blockchainGigId` populated

## Monitoring

### Check Contract State

```bash
# Get gig details from contract
curl http://localhost:3000/api/gigs/blockchain/:gigId

# Compare with MongoDB
curl http://localhost:3000/api/gigs/:mongoId
```

### Event Listener Health

The listener auto-reconnects on errors. Check logs for:
- `✅ Escrow event listener started` - Listener active
- `🔄 Attempting to reconnect event listener...` - Recovering from error
- `❌ Failed to start event listener` - Configuration issue (check env vars)

## Security Notes

1. **Private Keys**: Never commit `ADMIN_PRIVATE_KEY` to version control
2. **Gas Management**: Monitor admin wallet AVAX balance for gas fees
3. **Escrow Safety**: Contract holds real AVAX - audit thoroughly before mainnet
4. **Worker Signatures**: In production, workers should sign their own transactions (not admin)

## Next Steps

1. Deploy contract to Fuji testnet
2. Update `.env` with contract address and private key
3. Test end-to-end gig flow
4. Monitor event listener logs during testing
5. Consider adding webhook notifications for critical events
6. Add admin dashboard to view on-chain vs off-chain state

## Troubleshooting

**Event listener not starting**:
- Check `ESCROW_CONTRACT_ADDRESS` is set
- Check `AVALANCHE_RPC_URL` is accessible
- Verify contract is deployed to Fuji (not mainnet)

**Transactions failing**:
- Check admin wallet has AVAX for gas
- Verify `ADMIN_PRIVATE_KEY` is correct
- Ensure contract address matches deployed contract

**Events not syncing to MongoDB**:
- Check event listener is running (look for `✅ Escrow event listener started`)
- Verify MongoDB connection is active
- Check for error logs in console
- Try manual sync: call `getGigFromChain(gigId)` and compare
