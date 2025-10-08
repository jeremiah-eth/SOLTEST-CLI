# API Documentation

Programmatic usage of Soltest CLI components and modules.

## 📋 Table of Contents

- [Core Modules](#core-modules)
- [Plugin API](#plugin-api)
- [Configuration API](#configuration-api)
- [Network Management](#network-management)
- [Contract Operations](#contract-operations)
- [Testing Framework](#testing-framework)
- [Deployment API](#deployment-api)
- [Verification API](#verification-api)
- [Utility Functions](#utility-functions)

## Core Modules

### Compiler

The `Compiler` class handles Solidity contract compilation.

```javascript
import { Compiler } from './src/compiler.js';

const compiler = new Compiler();

// Compile single file
const result = compiler.compileFile('./contracts/Token.sol');

// Compile directory
const contracts = compiler.compileDirectory('./contracts');

// Save artifacts
compiler.saveArtifacts('./build');
```

**Methods**:
- `compileFile(filePath)` - Compile a single contract file
- `compileDirectory(dirPath)` - Compile all contracts in directory
- `saveArtifacts(outputDir)` - Save compiled artifacts

### TestRunner

The `TestRunner` class manages test execution with Ganache.

```javascript
import { TestRunner } from './src/test-runner.js';

const testRunner = new TestRunner();

// Start Ganache
await testRunner.startGanache();

// Run tests
const exitCode = await testRunner.runTests('./test');

// Run in watch mode
await testRunner.runTestsWatch('./test');

// Stop Ganache
await testRunner.stopGanache();
```

**Methods**:
- `startGanache()` - Start Ganache instance
- `stopGanache()` - Stop Ganache instance
- `runTests(testDir)` - Run tests in directory
- `runTestsWatch(testDir)` - Run tests in watch mode
- `enableGasReport(enabled)` - Enable/disable gas reporting

### Deployer

The `Deployer` class handles contract deployment.

```javascript
import { Deployer } from './src/deployer.js';

const deployer = new Deployer();

// Connect to network
await deployer.connect('http://127.0.0.1:8545');

// Get accounts
const accounts = await deployer.getAccounts();

// Deploy contract
const result = await deployer.deploy(
  artifact.abi,
  artifact.bytecode,
  accounts[0],
  constructorArgs
);
```

**Methods**:
- `connect(networkUrl)` - Connect to network
- `getAccounts()` - Get available accounts
- `deploy(abi, bytecode, account, args)` - Deploy contract

## Plugin API

### PluginManager

The `PluginManager` class manages plugin loading and execution.

```javascript
import { PluginManager } from './src/plugin-manager.js';

const pluginManager = new PluginManager('./plugins');

// Load plugins
await pluginManager.loadPlugins();

// Register plugin
pluginManager.registerPlugin('my-plugin', pluginObject);

// Execute plugin command
const result = await pluginManager.executePlugin('my-plugin', 'command-name', args);

// Execute hooks
await pluginManager.executeHook('beforeCompile');

// Get all commands
const commands = pluginManager.getAllCommands();
```

**Methods**:
- `loadPlugins(pluginDir?)` - Load plugins from directory
- `registerPlugin(name, plugin)` - Register a plugin
- `executePlugin(name, command, args)` - Execute plugin command
- `executeHook(hookName)` - Execute plugin hooks
- `getAllCommands()` - Get all available commands
- `getPlugins()` - Get all registered plugins
- `listPlugins()` - List plugins to console

### Plugin Interface

```javascript
export default {
  name: 'plugin-name',
  version: '1.0.0',
  description: 'Plugin description',
  
  // Optional initialization
  async init(cliAPI) {
    // Initialize with CLI API
  },
  
  // Plugin commands
  commands: {
    'command-name': async (args) => {
      // Command implementation
      return { success: true, message: 'Command executed' };
    }
  },
  
  // Optional hooks
  hooks: {
    beforeCompile: async () => { /* ... */ },
    afterCompile: async () => { /* ... */ },
    beforeDeploy: async () => { /* ... */ },
    afterDeploy: async () => { /* ... */ },
    beforeTest: async () => { /* ... */ },
    afterTest: async () => { /* ... */ }
  }
};
```

### CLI API for Plugins

Plugins receive a comprehensive CLI API:

```javascript
// Logging utilities
cliAPI.log(message, type); // type: 'info' | 'success' | 'warning' | 'error'
cliAPI.error(message);
cliAPI.success(message);
cliAPI.warning(message);
cliAPI.info(message);

// File operations
cliAPI.readFile(filePath);
cliAPI.writeFile(filePath, content);
cliAPI.exists(filePath);
cliAPI.mkdir(dirPath);

// Configuration
cliAPI.getConfig();
cliAPI.getNetworkConfig(networkName);

// Contract operations
cliAPI.compileContract(contractPath);
cliAPI.loadArtifact(contractName);

// Network operations
cliAPI.connect(networkUrl);
cliAPI.getAccounts();

// Deployment
cliAPI.deploy(abi, bytecode, account, args);

// Testing
cliAPI.runTests(testDir);

// Verification
cliAPI.verify(address, network, args, options);
```

## Configuration API

### Configuration Management

```javascript
import { loadConfig, getNetworkConfig, getAvailableNetworks } from './src/utils.js';

// Load configuration
const config = loadConfig();

// Get specific network config
const networkConfig = getNetworkConfig('sepolia');

// Get available networks
const networks = getAvailableNetworks();
```

**Configuration Structure**:
```javascript
{
  networks: {
    [networkName]: {
      url: string,
      accounts: string[] | 'ganache',
      chainId?: number
    }
  },
  solc: {
    version: string,
    optimizer: {
      enabled: boolean,
      runs: number
    },
    evmVersion: string
  },
  paths: {
    contracts: string,
    tests: string,
    build: string
  }
}
```

## Network Management

### Network Operations

```javascript
import { getNetworkConfig, getAvailableNetworks } from './src/utils.js';

// Get network configuration
const networkConfig = getNetworkConfig('sepolia');
console.log(networkConfig.url); // Network URL
console.log(networkConfig.chainId); // Chain ID

// List available networks
const networks = getAvailableNetworks();
console.log(networks); // ['local', 'sepolia', 'mainnet']
```

### Network Connection

```javascript
import { Deployer } from './src/deployer.js';

const deployer = new Deployer();

// Connect to network
await deployer.connect('https://sepolia.infura.io/v3/YOUR_KEY');

// Get accounts
const accounts = await deployer.getAccounts();
console.log(`Connected with ${accounts.length} accounts`);
```

## Contract Operations

### Compilation

```javascript
import { Compiler } from './src/compiler.js';

const compiler = new Compiler();

// Compile single contract
const result = compiler.compileFile('./contracts/Token.sol');
console.log(result.abi); // Contract ABI
console.log(result.bytecode); // Contract bytecode

// Compile all contracts
const contracts = compiler.compileDirectory('./contracts');
Object.keys(contracts).forEach(name => {
  console.log(`Compiled: ${name}`);
});

// Save artifacts
compiler.saveArtifacts('./build');
```

### Artifact Loading

```javascript
import { loadArtifact } from './src/utils.js';

// Load contract artifact
const artifact = loadArtifact('Token');
console.log(artifact.abi); // Contract ABI
console.log(artifact.bytecode); // Contract bytecode
```

## Testing Framework

### Test Execution

```javascript
import { TestRunner } from './src/test-runner.js';

const testRunner = new TestRunner();

// Enable gas reporting
testRunner.enableGasReport(true);

// Start Ganache
await testRunner.startGanache();

// Run tests
const exitCode = await testRunner.runTests('./test');

// Check results
if (exitCode === 0) {
  console.log('All tests passed!');
} else {
  console.log('Some tests failed');
}

// Stop Ganache
await testRunner.stopGanache();
```

### Watch Mode

```javascript
// Run tests in watch mode
await testRunner.runTestsWatch('./test');

// Stop watching
await testRunner.stopWatch();
```

## Deployment API

### Basic Deployment

```javascript
import { Deployer } from './src/deployer.js';
import { loadArtifact } from './src/utils.js';

const deployer = new Deployer();

// Connect to network
await deployer.connect('http://127.0.0.1:8545');

// Get accounts
const accounts = await deployer.getAccounts();

// Load contract artifact
const artifact = loadArtifact('Token');

// Deploy contract
const result = await deployer.deploy(
  artifact.abi,
  artifact.bytecode,
  accounts[0],
  ['MyToken', 'MTK', 18, '1000000'] // Constructor arguments
);

console.log(`Contract deployed at: ${result.address}`);
console.log(`Gas used: ${result.gasUsed}`);
console.log(`Transaction: ${result.transactionHash}`);
```

### Deployment Manager

```javascript
import { DeploymentManager } from './src/deployment-manager.js';

const manager = new DeploymentManager();

// Connect to network
await manager.connect('http://127.0.0.1:8545', 'local');

// Run deployment scripts
await manager.runDeployments('./deploy', {
  stopOnError: true
});

// Verify deployments
await manager.verifyDeployments();
```

### Proxy Deployment

```javascript
import { UpgradeManager } from './src/upgrade-manager.js';

const manager = new UpgradeManager();

// Connect to network
await manager.connect('http://127.0.0.1:8545', 'local');

// Deploy proxy
const result = await manager.deployProxy(
  'Token',
  ['MyToken', 'MTK', 18, '1000000'],
  'transparent'
);

console.log(`Implementation: ${result.implementation.address}`);
console.log(`Proxy: ${result.proxy.address}`);
```

## Verification API

### Contract Verification

```javascript
import { ContractVerifier } from './src/verifier.js';

const verifier = new ContractVerifier();

// Verify contract
const result = await verifier.verify(
  '0x123...', // Contract address
  'sepolia',  // Network
  ['MyToken', 'MTK', 18, '1000000'], // Constructor arguments
  {
    contractName: 'Token',
    contractPath: './contracts/Token.sol',
    compilerVersion: '0.8.20',
    optimizationUsed: '1',
    runs: '200',
    evmVersion: 'paris'
  }
);

if (result.success) {
  console.log(`Verification submitted: ${result.guid}`);
  console.log(`Explorer: ${result.explorer}`);
}
```

### Wait for Verification

```javascript
// Wait for verification to complete
const finalResult = await verifier.waitForVerification(
  result.guid,
  result.explorer
);

if (finalResult.success) {
  console.log('Contract verified successfully!');
} else {
  console.log(`Verification failed: ${finalResult.message}`);
}
```

## Utility Functions

### File Operations

```javascript
import { ensureDir, loadArtifact, saveArtifact } from './src/utils.js';

// Ensure directory exists
ensureDir('./build');

// Load contract artifact
const artifact = loadArtifact('Token');

// Save artifact
saveArtifact('Token', artifact);
```

### Coverage Reporting

```javascript
import { CoverageReporter } from './src/coverage.js';

const reporter = new CoverageReporter();

// Instrument contracts
await reporter.instrument('./contracts');

// Generate report
const coverageData = await reporter.generateReport('html');

// Check threshold
const meetsThreshold = await reporter.checkThreshold(80);

// Cleanup
reporter.cleanup();
```

### Security Scanning

```javascript
import { SecurityScanner } from './src/security-scanner.js';

const scanner = new SecurityScanner();

// Scan contract
const report = await scanner.scanContract('./contracts/Token.sol');

// Display report
scanner.displayReport(report);

// Check for critical issues
if (report.severityCounts.critical > 0) {
  console.log('Critical security issues found!');
}
```

## Error Handling

### Common Error Types

```javascript
try {
  await deployer.deploy(abi, bytecode, account, args);
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.error('Insufficient funds for deployment');
  } else if (error.message.includes('gas limit')) {
    console.error('Gas limit exceeded');
  } else {
    console.error('Deployment failed:', error.message);
  }
}
```

### Network Errors

```javascript
try {
  await deployer.connect(networkUrl);
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Network connection refused');
  } else if (error.code === 'ENOTFOUND') {
    console.error('Network URL not found');
  } else {
    console.error('Network error:', error.message);
  }
}
```

## TypeScript Support

### Type Definitions

```typescript
// types/index.d.ts
export interface NetworkConfig {
  url: string;
  accounts: string[] | 'ganache';
  chainId?: number;
}

export interface SolcConfig {
  version: string;
  optimizer: {
    enabled: boolean;
    runs: number;
  };
  evmVersion: string;
}

export interface ProjectConfig {
  networks: Record<string, NetworkConfig>;
  solc: SolcConfig;
  paths: {
    contracts: string;
    tests: string;
    build: string;
  };
}
```

### Usage with TypeScript

```typescript
import { Compiler } from './src/compiler.js';
import type { ProjectConfig } from './types';

const compiler = new Compiler();
const config: ProjectConfig = loadConfig();

// Type-safe compilation
const result = compiler.compileFile('./contracts/Token.sol');
```

## Advanced Usage

### Custom Network Configuration

```javascript
// Add custom network
const customNetwork = {
  url: 'https://custom-network.com',
  accounts: ['0x123...'],
  chainId: 999
};

// Use in deployment
await deployer.connect(customNetwork.url);
```

### Batch Operations

```javascript
// Batch deploy multiple contracts
const contracts = ['Token', 'NFT', 'Marketplace'];
const results = [];

for (const contractName of contracts) {
  const artifact = loadArtifact(contractName);
  const result = await deployer.deploy(
    artifact.abi,
    artifact.bytecode,
    accounts[0],
    []
  );
  results.push({ contract: contractName, address: result.address });
}
```

### Plugin Integration

```javascript
// Use plugins in your code
import { PluginManager } from './src/plugin-manager.js';

const pluginManager = new PluginManager('./plugins');
await pluginManager.loadPlugins();

// Execute plugin commands programmatically
const result = await pluginManager.executePlugin('my-plugin', 'analyze', {
  contract: './contracts/Token.sol'
});
```

---

This API documentation provides comprehensive coverage of all programmatic interfaces available in Soltest CLI. For more examples and advanced usage patterns, see the [Examples](./EXAMPLES.md) documentation.
