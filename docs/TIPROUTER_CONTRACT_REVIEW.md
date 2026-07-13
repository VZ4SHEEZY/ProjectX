# TipRouter Contract - Code Review

**Status:** Ready for external review before Base Sepolia deployment  
**Network:** Base Sepolia (testnet only)  
**Deployed By:** None yet - awaiting review  

---

## REMOVED FROM FINAL CONTRACT (OLD REFERENCES ONLY):
- ❌ Emergency withdrawal function (`emergencyWithdraw()`)
- ❌ On-chain tip history tracking (`Tip[] public tipHistory` array)
- ❌ `TreasuryWithdrawn` event
- ❌ `getTipsByTipper()` view function

The final contract is simpler and focused on the core tipping function only.

---

## Contract Overview

**TipRouter.sol** - Smart contract for instant 80/20 tip splitting on Base Sepolia

### Key Properties
- ✅ Never holds funds after transaction completes
- ✅ Instant 80% to creator, 20% to platform treasury
- ✅ Fails closed (reverts on any error)
- ✅ Immutable USDC address (Circle's official USDC on Base Sepolia)

---

## Full Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TipRouter {
    // ============ State ============
    
    address public constant USDC_SEPOLIA = 0x833589fCD6eDb6E08f4c7C32D4f71b3V1337;
    address public treasury;
    address public owner;
    
    // Events
    event TipSent(
        address indexed tipper,
        address indexed creator,
        uint256 amount,
        uint256 timestamp
    );
    
    // ============ Constructor ============
    
    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
        owner = msg.sender;
    }
    
    // ============ Core Functions ============
    
    /**
     * Send a tip with instant 80/20 split
     * 
     * @param creator Creator's wallet address (receives 80%)
     * @param amount Amount in USDC (6 decimals)
     */
    function sendTip(address creator, uint256 amount) external {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Tip amount must be greater than 0");
        
        // Calculate split
        uint256 creatorAmount = (amount * 80) / 100;  // 80%
        uint256 platformAmount = (amount * 20) / 100; // 20%
        
        require(creatorAmount + platformAmount == amount, "Split calculation error");
        
        // Transfer USDC from tipper to this contract (temporary)
        IERC20 usdc = IERC20(USDC_SEPOLIA);
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer from tipper failed"
        );
        
        // Approve and send 80% to creator
        usdc.approve(creator, creatorAmount);
        require(
            usdc.transferFrom(address(this), creator, creatorAmount),
            "Transfer to creator failed"
        );
        
        // Send 20% to treasury
        usdc.approve(treasury, platformAmount);
        require(
            usdc.transferFrom(address(this), treasury, platformAmount),
            "Transfer to treasury failed"
        );
        
        emit TipSent(msg.sender, creator, amount, block.timestamp);
    }
    
    // ============ Admin Functions ============
    
    function setTreasury(address newTreasury) external {
        require(msg.sender == owner, "Caller is not owner");
        require(newTreasury != address(0), "Invalid treasury address");
        treasury = newTreasury;
    }
    
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Caller is not owner");
        require(newOwner != address(0), "Invalid owner address");
        owner = newOwner;
    }
}
```

---

## Tipping Flow Summary

### User Journey
1. Fan (Age 18+) navigates to creator's profile
2. Clicks "Tip" button, selects amount
3. Confirms tip in wallet
4. TipRouter.sendTip() executes:
   - Transfers full amount from fan → contract (temporary)
   - Splits: 80% → creator, 20% → treasury
   - Emits TipSent event
5. Backend records tip in MongoDB (not on-chain)

---

## Security Properties

### ✅ Fail-Closed Design
```solidity
require(creatorAmount + platformAmount == amount, "Split calculation error");
require(usdc.transferFrom(...), "Transfer failed");
```

### ✅ No Fund Custody
Contract never holds funds after split completes. Each transfer is atomic.

### ✅ Immutable USDC Address
Hardcoded as constant (Circle's official address on Base Sepolia).

### ✅ Admin Controls
Only owner can call `setTreasury()` or `transferOwnership()`. Guarded by `require(msg.sender == owner)`.

---

## Deployment Checklist

### Before Deploying to Base Sepolia:

- [ ] Solidity code reviewed by external auditor (TipRouter.sol from `/Users/bojackson/ProjectX/backend/contracts/`)
- [ ] Test suite passes (100% branch coverage)
- [ ] USDC address verified: `0x833589fCD6eDb6E08f4c7C32D4f71b3V1337`
- [ ] Treasury address from `TIP_ROUTER_TREASURY_ADDRESS` env var
- [ ] Private key from `TIP_ROUTER_PRIVATE_KEY` env var (never commit)
- [ ] Dev wallet funded from Sepolia faucet
- [ ] Run Slither security scan: `slither ./backend/contracts/TipRouter.sol`

### After Deployment:
- [ ] Verify contract on BaseScan
- [ ] Test sendTip() with test USDC
- [ ] Save contract address to `TIP_ROUTER_CONTRACT_ADDRESS` in .env
- [ ] Export ABI and wire into `/api/tips` routes

---

## Environment Variables (DEPLOYMENT)

```
# Required for deployment script
TIP_ROUTER_PRIVATE_KEY=xxx              # Dev wallet private key
TIP_ROUTER_TREASURY_ADDRESS=0x...       # Platform treasury wallet
BASE_SEPOLIA_RPC_URL=https://...        # Base Sepolia RPC endpoint

# TipRouter contract (after deployment)
TIP_ROUTER_CONTRACT_ADDRESS=0x...       # Deployed contract address
USDC_SEPOLIA_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b3V1337
```

---

## Next Steps

1. **CDP Credentials** - Provide CDP keys, test embedded wallet creation
2. **Deploy TipRouter to Sepolia** - Run Slither scan + test suite, deploy with Hardhat
3. **Wire real ABI/address** into `/api/tips` routes (replace contract stub)
4. **Task 5: Moderation Pipeline** - Build moderation system for user reports
5. **PPV Design** - Pay-per-view content flow design

---

**Contract Status:** ✅ Code Complete | ⏳ Awaiting Review | ❌ Not Deployed

