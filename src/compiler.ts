/**
 * Solidity Compiler Module
 * Handles compilation of Solidity contracts using solc
 */

import solc from 'solc';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import type { Dirent } from 'fs';
import type { 
  ContractArtifact, 
  CompilerOptions, 
  CompilationResult,
  ContractABI 
} from '../types';

export class Compiler {
  private contracts: Record<string, ContractArtifact> = {};

  constructor() {
    this.contracts = {};
  }

  /**
   * Compile a single Solidity file
   * @param filePath - Path to the .sol file
   * @returns Contract artifact with abi and bytecode
   */
  compileFile(filePath: string): ContractArtifact {
    try {
      console.log(chalk.blue(`🔨 Compiling ${filePath}...`));
      
      // Read the source file
      const source = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Prepare solc input
      const input = {
        language: 'Solidity',
        sources: {
          [fileName]: {
            content: source
          }
        },
        settings: {
          evmVersion: "paris",
          optimizer: {
            enabled: true,
            runs: 200
          },
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode']
            }
          }
        }
      };

      // Compile the contract
      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      
      // Check for compilation errors
      if (output.errors) {
        const errors = output.errors.filter((error: any) => error.severity === 'error');
        if (errors.length > 0) {
          throw new Error(`Compilation failed: ${errors.map((e: any) => e.message).join(', ')}`);
        }
      }

      // Extract contract information
      const contractName = Object.keys(output.contracts[fileName])[0];
      if (!contractName) {
        throw new Error(`No contract found in ${fileName}`);
      }
      const contract = output.contracts[fileName][contractName];
      
      if (!contract) {
        throw new Error(`No contract found in ${fileName}`);
      }

      const artifact: ContractArtifact = {
        contractName: contractName,
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object,
        deployedBytecode: contract.evm.deployedBytecode.object,
        sourceMap: contract.evm.bytecode.sourceMap || '',
        deployedSourceMap: contract.evm.deployedBytecode.sourceMap || '',
        source: source,
        sourcePath: filePath,
        ast: output.sources[fileName].ast,
        legacyAST: null,
        compiler: {
          name: 'solc',
          version: solc.version()
        },
        networks: {},
        schemaVersion: '3.4.7',
        updatedAt: new Date().toISOString()
      };

      this.contracts[contractName] = artifact;
      console.log(chalk.green(`✅ Compiled ${contractName}`));
      
