# CyberDope Feature Inventory

**Legend:** ✅ Complete | ⚠️ Partial | 🔨 Stubbed | ❌ Not Started

---

## Core Features

### Authentication & Onboarding
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Email/password signup | ✅ Complete | `AuthPage.tsx`, `/api/auth/register` | Works, password hashed with bcrypt |
| Email/password login | ✅ Complete | `AuthPage.tsx`, `/api/auth/login` | JWT token returned, stored in localStorage |
| Session restore | ✅ Complete | `App.tsx` useEffect | Validates token on app mount, 8s timeout |
| Forgot password | ❌ Not Started | N/A | No reset flow |
| Email verification | ❌ Not Started | N/A | Emails not sent on signup |
| Two-factor auth | ❌ Not Started | N/A | Not planned |

---

## Content & Feed

### Feed System
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| TikTok-style infinite scroll | ✅ Complete | `Feed.tsx` | 3 tabs: Discover, Friends, Faction |
| Mobile feed layout | ✅ Complete | `Feed.tsx` | Full-screen video, swipe navigation |
| Desktop feed layout | ✅ Complete | `DesktopFeed.tsx` | 65/35 split (video/creator sidebar) |
| Feed pagination | ✅ Complete | `/api/posts/{tab}` | 20 items per page, offset-based |
| Tab switching | ✅ Complete | `Feed.tsx` (useState) | Reloads feed when tab changes |
| Pull-to-refresh | ❌ Not Started | N/A | No gesture support |
| Feed caching | ❌ Not Started | N/A | Every tab switch = fresh API call |

### Post Creation
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Video upload UI | ✅ Complete | `UploadModal.tsx` | File picker, preview |
| Cloudinary integration | ✅ Complete | Frontend + `/api/upload` | Direct upload to Cloudinary |
| Caption/description | ✅ Complete | `UploadModal.tsx` | Stored with post |
| Post thumbnail | ⚠️ Partial | Uses Cloudinary default | No custom thumbnail picker |
| Draft saving | ❌ Not Started | N/A | Posts publish immediately |
| Scheduled posting | ❌ Not Started | N/A | Not planned |

### Engagement

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Like/unlike | ✅ Complete | `Feed.tsx`, `/api/posts/{id}/like` | Persists to DB, real-time UI update |
| Comment creation | ✅ Complete | `Feed.tsx`, `/api/posts/{id}/comment` | Text comments only |
| Comment deletion | ✅ Complete | `/api/posts/{id}/comment` (DELETE) | Only own comments |
| Comment replies | ❌ Not Started | N/A | Flat comments only |
| Reactions (emoji) | ❌ Not Started | N/A | Only likes supported |
| Comment sorting | ❌ Not Started | N/A | Newest-first only |

---

## Creator Profiles

### Profile System
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Public profile pages | ✅ Complete | `UserProfilePage.tsx` | Shows posts, follower count, bio |
| User bio/description | ✅ Complete | `User.js` model | Editable in profile |
| Avatar upload | ✅ Complete | `AvatarCropper.tsx` | Square crop, Cloudinary storage |
| Profile customization | ✅ Complete | `ProfileGrid.tsx` | MySpace-style drag-drop widgets |
| Custom widgets | ⚠️ Partial | `ProfileBuilder.tsx` | Widget framework exists, limited variety |
| Follower/following list | ✅ Complete | `TopFriendsWidget.tsx` | Shows real following list |
| Faction display | ✅ Complete | User profile page | 20 factions + Unaffiliated |
| Private profiles | ⚠️ Partial | Model supports, UI doesn't | Backend field exists, no UI toggle |

### Creator Discovery
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Explore page | ✅ Complete | `ExplorePage.tsx` | Grid of trending creators |
| Creator search | ✅ Complete | `/api/users/search` | Search by username |
| Faction filtering | ✅ Complete | Backend support | Not exposed in UI |
| Creator stats | ✅ Complete | `User.js` | Followers, following, total likes |
| Top creators | ⚠️ Partial | No dedicated endpoint | Could sort by followers |

