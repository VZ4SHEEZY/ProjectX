// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../backend/contracts/TipRouter.sol";
import "../backend/contracts/MockUSDC.sol";

contract TipActor {
    function approve(MockUSDC token, address spender, uint256 amount) external {
        token.approve(spender, amount);
    }

    function tip(TipRouter router, address creator, uint256 amount) external {
        router.sendTip(creator, amount);
    }

    function setTreasury(TipRouter router, address treasury) external {
        router.setTreasury(treasury);
    }

    function acceptOwnership(TipRouter router) external {
        router.acceptOwnership();
    }
}

contract TipRouterTest {
    MockUSDC token;
    TipRouter router;
    TipActor tipper;
    TipActor creator;
    TipActor treasury;

    function setUp() public {
        token = new MockUSDC();
        tipper = new TipActor();
        creator = new TipActor();
        treasury = new TipActor();
        router = new TipRouter(address(token), address(treasury));
        token.mint(address(tipper), 10_000_000);
    }

    function testExactApprovalRoutesEightyTwentyAndConsumesAllowance() public {
        tipper.approve(token, address(router), 1_000_001);
        tipper.tip(router, address(creator), 1_000_001);
        require(token.balanceOf(address(creator)) == 800_000, "creator split");
        require(token.balanceOf(address(treasury)) == 200_001, "treasury split");
        require(token.allowance(address(tipper), address(router)) == 0, "allowance remains");
    }

    function testExcessiveApprovalReverts() public {
        tipper.approve(token, address(router), type(uint256).max);
        (bool success,) = address(tipper).call(abi.encodeCall(TipActor.tip, (router, address(creator), 1_000_000)));
        require(!success, "excessive approval accepted");
    }

    function testInvalidRecipientsRevert() public {
        tipper.approve(token, address(router), 10_000);
        (bool zeroSuccess,) = address(tipper).call(abi.encodeCall(TipActor.tip, (router, address(0), 10_000)));
        (bool treasurySuccess,) = address(tipper).call(abi.encodeCall(TipActor.tip, (router, address(treasury), 10_000)));
        (bool routerSuccess,) = address(tipper).call(abi.encodeCall(TipActor.tip, (router, address(router), 10_000)));
        require(!zeroSuccess && !treasurySuccess && !routerSuccess, "invalid recipient accepted");
    }

    function testOnlyOwnerCanChangeTreasury() public {
        TipActor stranger = new TipActor();
        (bool success,) = address(stranger).call(abi.encodeCall(TipActor.setTreasury, (router, address(stranger))));
        require(!success, "unauthorized treasury update");
    }

    function testOwnershipTransferRequiresAcceptance() public {
        TipActor nextOwner = new TipActor();
        router.transferOwnership(address(nextOwner));
        require(router.owner() == address(this), "owner changed before acceptance");
        nextOwner.acceptOwnership(router);
        require(router.owner() == address(nextOwner), "ownership not accepted");
        require(router.pendingOwner() == address(0), "pending owner not cleared");
    }

    function testConstructorRejectsTokenWithoutCode() public {
        try new TipRouter(address(0x1234), address(treasury)) {
            revert("EOA token accepted");
        } catch {}
    }
}
