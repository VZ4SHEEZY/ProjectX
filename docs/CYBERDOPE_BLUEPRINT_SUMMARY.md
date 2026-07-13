# CyberDope Master Blueprint V3.0 - Summary & Priorities

## Platform Vision
**TikTok + MySpace + Web3 + AI Agents inside a Cyberpunk civilization simulator**

A Web3 social platform where:
- Creators control content and monetize directly
- Users customize profiles with HTML/CSS (MySpace style)
- Faction-based identity with living PvP civilization mechanics
- AI agents (powered by Beaux Jaxxsun) monitor and narrate faction wars
- USDC payments on Base blockchain (censorship-resistant)

---

## CURRENT BUILD STATUS vs BLUEPRINT

### ✅ LIVE (WORKING)
- Frontend + Backend deployed
- User auth with JWT
- Faction assignment (zodiac → faction at signup)
- 3 feed tabs (Discover, Friends, Faction)
- Video upload via Cloudinary
- Autoplay videos with sound
- Profile posts grid
- Like/Comment/Follow systems
- User profile pages (public/private)

### 🟡 PARTIAL / NEEDS WORK
- Profile customization (need HTML/CSS editor)
- Top Friends widget (exists, not curated yet)
- Faction features (factions assigned but no war system)
- Messaging (buttons exist, routing incomplete)

### ❌ NOT STARTED (V1 Priority)
- **Referral system** - affiliate tier structure
- **Content Generation Studio** - image/video AI credits
- **NFT minting** - Thirdweb on Base blockchain
- **Real-world checkin** - GPS territory control
- **Battle system** - faction wars, takeovers
- **Beaux broadcasts** - faction announcements
- **AI Creator Agents** - personality-driven bots
- **Platform connections** - YouTube/TikTok/X import

---

## V1 LAUNCH PRIORITIES (Recommended Order)

### TIER 1: Core Social Features (NEXT)
**Est. 2-3 weeks**
- [ ] Profile HTML/CSS editor (custom styling)
- [ ] Fix messaging view routing
- [ ] Followers/Following list pages
- [ ] Edit/delete comments fully functional
- [ ] Faction colors on profiles
- [ ] Faction feed content tagged properly

### TIER 2: Monetization (USDC on Base)
**Est. 3-4 weeks**
- [ ] TipRouter contract deployment to Base Sepolia + Slither scan + test suite
- [ ] Subscription button on creator profiles (USDC, same rails as tips)
- [ ] PPV content gating (USDC, same rails as tips)
- [ ] Tip button on videos (80/20 split, USDC, via TipRouter)
- [ ] Creator Dashboard with earnings view
- [ ] Payout management

