# CyberDope Payment System Documentation

## Current State: What Actually Exists

### Frontend
- ✅ **TipModal.tsx** - UI component with hardcoded amounts ($1, $5, $10, $20)
- ✅ **WalletConnect.tsx** - MetaMask wallet integration (balance display, connection)
- ✅ **Nav bar "Tip" button** - Triggers TipModal
- ❌ **Payment processing** - No actual transaction handling
- ❌ **Error handling** - TipModal doesn't validate or submit anything
- ❌ **Success/failure flows** - Clicking "Send Tip" does nothing

### Backend
- ✅ **Wallet API stub** - `/api/wallet/balance` exists, returns mock data
- ❌ **Stripe integration** - Not installed, no routes
- ❌ **Payment processing** - No transaction endpoint
- ❌ **Payout system** - No creator payment distribution
- ❌ **Transaction history** - No database collection

### Database
- ❌ **Transactions collection** - Doesn't exist
- ❌ **Creator payouts** - No payout tracking
- ❌ **User wallet/payment info** - No payment method storage
- ❌ **Subscription tracking** - No subscriber model

---

## Design Decision: Coinbase vs Stripe

**Decision Made:** Use Coinbase Commerce instead of Stripe
- **Why:** No NSFW restrictions (unlike Stripe which has adult content restrictions)
- **Benefit:** Can accept tips without content filtering concerns
- **Trade-off:** Smaller payment processor, less mature than Stripe

---

## Implementation Plan: Make Tips Work

### Phase 1: Backend Setup (2-3 hours)

#### 1.1 Install Dependencies
```bash
npm install coinbase-commerce-node dotenv
```

#### 1.2 Create Payment Model (Backend)
**File:** `backend/models/Payment.js`
```javascript
const paymentSchema = new Schema({
  senderId: ObjectId,           // User sending tip
  receiverId: ObjectId,         // Creator receiving tip
  postId: ObjectId,             // Which post they tipped on
  amount: number,               // In USD ($1, $5, $10, $20)
  currency: string,             // 'USD'
  status: enum(['pending', 'completed', 'failed', 'refunded']),
  
  // Coinbase data
  chargeId: string,             // Coinbase charge ID
  chargeCode: string,           // Short code for user
  checkoutUrl: string,          // Link to payment page
  
  // Crypto data (if paid in crypto)
  cryptoAmount: string,         // Amount in token (ETH, USDC, etc)
  cryptoToken: string,          // Which token used
  txHash: string,               // Blockchain tx hash
  
  // Timestamps
  createdAt: Date,
  completedAt: Date,
  expiresAt: Date               // Payment link expires
});
```

#### 1.3 Create Payment Routes
**File:** `backend/routes/payments.js`
```javascript
// POST /api/payments/create-charge
// Body: { receiverId, postId, amount }
// Returns: { chargeId, checkoutUrl }

// GET /api/payments/charge/:chargeId
// Returns: { status, amounts, transactions[] }

// POST /api/payments/webhook
// Endpoint for Coinbase to notify of completion
```

#### 1.4 Set Up Coinbase Commerce API
```javascript
// backend/utils/coinbase.js
const Client = require('coinbase-commerce-node').Client;

Client.init(process.env.COINBASE_COMMERCE_KEY);
// Has methods: createCharge(), retrieveCharge(), listCharges()
```

#### 1.5 Create Webhook Handler
```javascript
// routes/payments.js
app.post('/api/payments/webhook', (req, res) => {
  const { data } = req.body;
  
  if (data.event === 'charge:confirmed') {
    // Payment completed
    // 1. Update Payment.status = 'completed'
    // 2. Add amount to creator's balance (pending payout)
    // 3. Send notification email
  }
  
  res.status(200).send('OK');
});
```

#### 1.6 Environment Variables
```bash
COINBASE_COMMERCE_KEY=<api_key>
COINBASE_WEBHOOK_SECRET=<webhook_secret>
```

**Estimated Time:** 1.5 hours

---

### Phase 2: Frontend Integration (2-3 hours)

#### 2.1 Update TipModal.tsx
```javascript
// Current: Button does nothing
// New: Opens Coinbase payment popup or redirects

const TipModal = ({ postId, creatorId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const sendTip = async (amount) => {
    setLoading(true);
    try {
      // 1. Call POST /api/payments/create-charge
      const { chargeId, checkoutUrl } = await api.post(
        '/payments/create-charge',
        { receiverId: creatorId, postId, amount }
      );
      
      // 2. Redirect to Coinbase checkout
      window.open(checkoutUrl, '_blank');
      
      // 3. Poll for completion (optional)
      // Poll /api/payments/charge/{chargeId} every 5s
      // Until status = 'completed'
      
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
};
```

