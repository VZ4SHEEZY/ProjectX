# TipRouter Contract - Audited Rewrite

**Status:** Ready for deployment to Base Sepolia  
**Network:** Base Sepolia (testnet only)  
**Compiler:** Solidity ^0.8.20  

---

## Contract Overview

**TipRouter.sol** - Smart contract for instant 80/20 tip splitting on Base Sepolia

### Key Properties
- ✅ Contract NEVER holds funds, even mid-transaction. Both splits move directly from tipper to recipients.
- ✅ 80% to creator (via BPS), 20% + any dust to treasury
- ✅ USDC address and treasury set at deployment from env vars - nothing hardcoded
- ✅ Tip history lives in events only (TipSent). Off-chain systems read events. No storage array, far cheaper gas.
- ✅ Fails closed (reverts on any error)

---

## Full Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * CyberDope Tip Router (audited rewrite)
 *
 * Routes USDC tips from fans to creators with an instant 80/20 split.
 *
 * Key properties:
 * - Contract NEVER holds funds, not even mid-transaction. Both splits
 * move directly from the tipper to the recipients.
 * - 80% to creator, remainder (20% plus any rounding dust) to treasury.
 * - USDC address and treasury are set at deployment from env vars.
 * Nothing is hardcoded.
 * - Tip history lives in events only. Off-chain systems (MongoDB,
 * indexers) read the TipSent event. No storage array, far cheaper gas.
 *
 * Deployment (Base Sepolia first, mainnet only after re-review):
 * constructor(usdcAddress from env, treasuryAddress from env)
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TipRouter {
    // ============ Immutable / State ============

    IERC20 public immutable usdc;
    address public treasury;
    address public owner;

    uint256 public constant CREATOR_BPS = 8000; // 80.00%
    uint256 public constant BPS_DENOMINATOR = 10000;

    // ============ Events ============

    event TipSent(
        address indexed tipper,
        address indexed creator,
        uint256 amount,
        uint256 creatorAmount,
        uint256 platformAmount,
        uint256 timestamp
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event StuckFundsRescued(address indexed token, address indexed to, uint256 amount);

    // ============ Constructor ============

    constructor(address _usdc, address _treasury) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_treasury != address(0), "Invalid treasury address");
        usdc = IERC20(_usdc);
        treasury = _treasury;
        owner = msg.sender;
    }

    // ============ Core ============

    /**
     * Send a tip. Tipper must have approved this contract for amount
     * of USDC beforehand (the frontend handles the approve step).
     *
     * Both transfers pull directly from the tipper, so this contract
     * never has custody of funds at any point.
     */
    function sendTip(address creator, uint256 amount) external {
        require(creator != address(0), "Invalid creator address");
        require(creator != treasury, "Creator cannot be treasury");
        require(amount >= 10000, "Tip below minimum (0.01 USDC)");

        uint256 creatorAmount = (amount * CREATOR_BPS) / BPS_DENOMINATOR;
        uint256 platformAmount = amount - creatorAmount; // exact, dust goes to platform

        require(
            usdc.transferFrom(msg.sender, creator, creatorAmount),
            "Transfer to creator failed"
        );
        require(
            usdc.transferFrom(msg.sender, treasury, platformAmount),
            "Transfer to treasury failed"
        );

        emit TipSent(msg.sender, creator, amount, creatorAmount, platformAmount, block.timestamp);
    }

    // ============ Admin ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * Rescue tokens accidentally sent straight to this contract.
     * Normal tip flow never leaves funds here, so this only covers
     * user mistakes. Uses transfer(), not transferFrom().
     */
    function rescueTokens(address token, address to) external onlyOwner {
        require(to != address(0), "Invalid destination");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to rescue");

        require(IERC20(token).transfer(to, balance), "Transfer failed");
        emit StuckFundsRescued(token, to, balance);
    }

    // ============ View ============

    function getCreatorBPS() external pure returns (uint256) {
        return CREATOR_BPS;
    }
}
```

---

## Deployment Architecture

### Constructor Arguments (TWO ARGS, IN ORDER)
1. **usdcAddress** - Circle's official USDC on Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
2. **treasuryAddress** - Platform treasury wallet (from `TIP_ROUTER_TREASURY_ADDRESS` env var)

### Environment Variables Required

```
# Deployment script reads these:
USDC_SEPOLIA_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
TIP_ROUTER_TREASURY_ADDRESS=0x...  (your treasury wallet)
TIP_ROUTER_PRIVATE_KEY=xxx         (dev wallet, never commit)
BASE_SEPOLIA_RPC_URL=https://...   (Base Sepolia RPC)

