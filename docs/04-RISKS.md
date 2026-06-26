# CyberDope: Known Risks & Technical Debt

**Last Updated:** Cleanup Pass Phase 1 (June 26, 2026)

---

## Critical Risks (Deployment Blockers)

### 1. ⛔ Payment System Doesn't Exist
**Severity:** CRITICAL (if monetization is goal)  
**Impact:** Revenue = $0  
**Status:** Design doc complete, 5-6 hours to implement  
**Flagged by:** User requirement, payment system audit

**Details:**
- TipModal UI exists but doesn't process payments
- No Coinbase/Stripe integration
- No transaction database
- No creator payout system

**To Fix:**
- Follow `03-PAYMENTS.md` implementation plan
- Estimated 5-6 hours for tips
- 7-9 hours for tips + payouts
- 11-15 hours for full system (with subscriptions)

**Decision Needed:**
- Proceed with Coinbase Commerce? (recommended)
- Need other payment methods (PayPal, etc)?

---

### 2. ⛔ localStorage Access Undefended (Critical)
**Severity:** CRITICAL (crashes app in certain scenarios)  
**Impact:** App unusable in private browsing, quota exceeded, or old browsers  
**Status:** PARTIALLY FIXED (WalletConnect hardened)  
**Flagged by:** Cleanup Pass audit, manual code review

**Affected Code:**
```
❌ App.tsx:108-142   restore() function - per-operation guards missing
✅ WalletConnect.tsx - HARDENED in cleanup-pass
✅ api.ts - HARDENED in cleanup-pass
```

**What Happens:**
1. User opens app in private browsing mode
2. localStorage throws error: `QuotaExceededError`
3. One unguarded access crashes restore() function
4. App stuck in loading state
5. User can't log in (session lost)

**To Fix (App.tsx):**
```javascript
// Line 108-142: wrap each operation
try {
  const token = localStorage?.getItem?.('cdToken');
  // ... more try/catches for each setItem/removeItem
} catch (err) {
  console.warn('localStorage unavailable');
}
```

**Estimated Time:** 30 minutes  
**Priority:** HIGH (do before next deploy)

---

### 3. ⛔ API Error Response Not Validated
**Severity:** MEDIUM-HIGH (runtime crash on malformed response)  
**Impact:** Single bad API response crashes entire feed  
**Status:** PARTIALLY FIXED (WalletConnect balance parsing hardened)  
**Flagged by:** Code review + cleanup pass

**Affected Code:**
```
⚠️ Feed.tsx:180-190   Maps response.data?.data without null checks
⚠️ Feed.tsx:260-280   Comment parsing unvalidated
⚠️ UserProfilePage   Profile data access unguarded
```

**Example:**
```javascript
// Current (risky):
const posts = response.data?.data || [];  // If data = null, posts = null
setApiVideos(posts.map(mapPostToVideo));  // Crashes: null.map

// Safe:
const posts = Array.isArray(response?.data?.data) ? response.data.data : [];
setApiVideos(posts.map(mapPostToVideo));
```

**To Fix:**
- Add response validation wrapper
- Use Array.isArray() checks
- Fallback to empty arrays

**Estimated Time:** 1-2 hours  
**Priority:** HIGH (do before next deploy)

---

## High Risks (Known Bugs / Fragile Code)

### 4. ⚠️ Feed Caching Missing
**Severity:** MEDIUM (performance + UX issue)  
**Impact:** Every tab switch = fresh API call, slow user experience  
**Flagged by:** Code review

**Current Behavior:**
```
User switches from "Discover" to "Friends" tab
  → Call GET /api/posts/friends?page=1
  → Load 20 items, render
User switches back to "Discover" tab
  → Call GET /api/posts/discover?page=1 (AGAIN)
  → Reload same items user just saw
```

**Result:**
- Network requests spike
- Loading indicator keeps appearing
- User experience feels slow
- API quota potentially wasted

**To Fix:**
- Implement React Query or SWR for caching
- Cache by tab + page
- Invalidate cache on new post creation
- Implement stale-while-revalidate

**Estimated Time:** 2-3 hours  
**Priority:** MEDIUM

---

### 5. ⚠️ Web3 Wallet Balance Data is Hardcoded Mock
**Severity:** MEDIUM (user trust issue)  
**Impact:** Shows fake crypto balances to users  
**Flagged by:** Code review

**Current Code (WalletConnect.tsx:120-130):**
```javascript
const tokens = [
  { symbol: 'ETH', balance: '0.5', ...},    // Fake
  { symbol: 'USDC', balance: '1000', ...},  // Fake
  // ...
];
```

**Real Implementation Needed:**
- `/api/wallet/balance` endpoint needs actual Web3 integration
- Call Web3 RPC provider (Infura, Alchemy)
- Query actual balances for connected address
- Handle multi-chain (Ethereum, Polygon, etc)

