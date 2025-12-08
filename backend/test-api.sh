# Setup env vars
export BASE=http://localhost:3000
export JSON='Content-Type: application/json'

# IMPORTANT: Set these before running the script
# export ADMIN_KEY="your-admin-api-key-here"
# export ADMIN_WALLET="0xYourWalletAddress"

if [ -z "$ADMIN_KEY" ] || [ -z "$ADMIN_WALLET" ]; then
  echo "⚠️  Please set ADMIN_KEY and ADMIN_WALLET environment variables"
  echo "   Example:"
  echo "   export ADMIN_KEY=\"your-admin-key\""
  echo "   export ADMIN_WALLET=\"0xYourAddress\""
  exit 1
fi

# Use admin wallet as both employer and worker for simplicity
export EMPLOYER=$ADMIN_WALLET
export WORKER=$ADMIN_WALLET

# 1. Health check
echo "=== Health Check ==="
curl -s $BASE/health | jq

# 2. Create employer profile
echo -e "\n=== Create Employer Profile ==="
curl -s -X POST $BASE/api/users/profile -H "$JSON" \
  -d '{"address":"'"$EMPLOYER"'","displayName":"Admin Employer","bio":"Test employer account"}' | jq

# 3. Create worker profile (same wallet but separate profile call)
echo -e "\n=== Create Worker Profile ==="
curl -s -X POST $BASE/api/users/profile -H "$JSON" \
  -d '{"address":"'"$WORKER"'","displayName":"Admin Worker","bio":"Test worker account"}' | jq

# 4. Create a gig (corrected JSON - using 0.1 AVAX to stay within balance)
echo -e "\n=== Create Gig ==="
GIG_RESPONSE=$(curl -s -X POST $BASE/api/gigs -H "$JSON" \
  -d '{"employer":"'"$EMPLOYER"'","title":"Build landing page","description":"Static site","paymentAmount":"0.1","requiredBadge":"React","deadline":7}')
echo $GIG_RESPONSE | jq
GIG_ID=$(echo $GIG_RESPONSE | jq -r '.gig._id')
echo "Gig ID: $GIG_ID"

# 5. Get all gigs
echo -e "\n=== Get All Gigs ==="
curl -s "$BASE/api/gigs?limit=5" | jq

# 6. Apply to the gig (as worker - use dummy payment hash for testing)
echo -e "\n=== Apply to Gig ==="
curl -s -X POST $BASE/api/gigs/$GIG_ID/apply -H "$JSON" \
  -d '{"workerId":"'"$WORKER"'","coverLetter":"I can build this landing page","estimatedTime":3,"paymentTxHash":"0xDUMMY_PAYMENT_HASH_123"}' | jq

# 7. Assign worker to gig (as employer)
echo -e "\n=== Assign Worker ==="
curl -s -X POST $BASE/api/gigs/$GIG_ID/assign -H "$JSON" \
  -d '{"workerId":"'"$WORKER"'"}' | jq

# 8. Submit work (update status to SUBMITTED)
echo -e "\n=== Submit Work ==="
curl -s -X PATCH $BASE/api/gigs/$GIG_ID/status -H "$JSON" \
  -d '{"status":"SUBMITTED"}' | jq

# 9. Complete gig (employer approves)
echo -e "\n=== Complete Gig ==="
curl -s -X PATCH $BASE/api/gigs/$GIG_ID/status -H "$JSON" \
  -d '{"status":"COMPLETED"}' | jq

# 10. Get user's completed work
echo -e "\n=== Get Completed Gigs ==="
curl -s "$BASE/api/users/$WORKER/completed" | jq

# 11. Get badge types
echo -e "\n=== Get Badge Types ==="
curl -s "$BASE/api/badges/types" | jq

# 12. Submit badge verification
echo -e "\n=== Submit Badge Verification ==="
BADGE_RESPONSE=$(curl -s -X POST $BASE/api/badges/verify -H "$JSON" \
  -d '{"userAddress":"'"$WORKER"'","skillName":"React","portfolioUrl":"https://example.com","githubUrl":"https://github.com/admin","linkedinUrl":"https://linkedin.com/in/admin","paymentTxHash":"0xBADGE_PAYMENT_HASH"}')
echo $BADGE_RESPONSE | jq
VERIFICATION_ID=$(echo $BADGE_RESPONSE | jq -r '.verificationId')

# 13. Admin: Get pending verifications
echo -e "\n=== Admin: Pending Verifications ==="
curl -s "$BASE/api/admin/verifications/pending" -H "x-admin-key: $ADMIN_KEY" | jq

# 14. Admin: Approve badge verification
echo -e "\n=== Admin: Approve Verification ==="
curl -s -X POST "$BASE/api/admin/verifications/$VERIFICATION_ID/approve" \
  -H "$JSON" -H "x-admin-key: $ADMIN_KEY" \
  -d '{"adminNotes":"Verified portfolio and GitHub"}' | jq

# 15. Get user badges
echo -e "\n=== Get User Badges ==="
curl -s "$BASE/api/badges/$WORKER" | jq

# 16. Get subscription pricing
echo -e "\n=== Subscription Pricing ==="
curl -s "$BASE/api/subscriptions/pricing" | jq

# 17. Get platform stats
echo -e "\n=== Platform Stats ==="
curl -s "$BASE/api/stats" | jq

# 18. Admin dashboard
echo -e "\n=== Admin Dashboard ==="
curl -s "$BASE/api/admin/dashboard" -H "x-admin-key: $ADMIN_KEY" | jq