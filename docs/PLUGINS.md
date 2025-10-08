# Plugin Development

Complete guide to creating and managing plugins for Soltest CLI.

## 📋 Table of Contents

- [Plugin Architecture](#plugin-architecture)
- [Creating Your First Plugin](#creating-your-first-plugin)
- [Plugin Interface](#plugin-interface)
- [CLI API Reference](#cli-api-reference)
- [Plugin Hooks](#plugin-hooks)
- [Advanced Plugin Features](#advanced-plugin-features)
- [Plugin Distribution](#plugin-distribution)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Plugin Architecture

Soltest CLI features a powerful plugin system that allows you to:

- **Extend Commands**: Add custom CLI commands
- **Integrate Tools**: Connect with external services and tools
- **Automate Workflows**: Create automated development workflows
- **Add Functionality**: Extend core features with custom logic

### Plugin Structure

```
plugins/
├── my-plugin/
│   ├── index.js          # Main plugin file
│   ├── package.json      # Plugin dependencies (optional)
│   └── README.md         # Plugin documentation (optional)
└── another-plugin/
    └── index.js
```

## Creating Your First Plugin

### 1. Create Plugin Directory

```bash
mkdir -p plugins/my-first-plugin
cd plugins/my-first-plugin
```

### 2. Create Plugin File

```javascript
// plugins/my-first-plugin/index.js
export default {
  name: 'my-first-plugin',
  version: '1.0.0',
  description: 'My first Soltest plugin',
  
  // Plugin initialization
  async init(cliAPI) {
    console.log('🔌 My First Plugin initialized!');
    this.cliAPI = cliAPI;
  },

  // Define custom commands
  commands: {
    'hello': async (args) => {
      const name = args.name || 'World';
      console.log(`👋 Hello, ${name}!`);
      
      return {
        success: true,
        message: `Greeted ${name} successfully`
      };
    },

    'info': async (args) => {
      console.log('📊 Plugin Information:');
      console.log(`   Name: ${this.name}`);
      console.log(`   Version: ${this.version}`);
      console.log(`   Description: ${this.description}`);
      
      return {
        success: true,
        info: {
          name: this.name,
          version: this.version,
          description: this.description
        }
      };
    }
  }
};
```

### 3. Test Your Plugin

```bash
# List plugins
soltest plugins --list

# Execute plugin command
soltest hello --args '{"name": "Developer"}'

# Or use generic plugin execution
soltest plugin my-first-plugin hello --args '{"name": "Developer"}'
```

## Plugin Interface

### Required Properties

```javascript
export default {
  name: 'plugin-name',           // Required: Unique plugin name
  commands: {                    // Required: Plugin commands
    'command-name': async (args) => {
      // Command implementation
    }
  }
};
```

### Optional Properties

```javascript
export default {
  name: 'plugin-name',
  version: '1.0.0',              // Optional: Plugin version
  description: 'Plugin description', // Optional: Plugin description
  
  // Optional: Plugin initialization
  async init(cliAPI) {
    // Initialize plugin with CLI API
  },
  
  commands: {
    // Plugin commands
  },
  
  // Optional: Plugin hooks
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

## CLI API Reference

Plugins receive a comprehensive CLI API that provides access to all Soltest functionality.

### Logging Utilities

```javascript
// Basic logging
cliAPI.log('Info message');
cliAPI.log('Success message', 'success');
cliAPI.log('Warning message', 'warning');
cliAPI.log('Error message', 'error');

// Convenience methods
cliAPI.info('Info message');
cliAPI.success('Success message');
cliAPI.warning('Warning message');
cliAPI.error('Error message');
```

### File Operations

```javascript
// Read file
const content = cliAPI.readFile('./contracts/Token.sol');

// Write file
cliAPI.writeFile('./output.txt', 'Hello World');

// Check if file exists
if (cliAPI.exists('./contracts/Token.sol')) {
  console.log('Contract file exists');
}

// Create directory
cliAPI.mkdir('./output');
```

### Configuration Access

```javascript
// Get full configuration
const config = cliAPI.getConfig();
console.log('Networks:', Object.keys(config.networks));

// Get specific network configuration
const networkConfig = cliAPI.getNetworkConfig('sepolia');
console.log('Network URL:', networkConfig.url);
```

### Contract Operations

```javascript
// Compile contract
const result = cliAPI.compileContract('./contracts/Token.sol');
console.log('ABI:', result.abi);
console.log('Bytecode:', result.bytecode);

// Load contract artifact
const artifact = cliAPI.loadArtifact('Token');
console.log('Contract ABI:', artifact.abi);
```

### Network Operations

```javascript
// Connect to network
const deployer = await cliAPI.connect('http://127.0.0.1:8545');

// Get available accounts
const accounts = await cliAPI.getAccounts();
console.log(`Found ${accounts.length} accounts`);
```

### Deployment

```javascript
// Deploy contract
const result = await cliAPI.deploy(
  artifact.abi,
  artifact.bytecode,
  accounts[0],
  ['MyToken', 'MTK', 18, '1000000'] // Constructor arguments
);

console.log('Contract deployed at:', result.address);
console.log('Gas used:', result.gasUsed);
```

### Testing

```javascript
// Run tests
const exitCode = await cliAPI.runTests('./test');
if (exitCode === 0) {
  console.log('All tests passed!');
} else {
  console.log('Some tests failed');
}
```

### Verification

```javascript
// Verify contract
const result = await cliAPI.verify(
  '0x123...', // Contract address
  'sepolia',  // Network
  ['MyToken', 'MTK', 18, '1000000'], // Constructor arguments
  {
    contractName: 'Token',
    contractPath: './contracts/Token.sol',
    compilerVersion: '0.8.20'
  }
);

if (result.success) {
  console.log('Verification submitted:', result.guid);
}
```

## Plugin Hooks

Hooks allow plugins to execute code at specific points in the Soltest workflow.

### Available Hooks

```javascript
hooks: {
  // Before contract compilation
  beforeCompile: async () => {
    console.log('🔌 [Plugin] Pre-compilation hook');
  },

  // After contract compilation
  afterCompile: async () => {
    console.log('🔌 [Plugin] Post-compilation hook');
  },

  // Before contract deployment
  beforeDeploy: async () => {
    console.log('🔌 [Plugin] Pre-deployment hook');
  },

  // After contract deployment
  afterDeploy: async () => {
    console.log('🔌 [Plugin] Post-deployment hook');
  },

  // Before running tests
  beforeTest: async () => {
    console.log('🔌 [Plugin] Pre-testing hook');
  },

  // After running tests
  afterTest: async () => {
    console.log('🔌 [Plugin] Post-testing hook');
  }
}
```

### Hook Execution Order

Hooks are executed for all loaded plugins in the order they were loaded:

1. Plugin A hooks
2. Plugin B hooks
3. Plugin C hooks
4. ...

## Advanced Plugin Features

### Complex Plugin Example

```javascript
// plugins/advanced-plugin/index.js
export default {
  name: 'advanced-plugin',
  version: '2.0.0',
  description: 'Advanced plugin with multiple features',
  
  async init(cliAPI) {
    this.cliAPI = cliAPI;
    this.deploymentHistory = [];
    this.analysisCache = new Map();
  },

  commands: {
    'analyze-contract': async (args) => {
      const contractPath = args.contract || './contracts/Token.sol';
      
      if (!this.cliAPI.exists(contractPath)) {
        throw new Error(`Contract file not found: ${contractPath}`);
      }

      // Check cache first
      if (this.analysisCache.has(contractPath)) {
        return this.analysisCache.get(contractPath);
      }

      const contractContent = this.cliAPI.readFile(contractPath);
      
      // Perform analysis
      const analysis = {
        file: contractPath,
        lines: contractContent.split('\n').length,
        functions: (contractContent.match(/function\s+\w+/g) || []).length,
        events: (contractContent.match(/event\s+\w+/g) || []).length,
        modifiers: (contractContent.match(/modifier\s+\w+/g) || []).length,
        imports: (contractContent.match(/import\s+["'].*["']/g) || []).length,
        hasConstructor: contractContent.includes('constructor'),
        hasFallback: contractContent.includes('fallback') || contractContent.includes('receive'),
        pragmaVersion: contractContent.match(/pragma\s+solidity\s+([^;]+)/)?.[1] || 'Unknown',
        gasOptimizations: this.analyzeGasOptimizations(contractContent),
        securityIssues: this.analyzeSecurity(contractContent)
      };

      // Cache result
      this.analysisCache.set(contractPath, analysis);

      this.cliAPI.success('Contract analysis completed');
      this.cliAPI.info(`📊 Analysis Results for ${contractPath}:`);
      this.cliAPI.info(`   Lines: ${analysis.lines}`);
      this.cliAPI.info(`   Functions: ${analysis.functions}`);
      this.cliAPI.info(`   Events: ${analysis.events}`);
      this.cliAPI.info(`   Modifiers: ${analysis.modifiers}`);
      this.cliAPI.info(`   Imports: ${analysis.imports}`);
      this.cliAPI.info(`   Solidity Version: ${analysis.pragmaVersion}`);

      return {
        success: true,
        analysis,
        message: 'Contract analysis completed'
      };
    },

    'deploy-with-verification': async (args) => {
      const contractName = args.contract;
      const network = args.network || 'sepolia';
      const constructorArgs = args.args || [];
      
      this.cliAPI.info(`🚀 Deploying ${contractName} to ${network}...`);
      
      try {
        // Get network configuration
        const networkConfig = this.cliAPI.getNetworkConfig(network);
        
        // Connect to network
        const deployer = await this.cliAPI.connect(networkConfig.url);
        const accounts = await this.cliAPI.getAccounts();
        
        // Load contract artifact
        const artifact = this.cliAPI.loadArtifact(contractName);
        
        // Deploy contract
        const result = await this.cliAPI.deploy(
          artifact.abi,
          artifact.bytecode,
          accounts[0],
          constructorArgs
        );
        
        this.cliAPI.success(`✅ Contract deployed at: ${result.address}`);
        
        // Verify contract
        this.cliAPI.info('🔍 Verifying contract...');
        const verificationResult = await this.cliAPI.verify(
          result.address,
          network,
          constructorArgs,
          {
            contractName,
            contractPath: `./contracts/${contractName}.sol`,
            compilerVersion: '0.8.20'
          }
        );
        
        if (verificationResult.success) {
          this.cliAPI.success('✅ Contract verification submitted');
        } else {
          this.cliAPI.warning('⚠️ Contract verification failed');
        }
        
        // Store deployment info
        this.deploymentHistory.push({
          contract: contractName,
          address: result.address,
          network,
          timestamp: new Date().toISOString(),
          gasUsed: result.gasUsed
        });
        
        return {
          success: true,
          address: result.address,
          verification: verificationResult,
          message: 'Deployment and verification completed'
        };
        
      } catch (error) {
        this.cliAPI.error(`❌ Deployment failed: ${error.message}`);
        throw error;
      }
    },

    'deployment-history': async (args) => {
      if (this.deploymentHistory.length === 0) {
        this.cliAPI.warning('No deployments recorded');
        return { success: true, deployments: [] };
      }
      
      this.cliAPI.info('📋 Deployment History:');
      this.deploymentHistory.forEach((deployment, index) => {
        this.cliAPI.info(`   ${index + 1}. ${deployment.contract} (${deployment.network})`);
        this.cliAPI.info(`      Address: ${deployment.address}`);
        this.cliAPI.info(`      Gas Used: ${deployment.gasUsed}`);
        this.cliAPI.info(`      Time: ${deployment.timestamp}`);
      });
      
      return {
        success: true,
        deployments: this.deploymentHistory,
        message: 'Deployment history retrieved'
      };
    }
  },

  hooks: {
    beforeDeploy: async () => {
      this.cliAPI.info('🔌 [Advanced Plugin] Pre-deployment analysis...');
    },
    
    afterDeploy: async () => {
      this.cliAPI.info('🔌 [Advanced Plugin] Post-deployment verification...');
    }
  },

  // Helper methods
  analyzeGasOptimizations(contractContent) {
    const optimizations = [];
    
    // Check for gas optimizations
    if (contractContent.includes('uint256') && !contractContent.includes('uint')) {
      optimizations.push('Consider using uint instead of uint256 for gas savings');
    }
    
    if (contractContent.includes('for (uint i = 0; i < length; i++)')) {
      optimizations.push('Consider caching array length for gas savings');
    }
    
    return optimizations;
  },

  analyzeSecurity(contractContent) {
    const issues = [];
    
    // Check for common security issues
    if (contractContent.includes('tx.origin')) {
      issues.push('Use of tx.origin detected - consider using msg.sender');
    }
    
    if (contractContent.includes('block.timestamp')) {
      issues.push('Use of block.timestamp detected - ensure it\'s not used for randomness');
    }
    
    return issues;
  }
};
```

### Plugin with Dependencies

```javascript
// plugins/network-monitor/package.json
{
  "name": "soltest-network-monitor",
  "version": "1.0.0",
  "description": "Network monitoring plugin for Soltest",
  "dependencies": {
    "axios": "^1.12.2",
    "node-cron": "^3.0.0"
  }
}

// plugins/network-monitor/index.js
import axios from 'axios';
import cron from 'node-cron';

export default {
  name: 'network-monitor',
  version: '1.0.0',
  description: 'Monitor network status and gas prices',
  
  async init(cliAPI) {
    this.cliAPI = cliAPI;
    this.monitoring = false;
    this.gasPrices = {};
    
    // Start monitoring
    this.startMonitoring();
  },

  commands: {
    'monitor-start': async (args) => {
      this.monitoring = true;
      this.cliAPI.success('Network monitoring started');
      return { success: true, message: 'Monitoring started' };
    },

    'monitor-stop': async (args) => {
      this.monitoring = false;
      this.cliAPI.success('Network monitoring stopped');
      return { success: true, message: 'Monitoring stopped' };
    },

    'gas-prices': async (args) => {
      const network = args.network || 'ethereum';
      
      try {
        const response = await axios.get(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKey`);
        const gasPrices = response.data.result;
        
        this.cliAPI.info(`⛽ Gas Prices for ${network}:`);
        this.cliAPI.info(`   Safe: ${gasPrices.SafeGasPrice} gwei`);
        this.cliAPI.info(`   Standard: ${gasPrices.ProposeGasPrice} gwei`);
        this.cliAPI.info(`   Fast: ${gasPrices.FastGasPrice} gwei`);
        
        return {
          success: true,
          gasPrices,
          message: 'Gas prices retrieved'
        };
      } catch (error) {
        this.cliAPI.error(`Failed to fetch gas prices: ${error.message}`);
        throw error;
      }
    }
  },

  startMonitoring() {
    // Monitor every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      if (this.monitoring) {
        this.checkNetworkStatus();
      }
    });
  },

  async checkNetworkStatus() {
    try {
      const networks = ['ethereum', 'polygon', 'bsc'];
      
      for (const network of networks) {
        const status = await this.getNetworkStatus(network);
        this.cliAPI.info(`📡 ${network}: ${status ? 'Online' : 'Offline'}`);
      }
    } catch (error) {
      this.cliAPI.error(`Network monitoring error: ${error.message}`);
    }
  },

  async getNetworkStatus(network) {
    // Implementation for checking network status
    return true;
  }
};
```

## Plugin Distribution

### Publishing Plugins

1. **Create Plugin Package**:
```bash
cd plugins/my-plugin
npm init -y
```

2. **Add Package Information**:
```json
{
  "name": "soltest-my-plugin",
  "version": "1.0.0",
  "description": "My custom Soltest plugin",
  "main": "index.js",
  "keywords": ["soltest", "plugin", "solidity"],
  "author": "Your Name",
  "license": "MIT"
}
```

3. **Publish to NPM**:
```bash
npm publish
```

### Installing Plugins

```bash
# Install plugin from NPM
npm install soltest-my-plugin

# Create symlink in plugins directory
ln -s ../node_modules/soltest-my-plugin plugins/my-plugin
```

## Best Practices

### 1. Error Handling

```javascript
commands: {
  'safe-command': async (args) => {
    try {
      // Command implementation
      const result = await this.performOperation(args);
      return { success: true, result };
    } catch (error) {
      this.cliAPI.error(`Command failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
```

### 2. Input Validation

```javascript
commands: {
  'validate-input': async (args) => {
    // Validate required parameters
    if (!args.contract) {
      throw new Error('Contract parameter is required');
    }
    
    // Validate file existence
    if (!this.cliAPI.exists(args.contract)) {
      throw new Error(`Contract file not found: ${args.contract}`);
    }
    
    // Command implementation
  }
}
```

### 3. Caching

```javascript
async init(cliAPI) {
  this.cliAPI = cliAPI;
  this.cache = new Map();
}

commands: {
  'cached-operation': async (args) => {
    const cacheKey = `operation-${JSON.stringify(args)}`;
    
    if (this.cache.has(cacheKey)) {
      this.cliAPI.info('Using cached result');
      return this.cache.get(cacheKey);
    }
    
    const result = await this.performExpensiveOperation(args);
    this.cache.set(cacheKey, result);
    return result;
  }
}
```

### 4. Configuration

```javascript
async init(cliAPI) {
  this.cliAPI = cliAPI;
  this.config = {
    timeout: 30000,
    retries: 3,
    ...cliAPI.getConfig().plugins?.[this.name] || {}
  };
}
```

## Troubleshooting

### Common Issues

1. **Plugin Not Loading**:
   - Check plugin directory structure
   - Ensure `index.js` exists
   - Verify plugin exports default object

2. **Command Not Found**:
   - Check command name spelling
   - Ensure command is defined in `commands` object
   - Verify plugin is loaded (`soltest plugins --list`)

3. **CLI API Errors**:
   - Check if `cliAPI` is available in plugin
   - Ensure proper error handling
   - Verify API method exists

### Debug Mode

```javascript
// Enable debug logging
export default {
  name: 'debug-plugin',
  
  async init(cliAPI) {
    this.cliAPI = cliAPI;
    this.debug = process.env.SOLTEST_DEBUG === 'true';
  },

  commands: {
    'debug-command': async (args) => {
      if (this.debug) {
        this.cliAPI.info('Debug: Command started');
        this.cliAPI.info(`Debug: Args: ${JSON.stringify(args)}`);
      }
      
      // Command implementation
    }
  }
};
```

### Testing Plugins

```javascript
// test-plugin.js
import { PluginManager } from './src/plugin-manager.js';

const pluginManager = new PluginManager('./plugins');
await pluginManager.loadPlugins();

// Test plugin command
try {
  const result = await pluginManager.executePlugin('my-plugin', 'test-command', {});
  console.log('Plugin test passed:', result);
} catch (error) {
  console.error('Plugin test failed:', error);
}
```

---

This comprehensive guide covers all aspects of plugin development for Soltest CLI. For more examples and advanced usage patterns, see the [Examples](./EXAMPLES.md) documentation.
