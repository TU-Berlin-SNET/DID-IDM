require("@nomicfoundation/hardhat-toolbox");

const SEPOLIA_URL = "https://sepolia.infura.io/v3/896658bbb69c4f788598d32fbdbdb937";
const PRIVATE_KEY = "c1ed196d877dcdf5b5010b2d0e2cb9eae1084f6f51da92ec19f45a05e9fe7f27";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 2,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    hardhat: {
      accounts: {
        count: 102, // had to make it 102 to have enough accounts for the tests, 1 owner, 1 issuer, 100 controllers where up to 50 of them vote
        initialIndex: 0,
        accountsBalance: "10000000000000000000000" // 10 ETH
      }
    }
  },
};


