/**
 * Utility Functions Module
 * Common utilities for the Soltest framework
 */

import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { 
  ContractArtifact, 
  SoltestConfig, 
  NetworkConfig, 
  DeploymentResult,
  Web3Instance 
} from '../types';

let web3Instance: Web3Instance | null = null;
let configCache: SoltestConfig | null = null;

// Load environment variables
dotenv.config();

/**
 * Load compiled contract artifact from build folder
 * @param contractName - Name of the contract
 * @returns Contract artifact with abi and bytecode
 */
export function loadArtifact(contractName: string): ContractArtifact {
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
      deployedBytecode: artifact.deployedBytecode || '',
      sourceMap: artifact.sourceMap || '',
      deployedSourceMap: artifact.deployedSourceMap || '',
      source: artifact.source || '',
      sourcePath: artifact.sourcePath || '',
      ast: artifact.ast || null,
      legacyAST: artifact.legacyAST || null,
      compiler: artifact.compiler || { name: 'solc', version: '0.8.20' },
      networks: artifact.networks || {},
      schemaVersion: artifact.schemaVersion || '3.4.7',
      updatedAt: artifact.updatedAt || new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to load artifact ${contractName}: ${(error as Error).message}`);
  }
}

/**
 * Convert wei to ETH string using Web3 utils
 * @param wei - Amount in wei
 * @returns Amount in ETH as string
 */
export function formatEther(wei: string | number): string {
  const web3 = getWeb3Provider();
  return web3.utils.fromWei(wei.toString(), 'ether');
}

/**
 * Convert ETH to wei string using Web3 utils
 * @param eth - Amount in ETH
 * @returns Amount in wei as string
 */
export function parseEther(eth: string | number): string {
  const web3 = getWeb3Provider();
  return web3.utils.toWei(eth.toString(), 'ether');
}

/**
 * Get Web3 provider instance
 * @returns Web3 instance
 */
export function getWeb3Provider(): Web3Instance {
  if (!web3Instance) {
    web3Instance = new Web3() as unknown as Web3Instance;
  }
  return web3Instance!;
}

/**
 * Set Web3 provider instance
 * @param provider - Web3 provider instance
 */
export function setWeb3Provider(provider: Web3Instance): void {
  web3Instance = provider;
}

/**
 * Ensure directory exists
 * @param dirPath - Directory path
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Load configuration from soltest.config.js
 * @param configPath - Path to config file
 * @returns Configuration object
 */
export function loadConfig(configPath: string = './soltest.config.js'): SoltestConfig {
  if (configCache) {
    return configCache;
  }

  try {
    if (!fs.existsSync(configPath)) {
      console.warn(`⚠️  Config file not found at ${configPath}, using defaults`);
      return getDefaultConfig();
    }

    // Clear require cache to allow hot reloading
    delete require.cache[require.resolve(path.resolve(configPath))];
    const config = require(path.resolve(configPath));
    
    const processedConfig = processConfigEnvVars(config);
    
    configCache = processedConfig;
    return processedConfig;
    
  } catch (error) {
    console.error(`❌ Failed to load config: ${(error as Error).message}`);
    console.log('📝 Using default configuration');
    return getDefaultConfig();
  }
}

/**
 * Process environment variables in configuration
 * @param config - Raw configuration object
 * @returns Processed configuration
 */
function processConfigEnvVars(config: any): SoltestConfig {
  const processed = JSON.parse(JSON.stringify(config));
  
  if (processed.networks) {
    Object.keys(processed.networks).forEach((networkName: string) => {
      const network = processed.networks[networkName];
      
      if (Array.isArray(network.accounts)) {
        network.accounts = network.accounts.map((account: string) => {
          if (typeof account === 'string' && account.startsWith('PRIVATE_KEY')) {
            const envVar = account.replace('PRIVATE_KEY_FROM_ENV', 'PRIVATE_KEY');
            return process.env[envVar] || account;
          }
          return account;
        });
      }
      
      if (network.url && network.url.includes('YOUR_')) {
        const envVar = network.url.includes('INFURA') ? 'INFURA_API_KEY' : 'ALCHEMY_API_KEY';
        const apiKey = process.env[envVar];
        if (apiKey) {
          network.url = network.url.replace('YOUR_INFURA_KEY', apiKey);
        }
      }
      
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
 * @returns Default configuration object
 */
function getDefaultConfig(): SoltestConfig {
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
 * Get network configuration
 * @param networkName - Name of the network
 * @returns Network configuration
 */
export function getNetworkConfig(networkName: string): NetworkConfig {
  const config = loadConfig();
  
  if (!config.networks || !config.networks[networkName]) {
    throw new Error(`Network '${networkName}' not found in configuration`);
  }
  
  return config.networks[networkName];
}

/**
 * Get available networks
 * @returns Array of network names
 */
export function getAvailableNetworks(): string[] {
  const config = loadConfig();
  return Object.keys(config.networks || {});
}

/**
 * Validate network configuration
 * @param networkConfig - Network configuration to validate
 * @returns True if valid
 */
export function validateNetworkConfig(networkConfig: NetworkConfig): boolean {
  if (!networkConfig.url) {
    throw new Error('Network configuration must include a URL');
  }
  
  if (networkConfig.accounts && Array.isArray(networkConfig.accounts)) {
    networkConfig.accounts.forEach((account: string) => {
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
export function clearConfigCache(): void {
  configCache = null;
}

/**
 * Format gas price for display
 * @param gasPrice - Gas price in wei
 * @returns Formatted gas price string
 */
export function formatGasPrice(gasPrice: string | number): string {
  const web3 = getWeb3Provider();
  const gwei = web3.utils.fromWei(gasPrice.toString(), 'gwei');
  return `${parseFloat(gwei).toFixed(2)} Gwei`;
}

/**
 * Format gas used for display
 * @param gasUsed - Gas used
 * @returns Formatted gas used string
 */
export function formatGasUsed(gasUsed: string | number): string {
  return `${Number(gasUsed).toLocaleString()} gas`;
}

/**
 * Calculate gas cost in ETH
 * @param gasUsed - Gas used
 * @param gasPrice - Gas price in wei
 * @returns Cost in ETH as string
 */
export function calculateGasCost(gasUsed: string | number, gasPrice: string | number): string {
  const web3 = getWeb3Provider();
  const cost = BigInt(gasUsed) * BigInt(gasPrice);
  return web3.utils.fromWei(cost.toString(), 'ether');
}

/**
 * Validate Ethereum address
 * @param address - Address to validate
 * @returns True if valid address
 */
export function isValidAddress(address: string): boolean {
  const web3 = getWeb3Provider();
  return web3.utils.isAddress(address);
}

/**
 * Convert address to checksum format
 * @param address - Address to convert
 * @returns Checksum address
 */
export function toChecksumAddress(address: string): string {
  const web3 = getWeb3Provider();
  return web3.utils.toChecksumAddress(address);
}

/**
 * Generate random private key
 * @returns Random private key
 */
export function generatePrivateKey(): string {
  const web3 = getWeb3Provider();
  return web3.utils.randomHex(32);
}

/**
 * Get contract deployment result
 * @param receipt - Transaction receipt
 * @param contractName - Name of the contract
 * @returns Deployment result
 */
export function getDeploymentResult(receipt: any, contractName: string): DeploymentResult {
  return {
    address: receipt.contractAddress,
    transactionHash: receipt.transactionHash,
    gasUsed: receipt.gasUsed,
    gasPrice: receipt.gasPrice || '0',
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    from: receipt.from,
    to: receipt.to,
    value: receipt.value || '0',
    nonce: receipt.nonce || 0
  };
}

/**
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Promise that resolves with function result
 */
export async function retry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

/**
 * Deep merge two objects
 * @param target - Target object
 * @param source - Source object
 * @returns Merged object
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || ({} as any), source[key] as any);
    } else {
      result[key] = source[key] as any;
    }
  }
  
  return result;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns True if empty
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Sanitize string for use in file names
 * @param str - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeFileName(str: string): string {
  return str.replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * Get file extension from path
 * @param filePath - File path
 * @returns File extension
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if file is a Solidity file
 * @param filePath - File path
 * @returns True if Solidity file
 */
export function isSolidityFile(filePath: string): boolean {
  return getFileExtension(filePath) === '.sol';
}

/**
 * Check if file is a test file
 * @param filePath - File path
 * @returns True if test file
 */
export function isTestFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return fileName.includes('.test.') || fileName.includes('.spec.');
}

/**
 * Get relative path from base to target
 * @param base - Base path
 * @param target - Target path
 * @returns Relative path
 */
export function getRelativePath(base: string, target: string): string {
  return path.relative(base, target);
}

/**
 * Normalize path separators
 * @param filePath - File path
 * @returns Normalized path
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Get timestamp string
 * @returns Current timestamp as string
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format duration in milliseconds to human readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Parse constructor arguments from string
 * @param argsString - Arguments as string
 * @returns Parsed arguments array
 */
export function parseConstructorArgs(argsString: string): any[] {
  if (!argsString || argsString.trim() === '') {
    return [];
  }
  
  try {
    // Simple parsing for basic types
    return argsString.split(',').map(arg => {
      const trimmed = arg.trim();
      
      // Try to parse as number
      if (!isNaN(Number(trimmed))) {
        return Number(trimmed);
      }
      
      // Try to parse as boolean
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      
      // Return as string
      return trimmed;
    });
  } catch (error) {
    throw new Error(`Failed to parse constructor arguments: ${(error as Error).message}`);
  }
}
