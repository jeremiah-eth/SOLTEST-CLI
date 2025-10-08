/**
 * Soltest Configuration
 * Configuration file for soltest CLI
 */

module.exports = {
  // Network configurations
  networks: {
    // Local development network (Ganache)
    local: {
      url: 'http://127.0.0.1:8545',
      accounts: 'ganache', // Auto-generate accounts using Ganache
      chainId: 1337
    },
    
    // Ethereum Sepolia testnet
    sepolia: {
      url: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      accounts: ['PRIVATE_KEY_FROM_ENV'], // Load from .env file
      chainId: 11155111,
      gasPrice: 'auto'
    },
    
    // Polygon Mumbai testnet
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 80001,
      gasPrice: 'auto'
    },
    
    // Ethereum mainnet (for production)
    mainnet: {
      url: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 1,
      gasPrice: 'auto'
    },
    
    // Polygon mainnet
    polygon: {
      url: 'https://polygon-rpc.com',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 137,
      gasPrice: 'auto'
    }
  },
  
  // Solidity compiler settings
  solc: {
    version: '0.8.20',
    optimizer: {
      enabled: true,
      runs: 200
    },
    evmVersion: 'paris'
  },
  
  // Directory paths
  paths: {
    contracts: './contracts',
    tests: './test',
    build: './build',
    artifacts: './build'
  },
  
  // Gas reporting settings
  gasReporter: {
    enabled: false,
    currency: 'USD',
    gasPrice: 20, // gwei
    outputFile: './gas-report.json'
  },
  
  // Test settings
  test: {
    timeout: 10000,
    bail: false,
    parallel: false
  },
  
  // Deployment settings
  deployment: {
    gasLimit: 2000000,
    gasPrice: 'auto',
    timeout: 300000 // 5 minutes
  }
};
