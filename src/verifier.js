/**
 * Contract Verifier Module
 * Handles contract verification on Etherscan and other block explorers
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig, getNetworkConfig } from './utils.js';

export class ContractVerifier {
  constructor() {
    this.apiKeys = {
      etherscan: process.env.ETHERSCAN_API_KEY,
      polygonscan: process.env.POLYGONSCAN_API_KEY,
      bscscan: process.env.BSCSCAN_API_KEY,
      arbiscan: process.env.ARBISCAN_API_KEY,
      snowtrace: process.env.SNOWTRACE_API_KEY,
      basescan: process.env.BASESCAN_API_KEY
    };
    
    this.explorerUrls = {
      etherscan: 'https://api.etherscan.io/api',
      polygonscan: 'https://api.polygonscan.com/api',
      bscscan: 'https://api.bscscan.com/api',
      arbiscan: 'https://api.arbiscan.io/api',
      snowtrace: 'https://api.snowtrace.io/api',
      basescan: 'https://api-sepolia.basescan.org/api'
    };
    
    this.networkMappings = {
      mainnet: 'etherscan',
      sepolia: 'etherscan',
      polygon: 'polygonscan',
      mumbai: 'polygonscan',
      bsc: 'bscscan',
      arbitrum: 'arbiscan',
      avalanche: 'snowtrace',
      baseSepolia: 'basescan',
      base: 'basescan'
    };
  }

  /**
   * Verify contract on block explorer
   * @param {string} contractAddress - Contract address to verify
   * @param {string} network - Network name
   * @param {Array} constructorArgs - Constructor arguments
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Verification result
   */
  async verify(contractAddress, network, constructorArgs = [], options = {}) {
    try {
      console.log(chalk.blue(`🔍 Verifying contract ${contractAddress} on ${network}...`));
      
      // Get network configuration
      const networkConfig = getNetworkConfig(network);
      const explorer = this.getExplorerForNetwork(network);
      
      if (!explorer) {
        throw new Error(`No block explorer configured for network: ${network}`);
      }
      
      // Get API key for explorer
      const apiKey = this.getApiKey(explorer);
      if (!apiKey) {
        throw new Error(`API key not found for ${explorer}. Set ${explorer.toUpperCase()}_API_KEY in .env`);
      }
      
      // Flatten contract source code
      const sourceCode = await this.flattenContract(options.contractPath || './contracts/Token.sol');
      
      // Prepare verification parameters
      const verificationParams = {
        apikey: apiKey,
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: contractAddress,
        sourcecode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: options.contractName || 'Token',
        compilerversion: `v${options.compilerVersion || '0.8.20'}`,
        optimizationUsed: options.optimizationUsed || '1',
        runs: options.runs || '200',
        evmversion: options.evmVersion || 'paris'
      };
      
      // Add constructor arguments if provided
      if (constructorArgs.length > 0) {
        verificationParams.constructorArguements = constructorArgs.join(',');
      }
      
      // Submit verification request
      const response = await axios.post(this.explorerUrls[explorer], verificationParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.status === '1') {
        const guid = response.data.result;
        console.log(chalk.green(`✅ Verification submitted successfully!`));
        console.log(chalk.blue(`📋 GUID: ${guid}`));
        
        return {
          success: true,
          guid: guid,
          explorer: explorer,
          contractAddress: contractAddress,
          network: network
        };
      } else {
        throw new Error(`Verification failed: ${response.data.result}`);
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Verification failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Flatten contract source code by resolving imports
   * @param {string} contractPath - Path to the contract file
   * @returns {Promise<string>} - Flattened source code
   */
  async flattenContract(contractPath) {
    try {
      console.log(chalk.blue(`📄 Flattening contract: ${contractPath}`));
      
      if (!fs.existsSync(contractPath)) {
        throw new Error(`Contract file not found: ${contractPath}`);
      }
      
      const sourceCode = fs.readFileSync(contractPath, 'utf8');
      const flattened = await this.resolveImports(sourceCode, path.dirname(contractPath));
      
      console.log(chalk.green(`✅ Contract flattened successfully`));
      return flattened;
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to flatten contract: ${error.message}`));
      throw error;
    }
  }

  /**
   * Resolve imports in source code
   * @param {string} sourceCode - Source code with imports
   * @param {string} basePath - Base directory for imports
   * @returns {Promise<string>} - Source code with resolved imports
   */
  async resolveImports(sourceCode, basePath) {
    const importRegex = /import\s+['"]([^'"]+)['"];?/g;
    let flattened = sourceCode;
    const processedImports = new Set();
    
    const resolveImport = async (importPath) => {
      if (processedImports.has(importPath)) {
        return '';
      }
      
      processedImports.add(importPath);
      
      let fullPath;
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        fullPath = path.resolve(basePath, importPath);
      } else {
        // Try to find in node_modules or common paths
        const possiblePaths = [
          path.resolve(basePath, 'node_modules', importPath),
          path.resolve(basePath, importPath),
          path.resolve('./node_modules', importPath)
        ];
        
        fullPath = possiblePaths.find(p => fs.existsSync(p));
      }
      
      if (!fullPath || !fs.existsSync(fullPath)) {
        console.warn(chalk.yellow(`⚠️  Import not found: ${importPath}`));
        return '';
      }
      
      const importSource = fs.readFileSync(fullPath, 'utf8');
      const importDir = path.dirname(fullPath);
      const resolvedImport = await this.resolveImports(importSource, importDir);
      
      return resolvedImport;
    };
    
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const importPath = match[1];
      const resolvedImport = await resolveImport(importPath);
      flattened = flattened.replace(match[0], resolvedImport);
    }
    
    return flattened;
  }

  /**
   * Check verification status
   * @param {string} guid - Verification GUID
   * @param {string} explorer - Explorer name
   * @returns {Promise<Object>} - Verification status
   */
  async checkVerificationStatus(guid, explorer = 'etherscan') {
    try {
      const apiKey = this.getApiKey(explorer);
      if (!apiKey) {
        throw new Error(`API key not found for ${explorer}`);
      }
      
      const response = await axios.get(this.explorerUrls[explorer], {
        params: {
          apikey: apiKey,
          module: 'contract',
          action: 'checkverifystatus',
          guid: guid
        }
      });
      
      if (response.data.status === '1') {
        return {
          success: true,
          status: 'verified',
          message: 'Contract verified successfully!'
        };
      } else if (response.data.result === 'Pending in queue') {
        return {
          success: false,
          status: 'pending',
          message: 'Verification is pending in queue'
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: response.data.result
        };
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to check verification status: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get explorer for network
   * @param {string} network - Network name
   * @returns {string|null} - Explorer name or null
   */
  getExplorerForNetwork(network) {
    return this.networkMappings[network] || null;
  }

  /**
   * Get API key for explorer
   * @param {string} explorer - Explorer name
   * @returns {string|null} - API key or null
   */
  getApiKey(explorer) {
    return this.apiKeys[explorer] || null;
  }

  /**
   * Get contract source code from block explorer
   * @param {string} contractAddress - Contract address
   * @param {string} explorer - Explorer name
   * @returns {Promise<string>} - Contract source code
   */
  async getContractSource(contractAddress, explorer = 'etherscan') {
    try {
      const apiKey = this.getApiKey(explorer);
      if (!apiKey) {
        throw new Error(`API key not found for ${explorer}`);
      }
      
      const response = await axios.get(this.explorerUrls[explorer], {
        params: {
          apikey: apiKey,
          module: 'contract',
          action: 'getsourcecode',
          address: contractAddress
        }
      });
      
      if (response.data.status === '1' && response.data.result[0].SourceCode) {
        return response.data.result[0].SourceCode;
      } else {
        throw new Error('Contract source code not found or not verified');
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get contract source: ${error.message}`));
      throw error;
    }
  }

  /**
   * Wait for verification to complete
   * @param {string} guid - Verification GUID
   * @param {string} explorer - Explorer name
   * @param {number} maxAttempts - Maximum attempts (default: 30)
   * @param {number} delay - Delay between attempts in ms (default: 10000)
   * @returns {Promise<Object>} - Final verification result
   */
  async waitForVerification(guid, explorer = 'etherscan', maxAttempts = 30, delay = 10000) {
    console.log(chalk.blue(`⏳ Waiting for verification to complete...`));
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.checkVerificationStatus(guid, explorer);
        
        if (status.success) {
          console.log(chalk.green(`✅ Contract verified successfully!`));
          return status;
        } else if (status.status === 'failed') {
          console.log(chalk.red(`❌ Verification failed: ${status.message}`));
          return status;
        } else {
          console.log(chalk.yellow(`⏳ Attempt ${attempt}/${maxAttempts}: ${status.message}`));
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        console.log(chalk.yellow(`⏳ Attempt ${attempt}/${maxAttempts}: Error checking status, retrying...`));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Verification timeout - please check manually');
  }

  /**
   * Get supported networks
   * @returns {Array} - Array of supported network names
   */
  getSupportedNetworks() {
    return Object.keys(this.networkMappings);
  }

  /**
   * Get supported explorers
   * @returns {Array} - Array of supported explorer names
   */
  getSupportedExplorers() {
    return Object.keys(this.explorerUrls);
  }
}

// Export convenience functions
export function createVerifier() {
  return new ContractVerifier();
}

export async function verifyContract(contractAddress, network, constructorArgs = [], options = {}) {
  const verifier = new ContractVerifier();
  return await verifier.verify(contractAddress, network, constructorArgs, options);
}

export async function flattenContract(contractPath) {
  const verifier = new ContractVerifier();
  return await verifier.flattenContract(contractPath);
}

export async function checkVerificationStatus(guid, explorer = 'etherscan') {
  const verifier = new ContractVerifier();
  return await verifier.checkVerificationStatus(guid, explorer);
}
