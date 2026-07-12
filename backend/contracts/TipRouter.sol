// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * CyberDope Tip Router Contract
 * 
 * Purpose: Route USDC tips from fans to creators with instant 80/20 split
 * 
 * Key Properties:
 * - Never holds funds after transaction completes
 * - Instant 80% to creator, 20% to platform treasury
 * - Fails closed (reverts on any error)
 * - Read-only interaction with USDC contract
 * 
 * Deployment: Base Sepolia only (testnet)
 * USDC Contract: Circle's official USDC on Base Sepolia
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IUSDCReceiver {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract TipRouter {
    // ============ State ============
    
    address public constant USDC_SEPOLIA = 0x833589fCD6eDb6E08f4c7C32D4f71b3V1337; // Circle's official USDC
    address public treasury;
    address public owner;
    
    // Tip tracking for auditing
    struct Tip {
        address tipper;
        address creator;
        uint256 amount;
        uint256 creatorAmount; // 80%
        uint256 platformAmount; // 20%
        uint256 timestamp;
    }
    
    Tip[] public tipHistory;
    
    // Events
    event TipSent(
        address indexed tipper,
        address indexed creator,
        uint256 amount,
        uint256 creatorAmount,
        uint256 platformAmount,
        uint256 timestamp
    );
    
    event TreasuryWithdrawn(
        address indexed to,
        uint256 amount
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
     * 
     * Flow:
     * 1. Transfer full amount from tipper to this contract (temporary holding)
     * 2. Calculate 80/20 split
     * 3. Transfer 80% to creator
     * 4. Transfer 20% to treasury
     * 5. Never hold funds after step 4
     */
    function sendTip(address creator, uint256 amount) external {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Tip amount must be greater than 0");
        
        // Calculate split (6 decimals for USDC)
        uint256 creatorAmount = (amount * 80) / 100;  // 80%
        uint256 platformAmount = (amount * 20) / 100; // 20%
        
        // Require amount is sufficient (no dust)
        require(creatorAmount + platformAmount == amount, "Split calculation error");
        
        // Transfer USDC from tipper to this contract (temporary)
        IERC20 usdc = IERC20(USDC_SEPOLIA);
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer from tipper failed"
        );
        
        // Approve transfers (required for some USDC implementations)
        usdc.approve(creator, creatorAmount);
        usdc.approve(treasury, platformAmount);
        
        // Send 80% to creator
        require(
            usdc.transferFrom(address(this), creator, creatorAmount),
            "Transfer to creator failed"
        );
        
        // Send 20% to treasury
        require(
            usdc.transferFrom(address(this), treasury, platformAmount),
            "Transfer to treasury failed"
        );
        
        // Record in history for auditing
        tipHistory.push(Tip({
            tipper: msg.sender,
            creator: creator,
            amount: amount,
            creatorAmount: creatorAmount,
            platformAmount: platformAmount,
            timestamp: block.timestamp
        }));
        
        // Emit event for indexing
        emit TipSent(msg.sender, creator, amount, creatorAmount, platformAmount, block.timestamp);
    }
    
    // ============ Admin Functions ============
    
    /**
     * Update treasury address (owner only)
     */
    function setTreasury(address newTreasury) external {
        require(msg.sender == owner, "Caller is not owner");
        require(newTreasury != address(0), "Invalid treasury address");
        treasury = newTreasury;
    }
    
    /**
     * Transfer owner (owner only)
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Caller is not owner");
        require(newOwner != address(0), "Invalid owner address");
        owner = newOwner;
    }
    
    /**
     * Emergency: withdraw any stuck USDC (owner only)
     * Should never be needed if contract logic is correct
     */
    function emergencyWithdraw() external {
        require(msg.sender == owner, "Caller is not owner");
        
        IERC20 usdc = IERC20(USDC_SEPOLIA);
        uint256 balance = usdc.balanceOf(address(this));
        
        require(balance > 0, "No funds to withdraw");
        require(
            usdc.transferFrom(address(this), owner, balance),
            "Withdrawal failed"
        );
    }
    
    // ============ View Functions ============
    
    /**
     * Get total number of tips
     */
    function getTipCount() external view returns (uint256) {
        return tipHistory.length;
    }
    
    /**
     * Get tip by index
     */
    function getTip(uint256 index) external view returns (Tip memory) {
        require(index < tipHistory.length, "Tip index out of bounds");
        return tipHistory[index];
    }
    
    /**
     * Get tips from a specific tipper
     */
    function getTipsByTipper(address tipper) external view returns (Tip[] memory) {
        uint256 count = 0;
        
        // Count matching tips
        for (uint256 i = 0; i < tipHistory.length; i++) {
            if (tipHistory[i].tipper == tipper) {
                count++;
            }
        }
        
        // Collect matching tips
        Tip[] memory result = new Tip[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < tipHistory.length; i++) {
            if (tipHistory[i].tipper == tipper) {
                result[index] = tipHistory[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * Get tips to a specific creator
     */
    function getTipsByCreator(address creator) external view returns (Tip[] memory) {
        uint256 count = 0;
        
        // Count matching tips
        for (uint256 i = 0; i < tipHistory.length; i++) {
            if (tipHistory[i].creator == creator) {
                count++;
            }
        }
        
        // Collect matching tips
        Tip[] memory result = new Tip[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < tipHistory.length; i++) {
            if (tipHistory[i].creator == creator) {
                result[index] = tipHistory[i];
                index++;
            }
        }
        
        return result;
    }
}
