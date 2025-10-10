/**
 * Contract Verifier Module
 * Handles contract verification on Etherscan and other block explorers
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig, getNetworkConfig } from './utils.js';
import type { 
  VerificationResult, 
  VerificationStatus,
  NetworkConfig 
} from '../types';

interface VerificationOptions {
  contractName?: string;
  contractPath?: string;
  compilerVersion?: string;
  optimizationUsed?: string;
  runs?: string;
  evmVersion?: string;
}

interface ExplorerConfig {
  apiKeys: Record<string, string | undefined>;
  explorerUrls: Record<string, string>;
  networkMappings: Record<string, string>;
}

export class ContractVerifier {
  private apiKeys: Record<string, string | undefined>;
  private explorerUrls: Record<string, string>;
  private networkMappings: Record<string, string>;

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
   * @param contractAddress - Contract address to verify
   * @param network - Network name
   * @param constructorArgs - Constructor arguments
   * @param options - Additional options
   * @returns Promise that resolves to verification result
   */
  async verify(
    contractAddress: string, 
    network: string, 
    constructorArgs: any[] = [], 
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
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
      const verificationParams: any = {
        apikey: apiKey!,
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
        verificationParams.constructorArguments = constructorArgs.join(',');
      }
      
      // Submit verification request
      const response = await axios.post(this.explorerUrls[explorer!]!, verificationParams, {
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
      console.error(chalk.red(`❌ Verification failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Flatten contract source code by resolving imports
   * @param contractPath - Path to the contract file
   * @returns Promise that resolves to flattened source code
   */
  async flattenContract(contractPath: string): Promise<string> {
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
      console.error(chalk.red(`❌ Failed to flatten contract: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Resolve imports in source code
   * @param sourceCode - Source code with imports
   * @param basePath - Base directory for imports
   * @returns Promise that resolves to source code with resolved imports
   */
  async resolveImports(sourceCode: string, basePath: string): Promise<string> {
    const importRegex = /import\s+['"]([^'"]+)['"];?/g;
    let flattened = sourceCode;
    const processedImports = new Set<string>();
    
    const resolveImport = async (importPath: string): Promise<string> => {
      if (processedImports.has(importPath)) {
        return '';
      }
      
      processedImports.add(importPath);
      
      let fullPath: string;
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        fullPath = path.resolve(basePath, importPath);
      } else {
        // Try to find in node_modules or common paths
        const possiblePaths = [
          path.resolve(basePath, 'node_modules', importPath),
          path.resolve(basePath, importPath),
          path.resolve('./node_modules', importPath)
        ];
        
        fullPath = possiblePaths.find(p => fs.existsSync(p)) || '';
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
    
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const importPath = match[1]!;
      const resolvedImport = await resolveImport(importPath);
      flattened = flattened.replace(match[0], resolvedImport);
    }
    
    return flattened;
  }

  /**
   * Check verification status
   * @param guid - Verification GUID
   * @param explorer - Explorer name
   * @returns Promise that resolves to verification status
   */
  async checkVerificationStatus(guid: string, explorer: string = 'etherscan'): Promise<VerificationStatus> {
    try {
      const apiKey = this.getApiKey(explorer);
      if (!apiKey) {
        throw new Error(`API key not found for ${explorer}`);
      }
      
      const response = await axios.get(this.explorerUrls[explorer!]!, {
        params: {
          apikey: apiKey!,
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
      console.error(chalk.red(`❌ Failed to check verification status: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get explorer for network
   * @param network - Network name
   * @returns Explorer name or null
   */
  getExplorerForNetwork(network: string): string | null {
    return this.networkMappings[network] || null;
  }

  /**
   * Get API key for explorer
   * @param explorer - Explorer name
   * @returns API key or null
   */
  getApiKey(explorer: string): string | null {
    return this.apiKeys[explorer] || null;
  }

  /**
   * Get contract source code from block explorer
   * @param contractAddress - Contract address
   * @param explorer - Explorer name
   * @returns Promise that resolves to contract source code
   */
  async getContractSource(contractAddress: string, explorer: string = 'etherscan'): Promise<string> {
    try {
      const apiKey = this.getApiKey(explorer);
      if (!apiKey) {
        throw new Error(`API key not found for ${explorer}`);
      }
      
      const response = await axios.get(this.explorerUrls[explorer!]!, {
        params: {
          apikey: apiKey!,
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
      console.error(chalk.red(`❌ Failed to get contract source: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Wait for verification to complete
   * @param guid - Verification GUID
   * @param explorer - Explorer name
   * @param maxAttempts - Maximum attempts (default: 30)
   * @param delay - Delay between attempts in ms (default: 10000)
   * @returns Promise that resolves to final verification result
   */
  async waitForVerification(
    guid: string, 
    explorer: string = 'etherscan', 
    maxAttempts: number = 30, 
    delay: number = 10000
  ): Promise<VerificationStatus> {
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
   * @returns Array of supported network names
   */
  getSupportedNetworks(): string[] {
    return Object.keys(this.networkMappings);
  }

  /**
   * Get supported explorers
   * @returns Array of supported explorer names
   */
  getSupportedExplorers(): string[] {
    return Object.keys(this.explorerUrls);
  }
}

// Export convenience functions
export function createVerifier(): ContractVerifier {
  return new ContractVerifier();
}

export async function verifyContract(
  contractAddress: string, 
  network: string, 
  constructorArgs: any[] = [], 
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const verifier = new ContractVerifier();
  return await verifier.verify(contractAddress, network, constructorArgs, options);
}

export async function flattenContract(contractPath: string): Promise<string> {
  const verifier = new ContractVerifier();
  return await verifier.flattenContract(contractPath);
}

export async function checkVerificationStatus(guid: string, explorer: string = 'etherscan'): Promise<VerificationStatus> {
  const verifier = new ContractVerifier();
  return await verifier.checkVerificationStatus(guid, explorer);
}
