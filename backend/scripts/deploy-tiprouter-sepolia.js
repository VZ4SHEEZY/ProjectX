/** Deploy TipRouter to Base Sepolia with a disposable, pre-funded wallet. */
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

function validateRpc(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('BASE_SEPOLIA_RPC_URL is malformed'); }
  if (url.protocol !== 'https:') throw new Error('BASE_SEPOLIA_RPC_URL must use HTTPS');
  if (url.hostname === 'sepolia.base.org') throw new Error('A dedicated Base Sepolia RPC is required; public RPC refused');
}

async function main() {
  const rpcUrl = required('BASE_SEPOLIA_RPC_URL');
  const privateKey = required('TIP_ROUTER_PRIVATE_KEY');
  const treasury = ethers.getAddress(required('TIP_ROUTER_TREASURY_ADDRESS'));
  const usdc = ethers.getAddress(required('USDC_SEPOLIA_ADDRESS'));
  validateRpc(rpcUrl);
  if (usdc !== OFFICIAL_USDC) throw new Error('Refusing non-official Base Sepolia USDC');
  if (treasury === ethers.ZeroAddress || treasury === usdc) throw new Error('Invalid test treasury');
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error('TIP_ROUTER_PRIVATE_KEY is malformed');

  const provider = new ethers.JsonRpcProvider(rpcUrl, Number(CHAIN_ID), { staticNetwork: true });
  const network = await provider.getNetwork();
  if (network.chainId !== CHAIN_ID) throw new Error(`Refusing chain ${network.chainId}; expected ${CHAIN_ID}`);
  const signer = new ethers.Wallet(privateKey, provider);
  if (treasury === signer.address) throw new Error('Test treasury must be separate from disposable deployer');
  if (await provider.getCode(usdc) === '0x') throw new Error('Official USDC has no bytecode');
  const token = new ethers.Contract(usdc, ['function symbol() view returns(string)', 'function decimals() view returns(uint8)'], provider);
  if (await token.symbol() !== 'USDC' || await token.decimals() !== 6n) throw new Error('Official USDC metadata mismatch');
  if (await provider.getBalance(signer.address) === 0n) throw new Error('Disposable deployer has no Base Sepolia ETH');

  const artifactPath = path.join(__dirname, '../../artifacts/backend/contracts/TipRouter.sol/TipRouter.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(usdc, treasury);
  const deploymentTx = contract.deploymentTransaction();
  const receipt = await deploymentTx.wait(3);
  const address = await contract.getAddress();
  const expectedInput = ethers.concat([artifact.bytecode, ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [usdc, treasury])]);
  if (deploymentTx.data.toLowerCase() !== expectedInput.toLowerCase()) throw new Error('Deployment input does not match audited artifact and constructor values');
  if (await provider.getCode(address) === '0x') throw new Error('Deployed TipRouter has no bytecode');
  if (ethers.getAddress(await contract.usdc()) !== usdc) throw new Error('Deployed USDC getter mismatch');
  if (ethers.getAddress(await contract.treasury()) !== treasury) throw new Error('Deployed treasury getter mismatch');
  if (ethers.getAddress(await contract.owner()) !== signer.address) throw new Error('Deployed owner getter mismatch');
  if (await contract.getCreatorBPS() !== 8000n) throw new Error('Deployed split getter mismatch');

  const runtimeCodeHash = ethers.keccak256(await provider.getCode(address));
  console.log(JSON.stringify({ chainId: Number(CHAIN_ID), contractAddress: address, transactionHash: receipt.hash, blockNumber: receipt.blockNumber, confirmations: 3, runtimeCodeHash, sourceInputVerified: true, gettersVerified: true }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
