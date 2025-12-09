require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      // Local testing network
      allowUnlimitedContractSize: true,
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 43113,
      gasPrice: 25000000000, // 25 gwei
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    artifacts: "./artifacts",
  },
};