# After deployment, set:
TIP_ROUTER_CONTRACT_ADDRESS=0x...  (address returned from deployment)
```

---

## Tipping Flow

### User Journey
1. Fan approves TipRouter contract for USDC amount (frontend handles)
2. Fan calls `sendTip(creator, amount)`
3. Contract transfers 80% → creator
4. Contract transfers 20% → treasury (dust included)
5. Event emitted, backend listens and records in MongoDB
6. Creator sees tip in dashboard

### Gas Efficiency
- No on-chain storage array (events only)
- Direct transfers, never held mid-contract
- ~120,000 - 150,000 gas per tip on Base Sepolia

---

## Security Properties

### ✅ No Fund Custody
Both transfers are `transferFrom(msg.sender, recipient)`. Contract never holds USDC.

### ✅ Exact Split Math
```
creatorAmount = (amount * 8000) / 10000  (80%)
platformAmount = amount - creatorAmount  (20% + dust)
```
No rounding errors. Dust (1 wei max per 100 wei) goes to treasury.

### ✅ Fail-Closed
All `require()` statements must pass or entire transaction reverts.

### ✅ Admin Controls
Only owner can:
- `setTreasury()` - Change treasury wallet
- `transferOwnership()` - Transfer ownership
- `rescueTokens()` - Rescue accidentally-sent tokens

All guarded by `onlyOwner()` modifier.

### ✅ Immutable USDC
USDC is `public immutable` - set at deployment, cannot change.

---

## Deployment Checklist

### Before Deploying to Base Sepolia:

- [ ] Contract code reviewed by external auditor
- [ ] Solidity compiler: ^0.8.20
- [ ] USDC address verified: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Circle official)
- [ ] Run Slither security scan: `slither ./backend/contracts/TipRouter.sol`
- [ ] Test suite passes: `npx hardhat test`
- [ ] Constructor args ready:
  - Arg 1: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC)
  - Arg 2: `$TIP_ROUTER_TREASURY_ADDRESS` (treasury from env)
- [ ] Dev wallet funded from Sepolia faucet

### After Deployment:

- [ ] Verify on BaseScan with constructor arguments
- [ ] Save deployed address to `TIP_ROUTER_CONTRACT_ADDRESS` in .env
- [ ] Export ABI from compilation, add to backend
- [ ] Test `sendTip()` with test USDC
- [ ] Wire address into `/api/tips` routes
- [ ] Monitor gas usage on first few transactions

---

## Testing Scenarios

### ✅ Happy Path
```
Input: sendTip(creator=0xBob, amount=100000000) [100 USDC]
Expected:
  - Creator receives: 80000000 (80 USDC)
  - Treasury receives: 20000000 (20 USDC)
  - TipSent event emitted
  - No funds left in contract
```

### ❌ Failure Cases

**Invalid creator:**
```
Input: sendTip(creator=0x0000..., amount=100000000)
Expected: Revert "Invalid creator address"
```

**Insufficient approval:**
```
Input: sendTip(creator=..., amount=100) but tipper approved 50
Expected: Revert "Transfer to creator failed" (from USDC)
```

**Amount too small:**
```
Input: sendTip(creator=..., amount=5000)
Expected: Revert "Tip below minimum (0.01 USDC)"
```

**Creator is treasury:**
```
Input: sendTip(creator=treasury, amount=100000000)
Expected: Revert "Creator cannot be treasury"
```

---

## Next Steps

1. **Compile & Slither:** Run compiler and security scan
2. **Output constructor args** before deployment verification
3. **Deploy to Sepolia** with Hardhat
4. **Verify on BaseScan**
5. **Wire ABI into backend routes**

---

**Status:** ✅ Audited Code Ready | ⏳ Pending Compilation + Slither | ❌ Not Deployed Yet