**To Fix:**
```javascript
// backend/routes/wallet.js
app.get('/wallet/balance', auth, async (req, res) => {
  const { walletAddress } = req.query;
  const provider = new ethers.providers.JsonRpcProvider(INFURA_URL);
  
  const ethBalance = await provider.getBalance(walletAddress);
  const usdcBalance = await getTokenBalance(walletAddress, USDC_ADDRESS);
  
  res.json({ balances: { ETH, USDC, ... } });
});
```

**Estimated Time:** 2-3 hours  
**Priority:** MEDIUM (before Web3 features go live)

---

### 6. ⚠️ No Error Recovery for Failed API Calls
**Severity:** MEDIUM (poor UX on network issues)  
**Impact:** Network error = stuck/broken state  
**Flagged by:** Manual testing, code review

**Example: Feed Load Fails**
```
User opens app
  → GET /api/posts/discover fails (network down)
  → Shows error toast
  → User has no way to retry
  → Must refresh entire page
```

**Missing:**
- Retry buttons on errors
- Exponential backoff for retries
- Fallback UI (skeleton loaders)
- Offline mode (service workers)

**To Fix:**
- Add "Retry" button to error messages
- Implement auto-retry with exponential backoff (3 attempts)
- Add skeleton loaders for loading states
- Cache last successful response

**Estimated Time:** 2-3 hours  
**Priority:** MEDIUM

---

### 7. ⚠️ No Input Validation (XSS Risk)
**Severity:** MEDIUM (potential XSS vulnerability)  
**Impact:** Malicious user could inject JavaScript via posts/comments  
**Flagged by:** Security review

**Current Code:**
```javascript
// No sanitization of user input
<div>{post.caption}</div>              // Could contain <script>
<div>{comment.text}</div>              // Could contain <img onerror=>
```

**To Fix:**
- Install `sanitize-html` or `dompurify`
- Sanitize all user-generated content on render
- Never use dangerouslySetInnerHTML

```javascript
import DOMPurify from 'dompurify';

<div>{DOMPurify.sanitize(post.caption)}</div>
```

**Estimated Time:** 1 hour  
**Priority:** HIGH (security issue)

---

### 8. ⚠️ Admin Check Hardcoded
**Severity:** MEDIUM (security issue)  
**Impact:** If vz4sheezy's user ID is compromised, attacker gets admin  
**Flagged by:** Code review

**Current Code (AdminDashboard.tsx:10):**
```javascript
const isAdmin = user?.id === '69c03c1f50bf927b744dd5d9';
```

**Risk:**
- User ID is predictable (MongoDB ObjectId)
- If database compromised, ID is exposed
- Attacker could impersonate admin

**To Fix:**
- Add `isAdmin: boolean` flag to User model
- Set on backend, don't trust frontend
- Check backend on every admin action

```javascript
// backend/middleware/admin.js
const adminOnly = (req, res, next) => {
  if (req.user?.isAdmin !== true) {
    return res.status(403).json({error: 'Forbidden'});
  }
  next();
};
```

**Estimated Time:** 1-2 hours  
**Priority:** HIGH (security issue)

---

### 9. ⚠️ DMs Don't Authenticate User Before Loading
**Severity:** MEDIUM (UX issue + potential info leak)  
**Impact:** User loses session, sees "No conversations" instead of "Please log in"  
**Flagged by:** Cleanup Pass audit

**Current Behavior:**
```
User opens DMSystem
  → Calls GET /api/dm/conversations (API requires auth)
  → Session expired → 401 response
  → API interceptor clears token, redirects
  → But DMSystem already mounted
  → Shows "No conversations found"
```

**User sees confusing message instead of login prompt.**

**To Fix:**
- Check authentication status before rendering DMSystem
- Show explicit "Not authenticated" message
- Redirect to login

**Estimated Time:** 30 minutes  
**Priority:** LOW-MEDIUM (nice UX improvement)

---

## Medium Risks (Tech Debt / Incomplete Features)

### 10. 📋 Profile Customization Data Validation Missing
**Severity:** MEDIUM  
**Impact:** Malformed profile data could crash renderer  
**Flagged by:** Code review

**Affected:** ProfileWidgetRenderer.tsx

**To Fix:**
- Validate widget structure before rendering
- Provide fallback for missing data
- Type-check arrays

---

### 11. 📋 Real-Time Messaging Not Implemented
**Severity:** MEDIUM  
**Impact:** DMs have 5-10 second delay, no typing indicators  
**Flagged by:** Feature audit

**Current:** Pull-based (polling every 2 seconds)  
**Better:** WebSocket-based real-time updates  

**Effort to implement:** 4-6 hours

---

### 12. 📋 No Recommendation Algorithm
**Severity:** LOW-MEDIUM  
**Impact:** Feed is purely chronological, not engaging  
**Flagged by:** Growth concerns

**Current:** Discover tab shows latest posts  
**Better:** ML-based recommendations (too complex for now)  

**Interim:** Sort by engagement (likes + comments)

---

### 13. 📋 No Offline Support
**Severity:** LOW-MEDIUM  
**Impact:** App unusable without internet  
**Flagged by:** PWA best practices

