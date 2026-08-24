/** Independently verify an existing Base Sepolia TipRouter deployment. */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const CHAIN_ID = 84532n;
const OFFICIAL_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(required('BASE_SEPOLIA_RPC_URL'));
  if ((await provider.getNetwork()).chainId !== CHAIN_ID) throw new Error('RPC is not Base Sepolia');
  const routerAddress = ethers.getAddress(required('TIP_ROUTER_CONTRACT_ADDRESS'));
  const treasury = ethers.getAddress(required('TIP_ROUTER_TREASURY_ADDRESS'));
  const usdc = ethers.getAddress(required('USDC_SEPOLIA_ADDRESS'));
  if (usdc !== OFFICIAL_USDC) throw new Error('USDC is not the official Base Sepolia contract');
  const artifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../../artifacts/backend/contracts/TipRouter.sol/TipRouter.json'), 'utf8'));
  const router = new ethers.Contract(routerAddress, artifact.abi, provider);
  const code = await provider.getCode(routerAddress);
  if (code === '0x') throw new Error('TipRouter has no bytecode');
  if (ethers.getAddress(await router.usdc()) !== usdc) throw new Error('USDC getter mismatch');
  if (ethers.getAddress(await router.treasury()) !== treasury) throw new Error('Treasury getter mismatch');
  if (await router.getCreatorBPS() !== 8000n || await router.BPS_DENOMINATOR() !== 10000n) throw new Error('Split getter mismatch');

  const creation = await provider.getTransaction(required('TIP_ROUTER_DEPLOYMENT_TX_HASH'));
  if (!creation || creation.to !== null) throw new Error('Configured transaction is not a contract deployment');
  const expectedInput = ethers.concat([artifact.bytecode, ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [usdc, treasury])]);
  if (creation.data.toLowerCase() !== expectedInput.toLowerCase()) throw new Error('On-chain creation input differs from audited compiled source');
  const receipt = await provider.getTransactionReceipt(creation.hash);
  if (!receipt || receipt.status !== 1) throw new Error('Deployment transaction was not successful');
  if (!receipt.contractAddress || ethers.getAddress(receipt.contractAddress) !== routerAddress) throw new Error('Deployment receipt does not create configured router');

  console.log(JSON.stringify({ chainId: Number(CHAIN_ID), contractAddress: routerAddress, runtimeCodeHash: ethers.keccak256(code), creationInputVerified: true, gettersVerified: true }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
