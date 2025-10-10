#!/usr/bin/env bun

/**
 * Soltest CLI - Smart contract testing CLI
 * Entry point for the soltest command-line tool
 */

import { program } from 'commander';
import { Compiler } from '../src/compiler.js';
import { Deployer } from '../src/deployer.js';
import { TestRunner } from '../src/test-runner.js';
import { loadArtifact, ensureDir, loadConfig, getNetworkConfig, getAvailableNetworks } from '../src/utils.js';
import { ContractVerifier } from '../src/verifier.js';
import { CoverageReporter } from '../src/coverage.js';
import { PluginManager } from '../src/plugin-manager.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { 
  ProjectAnswers, 
  ContractDetails,
  NetworkConfig 
} from '../types';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

// Configure program
program
  .name('soltest')
  .description('Smart contract testing CLI')
  .version(version);

// Initialize plugin manager
const pluginManager = new PluginManager('./plugins');

// Compile command
program
  .command('compile')
  .description('Compile Solidity contracts')
  .option('-d, --dir <directory>', 'Contracts directory', './contracts')
  .option('-o, --output <directory>', 'Output directory', './build')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔨 Compiling contracts...'));
      
      // Execute pre-compilation hooks
      await pluginManager.executeHook('beforeCompile');
      
      const compiler = new Compiler();
      const contracts = compiler.compileDirectory(options.dir);
      
      if (Object.keys(contracts).length === 0) {
        console.log(chalk.yellow('⚠️  No contracts found to compile'));
        return;
      }
      
      // Ensure output directory exists
      ensureDir(options.output);
      
      // Save artifacts
      compiler.saveArtifacts(options.output);
      
      console.log(chalk.green(`✅ Compiled ${Object.keys(contracts).length} contracts`));
      
      // Execute post-compilation hooks
      await pluginManager.executeHook('afterCompile');
      
    } catch (error) {
      console.error(chalk.red(`❌ Compilation failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy compiled contracts to network')
  .requiredOption('-c, --contract <name>', 'Contract name to deploy')
  .option('-n, --network <name>', 'Network name from config (default: local)')
  .option('--url <url>', 'Direct network URL (overrides network config)')
  .option('-a, --args <args>', 'Constructor arguments (comma-separated)')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Deploying contract...'));
      
      const deployer = new Deployer();
      
      // Determine network configuration
      let networkUrl = options.url;
      let networkName = options.network || 'local';
      
      if (!networkUrl) {
        try {
          const networkConfig = getNetworkConfig(networkName);
          networkUrl = networkConfig.url;
          console.log(chalk.blue(`📡 Using network: ${networkName} (${networkUrl})`));
        } catch (error) {
          console.error(chalk.red(`❌ Network '${networkName}' not found in config`));
          console.log(chalk.yellow(`Available networks: ${getAvailableNetworks().join(', ')}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.blue(`📡 Using direct URL: ${networkUrl}`));
      }
      
      // Connect to network
      await deployer.connect(networkUrl);
      
      // Get accounts
      const accounts = await deployer.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts available for deployment');
      }
      
      console.log(chalk.blue(`📋 Using account: ${accounts[0]}`));
      
      // Load contract artifact
      const artifact = loadArtifact(options.contract);
      
      // Parse constructor arguments
      let constructorArgs: any[] = [];
      if (options.args) {
        constructorArgs = options.args.split(',').map((arg: string) => arg.trim());
        console.log(chalk.blue(`🔧 Constructor arguments: ${constructorArgs.join(', ')}`));
      }
      
      // Execute pre-deployment hooks
      await pluginManager.executeHook('beforeDeploy');
      
      // Deploy contract
      const result = await deployer.deploy(
        artifact.abi,
        artifact.bytecode,
        accounts[0]!,
        constructorArgs
      );
      
      console.log(chalk.green('✅ Contract deployed successfully!'));
      console.log(chalk.blue(`📍 Address: ${result.address}`));
      console.log(chalk.blue(`⛽ Gas used: ${result.gasUsed}`));
      console.log(chalk.blue(`🔗 Transaction: ${result.transactionHash}`));
      
      // Execute post-deployment hooks
      await pluginManager.executeHook('afterDeploy');
      
    } catch (error) {
      console.error(chalk.red(`❌ Deployment failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Deploy Script command
program
  .command('deploy-script')
  .description('Run deployment scripts in order')
  .option('-n, --network <name>', 'Network name from config (default: local)')
  .option('--url <url>', 'Direct network URL (overrides network config)')
  .option('-d, --dir <directory>', 'Deployment scripts directory (default: ./deploy)', './deploy')
  .option('--stop-on-error', 'Stop deployment on first error (default: true)', true)
  .option('--verify', 'Verify deployed contracts after deployment')
  .option('--clear', 'Clear existing deployment state before running')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Running deployment scripts...'));
      
      // Import DeploymentManager
      const { DeploymentManager } = await import('../src/deployment-manager.js');
      const manager = new DeploymentManager();
      
      // Determine network configuration
      let networkUrl = options.url;
      let networkName = options.network || 'local';
      
      if (!networkUrl) {
        try {
          const networkConfig = getNetworkConfig(networkName);
          networkUrl = networkConfig.url;
          console.log(chalk.blue(`📡 Using network: ${networkName} (${networkUrl})`));
        } catch (error) {
          console.error(chalk.red(`❌ Network '${networkName}' not found in config`));
          console.log(chalk.yellow(`Available networks: ${getAvailableNetworks().join(', ')}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.blue(`📡 Using direct URL: ${networkUrl}`));
      }
      
      // Connect to network
      await manager.connect(networkUrl, networkName);
      
      // Clear deployment state if requested
      if (options.clear) {
        manager.clearDeploymentState();
      }
      
      // Run deployment scripts
      await manager.runDeployments(options.dir, {
        stopOnError: options.stopOnError
      });
      
      // Verify contracts if requested
      if (options.verify) {
        await manager.verifyDeployments();
      }
      
      console.log(chalk.green('🎉 Deployment process completed!'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Deployment failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Upgrade command
program
  .command('upgrade')
  .description('Upgrade proxy contracts to new implementations')
  .requiredOption('--proxy <address>', 'Proxy contract address to upgrade')
  .requiredOption('--implementation <name>', 'New implementation contract name')
  .option('-n, --network <name>', 'Network name from config (default: local)')
  .option('--url <url>', 'Direct network URL (overrides network config)')
  .option('-a, --args <args>', 'Constructor arguments for new implementation (comma-separated)')
  .option('--pattern <pattern>', 'Proxy pattern (transparent, uups, beacon)', 'transparent')
  .option('--no-validate', 'Skip storage layout validation')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔄 Upgrading proxy contract...'));
      
      // Import UpgradeManager
      const { UpgradeManager } = await import('../src/upgrade-manager.js');
      const manager = new UpgradeManager();
      
      // Determine network configuration
      let networkUrl = options.url;
      let networkName = options.network || 'local';
      
      if (!networkUrl) {
        try {
          const networkConfig = getNetworkConfig(networkName);
          networkUrl = networkConfig.url;
          console.log(chalk.blue(`📡 Using network: ${networkName} (${networkUrl})`));
        } catch (error) {
          console.error(chalk.red(`❌ Network '${networkName}' not found in config`));
          console.log(chalk.yellow(`Available networks: ${getAvailableNetworks().join(', ')}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.blue(`📡 Using direct URL: ${networkUrl}`));
      }
      
      // Connect to network
      await manager.connect(networkUrl, networkName);
      
      // Parse constructor arguments
      let constructorArgs: any[] = [];
      if (options.args) {
        constructorArgs = options.args.split(',').map((arg: string) => arg.trim());
        console.log(chalk.blue(`🔧 Constructor arguments: ${constructorArgs.join(', ')}`));
      }
      
      // Get proxy info first
      console.log(chalk.blue(`🔍 Analyzing proxy at ${options.proxy}...`));
      const proxyInfo = await manager.getProxyInfo(options.proxy);
      console.log(chalk.blue(`📋 Proxy pattern: ${proxyInfo.pattern}`));
      console.log(chalk.blue(`📋 Current implementation: ${proxyInfo.implementation}`));
      
      // Upgrade proxy
      const result = await manager.upgradeProxy(
        options.proxy,
        options.implementation,
        constructorArgs,
        {
          validateStorage: !options.noValidate
        }
      );
      
      console.log(chalk.green('🎉 Proxy upgraded successfully!'));
      console.log(chalk.blue(`📍 New implementation: ${result.newImplementation.address}`));
      console.log(chalk.blue(`🔗 Upgrade transaction: ${result.upgradeTransaction}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Upgrade failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Deploy Proxy command
program
  .command('deploy-proxy')
  .description('Deploy a proxy contract with implementation')
  .requiredOption('-c, --contract <name>', 'Implementation contract name')
  .option('-n, --network <name>', 'Network name from config (default: local)')
  .option('--url <url>', 'Direct network URL (overrides network config)')
  .option('-a, --args <args>', 'Constructor arguments (comma-separated)')
  .option('-p, --pattern <pattern>', 'Proxy pattern (transparent, uups, beacon)', 'transparent')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Deploying proxy contract...'));
      
      // Import UpgradeManager
      const { UpgradeManager } = await import('../src/upgrade-manager.js');
      const manager = new UpgradeManager();
      
      // Determine network configuration
      let networkUrl = options.url;
      let networkName = options.network || 'local';
      
      if (!networkUrl) {
        try {
          const networkConfig = getNetworkConfig(networkName);
          networkUrl = networkConfig.url;
          console.log(chalk.blue(`📡 Using network: ${networkName} (${networkUrl})`));
        } catch (error) {
          console.error(chalk.red(`❌ Network '${networkName}' not found in config`));
          console.log(chalk.yellow(`Available networks: ${getAvailableNetworks().join(', ')}`));
          process.exit(1);
        }
      } else {
        console.log(chalk.blue(`📡 Using direct URL: ${networkUrl}`));
      }
      
      // Connect to network
      await manager.connect(networkUrl, networkName);
      
      // Parse constructor arguments
      let constructorArgs: any[] = [];
      if (options.args) {
        constructorArgs = options.args.split(',').map((arg: string) => arg.trim());
        console.log(chalk.blue(`🔧 Constructor arguments: ${constructorArgs.join(', ')}`));
      }
      
      // Deploy proxy
      const result = await manager.deployProxy(
        options.contract,
        constructorArgs,
        options.pattern
      );
      
      console.log(chalk.green('🎉 Proxy deployed successfully!'));
      console.log(chalk.blue(`📍 Implementation: ${result.implementation.address}`));
      console.log(chalk.blue(`📍 Proxy: ${result.proxy.address}`));
      console.log(chalk.blue(`⛽ Total gas used: ${result.gasUsed}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Proxy deployment failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Security Scan command
program
  .command('scan')
  .description('Scan smart contracts for security vulnerabilities')
  .requiredOption('--contract <path>', 'Path to contract file to scan')
  .option('-o, --output <format>', 'Output format: console, json, html (default: console)', 'console')
  .option('-s, --severity <level>', 'Minimum severity level: critical, high, medium, low (default: low)', 'low')
  .option('--save-report', 'Save report to file')
  .option('--report-dir <directory>', 'Directory to save reports (default: ./security-reports)', './security-reports')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Starting security scan...'));
      
      // Import SecurityScanner
      const { SecurityScanner } = await import('../src/security-scanner.js');
      const scanner = new SecurityScanner();
      
      // Check if contract file exists
      if (!fs.existsSync(options.contract)) {
        console.error(chalk.red(`❌ Contract file not found: ${options.contract}`));
        process.exit(1);
      }
      
      // Scan contract
      const report = await scanner.scanContract(options.contract);
      
      // Filter by severity level
      const severityLevels: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      const minSeverity = severityLevels[options.severity as string] || 1;
      
      const filteredIssues = report.issues.filter(issue => 
        (severityLevels[issue.severity] || 0) >= minSeverity
      );
      
      report.issues = filteredIssues;
      report.totalIssues = filteredIssues.length;
      
      // Update severity counts
      report.severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      filteredIssues.forEach(issue => {
        report.severityCounts[issue.severity]++;
      });
      
      // Display or save report based on output format
      if (options.output === 'console') {
        scanner.displayReport(report);
      } else if (options.output === 'json') {
        const jsonReport = JSON.stringify(report, null, 2);
        console.log(jsonReport);
        
        if (options.saveReport) {
          const reportPath = path.join(options.reportDir, `security-report-${Date.now()}.json`);
          ensureDir(options.reportDir);
          fs.writeFileSync(reportPath, jsonReport);
          console.log(chalk.green(`📄 Report saved to: ${reportPath}`));
        }
      } else if (options.output === 'html') {
        const htmlReport = generateHtmlReport(report);
        console.log(htmlReport);
        
        if (options.saveReport) {
          const reportPath = path.join(options.reportDir, `security-report-${Date.now()}.html`);
          ensureDir(options.reportDir);
          fs.writeFileSync(reportPath, htmlReport);
          console.log(chalk.green(`📄 Report saved to: ${reportPath}`));
        }
      }
      
      // Exit with error code if critical or high severity issues found
      if (report.severityCounts.critical > 0 || report.severityCounts.high > 0) {
        console.log(chalk.red('\n❌ Critical or high severity issues found!'));
        process.exit(1);
      } else if (report.totalIssues > 0) {
        console.log(chalk.yellow('\n⚠️  Security issues found, but none are critical or high severity.'));
      } else {
        console.log(chalk.green('\n✅ No security issues found!'));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Security scan failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Networks command
program
  .command('networks')
  .description('List available networks from configuration')
  .action(async () => {
    try {
      console.log(chalk.blue('🌐 Available Networks:'));
      console.log('='.repeat(50));
      
      const config = loadConfig();
      const networks = getAvailableNetworks();
      
      for (const networkName of networks) {
        const network = config.networks[networkName];
        if (!network) continue;
        
        console.log(chalk.cyan(`📡 ${networkName}`));
        console.log(chalk.white(`   URL: ${network.url}`));
        if (network.chainId) {
          console.log(chalk.white(`   Chain ID: ${network.chainId}`));
        }
        if (Array.isArray(network.accounts)) {
          console.log(chalk.white(`   Accounts: ${network.accounts.length} configured`));
        } else {
          console.log(chalk.white(`   Accounts: ${network.accounts}`));
        }
        console.log('');
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load networks: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a new Soltest project with interactive setup')
  .action(async () => {
    try {
      // Display SOLTEST banner
      console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ███████╗ ██████╗ ██╗     ████████╗███████╗███████╗████████╗ ║
║    ██╔════╝██╔═══██╗██║     ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝ ║
║    ███████╗██║   ██║██║        ██║   █████╗  ███████╗   ██║    ║
║    ╚════██║██║   ██║██║        ██║   ██╔══╝  ╚════██║   ██║    ║
║    ███████║╚██████╔╝███████╗   ██║   ███████╗███████║   ██║    ║
║    ╚══════╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚══════╝   ╚═╝    ║
║                                                              ║
║              🚀 Smart Contract Development CLI 🚀            ║
║                                                              ║
║                    Built by jeremiah-eth                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`));
      
      console.log(chalk.blue('🚀 Welcome to Soltest! Let\'s set up your project...\n'));
      
      // Interactive prompts
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project name?',
          default: 'my-soltest-project',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Project name is required';
            }
            if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
              return 'Project name can only contain letters, numbers, hyphens, and underscores';
            }
            return true;
          }
        },
        {
          type: 'list',
          name: 'contractType',
          message: 'What type of contract do you want to create?',
          choices: [
            { name: 'ERC20 Token', value: 'ERC20' },
            { name: 'ERC721 NFT', value: 'ERC721' },
            { name: 'Custom Contract', value: 'Custom' }
          ],
          default: 'ERC20'
        },
        {
          type: 'confirm',
          name: 'includeTests',
          message: 'Include test files?',
          default: true
        },
        {
          type: 'confirm',
          name: 'includeDeployment',
          message: 'Include deployment scripts?',
          default: true
        },
        {
          type: 'confirm',
          name: 'useTypeScript',
          message: 'Use TypeScript?',
          default: false
        }
      ]);
      
      // Additional prompts based on contract type
      let contractDetails: ContractDetails;
      
      if (answers.contractType === 'ERC20') {
        const erc20Answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'tokenName',
            message: 'Token name:',
            default: 'MyToken',
            validate: (input: string) => input.trim() ? true : 'Token name is required'
          },
          {
            type: 'input',
            name: 'tokenSymbol',
            message: 'Token symbol:',
            default: 'MTK',
            validate: (input: string) => {
              if (!input.trim()) return 'Token symbol is required';
              if (input.length > 10) return 'Token symbol should be 10 characters or less';
              return true;
            }
          },
          {
            type: 'input',
            name: 'initialSupply',
            message: 'Initial supply:',
            default: '1000000',
            validate: (input: string) => {
              const num = parseInt(input);
              if (isNaN(num) || num <= 0) return 'Initial supply must be a positive number';
              return true;
            }
          },
          {
            type: 'input',
            name: 'tokenDescription',
            message: 'Token description:',
            default: 'A simple ERC20 token'
          }
        ]);
        contractDetails = erc20Answers;
      } else if (answers.contractType === 'ERC721') {
        const erc721Answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'tokenName',
            message: 'NFT name:',
            default: 'MyNFT',
            validate: (input: string) => input.trim() ? true : 'NFT name is required'
          },
          {
            type: 'input',
            name: 'tokenSymbol',
            message: 'NFT symbol:',
            default: 'MNFT',
            validate: (input: string) => {
              if (!input.trim()) return 'NFT symbol is required';
              if (input.length > 10) return 'NFT symbol should be 10 characters or less';
              return true;
            }
          },
          {
            type: 'input',
            name: 'maxSupply',
            message: 'Maximum supply:',
            default: '10000',
            validate: (input: string) => {
              const num = parseInt(input);
              if (isNaN(num) || num <= 0) return 'Max supply must be a positive number';
              return true;
            }
          },
          {
            type: 'input',
            name: 'tokenDescription',
            message: 'NFT description:',
            default: 'A simple ERC721 NFT collection'
          }
        ]);
        contractDetails = erc721Answers;
      } else {
        const customAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'tokenName',
            message: 'Contract name:',
            default: 'MyContract',
            validate: (input: string) => input.trim() ? true : 'Contract name is required'
          },
          {
            type: 'input',
            name: 'tokenDescription',
            message: 'Contract description:',
            default: 'A custom smart contract'
          }
        ]);
        contractDetails = customAnswers;
      }
      
      // Generate project structure
      await generateProject(answers, contractDetails);
      
      console.log(chalk.green('\n🎉 Project initialized successfully!'));
      console.log(chalk.blue('\n📁 Project structure created:'));
      console.log(chalk.white('  📄 contracts/ - Your smart contracts'));
      if (answers.includeTests) {
        console.log(chalk.white('  🧪 test/ - Your test files'));
      }
      if (answers.includeDeployment) {
        console.log(chalk.white('  🚀 scripts/ - Deployment scripts'));
      }
      console.log(chalk.white('  ⚙️  soltest.config.js - Configuration file'));
      console.log(chalk.white('  📦 package.json - Dependencies'));
      
      console.log(chalk.blue('\n🚀 Next steps:'));
      console.log(chalk.white('  1. cd ' + answers.projectName));
      console.log(chalk.white('  2. bun install'));
      console.log(chalk.white('  3. bun run compile'));
      console.log(chalk.white('  4. bun run test'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Initialization failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Verify command
program
  .command('verify')
  .description('Verify deployed contracts on block explorers')
  .requiredOption('--contract <name>', 'Contract name to verify')
  .requiredOption('--address <address>', 'Contract address to verify')
  .option('-n, --network <name>', 'Network name (default: local)')
  .option('-a, --args <args>', 'Constructor arguments (comma-separated)')
  .option('-p, --path <path>', 'Path to contract source file')
  .option('-v, --version <version>', 'Compiler version (default: 0.8.20)')
  .option('--optimization', 'Enable optimization (default: true)')
  .option('--runs <runs>', 'Optimization runs (default: 200)')
  .option('--wait', 'Wait for verification to complete')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Verifying contract...'));
      
      const verifier = new ContractVerifier();
      const network = options.network || 'local';
      
      // Parse constructor arguments
      let constructorArgs: any[] = [];
      if (options.args) {
        constructorArgs = options.args.split(',').map((arg: string) => arg.trim());
        console.log(chalk.blue(`🔧 Constructor arguments: ${constructorArgs.join(', ')}`));
      }
      
      // Prepare verification options
      const verificationOptions = {
        contractName: options.contract,
        contractPath: options.path || `./contracts/${options.contract}.sol`,
        compilerVersion: options.version || '0.8.20',
        optimizationUsed: options.optimization !== false ? '1' : '0',
        runs: options.runs || '200',
        evmVersion: 'paris'
      };
      
      // Verify contract
      const result = await verifier.verify(
        options.address,
        network,
        constructorArgs,
        verificationOptions
      );
      
      if (result.success) {
        console.log(chalk.green(`✅ Verification submitted successfully!`));
        console.log(chalk.blue(`📋 GUID: ${result.guid}`));
        console.log(chalk.blue(`🌐 Explorer: ${result.explorer}`));
        
        if (options.wait) {
          console.log(chalk.blue('⏳ Waiting for verification to complete...'));
          const finalResult = await verifier.waitForVerification(result.guid!, result.explorer!);
          
          if (finalResult.success) {
            console.log(chalk.green(`🎉 Contract verified successfully!`));
            console.log(chalk.blue(`🔗 View on explorer: https://${result.explorer === 'etherscan' ? 'etherscan.io' : result.explorer + '.com'}/address/${options.address}`));
          } else {
            console.log(chalk.red(`❌ Verification failed: ${finalResult.message}`));
            process.exit(1);
          }
        } else {
          console.log(chalk.yellow(`💡 Use --wait flag to wait for completion, or check status manually`));
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Verification failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Coverage command
program
  .command('coverage')
  .description('Generate code coverage reports for smart contracts')
  .option('-t, --threshold <percentage>', 'Minimum coverage threshold (default: 80)')
  .option('-f, --format <format>', 'Report format: html, json, text (default: html)', 'html')
  .option('-d, --dir <directory>', 'Contracts directory (default: ./contracts)', './contracts')
  .option('--clean', 'Clean up instrumented files after report generation')
  .option('--no-threshold', 'Skip threshold checking')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📊 Running code coverage analysis...'));
      
      const reporter = new CoverageReporter();
      const format = options.format;
      const contractsDir = options.dir;
      
      // Parse threshold only if not skipping threshold check
      let threshold = 80; // default
      if (!options.noThreshold) {
        if (options.threshold) {
          threshold = parseInt(options.threshold);
          
          // Validate threshold
          if (isNaN(threshold) || threshold < 0 || threshold > 100) {
            throw new Error('Threshold must be a number between 0 and 100');
          }
        }
      }
      
      // Instrument contracts
      console.log(chalk.blue('🔍 Instrumenting contracts...'));
      await reporter.instrument(contractsDir);
      
      // Generate coverage report
      console.log(chalk.blue(`📊 Generating ${format.toUpperCase()} report...`));
      const coverageData = await reporter.generateReport(format);
      
      // Display summary
      const summary = coverageData.summary;
      console.log(chalk.blue('\n📈 Coverage Summary:'));
      console.log(chalk.white(`  Line Coverage:    ${summary.lineCoverage.toFixed(1)}% (${summary.coveredLines}/${summary.totalLines})`));
      console.log(chalk.white(`  Function Coverage: ${summary.functionCoverage.toFixed(1)}% (${summary.coveredFunctions}/${summary.totalFunctions})`));
      
      // Check threshold if enabled
      if (!options.noThreshold) {
        console.log(chalk.blue(`\n🎯 Checking threshold: ${threshold}%`));
        const meetsThreshold = await reporter.checkThreshold(threshold);
        
        if (!meetsThreshold) {
          console.log(chalk.red('\n❌ Coverage threshold not met!'));
          console.log(chalk.yellow('💡 Consider adding more tests or increasing coverage'));
          process.exit(1);
        }
      } else {
        console.log(chalk.blue('\n⏭️  Skipping threshold check'));
      }
      
      // Display report location
      if (format === 'html') {
        console.log(chalk.green('\n✅ Coverage report generated!'));
        console.log(chalk.blue('📄 Open coverage/index.html in your browser to view the interactive report'));
      } else {
        console.log(chalk.green(`\n✅ Coverage report generated: coverage/index.${format}`));
      }
      
      // Clean up if requested
      if (options.clean) {
        console.log(chalk.blue('🧹 Cleaning up instrumented files...'));
        reporter.cleanup();
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Coverage analysis failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Run Solidity tests with Ganache')
  .option('-f, --file <file>', 'Run specific test file')
  .option('-d, --dir <directory>', 'Test directory', './test')
  .option('-w, --watch', 'Run tests in watch mode')
  .option('--gas', 'Enable gas usage reporting')
  .action(async (options) => {
    try {
      const testRunner = new TestRunner();
      
      // Handle Ctrl+C gracefully
      process.on('SIGINT', async () => {
        console.log(chalk.blue('\n👋 Shutting down gracefully...'));
        if (testRunner.isCurrentlyWatching()) {
          await testRunner.stopWatch();
        } else {
          await testRunner.stopGanache();
        }
        process.exit(0);
      });
      
      // Enable gas reporting if requested
      if (options.gas) {
        testRunner.enableGasReport(true);
        console.log(chalk.blue('⛽ Gas reporting enabled'));
      }
      
      if (options.watch) {
        // Run in watch mode
        await testRunner.runTestsWatch(options.dir);
      } else {
        // Run tests normally
        console.log(chalk.blue('🧪 Running Solidity tests...'));
        
        // Start Ganache
        await testRunner.startGanache();
        
        // Execute pre-testing hooks
        await pluginManager.executeHook('beforeTest');
        
        // Compile contracts first
        console.log(chalk.blue('🔨 Compiling contracts for testing...'));
        const compiler = new Compiler();
        compiler.compileDirectory('./contracts');
        compiler.saveArtifacts('./build');
        
        let exitCode: number;
        
        if (options.file) {
          // Run specific test file
          console.log(chalk.blue(`📄 Running test file: ${options.file}`));
          exitCode = await testRunner.runTests(path.dirname(options.file));
        } else {
          // Run all tests in directory
          exitCode = await testRunner.runTests(options.dir);
        }
        
        // Stop Ganache
        await testRunner.stopGanache();
        
        // Execute post-testing hooks
        await pluginManager.executeHook('afterTest');
        
        if (exitCode === 0) {
          console.log(chalk.green('🎉 All tests passed!'));
        } else {
          console.log(chalk.red('❌ Some tests failed'));
          process.exit(1);
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Test execution failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

/**
 * Generate project structure based on user answers
 * @param answers - User answers from prompts
 * @param contractDetails - Contract-specific details
 */
async function generateProject(answers: ProjectAnswers, contractDetails: ContractDetails): Promise<void> {
  const projectDir = answers.projectName;
  
  // Create project directory
  if (fs.existsSync(projectDir)) {
    throw new Error(`Directory ${projectDir} already exists`);
  }
  
  fs.mkdirSync(projectDir, { recursive: true });
  process.chdir(projectDir);
  
  // Create directory structure
  fs.mkdirSync('contracts', { recursive: true });
  if (answers.includeTests) {
    fs.mkdirSync('test', { recursive: true });
  }
  if (answers.includeDeployment) {
    fs.mkdirSync('scripts', { recursive: true });
  }
  fs.mkdirSync('build', { recursive: true });
  
  // Generate contract file
  await generateContract(answers.contractType, contractDetails);
  
  // Generate test file
  if (answers.includeTests) {
    await generateTest(answers.contractType, contractDetails);
  }
  
  // Generate deployment script
  if (answers.includeDeployment) {
    await generateDeploymentScript(answers.contractType, contractDetails);
  }
  
  // Generate package.json
  await generatePackageJson(answers, contractDetails);
  
  // Generate soltest.config.js
  await generateConfig();
  
  // Generate .env.example
  await generateEnvExample();
  
  // Generate README.md
  await generateReadme(answers, contractDetails);
}

/**
 * Generate contract file based on type
 */
async function generateContract(contractType: string, details: ContractDetails): Promise<void> {
  let templatePath: string;
  let contractName = details.tokenName;
  
  if (contractType === 'ERC20') {
    templatePath = '../templates/contracts/ERC20.sol';
  } else if (contractType === 'ERC721') {
    templatePath = '../templates/contracts/ERC721.sol';
  } else {
    // Custom contract - create a basic template
    const customContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ${contractName}
 * @dev ${details.tokenDescription}
 */
contract ${contractName} {
    // Add your contract logic here
}`;
    fs.writeFileSync(`contracts/${contractName}.sol`, customContract);
    return;
  }
  
  // Read and process template
  const template = fs.readFileSync(templatePath, 'utf8');
  const processedTemplate = template
    .replace(/\{\{TOKEN_NAME\}\}/g, contractName)
    .replace(/\{\{TOKEN_SYMBOL\}\}/g, details.tokenSymbol || 'SYMBOL')
    .replace(/\{\{INITIAL_SUPPLY\}\}/g, details.initialSupply || '1000000')
    .replace(/\{\{MAX_SUPPLY\}\}/g, details.maxSupply || '10000')
    .replace(/\{\{TOKEN_DESCRIPTION\}\}/g, details.tokenDescription || 'A smart contract');
  
  fs.writeFileSync(`contracts/${contractName}.sol`, processedTemplate);
}

/**
 * Generate test file based on type
 */
async function generateTest(contractType: string, details: ContractDetails): Promise<void> {
  let templatePath: string;
  let contractName = details.tokenName;
  
  if (contractType === 'ERC20') {
    templatePath = '../templates/tests/ERC20.test.js';
  } else if (contractType === 'ERC721') {
    templatePath = '../templates/tests/ERC721.test.js';
  } else {
    // Custom test - create a basic template
    const customTest = `/**
 * ${contractName} Contract Tests
 */

describe('${contractName} Contract', function() {
  let contract;
  let contractAddress;
  
  beforeEach(async function() {
    // Add your deployment logic here
  });
  
  describe('Basic Functionality', function() {
    it('should deploy successfully', async function() {
      // Add your test logic here
    });
  });
});`;
    fs.writeFileSync(`test/${contractName}.test.js`, customTest);
    return;
  }
  
  // Read and process template
  const template = fs.readFileSync(templatePath, 'utf8');
  const processedTemplate = template
    .replace(/\{\{TOKEN_NAME\}\}/g, contractName)
    .replace(/\{\{TOKEN_SYMBOL\}\}/g, details.tokenSymbol || 'SYMBOL')
    .replace(/\{\{INITIAL_SUPPLY\}\}/g, details.initialSupply || '1000000')
    .replace(/\{\{MAX_SUPPLY\}\}/g, details.maxSupply || '10000');
  
  fs.writeFileSync(`test/${contractName}.test.js`, processedTemplate);
}

/**
 * Generate deployment script
 */
async function generateDeploymentScript(contractType: string, details: ContractDetails): Promise<void> {
  const contractName = details.tokenName;
  const scriptContent = `/**
 * Deployment script for ${contractName}
 */

import { Deployer } from '../src/deployer.js';
import { loadArtifact } from '../src/utils.js';

async function deploy() {
  try {
    console.log('🚀 Deploying ${contractName}...');
    
    const deployer = new Deployer();
    await deployer.connect('http://127.0.0.1:8545');
    
    const accounts = await deployer.getAccounts();
    const artifact = loadArtifact('${contractName}');
    
    // Constructor arguments
    const constructorArgs = ${getConstructorArgs(contractType, details)};
    
    const result = await deployer.deploy(
      artifact.abi,
      artifact.bytecode,
      accounts[0],
      constructorArgs
    );
    
    console.log('✅ Contract deployed successfully!');
    console.log('📍 Address:', result.address);
    console.log('⛽ Gas used:', result.gasUsed);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();`;
  
  fs.writeFileSync(`scripts/deploy-${contractName.toLowerCase()}.js`, scriptContent);
}

/**
 * Get constructor arguments based on contract type
 */
function getConstructorArgs(contractType: string, details: ContractDetails): string {
  if (contractType === 'ERC20') {
    return `['${details.tokenName}', '${details.tokenSymbol}', 18, '${details.initialSupply}']`;
  } else if (contractType === 'ERC721') {
    return `['${details.tokenName}', '${details.tokenSymbol}', '${details.maxSupply}', 'https://api.example.com/metadata/']`;
  } else {
    return '[]';
  }
}

/**
 * Generate package.json
 */
async function generatePackageJson(answers: ProjectAnswers, contractDetails: ContractDetails): Promise<void> {
  const packageJson = {
    name: answers.projectName,
    version: '1.1.2',
    description: `A Soltest project for ${contractDetails.tokenName}`,
    main: 'index.js',
    scripts: {
      compile: 'soltest compile',
      test: 'soltest test',
      'test:watch': 'soltest test --watch',
      'test:gas': 'soltest test --gas',
      deploy: `node scripts/deploy-${contractDetails.tokenName.toLowerCase()}.js`,
      networks: 'soltest networks'
    },
    dependencies: {
      'soltest-cli': '^1.0.0'
    },
    devDependencies: {},
    keywords: ['solidity', 'smart-contracts', 'testing', 'soltest'],
    author: '',
    license: 'MIT'
  };
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
}

/**
 * Generate soltest.config.js
 */
async function generateConfig(): Promise<void> {
  const configContent = `/**
 * Soltest Configuration
 * Configuration file for soltest CLI
 */

module.exports = {
  // Network configurations
  networks: {
    // Local development network (Ganache)
    local: {
      url: 'http://127.0.0.1:8545',
      accounts: 'ganache', // Auto-generate accounts using Ganache
      chainId: 1337
    },
    
    // Ethereum Sepolia testnet
    sepolia: {
      url: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      accounts: ['PRIVATE_KEY_FROM_ENV'], // Load from .env file
      chainId: 11155111,
      gasPrice: 'auto'
    },
    
    // Polygon Mumbai testnet
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 80001,
      gasPrice: 'auto'
    },
    
    // Ethereum mainnet (for production)
    mainnet: {
      url: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 1,
      gasPrice: 'auto'
    },
    
    // Polygon mainnet
    polygon: {
      url: 'https://polygon-rpc.com',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 137,
      gasPrice: 'auto'
    },
    
    // Base Sepolia testnet
    baseSepolia: {
      url: 'https://sepolia.base.org',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 84532,
      gasPrice: 'auto'
    },
    
    // Base mainnet
    base: {
      url: 'https://mainnet.base.org',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 8453,
      gasPrice: 'auto'
    }
  },
  
  // Solidity compiler settings
  solc: {
    version: '0.8.20',
    optimizer: {
      enabled: true,
      runs: 200
    },
    evmVersion: 'paris'
  },
  
  // Directory paths
  paths: {
    contracts: './contracts',
    tests: './test',
    build: './build',
    artifacts: './build'
  },
  
  // Gas reporting settings
  gasReporter: {
    enabled: false,
    currency: 'USD',
    gasPrice: 20, // gwei
    outputFile: './gas-report.json'
  },
  
  // Test settings
  test: {
    timeout: 10000,
    bail: false,
    parallel: false
  },
  
  // Deployment settings
  deployment: {
    gasLimit: 2000000,
    gasPrice: 'auto',
    timeout: 300000 // 5 minutes
  }
};`;
  
  fs.writeFileSync('soltest.config.js', configContent);
}

/**
 * Generate .env.example
 */
async function generateEnvExample(): Promise<void> {
  const envContent = `# Soltest Environment Variables

# Private Keys (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# API Keys
INFURA_API_KEY=your_infura_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here`;
  
  fs.writeFileSync('.env.example', envContent);
}

/**
 * Generate README.md
 */
async function generateReadme(answers: ProjectAnswers, contractDetails: ContractDetails): Promise<void> {
  const readmeContent = `# ${answers.projectName}

${contractDetails.tokenDescription}

## Project Structure

\`\`\`
${answers.projectName}/
├── contracts/          # Smart contracts
├── test/              # Test files
├── scripts/           # Deployment scripts
├── build/             # Compiled artifacts
├── soltest.config.js  # Soltest configuration
└── package.json       # Dependencies
\`\`\`

## Getting Started

1. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`

2. Compile contracts:
   \`\`\`bash
   bun run compile
   \`\`\`

3. Run tests:
   \`\`\`bash
   bun run test
   \`\`\`

4. Deploy contract:
   \`\`\`bash
   bun run deploy
   \`\`\`

## Available Scripts

- \`bun run compile\` - Compile smart contracts
- \`bun run test\` - Run tests
- \`bun run test:watch\` - Run tests in watch mode
- \`bun run test:gas\` - Run tests with gas reporting
- \`bun run deploy\` - Deploy contracts
- \`bun run networks\` - List available networks

## Configuration

Edit \`soltest.config.js\` to configure networks, compiler settings, and paths.

## Environment Variables

Copy \`.env.example\` to \`.env\` and fill in your values:

- \`PRIVATE_KEY\` - Your private key for deployment
- \`INFURA_API_KEY\` - Infura API key for network access
- \`ETHERSCAN_API_KEY\` - Etherscan API key for contract verification
`;
  
  fs.writeFileSync('README.md', readmeContent);
}

/**
 * Generate HTML security report
 * @param report - Security report object
 * @returns HTML report string
 */
function generateHtmlReport(report: any): string {
  const severityColors = {
    critical: '#dc3545',
    high: '#fd7e14', 
    medium: '#0dcaf0',
    low: '#198754'
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Report - ${report.contract}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f8f9fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .issues { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .issue { border-left: 4px solid #ddd; padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 4px; }
        .critical { border-left-color: #dc3545; }
        .high { border-left-color: #fd7e14; }
        .medium { border-left-color: #0dcaf0; }
        .low { border-left-color: #198754; }
        .severity { padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; }
        .severity.critical { background: #dc3545; }
        .severity.high { background: #fd7e14; }
        .severity.medium { background: #0dcaf0; }
        .severity.low { background: #198754; }
        .recommendation { background: #e7f3ff; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 24px; font-weight: bold; }
        .stat-label { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Security Report</h1>
        <p><strong>Contract:</strong> ${report.contract}</p>
        <p><strong>Scan Time:</strong> ${report.timestamp}</p>
    </div>

    <div class="summary">
        <h2>📊 Summary</h2>
        <div class="stats">
            <div class="stat">
                <div class="stat-number" style="color: #dc3545;">${report.severityCounts.critical}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat">
                <div class="stat-number" style="color: #fd7e14;">${report.severityCounts.high}</div>
                <div class="stat-label">High</div>
            </div>
            <div class="stat">
                <div class="stat-number" style="color: #0dcaf0;">${report.severityCounts.medium}</div>
                <div class="stat-label">Medium</div>
            </div>
            <div class="stat">
                <div class="stat-number" style="color: #198754;">${report.severityCounts.low}</div>
                <div class="stat-label">Low</div>
            </div>
        </div>
        <p><strong>Total Issues:</strong> ${report.totalIssues}</p>
        <p><strong>Summary:</strong> ${report.summary}</p>
    </div>

    <div class="issues">
        <h2>🔍 Issues Found</h2>
        ${report.issues.map((issue: any, index: number) => `
            <div class="issue ${issue.severity}">
                <h3>${index + 1}. <span class="severity ${issue.severity}">${issue.severity.toUpperCase()}</span> ${issue.message}</h3>
                <p><strong>Line ${issue.line}:</strong> ${issue.description}</p>
                <div class="recommendation">
                    <strong>💡 Recommendation:</strong> ${issue.recommendation}
                </div>
            </div>
        `).join('')}
    </div>

    ${report.recommendations.length > 0 ? `
    <div class="issues">
        <h2>💡 Recommendations</h2>
        ${report.recommendations.map((rec: any, index: number) => `
            <div class="issue">
                <h3>${index + 1}. <span class="severity ${rec.severity}">${rec.severity.toUpperCase()}</span> ${rec.type.replace(/_/g, ' ').toUpperCase()}</h3>
                <p><strong>Count:</strong> ${rec.count}</p>
                <div class="recommendation">
                    <strong>💡 Recommendation:</strong> ${rec.recommendation}
                </div>
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;

  return html;
}

// Plugin management commands
program
  .command('plugins')
  .description('Manage plugins')
  .option('-l, --list', 'List all loaded plugins')
  .option('-r, --reload', 'Reload all plugins')
  .action(async (options) => {
    try {
      if (options.list) {
        pluginManager.listPlugins();
      } else if (options.reload) {
        console.log(chalk.blue('🔄 Reloading plugins...'));
        pluginManager.getPlugins().clear();
        await pluginManager.loadPlugins();
        console.log(chalk.green('✅ Plugins reloaded'));
      } else {
        pluginManager.listPlugins();
      }
    } catch (error) {
      console.error(chalk.red(`❌ Plugin management failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Generic plugin command executor
program
  .command('plugin <pluginName> <commandName>')
  .description('Execute a plugin command')
  .option('-a, --args <args>', 'Command arguments (JSON string)')
  .action(async (pluginName, commandName, options) => {
    try {
      const args = options.args ? JSON.parse(options.args) : {};
      const result = await pluginManager.executePlugin(pluginName, commandName, args);
      
      if (result && typeof result === 'object') {
        console.log(chalk.green('✅ Plugin command executed successfully'));
        if (result.message) {
          console.log(chalk.blue(result.message));
        }
      }
    } catch (error) {
      console.error(chalk.red(`❌ Plugin command failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// Load plugins on startup
pluginManager.loadPlugins().catch(error => {
  console.error(chalk.red(`Failed to load plugins: ${error.message}`));
});

// Custom command handler for plugin commands
program.on('command:*', async (commandName) => {
  try {
    // Check if this is a plugin command
    const allCommands = pluginManager.getAllCommands();
    const commandInfo = allCommands[commandName];
    
    if (commandInfo) {
      console.log(chalk.blue(`🔌 Executing plugin command: ${commandName}`));
      const result = await pluginManager.executePlugin(commandInfo.plugin, commandName, {});
      
      if (result && typeof result === 'object') {
        console.log(chalk.green('✅ Plugin command executed successfully'));
        if (result.message) {
          console.log(chalk.blue(result.message));
        }
      }
      process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red(`❌ Plugin command failed: ${(error as Error).message}`));
    process.exit(1);
  }
});

// Parse command line arguments
program.parse();