**Missing:** Service workers, offline cache

---

### 14. 📋 Bundle Size Large (698KB)
**Severity:** LOW  
**Impact:** Slow load on 3G, poor Core Web Vitals  
**Flagged by:** Build analysis

**Recommended:**
- Code splitting by route
- Dynamic imports for modals
- Remove unused dependencies

**Estimated Time:** 3-4 hours  
**Priority:** LOW (nice-to-have)

---

### 15. 📋 No User Notifications
**Severity:** LOW  
**Impact:** Users don't know when someone follows them, likes, etc  
**Flagged by:** Feature audit

**Missing:**
- Follow notifications
- Like notifications
- Comment notifications
- Message notifications (desktop browser push)

---

### 16. 📋 No Search Functionality
**Severity:** LOW  
**Impact:** Users can't find posts or topics  
**Flagged by:** Feature audit

**Missing:**
- Post search by caption
- Hashtag support
- Post discovery by topic

---

## Architecture Risks (Design Issues)

### 17. 📊 Single Database, No Replication
**Severity:** MEDIUM  
**Impact:** Single point of failure, data loss risk  
**Current:** MongoDB Atlas (managed, has backups)  
**Improvement:** Enable auto-replication, point-in-time recovery

---

### 18. 📊 No Caching Layer
**Severity:** MEDIUM  
**Impact:** Every feed request hits database  
**Current:** Direct DB queries  
**Improvement:** Add Redis for hot data (popular posts, creator profiles)

---

### 19. 📊 Backend Cold Starts (~10s)
**Severity:** MEDIUM  
**Impact:** First request after idle is slow  
**Current:** Free Render tier  
**Improvement:** Upgrade to paid tier for always-on instances

---

## Cleanup Pass Specific Risks (Already Flagged)

These were identified in the code quality audit and documented in CLEANUP_REPORT.md:

1. ✅ **WalletConnect localStorage** - FIXED in cleanup-pass
2. ✅ **API interceptor guards** - FIXED in cleanup-pass
3. ⚠️ **App.tsx restore function** - FLAGGED, not yet fixed
4. ⚠️ **Feed error recovery** - FLAGGED, partial fix suggested
5. ⚠️ **DMSystem pre-auth validation** - FLAGGED, low priority

---

## Risk Priority Matrix

| Risk | Severity | Effort | Priority | Status |
|------|----------|--------|----------|--------|
| Payment system | CRITICAL | 5-6h | 1 | Design ready |
| localStorage guards | CRITICAL | 0.5h | 1 | Partial fix |
| API response validation | MEDIUM-HIGH | 1-2h | 2 | Partial fix |
| Input sanitization (XSS) | MEDIUM | 1h | 2 | Not started |
| Admin hardcoding | MEDIUM | 1-2h | 2 | Not started |
| Feed caching | MEDIUM | 2-3h | 3 | Not started |
| Web3 mock data | MEDIUM | 2-3h | 3 | Not started |
| Error recovery UI | MEDIUM | 2-3h | 3 | Not started |
| Profile validation | MEDIUM | 1h | 4 | Not started |
| Real-time messaging | MEDIUM | 4-6h | 4 | Design ready |
| Bundle size | LOW | 3-4h | 5 | Not started |
| Recommendations | LOW | 4-6h | 5 | Future |
| Offline support | LOW | 3-4h | 5 | Future |

---

## Quick Action Checklist

### Before Next Deploy (Do This)
- [ ] Fix App.tsx localStorage guards (0.5h)
- [ ] Add input sanitization (1h)
- [ ] Move admin check to backend (1-2h)
- [ ] Add API response validation (1-2h)
- **Total:** 3.5-5 hours

### Before Monetization Launch (Do This)
- [ ] Implement payment system (5-6h) - SEE 03-PAYMENTS.md
- [ ] Add error recovery UI (2-3h)
- [ ] Implement Web3 balance queries (2-3h)
- **Total:** 9-12 hours

### Nice-to-Have (When You Have Time)
- [ ] Implement feed caching (2-3h)
- [ ] Add real-time DMs (4-6h)
- [ ] Reduce bundle size (3-4h)
- [ ] Add recommendations (4-6h)

---

## Recommendations

**Immediate (Next 24 Hours):**
1. ✅ Accept cleanup-pass branch (hardening done)
2. ⏳ Fix App.tsx localStorage (high risk, quick fix)
3. ⏳ Add input sanitization (security issue)

**This Week:**
1. ⏳ Implement payment system (revenue enablement)
2. ⏳ Move admin checks to backend (security)
3. ⏳ Add API response validation (stability)

**This Month:**
1. ⏳ Add error recovery UI (UX improvement)
2. ⏳ Implement feed caching (performance)
3. ⏳ Add Web3 balance queries (feature completion)

**This Quarter:**
1. ⏳ Real-time messaging (WebSocket)
2. ⏳ Creator analytics (monetization support)
3. ⏳ Recommendation algorithm (engagement)
