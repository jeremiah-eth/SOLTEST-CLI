/**
 * Deployment Manager
 * Handles execution of deployment scripts in order
 * Tracks deployed contract addresses and saves deployment artifacts
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Deployer } from './deployer.js';
import { loadArtifact } from './utils.js';

export class DeploymentManager {
  constructor() {
    this.deployer = new Deployer();
    this.deployedContracts = {};
    this.deploymentHistory = [];
    this.network = null;
    this.accounts = [];
  }

  /**
   * Connect to network and get accounts
   * @param {string} networkUrl - Network URL
   * @param {string} networkName - Network name
   */
  async connect(networkUrl, networkName = 'local') {
    console.log(chalk.blue(`🔗 Connecting to ${networkName}...`));
    
    await this.deployer.connect(networkUrl);
    this.accounts = await this.deployer.getAccounts();
    this.network = networkName;
    
    if (this.accounts.length === 0) {
      throw new Error('No accounts available for deployment');
    }
    
    console.log(chalk.green(`✅ Connected to ${networkName}`));
    console.log(chalk.blue(`👤 Deployer account: ${this.accounts[0]}`));
  }

  /**
   * Run deployment scripts in order
   * @param {string} scriptsDir - Directory containing deployment scripts
   * @param {Object} options - Deployment options
   */
  async runDeployments(scriptsDir = './deploy', options = {}) {
    console.log(chalk.blue('🚀 Starting deployment process...'));
    
    // Get all deployment scripts
    const scripts = this.getDeploymentScripts(scriptsDir);
    
    if (scripts.length === 0) {
      console.log(chalk.yellow('⚠️  No deployment scripts found'));
      return;
    }
    
    console.log(chalk.blue(`📋 Found ${scripts.length} deployment scripts`));
    
    // Load existing deployment state
    this.loadDeploymentState();
    
    // Execute scripts in order
    for (const script of scripts) {
      try {
        console.log(chalk.blue(`\n📄 Running ${script.name}...`));
        
        const result = await this.executeScript(script);
        
        if (result) {
          this.deployedContracts[result.name] = {
            address: result.address,
            transactionHash: result.transactionHash,
            script: script.name,
            timestamp: new Date().toISOString(),
            network: this.network
          };
          
          this.deploymentHistory.push({
            script: script.name,
            contract: result.name,
            address: result.address,
            transactionHash: result.transactionHash,
            timestamp: new Date().toISOString()
          });
          
          console.log(chalk.green(`✅ ${script.name} completed successfully`));
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ ${script.name} failed: ${error.message}`));
        
        if (options.stopOnError !== false) {
          throw error;
        }
      }
    }
    
    // Save deployment state
    this.saveDeploymentState();
    
    // Display summary
    this.displayDeploymentSummary();
  }

  /**
   * Get deployment scripts in order
   * @param {string} scriptsDir - Directory containing scripts
   * @returns {Array} Array of script objects
   */
  getDeploymentScripts(scriptsDir) {
    if (!fs.existsSync(scriptsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(scriptsDir)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort alphabetically to maintain order
    
    return files.map(file => ({
      name: file,
      path: path.join(scriptsDir, file)
    }));
  }

  /**
   * Execute a deployment script
   * @param {Object} script - Script object
   * @returns {Object} Deployment result
   */
  async executeScript(script) {
    // Import the script module
    const scriptModule = await import(path.resolve(script.path));
    const scriptFunction = scriptModule.default;
    
    if (typeof scriptFunction !== 'function') {
      throw new Error(`Script ${script.name} does not export a default function`);
    }
    
    // Create context for the script
    const context = {
      deployer: this.deployer,
      accounts: this.accounts,
      network: this.network,
      deployedContracts: { ...this.deployedContracts }
    };
    
    // Execute the script
    return await scriptFunction(context);
  }

  /**
   * Load deployment state from file
   */
  loadDeploymentState() {
    const stateFile = `./deployments/${this.network}.json`;
    
    if (fs.existsSync(stateFile)) {
      try {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        this.deployedContracts = state.contracts || {};
        this.deploymentHistory = state.history || [];
        console.log(chalk.blue(`📂 Loaded existing deployment state for ${this.network}`));
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Failed to load deployment state: ${error.message}`));
      }
    }
  }

  /**
   * Save deployment state to file
   */
  saveDeploymentState() {
    const deploymentsDir = './deployments';
    const stateFile = `${deploymentsDir}/${this.network}.json`;
    
    // Ensure deployments directory exists
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const state = {
      network: this.network,
      contracts: this.deployedContracts,
      history: this.deploymentHistory,
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    console.log(chalk.green(`💾 Deployment state saved to ${stateFile}`));
  }

  /**
   * Display deployment summary
   */
  displayDeploymentSummary() {
    console.log(chalk.blue('\n📊 Deployment Summary:'));
    console.log('='.repeat(50));
    
    if (Object.keys(this.deployedContracts).length === 0) {
      console.log(chalk.yellow('No contracts were deployed'));
      return;
    }
    
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      console.log(chalk.cyan(`📄 ${name}`));
      console.log(chalk.white(`   Address: ${contract.address}`));
      console.log(chalk.white(`   Script: ${contract.script}`));
      console.log(chalk.white(`   Timestamp: ${contract.timestamp}`));
      console.log('');
    }
    
    console.log(chalk.green(`✅ Successfully deployed ${Object.keys(this.deployedContracts).length} contracts`));
  }

  /**
   * Get deployed contract by name
   * @param {string} name - Contract name
   * @returns {Object|null} Contract info or null
   */
  getDeployedContract(name) {
    return this.deployedContracts[name] || null;
  }

  /**
   * Get all deployed contracts
   * @returns {Object} All deployed contracts
   */
  getAllDeployedContracts() {
    return { ...this.deployedContracts };
  }

  /**
   * Get deployment history
   * @returns {Array} Deployment history
   */
  getDeploymentHistory() {
    return [...this.deploymentHistory];
  }

  /**
   * Clear deployment state
   */
  clearDeploymentState() {
    this.deployedContracts = {};
    this.deploymentHistory = [];
    
    const stateFile = `./deployments/${this.network}.json`;
    if (fs.existsSync(stateFile)) {
      fs.unlinkSync(stateFile);
      console.log(chalk.blue(`🗑️  Cleared deployment state for ${this.network}`));
    }
  }

  /**
   * Verify deployed contracts
   * @param {Object} options - Verification options
   */
  async verifyDeployments(options = {}) {
    console.log(chalk.blue('🔍 Verifying deployed contracts...'));
    
    const { ContractVerifier } = await import('./verifier.js');
    const verifier = new ContractVerifier();
    
    for (const [name, contract] of Object.entries(this.deployedContracts)) {
      try {
        console.log(chalk.blue(`🔍 Verifying ${name}...`));
        
        const result = await verifier.verify(
          contract.address,
          this.network,
          [], // Constructor arguments - would need to be stored
          {
            contractName: name,
            contractPath: `./contracts/${name}.sol`
          }
        );
        
        if (result.success) {
          console.log(chalk.green(`✅ ${name} verification submitted`));
        } else {
          console.log(chalk.red(`❌ ${name} verification failed`));
        }
        
      } catch (error) {
        console.error(chalk.red(`❌ Failed to verify ${name}: ${error.message}`));
      }
    }
  }
}

// Export convenience functions
export function createDeploymentManager() {
  return new DeploymentManager();
}

export async function runDeployments(networkUrl, networkName = 'local', options = {}) {
  const manager = new DeploymentManager();
  await manager.connect(networkUrl, networkName);
  await manager.runDeployments('./deploy', options);
  return manager;
}
