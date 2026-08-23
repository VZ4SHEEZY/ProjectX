const { ethers } = require('ethers');

const BASE_SEPOLIA_CHAIN_ID = 84532n;
const OFFICIAL_BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const MIN_TIP_UNITS = 10_000n;
const MAX_TIP_UNITS = 1_000_000_000_000n;
const TIP_ROUTER_ABI = [
  'function sendTip(address creator,uint256 amount)', 'function usdc() view returns (address)',
  'function treasury() view returns (address)', 'function CREATOR_BPS() view returns (uint256)',
  'event TipSent(address indexed tipper,address indexed creator,uint256 amount,uint256 creatorAmount,uint256 platformAmount,uint256 timestamp)'
];
const USDC_ABI = [
  'function allowance(address owner,address spender) view returns (uint256)', 'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)', 'function symbol() view returns (string)',
  'function approve(address spender,uint256 amount) returns (bool)'
];
class PaymentConfigurationError extends Error { constructor(message) { super(message); this.name = 'PaymentConfigurationError'; } }
class PaymentVerificationError extends Error { constructor(message) { super(message); this.name = 'PaymentVerificationError'; } }
const sameAddress = (a, b) => ethers.getAddress(a) === ethers.getAddress(b);

function parseUsdcAmount(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) {
    throw new PaymentVerificationError('Amount must be a plain USDC decimal with at most 6 decimal places');
  }
  const units = ethers.parseUnits(value, 6);
  if (units < MIN_TIP_UNITS) throw new PaymentVerificationError('Minimum tip is 0.01 USDC');
  if (units > MAX_TIP_UNITS) throw new PaymentVerificationError('Tip amount exceeds the Base Sepolia safety limit');
  return units;
}