#### 2.2 Add Payment Confirmation
```javascript
// After payment completes (webhook fires)
// Show toast: "Tip sent! Creator will receive X"

// Redirect back to post with: ?payment_status=success
// Clear TipModal
```

#### 2.3 Add Payment History (UI)
```javascript
// Creator profile page new tab: "Earnings"
// Shows tips received, total earnings, pending payout
// GET /api/payments/creator/:userId
```

**Estimated Time:** 1.5 hours

---

### Phase 3: Creator Payouts (3-4 hours)

#### 3.1 Create Payout Model
**File:** `backend/models/Payout.js`
```javascript
const payoutSchema = new Schema({
  creatorId: ObjectId,
  amount: number,               // Total earned
  currency: string,             // USD
  status: enum(['pending', 'processing', 'completed', 'failed']),
  
  // Payment method (will vary)
  paymentMethod: string,        // 'bank_transfer', 'crypto_wallet'
  bankAccount: {
    accountNumber: string,      // Encrypted
    routingNumber: string       // Encrypted
  },
  walletAddress: string,        // For crypto payouts
  
  // Coinbase payout ID (when using their payouts API)
  coinbasePayoutId: string,
  
  // Timestamps
  createdAt: Date,
  processedAt: Date,
  completedAt: Date
});
```

#### 3.2 Payment Method Storage
```javascript
// POST /api/creator/payment-method
// Body: { type: 'bank_transfer' | 'crypto', details: {} }
// Encrypt sensitive data before storing
```

#### 3.3 Payout Processor (Cron Job)
```javascript
// Run daily: node backend/jobs/process-payouts.js
// 1. Find all creators with pending earnings > $50
// 2. Check their payment method
// 3. Initiate payout via Coinbase (if crypto) or bank transfer
// 4. Update Payout.status = 'processing'
// 5. Monitor completion
```

#### 3.4 Payout Routes
```javascript
// GET /api/creator/earnings
// Returns: { totalEarned, pendingPayout, lastPayout }

// POST /api/creator/request-payout
// Triggers manual payout request

// GET /api/creator/payout-history
// Returns: array of Payout records
```

**Estimated Time:** 2 hours

---

### Phase 4: Subscriptions (4-5 hours) - OPTIONAL

If implementing creator subscriptions for recurring revenue:

#### 4.1 Subscription Model
```javascript
const subscriptionSchema = new Schema({
  creatorId: ObjectId,
  subscriberId: ObjectId,
  tier: enum(['tier1', 'tier2', 'tier3']),
  price: number,                // $4.99, $9.99, $19.99
  billingCycle: string,         // 'monthly' | 'yearly'
  status: enum(['active', 'paused', 'cancelled']),
  
  // Coinbase subscription (if available)
  coinbaseSubscriptionId: string,
  nextBillingDate: Date,
  
  createdAt: Date,
  cancelledAt: Date
});
```

#### 4.2 Subscription Routes
```javascript
// POST /api/subscriptions/{creatorId}/{tier}
// GET /api/creator/subscribers
// POST /api/subscriptions/{id}/cancel
```

**This is more complex, estimate 4-5 hours separately.**

---

## Implementation Timeline

| Phase | Component | Effort | Priority |
|-------|-----------|--------|----------|
| 1 | Backend payments setup | 1.5h | **HIGH** |
| 2 | Frontend integration | 1.5h | **HIGH** |
| 3 | Creator payouts | 2h | **MEDIUM** (can defer) |
| 4 | Subscriptions | 4-5h | **LOW** (nice-to-have) |
| - | Testing + debugging | 2h | **HIGH** |
| **TOTAL (Tips Only)** | **5.5-7 hours** | | |
| **TOTAL (Tips + Payouts)** | **7.5-9 hours** | | |
| **TOTAL (Full System)** | **11-15 hours** | | |

---

## Coinbase Commerce Integration Details

### API Endpoints Used

```
POST https://api.commerce.coinbase.com/charges
Returns: { id, code, status, created_at, checkout_url, timeline[] }

GET https://api.commerce.coinbase.com/charges/{chargeId}
Returns: updated charge with status and transactions

Webhook: POST {yourUrl}/api/payments/webhook
Event types:
  - charge:created
  - charge:confirmed (payment complete)
  - charge:failed
  - charge:delayed (waiting for block confirmation)
```