      return artifact;
      
    } catch (error) {
      console.error(chalk.red(`❌ Compilation failed for ${filePath}: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Compile all Solidity files in a directory
   * @param {string} contractsDir - Directory containing .sol files
   * @returns {Object} - Object with contract names as keys and artifacts as values
   */
  compileDirectory(contractsDir: string): Record<string, ContractArtifact> {
    try {
      console.log(chalk.blue(`🔨 Compiling contracts in ${contractsDir}...`));
      
      if (!fs.existsSync(contractsDir)) {
        throw new Error(`Contracts directory ${contractsDir} does not exist`);
      }

      const files = this.getSolidityFiles(contractsDir);
      
      if (files.length === 0) {
        console.log(chalk.yellow(`⚠️  No Solidity files found in ${contractsDir}`));
        return {};
      }

      console.log(chalk.blue(`📄 Found ${files.length} Solidity files`));

      // Compile each file
      for (const file of files) {
        try {
          this.compileFile(file);
        } catch (error) {
          console.error(chalk.red(`❌ Failed to compile ${file}: ${(error as Error).message}`));
          // Continue with other files
        }
      }

      console.log(chalk.green(`✅ Compiled ${Object.keys(this.contracts).length} contracts`));
      return this.contracts;
      
    } catch (error) {
      console.error(chalk.red(`❌ Directory compilation failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get all Solidity files in a directory recursively
   * @param {string} dir - Directory to scan
   * @returns {Array} - Array of file paths
   */
  private getSolidityFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true }) as unknown as Dirent[];
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...this.getSolidityFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.sol')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Save compiled artifacts to build directory
   * @param {string} buildDir - Directory to save artifacts
   */
  saveArtifacts(buildDir: string): void {
    try {
      console.log(chalk.blue(`💾 Saving artifacts to ${buildDir}...`));
      
      // Ensure build directory exists
      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      // Save each contract artifact
      for (const [contractName, artifact] of Object.entries(this.contracts)) {
        const artifactPath = path.join(buildDir, `${contractName}.json`);
        fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
        console.log(chalk.gray(`  📄 Saved ${contractName}.json`));
      }

      console.log(chalk.green(`✅ Saved ${Object.keys(this.contracts).length} artifacts`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save artifacts: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get compiled contracts
   * @returns {Object} - Object with contract names as keys and artifacts as values
   */
  getContracts(): Record<string, ContractArtifact> {
    return this.contracts;
  }

  /**
   * Get a specific contract artifact
   * @param {string} contractName - Name of the contract
   * @returns {Object} - Contract artifact
   */
  getContract(contractName: string): ContractArtifact | undefined {
    return this.contracts[contractName];
  }

  /**
   * Clear compiled contracts
   */
  clearContracts(): void {
    this.contracts = {};
  }

  /**
   * Check if contract is compiled
   * @param {string} contractName - Name of the contract
   * @returns {boolean} - True if compiled
   */
  isCompiled(contractName: string): boolean {
    return contractName in this.contracts;
  }

  /**
   * Get compilation statistics
   * @returns {Object} - Compilation statistics
   */
  getStats(): { totalContracts: number; contractNames: string[] } {
    return {
      totalContracts: Object.keys(this.contracts).length,
      contractNames: Object.keys(this.contracts)
    };
  }

  /**
   * Validate contract ABI
   * @param {Array} abi - Contract ABI
   * @returns {boolean} - True if valid
   */
  validateABI(abi: ContractABI[]): boolean {
    try {
      if (!Array.isArray(abi)) {
        return false;
      }

      for (const item of abi) {
        if (!item.name || !item.type) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get contract constructor ABI
   * @param {Array} abi - Contract ABI
   * @returns {Object|null} - Constructor ABI or null
   */
  getConstructorABI(abi: ContractABI[]): ContractABI | null {
    return abi.find(item => item.type === 'constructor') || null;
  }

  /**
   * Get contract functions ABI
   * @param {Array} abi - Contract ABI
   * @returns {Array} - Functions ABI
   */
  getFunctionsABI(abi: ContractABI[]): ContractABI[] {
    return abi.filter(item => item.type === 'function');
  }

  /**
   * Get contract events ABI
   * @param {Array} abi - Contract ABI
   * @returns {Array} - Events ABI
   */
  getEventsABI(abi: ContractABI[]): ContractABI[] {
    return abi.filter(item => item.type === 'event');
  }

  /**
   * Get contract errors ABI
   * @param {Array} abi - Contract ABI
   * @returns {Array} - Errors ABI
   */
  getErrorsABI(abi: ContractABI[]): ContractABI[] {
    return abi.filter(item => item.type === 'error');
  }

  /**
   * Format ABI for display
   * @param {Array} abi - Contract ABI
   * @returns {string} - Formatted ABI string
   */
  formatABI(abi: ContractABI[]): string {
    return JSON.stringify(abi, null, 2);
  }

  /**
   * Get contract size in bytes
   * @param {string} bytecode - Contract bytecode
   * @returns {number} - Size in bytes
   */
  getContractSize(bytecode: string): number {
    return (bytecode.length - 2) / 2; // Remove 0x prefix and divide by 2 for hex
  }

  /**
   * Check if contract size exceeds limit
   * @param {string} bytecode - Contract bytecode
   * @param {number} limit - Size limit in bytes (default: 24576)
   * @returns {boolean} - True if exceeds limit
   */
  exceedsSizeLimit(bytecode: string, limit: number = 24576): boolean {
    return this.getContractSize(bytecode) > limit;
  }

  /**
   * Get compilation warnings
   * @param {Object} output - Solc compilation output
   * @returns {Array} - Array of warnings
   */
  getWarnings(output: any): string[] {
    if (!output.errors) {
      return [];
    }

    return output.errors
      .filter((error: any) => error.severity === 'warning')
      .map((error: any) => error.message);
  }

  /**
   * Get compilation errors
   * @param {Object} output - Solc compilation output
   * @returns {Array} - Array of errors
   */
  getErrors(output: any): string[] {
    if (!output.errors) {
      return [];
    }

    return output.errors
      .filter((error: any) => error.severity === 'error')
      .map((error: any) => error.message);
  }
}
