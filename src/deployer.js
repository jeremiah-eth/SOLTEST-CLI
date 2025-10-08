/**
 * Contract Deployer Module
 * Handles deployment of compiled Solidity contracts
 */

import Web3 from 'web3';
import chalk from 'chalk';

export class Deployer {
  constructor() {
    this.web3 = null;
    this.deployed = {};
  }

  /**
   * Connect to Ethereum node
   * @param {string} rpcUrl - RPC URL (default: http://127.0.0.1:8545)
   * @returns {Promise<void>}
   */
  async connect(rpcUrl = 'http://127.0.0.1:8545') {
    try {
      console.log(chalk.blue(`🔗 Connecting to ${rpcUrl}...`));
      
      this.web3 = new Web3(rpcUrl);
      
      // Test connection
      const isConnected = await this.web3.eth.isSyncing();
      const networkId = await this.web3.eth.net.getId();
      
      console.log(chalk.green(`✅ Connected to network ID: ${networkId}`));
      
      if (isConnected !== false) {
        console.log(chalk.yellow('⚠️  Node is still syncing'));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to connect to ${rpcUrl}: ${error.message}`));
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  /**
   * Get available accounts
   * @returns {Promise<Array>} - Array of account addresses
   */
  async getAccounts() {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }
      
      const accounts = await this.web3.eth.getAccounts();
      console.log(chalk.blue(`📋 Found ${accounts.length} accounts`));
      
      return accounts;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get accounts: ${error.message}`));
      throw error;
    }
  }

  /**
   * Deploy a contract
   * @param {Array} abi - Contract ABI
   * @param {string} bytecode - Contract bytecode
   * @param {string} from - Deployer address
   * @param {Array} constructorArgs - Constructor arguments
   * @returns {Promise<Object>} - Contract instance with address
   */
  async deploy(abi, bytecode, from, constructorArgs = []) {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }

      console.log(chalk.blue(`🚀 Deploying contract...`));
      
      // Create contract instance
      const contract = new this.web3.eth.Contract(abi);
      
      // Deploy contract
      const deploy = contract.deploy({
        data: bytecode,
        arguments: constructorArgs
      });
      
      // Estimate gas
      const gasEstimate = await deploy.estimateGas({ from });
      console.log(chalk.blue(`⛽ Estimated gas: ${gasEstimate}`));
      
      // Deploy with gas estimate (no buffer for now to avoid BigInt issues)
      const instance = await deploy.send({
        from,
        gas: gasEstimate // Use gas estimate directly
      });
      
      const address = instance.options.address;
      
      // Store deployed contract
      this.deployed[address] = {
        contract: instance,
        abi,
        bytecode,
        deployedAt: new Date().toISOString(),
        deployer: from
      };
      
      console.log(chalk.green(`✅ Contract deployed successfully`));
      console.log(chalk.green(`📍 Address: ${address}`));
      console.log(chalk.green(`⛽ Gas used: ${gasEstimate}`));
      
      return {
        address,
        contract: instance,
        gasUsed: gasEstimate
      };
      
    } catch (error) {
      console.error(chalk.red(`❌ Deployment failed: ${error.message}`));
      throw new Error(`Deployment failed: ${error.message}`);
    }
  }

  /**
   * Get ETH balance of an address
   * @param {string} address - Address to check
   * @returns {Promise<string>} - Balance in wei
   */
  async getBalance(address) {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }
      
      const balance = await this.web3.eth.getBalance(address);
      const balanceEth = this.web3.utils.fromWei(balance, 'ether');
      
      console.log(chalk.blue(`💰 Balance of ${address}: ${balanceEth} ETH`));
      
      return balance;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get balance: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get contract instance by address
   * @param {Array} abi - Contract ABI
   * @param {string} address - Contract address
   * @returns {Object} - Contract instance
   */
  getContract(abi, address) {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }
      
      const contract = new this.web3.eth.Contract(abi, address);
      
      console.log(chalk.blue(`📄 Retrieved contract at ${address}`));
      
      return contract;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get contract: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get all deployed contracts
   * @returns {Object} - All deployed contracts
   */
  getDeployedContracts() {
    return { ...this.deployed };
  }

  /**
   * Get deployed contract by address
   * @param {string} address - Contract address
   * @returns {Object|null} - Deployed contract info or null
   */
  getDeployedContract(address) {
    return this.deployed[address] || null;
  }

  /**
   * Clear all deployed contracts
   */
  clearDeployed() {
    this.deployed = {};
    console.log(chalk.blue('🧹 Cleared deployed contracts'));
  }

  /**
   * Get network information
   * @returns {Promise<Object>} - Network info
   */
  async getNetworkInfo() {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }
      
      const networkId = await this.web3.eth.net.getId();
      const isSyncing = await this.web3.eth.isSyncing();
      const blockNumber = await this.web3.eth.getBlockNumber();
      
      return {
        networkId,
        isSyncing,
        blockNumber
      };
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get network info: ${error.message}`));
      throw error;
    }
  }
}

// Export convenience functions for backward compatibility
export async function deployContract(options = {}) {
  const deployer = new Deployer();
  const contractName = options.contract || 'Token';
  
  try {
    // Connect to network
    await deployer.connect();
    
    // Get accounts
    const accounts = await deployer.getAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts available');
    }
    
    // Get compiled contract (assuming it exists from compiler)
    const { getCompiledContract } = await import('./compiler.js');
    const { bytecode, abi } = getCompiledContract(contractName);
    
    // Deploy contract
    const result = await deployer.deploy(abi, bytecode, accounts[0]);
    
    return {
      address: result.address,
      contract: result.contract
    };
  } catch (error) {
    throw new Error(`Deployment failed: ${error.message}`);
  }
}

export async function deployContractWithArgs(contractName, constructorArgs = []) {
  const deployer = new Deployer();
  
  try {
    // Connect to network
    await deployer.connect();
    
    // Get accounts
    const accounts = await deployer.getAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts available');
    }
    
    // Get compiled contract
    const { getCompiledContract } = await import('./compiler.js');
    const { bytecode, abi } = getCompiledContract(contractName);
    
    // Deploy contract with constructor args
    const result = await deployer.deploy(abi, bytecode, accounts[0], constructorArgs);
    
    return {
      address: result.address,
      contract: result.contract
    };
  } catch (error) {
    throw new Error(`Deployment with args failed: ${error.message}`);
  }
}
