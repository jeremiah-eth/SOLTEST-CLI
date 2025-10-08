/**
 * Test Runner Module
 * Handles execution of Solidity tests using Mocha and Ganache
 */

import Mocha from 'mocha';
import Ganache from 'ganache';
import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { GasReporter } from './gas-reporter.js';
import type { Dirent } from 'fs';
import type { 
  TestResult, 
  TestSuite, 
  Web3Instance,
  TransactionReceipt 
} from '../types';

export class TestRunner {
  private mocha: Mocha;
  private ganache: any;
  private web3: Web3Instance | null = null;
  private accounts: string[] = [];
  private server: any = null;
  private watcher: any = null;
  private isWatching: boolean = false;
  private debounceTimer: NodeJS.Timeout | null = null;
  private currentTestDir: string = 'test';
  private gasReporter: GasReporter | null = null;
  private enableGasReporting: boolean = false;

  constructor() {
    // Configure Mocha
    this.mocha = new Mocha({
      timeout: 10000, // 10 seconds
      reporter: 'spec',
      color: true,
      bail: false,
      fullTrace: true
    });

    // Initialize Ganache
    this.ganache = null;
    this.web3 = null;
    this.accounts = [];
    this.server = null;
    
    // Watch mode properties
    this.watcher = null;
    this.isWatching = false;
    this.debounceTimer = null;
    this.currentTestDir = 'test';
    
    // Gas reporting
    this.gasReporter = null;
    this.enableGasReporting = false;
  }

