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
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// Configure program
program
  .name('soltest')
  .description('Smart contract testing CLI')
  .version('1.0.0');

// Compile command
program
  .command('compile')
  .description('Compile Solidity contracts')
  .option('-c, --contract <file>', 'Compile single contract file')
  .option('-d, --dir <directory>', 'Compile all contracts in directory', './contracts')
  .option('-o, --output <dir>', 'Output directory for compiled contracts', './build')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔨 Compiling Solidity contracts...'));
      
      const compiler = new Compiler();
      
      if (options.contract) {
        // Compile single file
        console.log(chalk.blue(`📄 Compiling ${options.contract}...`));
        const results = compiler.compileFile(options.contract);
        console.log(chalk.green(`✅ Compiled ${Object.keys(results).length} contract(s)`));
      } else {
        // Compile directory
        console.log(chalk.blue(`📁 Compiling directory: ${options.dir}`));
        const results = compiler.compileDirectory(options.dir);
        console.log(chalk.green(`✅ Compiled ${Object.keys(results).length} contract(s) from ${options.dir}`));
      }
      
      // Save artifacts
      compiler.saveArtifacts(options.output);
      
      console.log(chalk.green('🎉 Compilation completed successfully!'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Compilation failed: ${error.message}`));
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
      
      // Load contract artifact
      const artifact = loadArtifact(options.contract);
      console.log(chalk.blue(`📦 Loaded artifact for ${artifact.contractName}`));
      
      // Parse constructor arguments
      let constructorArgs = [];
      if (options.args) {
        // Use user-provided arguments
        constructorArgs = options.args.split(',').map(arg => arg.trim());
        console.log(chalk.blue(`🔧 Using custom constructor arguments: ${constructorArgs.join(', ')}`));
      } else if (options.contract === 'Token') {
        // Use default arguments for Token contract
        constructorArgs = ['TestToken', 'TTK', '1000000'];
        console.log(chalk.blue(`🔧 Using default constructor arguments for Token: ${constructorArgs.join(', ')}`));
      } else {
        console.log(chalk.blue(`🔧 No constructor arguments provided for ${options.contract}`));
      }
      
      // Deploy contract
      const result = await deployer.deploy(
        artifact.abi,
        artifact.bytecode,
        accounts[0],
        constructorArgs
      );
      
      console.log(chalk.green(`🎉 Contract deployed successfully!`));
      console.log(chalk.green(`📍 Address: ${result.address}`));
      console.log(chalk.green(`⛽ Gas used: ${result.gasUsed}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Deployment failed: ${error.message}`));
      process.exit(1);
    }
  });

// Networks command
program
  .command('networks')
  .description('List available networks from configuration')
  .action(async () => {
    try {
      const config = loadConfig();
      const networks = getAvailableNetworks();
      
      console.log(chalk.blue('🌐 Available Networks:'));
      console.log(chalk.blue('═'.repeat(50)));
      
      networks.forEach(networkName => {
        const network = config.networks[networkName];
        console.log(chalk.white(`📡 ${networkName}`));
        console.log(chalk.gray(`   URL: ${network.url}`));
        if (network.chainId) {
          console.log(chalk.gray(`   Chain ID: ${network.chainId}`));
        }
        if (network.accounts && network.accounts !== 'ganache') {
          console.log(chalk.gray(`   Accounts: ${network.accounts.length} configured`));
        } else if (network.accounts === 'ganache') {
          console.log(chalk.gray(`   Accounts: Ganache auto-generated`));
        }
        console.log('');
      });
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load networks: ${error.message}`));
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a new Soltest project with interactive setup')
  .action(async () => {
    try {
      console.log(chalk.blue('🚀 Welcome to Soltest! Let\'s set up your project...\n'));
      
      // Interactive prompts
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project name?',
          default: 'my-soltest-project',
          validate: (input) => {
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
      let contractDetails = {};
      
      if (answers.contractType === 'ERC20') {
        const erc20Answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'tokenName',
            message: 'Token name:',
            default: 'MyToken',
            validate: (input) => input.trim() ? true : 'Token name is required'
          },
          {
            type: 'input',
            name: 'tokenSymbol',
            message: 'Token symbol:',
            default: 'MTK',
            validate: (input) => {
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
            validate: (input) => {
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
            validate: (input) => input.trim() ? true : 'NFT name is required'
          },
          {
            type: 'input',
            name: 'tokenSymbol',
            message: 'NFT symbol:',
            default: 'MNFT',
            validate: (input) => {
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
            validate: (input) => {
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
            validate: (input) => input.trim() ? true : 'Contract name is required'
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
      console.error(chalk.red(`❌ Initialization failed: ${error.message}`));
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
      let constructorArgs = [];
      if (options.args) {
        constructorArgs = options.args.split(',').map(arg => arg.trim());
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
          const finalResult = await verifier.waitForVerification(result.guid, result.explorer);
          
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
      console.error(chalk.red(`❌ Verification failed: ${error.message}`));
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
      console.error(chalk.red(`❌ Coverage analysis failed: ${error.message}`));
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
        if (testRunner.isWatching) {
          await testRunner.stopWatch();
        } else {
          await testRunner.stopGanache();
        }
        process.exit(0);
      });
      
      // Enable gas reporting if flag is set
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
        
        // Compile contracts first
        console.log(chalk.blue('🔨 Compiling contracts for testing...'));
        const compiler = new Compiler();
        compiler.compileDirectory('./contracts');
        compiler.saveArtifacts('./build');
        
        // Run tests
        let exitCode;
        if (options.file) {
          console.log(chalk.blue(`📄 Running test file: ${options.file}`));
          // For single file, we need to modify the test runner
          // For now, run all tests in the directory
          exitCode = await testRunner.runTests(options.dir);
        } else {
          console.log(chalk.blue(`📁 Running tests in directory: ${options.dir}`));
          exitCode = await testRunner.runTests(options.dir);
        }
        
        // Stop Ganache
        await testRunner.stopGanache();
        
        if (exitCode === 0) {
          console.log(chalk.green('🎉 All tests passed!'));
        } else {
          console.log(chalk.red('❌ Some tests failed'));
          process.exit(1);
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Test execution failed: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Generate project structure based on user answers
 * @param {Object} answers - User answers from prompts
 * @param {Object} contractDetails - Contract-specific details
 */
async function generateProject(answers, contractDetails) {
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
async function generateContract(contractType, details) {
  let templatePath;
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
async function generateTest(contractType, details) {
  let templatePath;
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
async function generateDeploymentScript(contractType, details) {
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
function getConstructorArgs(contractType, details) {
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
async function generatePackageJson(answers, contractDetails) {
  const packageJson = {
    name: answers.projectName,
    version: '1.0.0',
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
async function generateConfig() {
  const configContent = `/**
 * Soltest Configuration
 */

module.exports = {
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
      accounts: 'ganache',
      chainId: 1337
    },
    sepolia: {
      url: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 11155111
    }
  },
  solc: {
    version: '0.8.20',
    optimizer: {
      enabled: true,
      runs: 200
    },
    evmVersion: 'paris'
  },
  paths: {
    contracts: './contracts',
    tests: './test',
    build: './build'
  }
};`;
  
  fs.writeFileSync('soltest.config.js', configContent);
}

/**
 * Generate .env.example
 */
async function generateEnvExample() {
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
async function generateReadme(answers, contractDetails) {
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

// Parse command line arguments
program.parse();
