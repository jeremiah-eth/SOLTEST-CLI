# Soltest Plugins

This directory contains plugins for the Soltest CLI. Plugins allow you to extend the functionality of Soltest with custom commands and hooks.

## Plugin Structure

Each plugin should be in its own directory with an `index.js` file that exports a plugin object:

```
plugins/
├── my-plugin/
│   └── index.js
└── another-plugin/
    └── index.js
```

## Plugin Interface

A plugin must export an object with the following structure:

```javascript
export default {
  name: 'plugin-name',
  version: '1.0.0',
  description: 'Plugin description',
  
  // Optional initialization
  async init(cliAPI) {
    // Initialize plugin with CLI API
  },
  
  // Custom commands
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

## CLI API

Plugins have access to a comprehensive CLI API through the `cliAPI` parameter:

### Logging
- `cliAPI.log(message, type)` - Log with color coding
- `cliAPI.error(message)` - Log error
- `cliAPI.success(message)` - Log success
- `cliAPI.warning(message)` - Log warning
- `cliAPI.info(message)` - Log info

### File Operations
- `cliAPI.readFile(filePath)` - Read file content
- `cliAPI.writeFile(filePath, content)` - Write file content
- `cliAPI.exists(filePath)` - Check if file exists
- `cliAPI.mkdir(dirPath)` - Create directory

### Configuration
- `cliAPI.getConfig()` - Get soltest configuration
- `cliAPI.getNetworkConfig(networkName)` - Get network configuration

### Contract Operations
- `cliAPI.compileContract(contractPath)` - Compile a contract
- `cliAPI.loadArtifact(contractName)` - Load contract artifact

### Network Operations
- `cliAPI.connect(networkUrl)` - Connect to network
- `cliAPI.getAccounts()` - Get available accounts

### Deployment
- `cliAPI.deploy(abi, bytecode, account, args)` - Deploy contract

### Testing
- `cliAPI.runTests(testDir)` - Run tests

### Verification
- `cliAPI.verify(address, network, args, options)` - Verify contract

## Usage

### Plugin Commands

Plugin commands can be executed in several ways:

1. **Direct command execution:**
   ```bash
   soltest custom-command
   ```

2. **Generic plugin execution:**
   ```bash
   soltest plugin my-plugin custom-command
   ```

3. **With arguments:**
   ```bash
   soltest custom-command --args '{"param": "value"}'
   ```

### Plugin Management

```bash
# List all loaded plugins
soltest plugins --list

# Reload all plugins
soltest plugins --reload
```

## Example Plugin

See `my-plugin/index.js` for a complete example plugin that demonstrates:

- Custom commands
- CLI API usage
- File operations
- Network operations
- Hook implementation

## Creating Your Own Plugin

1. Create a new directory in the `plugins/` folder
2. Create an `index.js` file with your plugin implementation
3. Export a plugin object with the required structure
4. Use the CLI API to interact with Soltest functionality
5. Test your plugin with `soltest plugins --list`

## Hooks

Hooks allow plugins to execute code at specific points in the Soltest workflow:

- `beforeCompile` - Before contract compilation
- `afterCompile` - After contract compilation
- `beforeDeploy` - Before contract deployment
- `afterDeploy` - After contract deployment
- `beforeTest` - Before running tests
- `afterTest` - After running tests

Hooks are executed for all loaded plugins in the order they were loaded.