class TipService {
  constructor(env = process.env, provider) {
    this.env = env;
    this.rpcUrl = env.BASE_SEPOLIA_RPC_URL;
    this.contractAddress = env.TIP_ROUTER_CONTRACT_ADDRESS;
    this.contractCodeHash = env.TIP_ROUTER_CODE_HASH;
    this.usdcAddress = env.USDC_SEPOLIA_ADDRESS;
    this.treasuryAddress = env.TIP_ROUTER_TREASURY_ADDRESS;
    this.executionRequested = env.PAYMENT_EXECUTION_ENABLED === 'true';
    this.provider = provider || null;
    this.verification = null;
    this.tipInterface = new ethers.Interface(TIP_ROUTER_ABI);
  }
  validateStaticConfiguration() {
    const errors = [];
    try {
      const rpc = new URL(this.rpcUrl || '');
      if (rpc.protocol !== 'https:') errors.push('BASE_SEPOLIA_RPC_URL must use HTTPS');
      if (rpc.hostname === 'sepolia.base.org') errors.push('BASE_SEPOLIA_RPC_URL must be a dedicated RPC');
    }
    catch { errors.push('BASE_SEPOLIA_RPC_URL is missing or malformed'); }
    for (const [name, value] of [['TIP_ROUTER_CONTRACT_ADDRESS', this.contractAddress], ['USDC_SEPOLIA_ADDRESS', this.usdcAddress], ['TIP_ROUTER_TREASURY_ADDRESS', this.treasuryAddress]]) {
      if (!ethers.isAddress(value || '') || value === ethers.ZeroAddress) errors.push(`${name} is missing or malformed`);
    }
    if (ethers.isAddress(this.usdcAddress || '') && !sameAddress(this.usdcAddress, OFFICIAL_BASE_SEPOLIA_USDC)) errors.push('USDC_SEPOLIA_ADDRESS is not Circle Base Sepolia USDC');
    if (!/^0x[0-9a-fA-F]{64}$/.test(this.contractCodeHash || '')) errors.push('TIP_ROUTER_CODE_HASH is missing or malformed');
    if (ethers.isAddress(this.contractAddress || '') && ethers.isAddress(this.treasuryAddress || '') && sameAddress(this.contractAddress, this.treasuryAddress)) errors.push('TipRouter and treasury must be different addresses');
    if (ethers.isAddress(this.usdcAddress || '') && ethers.isAddress(this.treasuryAddress || '') && sameAddress(this.usdcAddress, this.treasuryAddress)) errors.push('USDC and treasury must be different addresses');
    return { valid: errors.length === 0, errors };
  }
  getProvider() {
    const status = this.validateStaticConfiguration();
    if (!status.valid) throw new PaymentConfigurationError(status.errors.join('; '));
    if (!this.provider) this.provider = new ethers.JsonRpcProvider(this.rpcUrl, Number(BASE_SEPOLIA_CHAIN_ID), { staticNetwork: true });
    return this.provider;
  }
  async verifyConfiguration() {
    const status = this.validateStaticConfiguration();
    if (!status.valid) throw new PaymentConfigurationError(status.errors.join('; '));
    const provider = this.getProvider();
    const network = await provider.getNetwork();
    if (network.chainId !== BASE_SEPOLIA_CHAIN_ID) throw new PaymentConfigurationError(`RPC chain ID ${network.chainId} is not Base Sepolia`);
    const [routerCode, usdcCode] = await Promise.all([provider.getCode(this.contractAddress), provider.getCode(this.usdcAddress)]);
    if (routerCode === '0x') throw new PaymentConfigurationError('TipRouter has no bytecode on Base Sepolia');
    if (usdcCode === '0x') throw new PaymentConfigurationError('USDC has no bytecode on Base Sepolia');
    if (ethers.keccak256(routerCode).toLowerCase() !== this.contractCodeHash.toLowerCase()) throw new PaymentConfigurationError('TipRouter runtime bytecode hash does not match verified deployment');
    const router = new ethers.Contract(this.contractAddress, TIP_ROUTER_ABI, provider);
    const usdc = new ethers.Contract(this.usdcAddress, USDC_ABI, provider);
    const [onchainUsdc, onchainTreasury, creatorBps, decimals, symbol] = await Promise.all([router.usdc(), router.treasury(), router.CREATOR_BPS(), usdc.decimals(), usdc.symbol()]);
    if (!sameAddress(onchainUsdc, this.usdcAddress)) throw new PaymentConfigurationError('TipRouter USDC does not match configuration');
    if (!sameAddress(onchainTreasury, this.treasuryAddress)) throw new PaymentConfigurationError('TipRouter treasury does not match configuration');
    if (creatorBps !== 8000n) throw new PaymentConfigurationError('TipRouter split is not 80/20');
    if (Number(decimals) !== 6 || symbol !== 'USDC') throw new PaymentConfigurationError('Configured token is not 6-decimal USDC');
    this.verification = { verifiedAt: new Date(), chainId: Number(network.chainId), routerCodeHash: ethers.keccak256(routerCode), usdcCodeHash: ethers.keccak256(usdcCode) };
    return this.verification;
  }
  async assertExecutionEnabled() {
    if (!this.executionRequested) throw new PaymentConfigurationError('Payment execution is disabled');
    return this.verifyConfiguration();
  }
  async getAllowance(owner) {
    await this.assertExecutionEnabled();
    if (!ethers.isAddress(owner)) throw new PaymentVerificationError('Invalid wallet address');
    return new ethers.Contract(this.usdcAddress, USDC_ABI, this.getProvider()).allowance(owner, this.contractAddress);
  }
  createIntent({ sender, creator, amount }) {
    if (!ethers.isAddress(sender)) throw new PaymentVerificationError('Invalid sender wallet');
    if (!ethers.isAddress(creator)) throw new PaymentVerificationError('Invalid creator wallet');
    if (sameAddress(sender, creator)) throw new PaymentVerificationError('Cannot tip your own wallet');
    if (sameAddress(creator, this.treasuryAddress)) throw new PaymentVerificationError('Creator cannot be the treasury');
    const amountUnits = parseUsdcAmount(amount);
    return { chainId: Number(BASE_SEPOLIA_CHAIN_ID), token: ethers.getAddress(this.usdcAddress), router: ethers.getAddress(this.contractAddress), treasury: ethers.getAddress(this.treasuryAddress), sender: ethers.getAddress(sender), creator: ethers.getAddress(creator), amount, amountUnits: amountUnits.toString() };
  }
  async verifyTipTransaction(intent, txHash, confirmations = 3) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash || '')) throw new PaymentVerificationError('Malformed transaction hash');
    await this.assertExecutionEnabled();
    const provider = this.getProvider();
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return { pending: true };
    if (receipt.status !== 1) throw new PaymentVerificationError('Tip transaction reverted');
    const block = await provider.getBlockNumber();
    const count = block - receipt.blockNumber + 1;
    if (count < confirmations) return { pending: true, confirmations: count };
    if (!sameAddress(receipt.from, intent.sender) || !sameAddress(receipt.to, intent.router)) throw new PaymentVerificationError('Transaction sender or recipient does not match intent');
    const tx = await provider.getTransaction(txHash);
    if (!tx || tx.chainId !== BASE_SEPOLIA_CHAIN_ID) throw new PaymentVerificationError('Transaction is on the wrong chain');
    const decoded = this.tipInterface.parseTransaction({ data: tx.data, value: tx.value });
    if (!decoded || decoded.name !== 'sendTip' || !sameAddress(decoded.args[0], intent.creator) || decoded.args[1].toString() !== intent.amountUnits) throw new PaymentVerificationError('Transaction calldata does not match intent');
    if (tx.value !== 0n) throw new PaymentVerificationError('Tip transaction unexpectedly transferred native currency');
    const expectedCreator = (BigInt(intent.amountUnits) * 8000n) / 10000n;
    const expectedPlatform = BigInt(intent.amountUnits) - expectedCreator;
    const event = receipt.logs.filter(log => sameAddress(log.address, intent.router)).map(log => { try { return this.tipInterface.parseLog(log); } catch { return null; } }).filter(Boolean).find(e => e.name === 'TipSent' && sameAddress(e.args.tipper, intent.sender) && sameAddress(e.args.creator, intent.creator) && e.args.amount.toString() === intent.amountUnits && e.args.creatorAmount === expectedCreator && e.args.platformAmount === expectedPlatform);
    if (!event) throw new PaymentVerificationError('Matching TipSent event not found');
    return { pending: false, txHash: receipt.hash, blockNumber: receipt.blockNumber, confirmations: count, creatorAmountUnits: expectedCreator.toString(), platformAmountUnits: expectedPlatform.toString() };
  }
  getStatus() {
    const config = this.validateStaticConfiguration();
    return { configured: config.valid, paymentExecutionEnabled: this.executionRequested && config.valid && Boolean(this.verification), chainId: Number(BASE_SEPOLIA_CHAIN_ID), network: 'base-sepolia', contractAddress: this.contractAddress || null, usdcAddress: this.usdcAddress || null, treasuryAddress: this.treasuryAddress || null, verifiedAt: this.verification?.verifiedAt || null, errors: config.errors };
  }
}
const singleton = new TipService();
module.exports = singleton;
module.exports.TipService = TipService;
module.exports.PaymentConfigurationError = PaymentConfigurationError;
module.exports.PaymentVerificationError = PaymentVerificationError;
module.exports.parseUsdcAmount = parseUsdcAmount;
module.exports.constants = { BASE_SEPOLIA_CHAIN_ID, OFFICIAL_BASE_SEPOLIA_USDC, MIN_TIP_UNITS };