### TIER 3: Referral System
**Est. 2 weeks**
- [ ] Referral code generation (FactionName-Username-####)
- [ ] Referral link tracking
- [ ] Tier accumulation (Spark → Sovereign)
- [ ] Earnings dashboard
- [ ] Withdrawal to Base wallet

### TIER 4: Faction War System
**Est. 3-4 weeks**
- [ ] Weekly battles between factions
- [ ] Points tracking and leaderboard
- [ ] Takeover mechanics (3x points = conquest)
- [ ] Fracture system (10K+ members split)
- [ ] Hall of Fame recording
- [ ] Real-time faction map

### TIER 5: Creative Tools & Web3
**Est. 4-6 weeks**
- [ ] Image generation credits (Replicate API)
- [ ] Video generation credits (Sora 2 API)
- [ ] NFT minting (Thirdweb on Base)
- [ ] NFT marketplace
- [ ] Coinbase Smart Wallet integration

### TIER 6: Real-World Extension
**Est. 3-4 weeks**
- [ ] GPS checkin system (Google Places)
- [ ] District Overlord rankings
- [ ] Territory map by city
- [ ] Location NFT badges
- [ ] Faction territory points

### TIER 7: AI & Automation
**Est. 4-6 weeks**
- [ ] Beaux Jaxxsun broadcast system
- [ ] Faction AI agents
- [ ] Creator AI agent framework
- [ ] Personality configuration UI
- [ ] Auto-responses to fans

### TIER 8: Cross-Platform
**Est. 2-3 weeks**
- [ ] YouTube/TikTok/X OAuth connections
- [ ] Audience import display
- [ ] Cross-posting engine
- [ ] Platform analytics per creator

---

## KEY TECHNICAL DECISIONS

### Payments Strategy - USDC ON BASE ONLY
**V1: USDC on Base (censorship-resistant, no bank dependency)**
- Stripe is NOT used. All payments via USDC.
- TipRouter contract for instant 80/20 splits.
- Subscriptions and PPV use same rails as tips.
- All funds flow through smart contracts, never held by platform.

### Blockchain Stack
- **Network:** Base (Coinbase-built, near-zero fees)
- **Smart Contracts:** Custom Solidity (TipRouter), Thirdweb for NFTs when needed
- **Wallets:** Coinbase CDP embedded wallets + Coinbase Smart Wallet
- **NFT Storage:** Pinata IPFS (permanent, decentralized)

### Revenue Split
- **Creator:** 80% of all transactions
- **Platform Treasury:** 20% of all transactions
- **Referral:** Earners get 10-30% of platform cut based on tier

---

## THE 20 FACTIONS (Zodiac-Mapped)

1. **Neon Wraith** (Scorpio/Pisces) - Hackers & infiltrators
2. **Iron Veil** (Capricorn/Taurus) - Soldiers & builders
3. **Crimson Static** (Aries/Leo) - Fighters & rebels
4. **Void Circuit** (Aquarius/Gemini) - Engineers & coders
5. **Gold Syndicate** (Leo/Libra) - Traders & power brokers
6. **Azure Phantom** (Libra/Gemini) - Runners & free spirits
7. **Toxic Bloom** (Virgo/Capricorn) - Scientists & eco warriors
8. **Scarlet Dominion** (Scorpio/Aries) - Politicians & strategists
9. **Chrome Legion** (Taurus/Virgo) - Military & loyalists
10. **Phantom Signal** (Pisces/Cancer) - Spies & communicators
11. **Obsidian Pact** (Scorpio/Capricorn) - Occultists & power seekers
12. **Ember Protocol** (Sagittarius/Aries) - Revolutionaries
13. **Violet Surge** (Aquarius/Pisces) - Artists & visionaries
14. **Steel Covenant** (Cancer/Taurus) - Honorable warriors
15. **Binary Ghost** (Gemini/Aquarius) - Coders & AI researchers
16. **Copper Throne** (Leo/Sagittarius) - Dynasty builders
17. **Nova Rift** (Sagittarius/Leo) - Explorers & adventurers
18. **Silver Wraith** (Cancer/Pisces) - Historians & avengers
19. **Inferno Grid** (Aries/Scorpio) - Berserkers & destroyers
20. **Quantum Veil** (Aquarius/Libra) - Philosophers & scientists

---

## BEAUX JAXXSUN ROLE
- **Guardian AI** - Powers Claude Sonnet via OpenClaw
- **Platform Narrator** - Broadcasts faction updates
- **Content Moderator** - 24/7 security
- **Creator Agent Framework** - Other creators build agents on his system
- **Daily Intelligence Reports** - Platform owner only
- **Verified Profile** - Has his own public account (@beauxjaxxsun)

---

## IMMEDIATE NEXT STEPS FOR BO

1. **Pick Tier 1 feature** from above
2. **Tell me which one first**
3. **I'll code it, test it, push it**
4. **Update this README**
5. **Move to next feature**

---

## Launch Definition
**V1 Launch Ready when:**
- Core social features complete (Tier 1)
- USDC payments working via TipRouter (Tier 2)
- Referral system live (Tier 3)
- Faction system functional (Tier 4)
- Everything tested on live site

**Post-Launch (V1.1+):**
- NFTs, Web3, real-world, AI agents

---

## USDC ON BASE - ENVIRONMENT VARIABLES

```
# Base Sepolia RPC
BASE_SEPOLIA_RPC_URL=https://...

# TipRouter Contract
TIP_ROUTER_PRIVATE_KEY=xxx (dev wallet private key)
TIP_ROUTER_TREASURY_ADDRESS=0x... (platform treasury wallet)
USDC_SEPOLIA_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e (Circle's official Base Sepolia USDC)

# Coinbase CDP (Embedded Wallets)
CDP_API_KEY_ID=xxx
CDP_API_KEY_SECRET=xxx
CDP_PROJECT_ID=xxx

# Yoti Integration
YOTI_CLIENT_SDK_ID=xxx
YOTI_API_BASE_URL=https://...
YOTI_REDIRECT_URL=http://...
```

---

## TIPROUTER CONTRACT - DEPLOYMENT FLOW

When deploying TipRouter to Base Sepolia:

**Deployment Script:** `/Users/bojackson/ProjectX/backend/scripts/deploy-tiprouter-sepolia.js`

**Required Environment Variables:**
- `TIP_ROUTER_PRIVATE_KEY` - Dev wallet private key (never commit)
- `TIP_ROUTER_TREASURY_ADDRESS` - Platform treasury wallet (from env var, never hardcoded)
- `BASE_SEPOLIA_RPC_URL` - Base Sepolia RPC endpoint
- `USDC_SEPOLIA_ADDRESS` - Circle's official Base Sepolia USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

**Constructor Call (TWO ARGS):**
```solidity
constructor(address _usdc, address _treasury) {
    require(_usdc != address(0), "Invalid USDC address");
    require(_treasury != address(0), "Invalid treasury address");
    usdc = IERC20(_usdc);         // USDC from env var (first arg)
    treasury = _treasury;          // Treasury from env var (second arg)
    owner = msg.sender;            // Deployer becomes owner
}
```

Both USDC and treasury addresses come from environment variables at deployment. Nothing is hardcoded.
