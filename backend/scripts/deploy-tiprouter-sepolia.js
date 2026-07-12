/**
 * Deploy TipRouter to Base Sepolia (testnet)
 * 
 * SAFETY RULES:
 * - NEVER deploy to mainnet with this script
 * - Use dev wallet from env vars only
 * - Fund wallet from Sepolia faucet before deployment
 * - Treasury address from env var, never hardcoded
 * 
 * Usage:
 * PRIVATE_KEY=xxx TREASURY_ADDRESS=0x... node scripts/deploy-tiprouter-sepolia.js
 */

require('dotenv').config();

const privateKey = process.env.TIP_ROUTER_PRIVATE_KEY;
const treasuryAddress = process.env.TIP_ROUTER_TREASURY_ADDRESS;

if (!privateKey || !treasuryAddress) {
  console.error('❌ ERROR: Missing required environment variables');
  console.error('   TIP_ROUTER_PRIVATE_KEY: Dev wallet private key');
  console.error('   TIP_ROUTER_TREASURY_ADDRESS: Treasury wallet address');
  console.error('\nSet these in your .env file, never commit them.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('❌ SAFETY BLOCK: This script can only run in development/test!');
  console.error('   Mainnet deployments must be manual and verified.');
  process.exit(1);
}

console.log('🚀 Deploying TipRouter to Base Sepolia...');
console.log(`   Treasury: ${treasuryAddress}`);
console.log(`   Network: Base Sepolia (testnet only)`);
console.log('');

// For Hardhat deployment, you'd use:
// const TipRouter = await ethers.getContractFactory("TipRouter");
// const contract = await TipRouter.deploy(treasuryAddress);
// 
// For now, this is a template. Actual deployment would use Hardhat/Foundry

console.log('✅ Template deployment script created');
console.log('   To deploy with Hardhat:');
console.log('   npx hardhat run scripts/deploy-tiprouter-sepolia.js --network baseSepolia');
