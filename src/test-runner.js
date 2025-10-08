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

export class TestRunner {
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
   * @param {number} port - Port to run on (default: 8545)
   * @returns {Promise<void>}
   */
  async startGanache(port = 8545) {
    try {
      console.log(chalk.blue(`🚀 Starting Ganache on port ${port}...`));
      
      // Configure Ganache
      const options = {
        port,
        accounts: [
          {
            secretKey: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
            balance: '0x3635c9adc5dea00000' // 1000 ETH in wei
          },
          {
            secretKey: '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0xadd53f9a7e588d003326d1cbf9e4a43c061badd0295474954b2df4c393c663e',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0x395df67f0c2d2b9000474ca6b8b36c50c2c52701bb4a9bd4d55cc20c0a72f2e2',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4',
            balance: '0x3635c9adc5dea00000'
          },
          {
            secretKey: '0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773',
            balance: '0x3635c9adc5dea00000'
          }
        ],
        gasLimit: '0x1fffffffffffff',
        gasPrice: '0x1'
      };

      // Start Ganache server
      this.server = Ganache.server(options);
      await this.server.listen(port);
      
      // Connect Web3
      this.web3 = new Web3(this.server.provider);
      this.accounts = await this.web3.eth.getAccounts();
      
      console.log(chalk.green(`✅ Ganache started on port ${port}`));
      console.log(chalk.green(`📋 ${this.accounts.length} accounts available`));
      console.log(chalk.blue(`🔗 RPC URL: http://localhost:${port}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start Ganache: ${error.message}`));
      throw error;
    }
  }