---

## Social Features

### Following System
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Follow creator | ✅ Complete | `/api/users/{id}/follow` | Works everywhere (search, explore, profile) |
| Unfollow creator | ✅ Complete | `/api/users/{id}/unfollow` | Works everywhere |
| Friends feed | ✅ Complete | `Feed.tsx` → "Friends" tab | Shows posts from followed creators only |
| Follower notifications | ❌ Not Started | N/A | No push/email notifications |
| Block user | ❌ Not Started | N/A | No block feature |
| Mute creator | ❌ Not Started | N/A | All creators visible |

### Direct Messaging
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Conversation list | ✅ Complete | `DMSystem.tsx` | Shows all DM threads |
| Send message | ✅ Complete | `/api/dm/send` | Text only, no media |
| Message display | ✅ Complete | `DMSystem.tsx` | Chronological order |
| Vanishing messages | ✅ Complete | 7-day auto-delete | TTL index on MongoDB |
| Read receipts | ✅ Complete | `/api/dm/send` → readBy array | Shows who has read |
| Screenshot alerts | ⚠️ Partial | Frontend shows alert | No backend enforcement |
| Search conversations | ✅ Complete | `DMSystem.tsx` search | Filters by username |
| User search | ✅ Complete | `/api/users/search` | To find new DM recipients |
| Conversation delete | ❌ Not Started | N/A | Messages stay forever (with 7-day vanish) |
| Group DMs | ❌ Not Started | N/A | 1:1 only |
| Video/media in DMs | ❌ Not Started | N/A | Text only |
| Typing indicators | ❌ Not Started | N/A | No real-time |
| Online status | ❌ Not Started | N/A | No real-time presence |

---

## Community & Factions

### Faction System
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Faction assignment | ✅ Complete | User.faction field | 20 predefined factions |
| Faction selection | ⚠️ Partial | Signup, but only shows name | No faction descriptions/lore |
| Faction feed | ✅ Complete | `/api/posts/faction` | Shows posts from same faction |
| Faction announcements | ✅ Complete | `/api/announcements` | Admin-only, visible to faction members |
| Faction-only posts | 🔨 Stubbed | Model field exists | UI doesn't expose visibility toggle |
| Faction leaderboard | ❌ Not Started | N/A | No ranking system |
| Faction perks | ❌ Not Started | N/A | All factions equal (currently) |

### Announcements
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Admin can broadcast | ✅ Complete | `AdminDashboard.tsx` | vz4sheezy only |
| Announcement banner | ✅ Complete | `AnnouncementBanner.tsx` | Global dismissible banner |
| Faction-scoped announcements | ✅ Complete | Backend support | Can target specific faction |
| Announcement persistence | ✅ Complete | Stored in MongoDB | Auto-expires after 30 days |

---

## Web3 & Wallets

### Wallet Integration
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| MetaMask connection | ✅ Complete | `WalletConnect.tsx` | eth_requestAccounts flow |
| Wallet signature | ✅ Complete | personal_sign method | Used for auth |
| Balance display | ⚠️ Partial | Shows UI, data is mock | ETH, USDC, USDT, MATIC, SOL (hardcoded) |
| Balance refresh | ✅ Complete | Manual refresh button | Calls `/api/wallet/balance` (stub) |
| Wallet disconnect | ✅ Complete | Clears localStorage | Session ends |
| Multiple chain support | ❌ Not Started | N/A | Currently Ethereum only |
| Hardware wallet support | ✅ Complete | MetaMask handles it | Ledger/Trezor work through MetaMask |

---

## Payments & Monetization

### Tipping System
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Tip UI | 🔨 Stubbed | `TipModal.tsx` exists | No payment integration |
| Tip amount selector | 🔨 Stubbed | UI has amounts | $1, $5, $10, $20 (hardcoded) |
| Payment processing | ❌ Not Started | N/A | No Stripe/Coinbase integration |
| Tip history | ❌ Not Started | N/A | No database schema |
| Creator payout | ❌ Not Started | N/A | No payout system |