### Payment Flow (User Perspective)

```
1. User clicks "Tip $5"
2. TipModal appears, user confirms
3. Frontend calls POST /api/payments/create-charge
4. Backend creates Coinbase charge, returns checkout URL
5. User redirected to Coinbase payment page
6. User selects payment method (card, crypto, bank transfer)
7. Payment processed by Coinbase
8. Coinbase sends webhook to /api/payments/webhook
9. Backend marks payment as completed
10. Creator's earning balance updated
11. Optional: Email sent to creator
12. User sees "Thank you!" notification
```

### Transaction Statuses
- **created** - Charge created, awaiting payment
- **confirmed** - Payment received and confirmed
- **unresolved** - Payment failed or timed out
- **resolved** - Final state (confirmed or failed)

### Recommended Settings
- **Charge timeout:** 1 hour (default)
- **Accepted currencies:** USD primary, allow crypto
- **Confirmation levels:** 0 for most crypto (instant), 1 for extra safety

---

## Security Considerations

### What Coinbase Handles for You
- ✅ PCI compliance (no card data touches your server)
- ✅ Fraud detection
- ✅ Encryption in transit (HTTPS)
- ✅ Webhook signature verification

### What You Must Do
1. **Verify webhook signatures** before processing
   ```javascript
   const signature = req.headers['X-CC-Webhook-Signature'];
   // Verify against COINBASE_WEBHOOK_SECRET
   ```

2. **Encrypt sensitive data** in database
   - Wallet addresses (if storing)
   - Bank account info (if added later)

3. **Use HTTPS only** - Coinbase won't POST to HTTP

4. **Rate limit payment endpoints**
   - Prevent spam tip attempts
   - Implement rate limiter middleware

5. **Validate all inputs**
   - Amount in range ($1-$100 suggested)
   - Valid receiver ID
   - Post exists

---

## Testing Strategy

### Local Testing
```bash
# 1. Use Coinbase sandbox
COINBASE_API_KEY=<sandbox_key>

# 2. Create test charge, get checkout URL
# 3. Use Coinbase test cards: 4242-4242-4242-4242

# 4. Trigger webhooks manually
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"data": {"event": "charge:confirmed", ...}}'
```

### Production Testing
- Test with small amounts ($0.01 or $1)
- Verify webhook delivery
- Confirm creator earnings appear
- Test payout initiation

---

## Future Enhancements

1. **Stripe integration** - If you want broader payment options later
2. **Multi-currency support** - USD, EUR, GBP, CAD
3. **Transaction analytics** - Top tippers, trending posts by tips
4. **Tiered creators** - Different commission rates for top creators
5. **Team splits** - Allow creators to split earnings with collaborators
6. **Referral bonuses** - Reward users who refer others
7. **Recurring subscriptions** - Monthly membership tiers
8. **Escrow/splits** - Complex revenue sharing

---

## Cost Breakdown (Coinbase Commerce)

- **Transaction fees:** 1% on card payments, varies on crypto
- **Monthly fee:** Free tier available for up to $50k/month
- **Payout fees:** Varies by method (bank transfer ~$0.10-0.25)
- **Example:** $5 tip
  - Coinbase takes ~$0.05 (1%)
  - Creator gets ~$4.95
  - Monthly cost: ~$5-20 on small volume

**Compare to alternatives:**
- Stripe: 2.2% + $0.30 per transaction
- Square: 2.6% + $0.10 per transaction
- Coinbase: 1-2% (lower rates)

---

## Quick Reference: Files to Create/Modify

**To create:**
- `backend/models/Payment.js`
- `backend/routes/payments.js`
- `backend/utils/coinbase.js`
- `backend/jobs/process-payouts.js` (optional)

**To modify:**
- `app/components/TipModal.tsx` (add API call)
- `backend/server.js` (mount /payments route, webhook)
- `.env` files (add COINBASE keys)
- `package.json` (add coinbase-commerce-node)

**Optional:**
- `backend/models/Payout.js`
- `backend/models/PaymentMethod.js`

---

## Summary

**To get tips working:**
1. Sign up for Coinbase Commerce (free)
2. Get API key and webhook secret
3. Create Payment model + routes (~1.5h)
4. Integrate into TipModal (~1.5h)
5. Set up webhook handler (~30m)
6. Test end-to-end (~1h)
7. **Total: ~5-6 hours of work**

**Then optionally:**
- Add creator earnings dashboard
- Add payout system
- Add subscriptions

This unblocks monetization and lets you launch payment infrastructure without waiting for Stripe approval.
