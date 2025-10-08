/**
 * Utility Functions Module
 * Common utilities for the Soltest framework
 */

import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

let web3Instance = null;
let configCache = null;

// Load environment variables
dotenv.config();

/**
 * Load compiled contract artifact from build folder
 * @param {string} contractName - Name of the contract
 * @returns {Object} - Contract artifact with abi and bytecode
 */
export function loadArtifact(contractName) {
  const artifactPath = path.join('build', `${contractName}.json`);
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Contract artifact ${contractName}.json not found in build folder`);
  }
  
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return {
      contractName: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      metadata: artifact.metadata
    };
  } catch (error) {
    throw new Error(`Failed to load artifact ${contractName}: ${error.message}`);
  }
}

/**
 * Convert wei to ETH string using Web3 utils
 * @param {string|number} wei - Amount in wei
 * @returns {string} - Amount in ETH as string
 */
export function formatEther(wei) {
  const web3 = getWeb3Provider();
  return web3.utils.fromWei(wei.toString(), 'ether');
}

/**
 * Convert ETH to wei using Web3 utils
 * @param {string|number} eth - Amount in ETH
 * @returns {string} - Amount in wei as string
 */
export function parseEther(eth) {
  const web3 = getWeb3Provider();
  return web3.utils.toWei(eth.toString(), 'ether');
}

/**
 * Get array of .sol files in directory
 * @param {string} dir - Directory to search
 * @returns {Array} - Array of .sol file paths
 */
export function getContractFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  
  const files = fs.readdirSync(dir, { withFileTypes: true });
  const solFiles = [];
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Recursively search subdirectories
      solFiles.push(...getContractFiles(filePath));
    } else if (file.name.endsWith('.sol')) {
      solFiles.push(filePath);
    }
  });
  
  return solFiles;
}

/**
 * Create directory if it doesn't exist
 * @param {string} dir - Directory path to create
 * @returns {void}
 */
export function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Async sleep function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after specified time
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Legacy functions for backward compatibility
export function getWeb3Provider() {
  if (!web3Instance) {
    // Try to connect to local blockchain (Ganache, Hardhat, etc.)
    const providerUrl = process.env.WEB3_PROVIDER || 'http://localhost:8545';
    
    try {
      web3Instance = new Web3(providerUrl);
      console.log(`🔗 Connected to Web3 provider: ${providerUrl}`);
    } catch (error) {
      throw new Error(`Failed to connect to Web3 provider: ${error.message}`);
    }
  }
  
  return web3Instance;
}

export function formatAddress(address) {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function logWithTimestamp(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export function validateAddress(address) {
  const web3 = getWeb3Provider();
  return web3.utils.isAddress(address);
}

export function getGasEstimate(contract, method, args = [], from) {
  return contract.methods[method](...args).estimateGas({ from });
}

export function formatGasUsed(gasUsed, gasPrice) {
  const gasCost = gasUsed * gasPrice;
  return {
    gasUsed: gasUsed.toString(),
    gasPrice: gasPrice.toString(),
    gasCost: formatEther(gasCost)
  };
}

/**
 * Load soltest configuration from soltest.config.js
 * @param {string} configPath - Path to config file (default: './soltest.config.js')
 * @returns {Object} - Configuration object
 */
export function loadConfig(configPath = './soltest.config.js') {
  if (configCache) {
    return configCache;
  }

  try {
    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️  Config file not found at ${configPath}, using defaults`);
      return getDefaultConfig();
    }

    // Load and execute config file
    delete require.cache[require.resolve(path.resolve(configPath))];
    const config = require(path.resolve(configPath));
    
    // Process environment variables in config
    const processedConfig = processConfigEnvVars(config);
    
    configCache = processedConfig;
    return processedConfig;
    
  } catch (error) {
    console.error(`❌ Failed to load config: ${error.message}`);
    console.log('📝 Using default configuration');
    return getDefaultConfig();
  }
}

/**
 * Process environment variables in configuration
 * @param {Object} config - Raw configuration object
 * @returns {Object} - Processed configuration with env vars resolved
 */
function processConfigEnvVars(config) {
  const processed = JSON.parse(JSON.stringify(config)); // Deep clone
  
  // Process network configurations
  if (processed.networks) {
    Object.keys(processed.networks).forEach(networkName => {
      const network = processed.networks[networkName];
      
      // Process accounts
      if (Array.isArray(network.accounts)) {
        network.accounts = network.accounts.map(account => {
          if (typeof account === 'string' && account.startsWith('PRIVATE_KEY')) {
            const envVar = account.replace('PRIVATE_KEY_FROM_ENV', 'PRIVATE_KEY');
            return process.env[envVar] || account;
          }
          return account;
        });
      }
      
      // Process URLs with environment variables
      if (network.url && network.url.includes('YOUR_')) {
        const envVar = network.url.includes('INFURA') ? 'INFURA_API_KEY' : 'ALCHEMY_API_KEY';
        const apiKey = process.env[envVar];
        if (apiKey) {
          network.url = network.url.replace('YOUR_INFURA_KEY', apiKey);
        }
      }
      
      // Override with environment variables
      const networkEnvVar = `${networkName.toUpperCase()}_RPC_URL`;
      if (process.env[networkEnvVar]) {
        network.url = process.env[networkEnvVar];
      }
    });
  }
  
  return processed;
}

/**
 * Get default configuration
 * @returns {Object} - Default configuration
 */
function getDefaultConfig() {
  return {
    networks: {
      local: {
        url: 'http://127.0.0.1:8545',
        accounts: 'ganache',
        chainId: 1337
      }
    },
    solc: {
      version: '0.8.20',
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: 'paris'
    },
    paths: {
      contracts: './contracts',
      tests: './test',
      build: './build',
      artifacts: './build'
    },
    gasReporter: {
      enabled: false,
      currency: 'USD',
      gasPrice: 20,
      outputFile: './gas-report.json'
    },
    test: {
      timeout: 10000,
      bail: false,
      parallel: false
    },
    deployment: {
      gasLimit: 2000000,
      gasPrice: 'auto',
      timeout: 300000
    }
  };
}

/**
 * Get network configuration by name
 * @param {string} networkName - Name of the network
 * @returns {Object} - Network configuration
 */
export function getNetworkConfig(networkName) {
  const config = loadConfig();
  
  if (!config.networks || !config.networks[networkName]) {
    throw new Error(`Network '${networkName}' not found in configuration`);
  }
  
  return config.networks[networkName];
}

/**
 * Get all available networks
 * @returns {Array} - Array of network names
 */
export function getAvailableNetworks() {
  const config = loadConfig();
  return Object.keys(config.networks || {});
}

/**
 * Validate network configuration
 * @param {Object} networkConfig - Network configuration to validate
 * @returns {boolean} - Whether configuration is valid
 */
export function validateNetworkConfig(networkConfig) {
  if (!networkConfig.url) {
    throw new Error('Network configuration must include a URL');
  }
  
  if (networkConfig.accounts && Array.isArray(networkConfig.accounts)) {
    networkConfig.accounts.forEach(account => {
      if (typeof account === 'string' && account.length !== 64 && !account.startsWith('0x')) {
        throw new Error(`Invalid private key format: ${account}`);
      }
    });
  }
  
  return true;
}

/**
 * Clear configuration cache
 */
export function clearConfigCache() {
  configCache = null;
}
