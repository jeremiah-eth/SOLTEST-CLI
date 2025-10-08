/**
 * Contract Deployer Module
 * Handles deployment of compiled Solidity contracts
 */

import Web3 from 'web3';
import chalk from 'chalk';
import type { 
  ContractABI, 
  DeploymentResult, 
  TransactionReceipt,
  Web3Instance 
} from '../types';

export class Deployer {
  private web3: Web3Instance | null = null;
  private deployed: Record<string, DeploymentResult> = {};

  constructor() {
    this.web3 = null;
    this.deployed = {};
  }

  /**
   * Connect to Ethereum node
   * @param rpcUrl - RPC URL (default: http://127.0.0.1:8545)
   * @returns Promise that resolves when connected
   */
  async connect(rpcUrl: string = 'http://127.0.0.1:8545'): Promise<void> {
    try {
      console.log(chalk.blue(`🔗 Connecting to ${rpcUrl}...`));
      
      this.web3 = new Web3(rpcUrl) as unknown as Web3Instance;
      
      // Test connection
      const isConnected = await this.web3?.eth.isSyncing();
      const networkId = await this.web3?.eth.net.getId();
      
      console.log(chalk.green(`✅ Connected to network ID: ${networkId}`));
      
      if (isConnected !== false) {
        console.log(chalk.yellow('⚠️  Node is still syncing'));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to connect to ${rpcUrl}: ${(error as Error).message}`));
      throw new Error(`Connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get available accounts
   * @returns Promise that resolves to array of account addresses
   */
  async getAccounts(): Promise<string[]> {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }

      const accounts = await this.web3.eth.getAccounts();
      console.log(chalk.blue(`📋 Found ${accounts.length} accounts`));
      
      return accounts;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get accounts: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get web3 instance
   * @returns Web3 instance or null if not connected
   */
  getWeb3(): Web3Instance | null {
    return this.web3;
  }

  /**
   * Get account balance
   * @param address - Account address
   * @returns Promise that resolves to balance in wei
   */
  async getBalance(address: string): Promise<string> {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }

      const balance = await this.web3.eth.getBalance(address);
      return balance;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get balance: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Deploy a contract
   * @param abi - Contract ABI
   * @param bytecode - Contract bytecode
   * @param from - Deployer address
   * @param constructorArgs - Constructor arguments
   * @param options - Deployment options
   * @returns Promise that resolves to deployment result
   */
  async deploy(
    abi: ContractABI[], 
    bytecode: string, 
    from: string, 
    constructorArgs: any[] = [], 
    options: {
      gas?: number;
      gasPrice?: string;
      value?: string;
    } = {}
  ): Promise<DeploymentResult> {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }

      console.log(chalk.blue(`🚀 Deploying contract...`));
      
      // Create contract instance
      const contract = new this.web3.eth.Contract(abi);
      
      // Prepare deployment transaction
      const deployTx = contract.deploy({
        data: bytecode,
        arguments: constructorArgs
      });

      // Estimate gas
      const gasEstimate = await deployTx.estimateGas({ from });
      console.log(chalk.blue(`⛽ Estimated gas: ${gasEstimate}`));

      // Set gas limit with buffer
      const gasLimit = options.gas || Math.floor(gasEstimate * 1.2);
      
      // Get gas price if not provided
      let gasPrice = options.gasPrice;
      if (!gasPrice) {
        gasPrice = await this.web3.eth.getGasPrice();
      }

      console.log(chalk.blue(`💰 Gas price: ${gasPrice} wei`));

      // Deploy the contract
      const deployed = await deployTx.send({
        from: from,
        gas: gasLimit,
        gasPrice: gasPrice,
        value: options.value || '0'
      });

      // Get transaction receipt for deployment details
      const txHash = (deployed as any).transactionHash;
      const receipt = await this.web3?.eth.getTransactionReceipt(txHash);
      
      const result: DeploymentResult = {
        address: deployed.options.address,
        transactionHash: txHash,
        gasUsed: receipt?.gasUsed || 0,
        gasPrice: gasPrice,
        blockNumber: receipt?.blockNumber || 0,
        blockHash: receipt?.blockHash || '',
        from: receipt?.from || from,
        to: receipt?.to || null,
        value: options.value || '0',
        nonce: 0 // Nonce is not available in receipt
      };

      this.deployed[deployed.options.address] = result;

      console.log(chalk.green(`✅ Contract deployed successfully!`));
      console.log(chalk.blue(`📍 Address: ${result.address}`));
      console.log(chalk.blue(`⛽ Gas used: ${result.gasUsed}`));
      console.log(chalk.blue(`🔗 Transaction: ${result.transactionHash}`));

      return result;
      
    } catch (error) {
      console.error(chalk.red(`❌ Deployment failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get deployed contract instance
   * @param address - Contract address
   * @param abi - Contract ABI
   * @returns Contract instance
   */
  getContract(address: string, abi: ContractABI[]): any {
    if (!this.web3) {
      throw new Error('Not connected to any network');
    }

    return new this.web3.eth.Contract(abi, address);
  }

  /**
   * Call a contract method
   * @param address - Contract address
   * @param abi - Contract ABI
   * @param methodName - Method name
   * @param args - Method arguments
   * @param options - Call options
   * @returns Promise that resolves to method result
   */
  async callMethod(
    address: string, 
    abi: ContractABI[], 
    methodName: string, 
    args: any[] = [], 
    options: { from?: string } = {}
  ): Promise<any> {
    try {
      const contract = this.getContract(address, abi);
      const method = contract.methods[methodName];
      
      if (!method) {
        throw new Error(`Method ${methodName} not found in contract ABI`);
      }

      return await method(...args).call(options);
    } catch (error) {
      console.error(chalk.red(`❌ Method call failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Send a transaction to a contract method
   * @param address - Contract address
   * @param abi - Contract ABI
   * @param methodName - Method name
   * @param args - Method arguments
   * @param options - Transaction options
   * @returns Promise that resolves to transaction receipt
   */
  async sendTransaction(
    address: string, 
    abi: ContractABI[], 
    methodName: string, 
    args: any[] = [], 
    options: {
      from: string;
      gas?: number;
      gasPrice?: string;
      value?: string;
    }
  ): Promise<TransactionReceipt> {
    try {
      const contract = this.getContract(address, abi);
      const method = contract.methods[methodName];
      
      if (!method) {
        throw new Error(`Method ${methodName} not found in contract ABI`);
      }

      const tx = method(...args);
      const gasEstimate = await tx.estimateGas({ from: options.from });
      
      const receipt = await tx.send({
        from: options.from,
        gas: options.gas || gasEstimate,
        gasPrice: options.gasPrice,
        value: options.value || '0'
      });

      return receipt;
    } catch (error) {
      console.error(chalk.red(`❌ Transaction failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get transaction receipt
   * @param txHash - Transaction hash
   * @returns Promise that resolves to transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }

      return await this.web3.eth.getTransactionReceipt(txHash);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get transaction receipt: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   * @param txHash - Transaction hash
   * @param confirmations - Number of confirmations to wait for
   * @returns Promise that resolves to transaction receipt
   */
  async waitForConfirmation(txHash: string, confirmations: number = 1): Promise<TransactionReceipt> {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }

      console.log(chalk.blue(`⏳ Waiting for transaction confirmation...`));
      
      let receipt = await this.web3.eth.getTransactionReceipt(txHash);
      
      if (!receipt) {
        throw new Error('Transaction not found');
      }

      const currentBlock = await this.web3.eth.getBlockNumber();
      const requiredBlock = receipt.blockNumber + confirmations;
      
      while (currentBlock < requiredBlock) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newBlock = await this.web3.eth.getBlockNumber();
        if (newBlock >= requiredBlock) {
          break;
        }
      }

      console.log(chalk.green(`✅ Transaction confirmed`));
      return receipt;
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to wait for confirmation: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get deployed contracts
   * @returns Object with deployed contracts
   */
  getDeployedContracts(): Record<string, DeploymentResult> {
    return this.deployed;
  }

  /**
   * Get a specific deployed contract
   * @param address - Contract address
   * @returns Deployment result or undefined
   */
  getDeployedContract(address: string): DeploymentResult | undefined {
    return this.deployed[address];
  }

  /**
   * Check if contract is deployed
   * @param address - Contract address
   * @returns True if deployed
   */
  isDeployed(address: string): boolean {
    return address in this.deployed;
  }

  /**
   * Get deployment history
   * @returns Array of deployment results
   */
  getDeploymentHistory(): DeploymentResult[] {
    return Object.values(this.deployed);
  }

  /**
   * Clear deployment history
   */
  clearDeployments(): void {
    this.deployed = {};
  }

  /**
   * Get network information
   * @returns Promise that resolves to network info
   */
  async getNetworkInfo(): Promise<{
    networkId: number;
    isSyncing: boolean | object;
    gasPrice: string;
    blockNumber: number;
  }> {
    try {
      if (!this.web3) {
        throw new Error('Not connected to any network');
      }

      const [networkId, isSyncing, gasPrice, blockNumber] = await Promise.all([
        this.web3.eth.net.getId(),
        this.web3.eth.isSyncing(),
        this.web3.eth.getGasPrice(),
        this.web3.eth.getBlockNumber()
      ]);

      return {
        networkId,
        isSyncing,
        gasPrice,
        blockNumber
      };
    } catch (error) {
      console.error(chalk.red(`❌ Failed to get network info: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Disconnect from network
   */
  disconnect(): void {
    this.web3 = null;
    console.log(chalk.blue('🔌 Disconnected from network'));
  }

  /**
   * Check if connected to network
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.web3 !== null;
  }
}
