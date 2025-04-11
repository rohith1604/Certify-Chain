require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify"); // Add Hardhat Verify plugin
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      chainId: 1337,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "", // Load API Key from .env
  },
  paths: {
    artifacts: "./artifacts",
  },
};
