/**
 * Deploy TipRouter to Base Sepolia (testnet)
 * 
 * SAFETY RULES:
 * - NEVER deploy to mainnet with this script
 * - Use dev wallet from env vars only
 * - Fund wallet from Sepolia faucet before deployment
 * - All addresses from env vars, never hardcoded
 * 
 * Environment Variables Required:
 * - TIP_ROUTER_PRIVATE_KEY: Dev wallet private key (never commit)
 * - USDC_SEPOLIA_ADDRESS: Circle's USDC on Base Sepolia
 * - TIP_ROUTER_TREASURY_ADDRESS: Platform treasury wallet
 * - BASE_SEPOLIA_RPC_URL: Base Sepolia RPC endpoint
 */

require('dotenv').config();

const privateKey = process.env.TIP_ROUTER_PRIVATE_KEY;
const usdcAddress = process.env.USDC_SEPOLIA_ADDRESS;
const treasuryAddress = process.env.TIP_ROUTER_TREASURY_ADDRESS;
const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;

if (!privateKey || !usdcAddress || !treasuryAddress || !rpcUrl) {
  console.error('❌ ERROR: Missing required environment variables');
  console.error('   TIP_ROUTER_PRIVATE_KEY: Dev wallet private key');
  console.error('   USDC_SEPOLIA_ADDRESS: Circle USDC on Base Sepolia');
  console.error('   TIP_ROUTER_TREASURY_ADDRESS: Platform treasury wallet');
  console.error('   BASE_SEPOLIA_RPC_URL: Base Sepolia RPC endpoint');
  console.error('\nSet these in your .env file, never commit them.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('❌ SAFETY BLOCK: This script can only run in development/test!');
  console.error('   Mainnet deployments must be manual and verified.');
  process.exit(1);
}

console.log('🚀 Deploying TipRouter to Base Sepolia...');
console.log(`   RPC: ${rpcUrl}`);
console.log(`   USDC: ${usdcAddress}`);
console.log(`   Treasury: ${treasuryAddress}`);
console.log(`   Network: Base Sepolia (testnet only)`);
console.log('');

// Hardhat deployment:
// const { ethers } = require('hardhat');
// 
// const TipRouter = await ethers.getContractFactory("TipRouter");
// const contract = await TipRouter.deploy(usdcAddress, treasuryAddress);
// await contract.waitForDeployment();
// 
// console.log(`✅ TipRouter deployed to: ${await contract.getAddress()}`);

console.log('✅ Deployment script ready for Hardhat/Foundry');
console.log('');
console.log('To deploy with Hardhat:');
console.log('   npx hardhat run scripts/deploy-tiprouter-sepolia.js --network baseSepolia');
console.log('');
console.log('Constructor arguments (in order):');
console.log(`   1. USDC Address:    ${usdcAddress}`);
console.log(`   2. Treasury Address: ${treasuryAddress}`);
