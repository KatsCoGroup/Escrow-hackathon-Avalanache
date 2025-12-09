#!/bin/bash
# Test script for existing blockchain gig
# Uses the newly created gig with on-chain escrow

# Setup
export BASE=http://localhost:3000
export JSON='Content-Type: application/json'

# IMPORTANT: Set these before running the script
# export ADMIN_KEY="your-admin-api-key-here"
# export EMPLOYER="0xYourEmployerAddress"
# export WORKER="0xYourWorkerAddress"

if [ -z "$ADMIN_KEY" ] || [ -z "$EMPLOYER" ] || [ -z "$WORKER" ]; then
  echo "⚠️  Please set ADMIN_KEY, EMPLOYER, and WORKER environment variables"
  echo "   Example:"
  echo "   export ADMIN_KEY=\"your-admin-key\""
  echo "   export EMPLOYER=\"0xYourAddress\""
  echo "   export WORKER=\"0xYourAddress\""
  exit 1
fi

# Get the latest gig ID
echo "=== Fetching Latest Gig ==="
GIG_RESPONSE=$(curl -s "$BASE/api/gigs?limit=1")
GIG_ID=$(echo $GIG_RESPONSE | jq -r '.gigs[0]._id')
BLOCKCHAIN_GIG_ID=$(echo $GIG_RESPONSE | jq -r '.gigs[0].blockchainGigId')

echo "Database Gig ID: $GIG_ID"
echo "Blockchain Gig ID: $BLOCKCHAIN_GIG_ID"
echo $GIG_RESPONSE | jq '.gigs[0]'

# 1. View gig details
echo -e "\n=== Get Gig Details ==="
curl -s "$BASE/api/gigs/$GIG_ID" | jq

# 2. Apply to gig (as worker)
echo -e "\n=== Apply to Gig (Worker) ==="
curl -s -X POST "$BASE/api/gigs/$GIG_ID/apply" -H "$JSON" \
  -d '{"workerId":"'"$WORKER"'","coverLetter":"I am ready to work on this blockchain gig","estimatedTime":2,"paymentTxHash":"0xAPPLICATION_PAYMENT"}' | jq

# 3. View applications
echo -e "\n=== View Gig After Application ==="
curl -s "$BASE/api/gigs/$GIG_ID" | jq '.gig.applications'

# 4. Assign worker (employer action)
echo -e "\n=== Assign Worker (Employer) ==="
ASSIGN_RESPONSE=$(curl -s -X POST "$BASE/api/gigs/$GIG_ID/assign" -H "$JSON" \
  -d '{"workerId":"'"$WORKER"'"}')
echo $ASSIGN_RESPONSE | jq

# Check blockchain result
BLOCKCHAIN_TX=$(echo $ASSIGN_RESPONSE | jq -r '.blockchain.txHash')
if [ "$BLOCKCHAIN_TX" != "null" ] && [ "$BLOCKCHAIN_TX" != "" ]; then
  echo "✅ Worker assigned on blockchain!"
  echo "   Transaction: $BLOCKCHAIN_TX"
fi

# 5. Check gig status
echo -e "\n=== Gig Status After Assignment ==="
curl -s "$BASE/api/gigs/$GIG_ID" | jq '{status: .gig.status, worker: .gig.worker, blockchainGigId: .gig.blockchainGigId}'

# 6. Submit work (worker action)
echo -e "\n=== Submit Work (Worker) ==="
SUBMIT_RESPONSE=$(curl -s -X PATCH "$BASE/api/gigs/$GIG_ID/status" -H "$JSON" \
  -d '{"status":"SUBMITTED"}')
echo $SUBMIT_RESPONSE | jq

SUBMIT_TX=$(echo $SUBMIT_RESPONSE | jq -r '.blockchain.txHash')
if [ "$SUBMIT_TX" != "null" ] && [ "$SUBMIT_TX" != "" ]; then
  echo "✅ Work submitted on blockchain!"
  echo "   Transaction: $SUBMIT_TX"
fi

# 7. View submitted gig
echo -e "\n=== Gig After Work Submission ==="
curl -s "$BASE/api/gigs/$GIG_ID" | jq '{status: .gig.status, completedAt: .gig.completedAt}'

# 8. Approve and pay (employer action - releases escrow)
echo -e "\n=== Approve & Release Payment (Employer) ==="
COMPLETE_RESPONSE=$(curl -s -X PATCH "$BASE/api/gigs/$GIG_ID/status" -H "$JSON" \
  -d '{"status":"COMPLETED"}')
echo $COMPLETE_RESPONSE | jq

PAYMENT_TX=$(echo $COMPLETE_RESPONSE | jq -r '.blockchain.txHash')
if [ "$PAYMENT_TX" != "null" ] && [ "$PAYMENT_TX" != "" ]; then
  echo "🎉 Payment released on blockchain!"
  echo "   Transaction: $PAYMENT_TX"
  echo "   Check on Snowtrace: https://testnet.snowtrace.io/tx/$PAYMENT_TX"
fi

# 9. Final gig state
echo -e "\n=== Final Gig State ==="
curl -s "$BASE/api/gigs/$GIG_ID" | jq '{
  _id: .gig._id,
  title: .gig.title,
  status: .gig.status,
  employer: .gig.employer,
  worker: .gig.worker,
  paymentAmount: .gig.paymentAmount,
  blockchainGigId: .gig.blockchainGigId,
  createdAt: .gig.createdAt,
  completedAt: .gig.completedAt
}'

# 10. Check worker's completed gigs
echo -e "\n=== Worker Completed Gigs ==="
curl -s "$BASE/api/users/$WORKER/completed" | jq '.count, .completedGigs[0].title'

# 11. Platform stats
echo -e "\n=== Platform Stats ==="
curl -s "$BASE/api/stats" | jq '.stats.gigs'

echo -e "\n✅ Complete gig lifecycle test finished!"
