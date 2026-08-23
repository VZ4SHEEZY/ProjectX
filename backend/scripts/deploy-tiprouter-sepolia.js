/** Base Sepolia-only TipRouter deployment. Use a disposable testnet deployer. */
require('dotenv').config();
const { ethers: ethersLib } = require('ethers');

async function main() {
  const required = ['TIP_ROUTER_PRIVATE_KEY', 'USDC_SEPOLIA_ADDRESS', 'TIP_ROUTER_TREASURY_ADDRESS', 'BASE_SEPOLIA_RPC_URL'];
  const missing = required.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`);
  if (process.env.USDC_SEPOLIA_ADDRESS.toLowerCase() !== '0x036cbd53842c5426634e7929541ec2318f3dcf7e') throw new Error('Refusing non-official Base Sepolia USDC');
  if (!ethersLib.isAddress(process.env.TIP_ROUTER_TREASURY_ADDRESS) || process.env.TIP_ROUTER_TREASURY_ADDRESS === ethersLib.ZeroAddress) throw new Error('Invalid treasury');
  const hre = await import('hardhat');
  const network = await hre.default.ethers.provider.getNetwork();
  if (network.chainId !== 84532n) throw new Error(`Refusing chain ${network.chainId}; expected Base Sepolia 84532`);
  const usdcCode = await hre.default.ethers.provider.getCode(process.env.USDC_SEPOLIA_ADDRESS);
  if (usdcCode === '0x') throw new Error('USDC has no bytecode');
  const factory = await hre.default.ethers.getContractFactory('TipRouter');
  const contract = await factory.deploy(process.env.USDC_SEPOLIA_ADDRESS, process.env.TIP_ROUTER_TREASURY_ADDRESS);
  await contract.waitForDeployment();
  const receipt = await contract.deploymentTransaction().wait(3);
  const address = await contract.getAddress();
  if ((await contract.usdc()).toLowerCase() !== process.env.USDC_SEPOLIA_ADDRESS.toLowerCase()) throw new Error('Deployed USDC mismatch');
  if ((await contract.treasury()).toLowerCase() !== process.env.TIP_ROUTER_TREASURY_ADDRESS.toLowerCase()) throw new Error('Deployed treasury mismatch');
  console.log(JSON.stringify({ chainId: Number(network.chainId), contractAddress: address, transactionHash: receipt.hash, blockNumber: receipt.blockNumber }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
