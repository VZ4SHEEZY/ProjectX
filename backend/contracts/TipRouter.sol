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
    function allowance(address owner, address spender) external view returns (uint256);
}

contract TipRouter {
    // ============ Immutable / State ============

    IERC20 public immutable usdc;
    address public treasury;
    address public owner;
    address public pendingOwner;
    uint256 private unlocked = 1;

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
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event StuckFundsRescued(address indexed token, address indexed to, uint256 amount);

    // ============ Constructor ============

    constructor(address _usdc, address _treasury) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_usdc.code.length > 0, "USDC has no bytecode");
        require(_treasury != _usdc, "Treasury cannot be USDC");
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
        require(unlocked == 1, "Reentrant call");
        unlocked = 0;
        require(creator != address(0), "Invalid creator address");
        require(creator != treasury, "Creator cannot be treasury");
        require(creator != address(this), "Creator cannot be router");
        require(creator != address(usdc), "Creator cannot be USDC");
        require(amount >= 10000, "Tip below minimum (0.01 USDC)");
        require(usdc.allowance(msg.sender, address(this)) == amount, "Approval must equal tip amount");

        uint256 creatorAmount = (amount * CREATOR_BPS) / BPS_DENOMINATOR;
        uint256 platformAmount = amount - creatorAmount; // exact, dust goes to platform

        _safeTransferFrom(msg.sender, creator, creatorAmount);
        _safeTransferFrom(msg.sender, treasury, platformAmount);

        emit TipSent(msg.sender, creator, amount, creatorAmount, platformAmount, block.timestamp);
        unlocked = 1;
    }

    // ============ Admin ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        require(newTreasury != address(this), "Treasury cannot be router");
        require(newTreasury != address(usdc), "Treasury cannot be USDC");
        require(newTreasury != treasury, "Treasury unchanged");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner address");
        require(newOwner != owner, "Owner unchanged");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Caller is not pending owner");
        address oldOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    /**
     * Rescue tokens accidentally sent straight to this contract.
     * Normal tip flow never leaves funds here, so this only covers
     * user mistakes. Uses transfer(), not transferFrom().
     */
    function rescueTokens(address token, address to) external onlyOwner {
        require(token != address(0) && token.code.length > 0, "Invalid token");
        require(to != address(0), "Invalid recipient");
        IERC20 t = IERC20(token);
        uint256 balance = t.balanceOf(address(this));
        require(balance > 0, "No funds to rescue");
        _safeTransfer(token, to, balance);
        emit StuckFundsRescued(token, to, balance);
    }

    function _safeTransferFrom(address from, address to, uint256 amount) private {
        (bool success, bytes memory data) = address(usdc).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "USDC transferFrom failed");
    }

    function _safeTransfer(address token, address to, uint256 amount) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
    }

    // ============ View ============

    function getCreatorBPS() external pure returns (uint256) {
        return CREATOR_BPS;
    }
}
