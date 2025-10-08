/**
 * Solidity Compiler Module
 * Handles compilation of Solidity contracts using solc
 */

import solc from 'solc';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class Compiler {
  constructor() {
    this.contracts = {};
  }

  /**
   * Compile a single Solidity file
   * @param {string} filePath - Path to the .sol file
   * @returns {Object} - { contractName, abi, bytecode }
   */
  compileFile(filePath) {
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
        const errors = output.errors.filter(error => error.severity === 'error');
        if (errors.length > 0) {
          console.error(chalk.red('❌ Compilation errors:'));
          errors.forEach(error => {
            console.error(chalk.red(`  ${error.message}`));
          });
          throw new Error('Compilation failed due to errors');
        }
      }

      // Extract contract information
      const contracts = output.contracts[fileName];
      const contractNames = Object.keys(contracts);
      
      if (contractNames.length === 0) {
        throw new Error('No contracts found in file');
      }

      const results = {};
      
      contractNames.forEach(contractName => {
        const contract = contracts[contractName];
        const abi = contract.abi;
        const bytecode = contract.evm.bytecode.object;
        
        results[contractName] = {
          contractName,
          abi,
          bytecode
        };
        
        // Store in instance
        this.contracts[contractName] = {
          contractName,
          abi,
          bytecode
        };
        
        console.log(chalk.green(`✅ Compiled ${contractName}`));
      });
      
      return results;
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to compile ${filePath}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Compile all Solidity files in a directory
   * @param {string} dirPath - Path to the directory containing .sol files
   * @returns {Object} - Object with all compiled contracts
   */
  compileDirectory(dirPath) {
    try {
      console.log(chalk.blue(`🔨 Compiling directory ${dirPath}...`));
      
      // Find all .sol files
      const files = fs.readdirSync(dirPath)
        .filter(file => file.endsWith('.sol'))
        .map(file => path.join(dirPath, file));
      
      if (files.length === 0) {
        console.log(chalk.yellow('⚠️  No .sol files found in directory'));
        return {};
      }
      
      const allResults = {};
      
      files.forEach(filePath => {
        try {
          const results = this.compileFile(filePath);
          Object.assign(allResults, results);
        } catch (error) {
          console.error(chalk.red(`Failed to compile ${filePath}: ${error.message}`));
          // Continue with other files
        }
      });
      
      console.log(chalk.green(`✅ Compiled ${Object.keys(allResults).length} contracts from ${files.length} files`));
      return allResults;
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to compile directory ${dirPath}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Save compiled contracts as JSON artifacts to build directory
   * @param {string} outputDir - Output directory (default: 'build')
   */
  saveArtifacts(outputDir = 'build') {
    try {
      console.log(chalk.blue(`💾 Saving artifacts to ${outputDir}...`));
      
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Save each contract as a separate JSON file
      Object.keys(this.contracts).forEach(contractName => {
        const contract = this.contracts[contractName];
        const artifact = {
          contractName: contract.contractName,
          abi: contract.abi,
          bytecode: contract.bytecode,
          metadata: {
            compiledAt: new Date().toISOString(),
            compiler: 'solc'
          }
        };
        
        const filePath = path.join(outputDir, `${contractName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
        console.log(chalk.green(`✅ Saved ${contractName}.json`));
      });
      
      console.log(chalk.green(`✅ All artifacts saved to ${outputDir}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save artifacts: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get a compiled contract by name
   * @param {string} contractName - Name of the contract
   * @returns {Object} - Contract data or null if not found
   */
  getContract(contractName) {
    return this.contracts[contractName] || null;
  }

  /**
   * Get all compiled contracts
   * @returns {Object} - All compiled contracts
   */
  getAllContracts() {
    return { ...this.contracts };
  }

  /**
   * Clear all compiled contracts
   */
  clear() {
    this.contracts = {};
  }
}

// Export convenience functions for backward compatibility
export async function compileContracts(options = {}) {
  const compiler = new Compiler();
  const outputDir = options.output || 'build';
  
  try {
    // Compile contracts directory
    compiler.compileDirectory('contracts');
    
    // Save artifacts
    compiler.saveArtifacts(outputDir);
    
    return { success: true, contracts: compiler.getAllContracts() };
  } catch (error) {
    throw new Error(`Compilation failed: ${error.message}`);
  }
}

export function getCompiledContract(contractName, buildDir = 'build') {
  const filePath = path.join(buildDir, `${contractName}.json`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Contract ${contractName} not found in build directory`);
  }
  
  const artifact = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    bytecode: artifact.bytecode,
    abi: artifact.abi
  };
}