  /**
   * Stop Ganache blockchain
   * @returns {Promise<void>}
   */
  async stopGanache() {
    try {
      if (this.server) {
        console.log(chalk.blue('🛑 Stopping Ganache...'));
        await this.server.close();
        this.server = null;
        this.web3 = null;
        this.accounts = [];
        console.log(chalk.green('✅ Ganache stopped'));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Failed to stop Ganache: ${error.message}`));
      throw error;
    }
  }

  /**
   * Run all test files in directory
   * @param {string} testDir - Directory containing test files
   * @returns {Promise<number>} - Exit code (0 = pass, 1 = fail)
   */
  async runTests(testDir = 'test') {
    try {
      console.log(chalk.blue(`🧪 Running tests in ${testDir}...`));
      
      // Find all test files
      const testFiles = this.findTestFiles(testDir);
      
      if (testFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No test files found'));
        return 0;
      }
      
      console.log(chalk.blue(`🔍 Found ${testFiles.length} test file(s)`));
      
      // Setup globals for tests
      this.setupGlobals(this.web3, this.accounts);
      
      // Add test files to Mocha
      testFiles.forEach(file => {
        this.mocha.addFile(file);
      });
      
      // Run tests
      const failures = await new Promise((resolve) => {
        this.mocha.run((failures) => {
          resolve(failures);
        });
      });
      
      // Return exit code
      const exitCode = failures > 0 ? 1 : 0;
      
      if (exitCode === 0) {
        console.log(chalk.green('✅ All tests passed!'));
      } else {
        console.log(chalk.red(`❌ ${failures} test(s) failed`));
      }
      
      // Show gas report if enabled
      if (this.enableGasReporting && this.gasReporter) {
        console.log(this.getGasReport());
      }
      
      return exitCode;
      
    } catch (error) {
      console.error(chalk.red(`❌ Test execution failed: ${error.message}`));
      return 1;
    }
  }

  /**
   * Run tests in watch mode
   * @param {string} testDir - Directory containing test files
   * @returns {Promise<void>}
   */
  async runTestsWatch(testDir = 'test') {
    try {
      this.currentTestDir = testDir;
      this.isWatching = true;
      
      console.log(chalk.blue('👀 Starting watch mode...'));
      console.log(chalk.blue('📁 Watching contracts/ and test/ directories'));
      console.log(chalk.yellow('⌨️  Press "r" to rerun tests, "q" to quit'));
      
      // Start Ganache
      await this.startGanache();
      
      // Run tests initially
      await this.runSingleTest();
      
      // Setup file watcher
      this.setupWatcher();
      
      // Setup keyboard input
      this.setupKeyboardInput();
      
      // Show waiting message
      this.showWaitingMessage();
      
    } catch (error) {
      console.error(chalk.red(`❌ Watch mode failed: ${error.message}`));
      await this.stopWatch();
      throw error;
    }
  }

  /**
   * Setup file watcher for contracts and tests
   */
  setupWatcher() {
    const watchPaths = ['contracts/**/*.sol', 'test/**/*.js'];
    
    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('change', (path) => {
      console.log(chalk.blue(`📝 File changed: ${path}`));
      this.debouncedRerun();
    });
    
    this.watcher.on('add', (path) => {
      console.log(chalk.blue(`➕ File added: ${path}`));
      this.debouncedRerun();
    });
    
    this.watcher.on('unlink', (path) => {
      console.log(chalk.blue(`➖ File removed: ${path}`));
      this.debouncedRerun();
    });
  }

  /**
   * Debounced test rerun
   */
  debouncedRerun() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(async () => {
      await this.runSingleTest();
      this.showWaitingMessage();
    }, 500);
  }

  /**
   * Run a single test execution
   */
  async runSingleTest() {
    try {
      // Clear console
      console.clear();
      console.log(chalk.blue('🔄 Running tests...'));
      
      // Compile contracts first
      const { Compiler } = await import('./compiler.js');
      const compiler = new Compiler();
      compiler.compileDirectory('./contracts');
      compiler.saveArtifacts('./build');
      
      // Run tests
      const exitCode = await this.runTests(this.currentTestDir);
      
      if (exitCode === 0) {
        console.log(chalk.green('✅ All tests passed!'));
      } else {
        console.log(chalk.red('❌ Some tests failed'));
      }
      
      // Show gas report if enabled
      if (this.enableGasReporting && this.gasReporter) {
        console.log(this.getGasReport());
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Test execution failed: ${error.message}`));
    }
  }

  /**
   * Setup keyboard input handling
   */
  setupKeyboardInput() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (key) => {
      switch (key) {
        case 'r':
          console.log(chalk.blue('🔄 Rerunning tests...'));
          await this.runSingleTest();
          this.showWaitingMessage();
          break;
        case 'q':
          console.log(chalk.blue('👋 Quitting watch mode...'));
          await this.stopWatch();
          process.exit(0);
          break;
        case '\u0003': // Ctrl+C
          console.log(chalk.blue('👋 Quitting watch mode...'));
          await this.stopWatch();
          process.exit(0);
          break;
      }
    });
  }

  /**
   * Show waiting message
   */
  showWaitingMessage() {
    console.log(chalk.yellow('⏳ Waiting for changes... (Press "r" to rerun, "q" to quit)'));
  }

  /**
   * Stop watch mode
   */
  async stopWatch() {
    try {
      this.isWatching = false;
      
      if (this.watcher) {
        await this.watcher.close();
        this.watcher = null;
      }
      
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      
      // Restore stdin
      process.stdin.setRawMode(false);
      process.stdin.pause();
      
      // Stop Ganache
      await this.stopGanache();
      
      console.log(chalk.green('✅ Watch mode stopped'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error stopping watch mode: ${error.message}`));
    }
  }

  /**
   * Enable gas reporting
   * @param {boolean} enable - Whether to enable gas reporting
   */
  enableGasReport(enable = true) {
    this.enableGasReporting = enable;
    if (enable && !this.gasReporter) {
      this.gasReporter = new GasReporter();
    }
  }

  /**
   * Track gas usage for a transaction
   * @param {string} functionName - Name of the function
   * @param {Object} receipt - Transaction receipt
   */
  trackGasUsage(functionName, receipt) {
    if (this.enableGasReporting && this.gasReporter && receipt && receipt.gasUsed) {
      this.gasReporter.recordGas(functionName, receipt.gasUsed);
    }
  }

  /**
   * Get gas report
   * @returns {string} - Formatted gas report
   */
  getGasReport() {
    if (!this.enableGasReporting || !this.gasReporter) {
      return chalk.yellow('📊 Gas reporting not enabled');
    }
    return this.gasReporter.generateReport();
  }

  /**
   * Save gas report to file
   * @param {string} filePath - Path to save the report
   */
  saveGasReport(filePath) {
    if (!this.enableGasReporting || !this.gasReporter) {
      console.log(chalk.yellow('📊 Gas reporting not enabled'));
      return;
    }
    this.gasReporter.saveReport(filePath);
  }

  /**
   * Clear gas report data
   */
  clearGasReport() {
    if (this.gasReporter) {
      this.gasReporter.clear();
    }
  }

  /**
   * Setup global variables for tests
   * @param {Object} web3 - Web3 instance
   * @param {Array} accounts - Available accounts
   */
  setupGlobals(web3, accounts) {
    // Make web3 available globally
    global.web3 = web3;
    global.accounts = accounts;
    
    // Make expect available globally
    global.expect = this.createExpect();
    
    // Make Contract available globally
    global.Contract = web3.eth.Contract;
    
    // Make common utilities available
    global.toWei = web3.utils.toWei;
    global.fromWei = web3.utils.fromWei;
    global.toBN = web3.utils.toBN;
    
    // Make gas tracking available if enabled
    if (this.enableGasReporting) {
      const self = this;
      global.trackGas = function(functionName, receipt) {
        self.trackGasUsage(functionName, receipt);
      };
      console.log(chalk.blue('⛽ Gas tracking enabled'));
    }
    
    console.log(chalk.blue('🌐 Global variables set up for tests'));
  }

  /**
   * Find all test files in directory
   * @param {string} testDir - Directory to search
   * @returns {Array} - Array of test file paths
   */
  findTestFiles(testDir) {
    const testFiles = [];
    
    if (!fs.existsSync(testDir)) {
      return testFiles;
    }
    
    const files = fs.readdirSync(testDir, { withFileTypes: true });
    
    files.forEach(file => {
      const filePath = path.join(testDir, file.name);
      
      if (file.isDirectory()) {
        // Recursively search subdirectories
        testFiles.push(...this.findTestFiles(filePath));
      } else if (file.name.endsWith('.test.js')) {
        testFiles.push(filePath);
      }
    });
    
    return testFiles;
  }

  /**
   * Create expect function for assertions
   * @returns {Function} - Expect function
   */
  createExpect() {
    return (actual) => {
      return {
        toBe: (expected) => {
          const actualValue = typeof actual === 'bigint' ? actual : BigInt(actual);
          const expectedValue = typeof expected === 'bigint' ? expected : BigInt(expected);
          if (actualValue !== expectedValue) {
            throw new Error(`Expected ${expected}, but got ${actual}`);
          }
          return this;
        },
        toContain: (substring) => {
          if (!actual.includes(substring)) {
            throw new Error(`Expected "${actual}" to contain "${substring}"`);
          }
          return this;
        },
        toEqual: (expected) => {
          if (actual !== expected) {
            throw new Error(`Expected ${expected}, but got ${actual}`);
          }
          return this;
        },
        toThrow: (expectedError) => {
          try {
            if (typeof actual === 'function') {
              actual();
            }
            throw new Error('Expected function to throw, but it did not');
          } catch (error) {
            if (expectedError && !error.message.includes(expectedError)) {
              throw new Error(`Expected error containing "${expectedError}", but got "${error.message}"`);
            }
          }
          return this;
        },
        toBeDefined: () => {
          if (actual === undefined) {
            throw new Error('Expected value to be defined, but it was undefined');
          }
          return this;
        },
        toBeNull: () => {
          if (actual !== null) {
            throw new Error(`Expected null, but got ${actual}`);
          }
          return this;
        },
        toBeTruthy: () => {
          if (!actual) {
            throw new Error(`Expected truthy value, but got ${actual}`);
          }
          return this;
        },
        toBeFalsy: () => {
          if (actual) {
            throw new Error(`Expected falsy value, but got ${actual}`);
          }
          return this;
        }
      };
    };
  }

  /**
   * Get Web3 instance
   * @returns {Object} - Web3 instance
   */
  getWeb3() {
    return this.web3;
  }

  /**
   * Get accounts
   * @returns {Array} - Available accounts
   */
  getAccounts() {
    return this.accounts;
  }
}

// Export convenience functions for backward compatibility
export async function runTests(options = {}) {
  const testRunner = new TestRunner();
  
  try {
    // Start Ganache
    await testRunner.startGanache();
    
    // Run tests
    const exitCode = await testRunner.runTests(options.testDir || 'test');
    
    // Stop Ganache
    await testRunner.stopGanache();
    
    return exitCode;
  } catch (error) {
    await testRunner.stopGanache();
    throw new Error(`Test execution failed: ${error.message}`);
  }
}

// Export test utilities
export function describe(name, fn) {
  return global.describe ? global.describe(name, fn) : fn();
}

export function it(name, fn) {
  return global.it ? global.it(name, fn) : fn();
}

export function expect(actual) {
  return global.expect ? global.expect(actual) : actual;
}