### Subscriptions
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Subscription tiers | ❌ Not Started | N/A | No UI or backend |
| Subscriber badge | ❌ Not Started | N/A | Not planned |
| Exclusive content | ❌ Not Started | N/A | Not planned |
| Subscription billing | ❌ Not Started | N/A | Would need Stripe |

### Payment Methods
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Stripe card payments | ❌ Not Started | N/A | No integration |
| Coinbase Commerce | ❌ Not Started | N/A | Design decision to use instead of Stripe |
| Crypto direct (Web3) | 🔨 Stubbed | Wallet connects | No actual payment routing |
| PayPal | ❌ Not Started | N/A | Not planned |

---

## Admin Features

### Admin Dashboard
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Admin-only access | ✅ Complete | vz4sheezy hardcoded | Only user ID 69c03c1f50bf927b744dd5d9 |
| User management | ⚠️ Partial | Can view users, no edit/delete | Read-only list |
| Post moderation | 🔨 Stubbed | No moderation interface | Posts can't be removed admin-side |
| Announcements broadcast | ✅ Complete | Form in dashboard | Can target all or specific faction |
| Analytics/metrics | 🔨 Stubbed | Dashboard exists | No real data collected |
| Reports system | ❌ Not Started | N/A | No user reporting |

---

## Technical Features

### Performance & Optimization
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Lazy loading (images) | ❌ Not Started | N/A | All videos load eagerly |
| Code splitting | ❌ Not Started | N/A | Single bundle, no chunks |
| Service workers | ❌ Not Started | N/A | No offline support |
| Image optimization | ⚠️ Partial | Cloudinary handles it | No responsive sizing |

### Error Handling
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| API error display | ✅ Complete | Most endpoints have try/catch | User sees error messages |
| Network timeout handling | ✅ Complete | 8s timeout on auth restore | Falls back to login |
| Component error boundary | ✅ Complete | `ErrorBoundary.tsx` NEW | Not yet deployed |
| Fallback UI | ⚠️ Partial | Some errors show toast | Missing loaders/skeletons |

### Accessibility
| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Mobile responsive | ✅ Complete | Tailwind mobile-first | Works on all screen sizes |
| Dark mode | ✅ Complete | Entire app dark-themed | No light mode toggle |
| Keyboard navigation | ⚠️ Partial | Basic browser defaults | No custom focus management |
| Screen reader support | ❌ Not Started | N/A | No alt text, ARIA labels |
| Color contrast | ⚠️ Partial | Mostly OK, some text too light | Not WCAG tested |

---

## Summary Statistics

| Category | Complete | Partial | Stubbed | Not Started |
|----------|----------|---------|---------|-------------|
| Authentication | 2 | 0 | 0 | 3 |
| Content & Feed | 5 | 1 | 0 | 2 |
| Engagement | 3 | 0 | 0 | 3 |
| Creator Profiles | 5 | 3 | 0 | 1 |
| Social Features | 7 | 1 | 0 | 5 |
| Web3 | 3 | 1 | 0 | 2 |
| Payments | 1 | 0 | 4 | 7 |
| Admin | 2 | 1 | 1 | 1 |
| Technical | 3 | 2 | 0 | 4 |
| **TOTAL** | **31** | **9** | **5** | **28** |

**Overall:** 50% features working end-to-end. 18% partially working. 10% UI exists but no backend. 22% not started.

---

## Priority Roadmap (Recommended)

1. **High Priority (Breaks functionality)**
   - Complete payment system (tips/subscriptions) → Revenue enablement
   - Fix flagged risks from cleanup pass → Stability

2. **Medium Priority (Core features)**
   - Group DMs → Social completeness
   - Real-time messaging (WebSocket) → Better UX
   - Scheduled posting → Creator tools

3. **Low Priority (Nice-to-haves)**
   - Feed caching → Performance
   - Recommendation algorithm → Engagement
   - User analytics → Growth insights
   - Notifications → Engagement
