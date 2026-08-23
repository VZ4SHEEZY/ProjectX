import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = hre;

describe('TipRouter payment safety', function () {
  async function fixture() {
    const [owner, tipper, creator, treasury, stranger] = await ethers.getSigners();
    const usdc = await (await ethers.getContractFactory('MockUSDC')).deploy();
    const router = await (await ethers.getContractFactory('TipRouter')).deploy(await usdc.getAddress(), treasury.address);
    await usdc.mint(tipper.address, 10_000_000n);
    return { owner, tipper, creator, treasury, stranger, usdc, router };
  }
  it('routes an exact approval 80/20 and consumes the allowance', async function () {
    const { tipper, creator, treasury, usdc, router } = await fixture();
    await usdc.connect(tipper).approve(await router.getAddress(), 1_000_001n);
    await expect(router.connect(tipper).sendTip(creator.address, 1_000_001n)).to.emit(router, 'TipSent');
    expect(await usdc.balanceOf(creator.address)).to.equal(800_000n);
    expect(await usdc.balanceOf(treasury.address)).to.equal(200_001n);
    expect(await usdc.allowance(tipper.address, await router.getAddress())).to.equal(0n);
  });
  it('rejects excessive approvals', async function () {
    const { tipper, creator, usdc, router } = await fixture();
    await usdc.connect(tipper).approve(await router.getAddress(), ethers.MaxUint256);
    await expect(router.connect(tipper).sendTip(creator.address, 1_000_000n)).to.be.revertedWith('Approval must equal tip amount');
  });
  it('rejects malformed recipients and insufficient approval', async function () {
    const { tipper, treasury, usdc, router } = await fixture();
    await usdc.connect(tipper).approve(await router.getAddress(), 10_000n);
    await expect(router.connect(tipper).sendTip(ethers.ZeroAddress, 10_000n)).to.be.revertedWith('Invalid creator address');
    await expect(router.connect(tipper).sendTip(treasury.address, 10_000n)).to.be.revertedWith('Creator cannot be treasury');
    await expect(router.connect(tipper).sendTip(tipper.address, 20_000n)).to.be.revertedWith('Approval must equal tip amount');
  });
  it('allows only the owner to change treasury', async function () {
    const { stranger, router } = await fixture();
    await expect(router.connect(stranger).setTreasury(stranger.address)).to.be.revertedWith('Caller is not owner');
  });
});