  /**
   * Start local Ganache blockchain
   * @param port - Port to run on (default: 8545)
   * @returns Promise that resolves when Ganache is started
   */
  async startGanache(port: number = 8545): Promise<void> {
    try {
      console.log(chalk.blue(`🚀 Starting Ganache on port ${port}...`));
      
      // Configure Ganache
      const options = {
        port: port,
        hostname: '127.0.0.1',
        accounts: [
          {
            secretKey: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
            balance: '0x56bc75e2d630e00000' // 100 ETH
          },
          {
            secretKey: '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
            balance: '0x56bc75e2d630e00000' // 100 ETH
          },
          {
            secretKey: '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
            balance: '0x56bc75e2d630e00000' // 100 ETH
          },
          {
            secretKey: '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913',
            balance: '0x56bc75e2d630e00000' // 100 ETH
          },
          {
            secretKey: '0xadd53f9a7e588d003326d1cbf9e4a43c061badd9c438535bed27d502acf38746',
            balance: '0x56bc75e2d630e00000' // 100 ETH
          }
        ],
        gasLimit: 0x1fffffffffffff,
        gasPrice: '0x77359400', // 2 gwei
        hardfork: 'paris',
        chainId: 1337
      };

      // Start Ganache server
      this.server = Ganache.server(options as any);
      await this.server.listen(port);
      
      // Connect Web3
      this.web3 = new Web3(`http://127.0.0.1:${port}`) as unknown as Web3Instance;
      
      // Get accounts
      this.accounts = await this.web3?.eth.getAccounts() || [];
      
      console.log(chalk.green(`✅ Ganache started on http://127.0.0.1:${port}`));
      console.log(chalk.blue(`📋 Available accounts: ${this.accounts.length}`));
      
      // Initialize gas reporter if enabled
      if (this.enableGasReporting) {
        this.gasReporter = new GasReporter();
        this.setupGasTracking();
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start Ganache: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Stop Ganache blockchain
   * @returns Promise that resolves when Ganache is stopped
   */
  async stopGanache(): Promise<void> {
    try {
      if (this.server) {
        await this.server.close();
        this.server = null;
        this.web3 = null;
        this.accounts = [];
        console.log(chalk.blue('🛑 Ganache stopped'));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to stop Ganache: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Setup gas tracking for transactions
   */
  private setupGasTracking(): void {
    if (!this.web3 || !this.gasReporter) return;

    // Override sendTransaction to track gas
    const originalSendTransaction = this.web3.eth.sendTransaction;
    this.web3.eth.sendTransaction = async (tx: any) => {
      const receipt = await originalSendTransaction.call(this.web3?.eth, tx);
      
      if (this.gasReporter && receipt.gasUsed) {
        const functionName = tx.data ? 'contract_call' : 'eth_transfer';
        this.gasReporter.recordGas(functionName, receipt.gasUsed);
      }
      
      return receipt;
    };
  }

  /**
   * Run tests in a directory
   * @param testDir - Directory containing test files
   * @returns Promise that resolves to exit code
   */
  async runTests(testDir: string = 'test'): Promise<number> {
    try {
      console.log(chalk.blue(`🧪 Running tests in ${testDir}...`));
      
      if (!fs.existsSync(testDir)) {
        console.log(chalk.yellow(`⚠️  Test directory ${testDir} does not exist`));
        return 0;
      }

      // Find test files
      const testFiles = this.findTestFiles(testDir);
      
      if (testFiles.length === 0) {
        console.log(chalk.yellow(`⚠️  No test files found in ${testDir}`));
        return 0;
      }

      console.log(chalk.blue(`📄 Found ${testFiles.length} test files`));

      // Setup global variables for tests
      this.setupGlobalVariables();

      // Add test files to Mocha
      for (const file of testFiles) {
        this.mocha.addFile(file);
      }

      // Run tests
      const exitCode = await new Promise<number>((resolve) => {
        this.mocha.run((failures: number) => {
          resolve(failures);
        });
      });

      // Generate gas report if enabled
      if (this.enableGasReporting && this.gasReporter) {
        console.log(this.gasReporter.generateReport());
        this.gasReporter.saveJSON('./gas-report.json');
      }

      return exitCode;
      
    } catch (error) {
      console.error(chalk.red(`❌ Test execution failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Run tests in watch mode
   * @param testDir - Directory containing test files
   * @returns Promise that resolves when watching starts
   */
  async runTestsWatch(testDir: string = 'test'): Promise<void> {
    try {
      console.log(chalk.blue(`👀 Starting watch mode for ${testDir}...`));
      
      this.currentTestDir = testDir;
      this.isWatching = true;

      // Initial test run
      await this.runTests(testDir);

      // Setup file watcher
      this.watcher = chokidar.watch([
        path.join(testDir, '**/*.js'),
        path.join(testDir, '**/*.ts'),
        'contracts/**/*.sol'
      ], {
        ignored: /node_modules/,
        persistent: true,
        ignoreInitial: true
      });

      this.watcher.on('change', (filePath: string) => {
        console.log(chalk.blue(`📝 File changed: ${filePath}`));
        this.debouncedRerun();
      });

      this.watcher.on('add', (filePath: string) => {
        console.log(chalk.blue(`📄 File added: ${filePath}`));
        this.debouncedRerun();
      });

      this.watcher.on('unlink', (filePath: string) => {
        console.log(chalk.blue(`🗑️  File removed: ${filePath}`));
        this.debouncedRerun();
      });

      console.log(chalk.green('👀 Watching for changes...'));
      console.log(chalk.yellow('Press Ctrl+C to stop'));
      
      // Handle keyboard input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', (key: Buffer) => {
        const char = key.toString();
        
        if (char === 'q' || char === '\u0003') { // Ctrl+C
          this.stopWatch();
          process.exit(0);
        } else if (char === 'r') {
          console.log(chalk.blue('🔄 Manual rerun triggered'));
          this.debouncedRerun();
        }
      });
      
    } catch (error) {
      console.error(chalk.red(`❌ Watch mode failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Stop watch mode
   * @returns Promise that resolves when watching stops
   */
  async stopWatch(): Promise<void> {
    try {
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }
      
      this.isWatching = false;
      console.log(chalk.blue('👀 Watch mode stopped'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to stop watch mode: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Debounced rerun for watch mode
   */
  private debouncedRerun(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(async () => {
      console.clear();
      console.log(chalk.blue('🔄 Rerunning tests...'));
      await this.runTests(this.currentTestDir);
      console.log(chalk.green('👀 Watching for changes...'));
    }, 500);
  }

  /**
   * Find test files in directory
   * @param dir - Directory to search
   * @returns Array of test file paths
   */
  private findTestFiles(dir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true }) as unknown as Dirent[];
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...this.findTestFiles(fullPath));
      } else if (item.isFile() && (item.name.endsWith('.test.js') || item.name.endsWith('.spec.js'))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Setup global variables for tests
   */
  private setupGlobalVariables(): void {
    // Make Web3 and accounts available globally
    (global as any).Web3 = Web3;
    (global as any).web3 = this.web3;
    (global as any).accounts = this.accounts;
    (global as any).Contract = this.web3?.eth.Contract;

    // Setup gas tracking function
    (global as any).trackGas = (functionName: string, receipt: TransactionReceipt) => {
      if (this.gasReporter && receipt.gasUsed) {
        this.gasReporter.recordGas(functionName, Number(receipt.gasUsed));
      }
    };

    // Setup custom expect function
    (global as any).expect = (value: any) => {
      return {
        toBe: (expected: any) => {
          const actual = typeof value === 'bigint' ? value : BigInt(value);
          const exp = typeof expected === 'bigint' ? expected : BigInt(expected);
          if (actual !== exp) {
            throw new Error(`Expected ${expected}, but got ${value}`);
          }
          return true;
        },
        toEqual: (expected: any) => {
          if (value !== expected) {
            throw new Error(`Expected ${expected}, but got ${value}`);
          }
          return true;
        },
        toContain: (substring: string) => {
          if (!value.includes(substring)) {
            throw new Error(`Expected "${value}" to contain "${substring}"`);
          }
          return true;
        },
        toThrow: (expectedError?: string) => {
          try {
            if (typeof value === 'function') {
              value();
            }
            throw new Error('Expected function to throw');
          } catch (error) {
            if (expectedError && !(error as Error).message.includes(expectedError)) {
              throw new Error(`Expected error to contain "${expectedError}", but got "${(error as Error).message}"`);
            }
            return true;
          }
        }
      };
    };
  }

  /**
   * Enable gas reporting
   * @param enabled - Whether to enable gas reporting
   */
  enableGasReport(enabled: boolean): void {
    this.enableGasReporting = enabled;
    if (enabled && !this.gasReporter) {
      this.gasReporter = new GasReporter();
    }
  }

  /**
   * Get test statistics
   * @returns Test statistics
   */
  getStats(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    gasReported: boolean;
  } {
    return {
      totalTests: 0, // Would need to track this
      passedTests: 0,
      failedTests: 0,
      gasReported: this.enableGasReporting
    };
  }

  /**
   * Check if currently watching
   * @returns True if watching
   */
  isCurrentlyWatching(): boolean {
    return this.isWatching;
  }

  /**
   * Get current test directory
   * @returns Current test directory
   */
  getCurrentTestDir(): string {
    return this.currentTestDir;
  }

  /**
   * Get gas reporter instance
   * @returns Gas reporter or null
   */
  getGasReporter(): GasReporter | null {
    return this.gasReporter;
  }

  /**
   * Get Web3 instance
   * @returns Web3 instance or null
   */
  getWeb3(): Web3Instance | null {
    return this.web3;
  }

  /**
   * Get accounts
   * @returns Array of accounts
   */
  getAccounts(): string[] {
    return this.accounts;
  }
}
