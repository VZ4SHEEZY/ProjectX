import '@nomicfoundation/hardhat-toolbox';

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.20",
  paths: { sources: './backend/contracts', tests: './test' },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.TIP_ROUTER_PRIVATE_KEY ? [process.env.TIP_ROUTER_PRIVATE_KEY] : [],
    },
  },
};
