// hardhat.config.js
require('@nomicfoundation/hardhat-toolbox')

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs:    200
      }
    }
  },
  networks: {
    amoy: {
      url:      process.env.POLYGON_RPC_URL ||
                'https://rpc-amoy.polygon.technology',
      accounts: process.env.WALLET_PRIVATE_KEY
        ? [process.env.WALLET_PRIVATE_KEY]
        : [],
      chainId:  80002
      // Polygon Amoy testnet chain ID
    },
    localhost: {
      url:     'http://127.0.0.1:8545',
      chainId: 31337
    }
  },
  gasReporter: {
    enabled:  true,
    currency: 'INR'
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || ''
    }
  }
}
