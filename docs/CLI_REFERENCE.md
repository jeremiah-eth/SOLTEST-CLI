# CLI Reference

Complete reference for all Soltest CLI commands and options.

## 📋 Table of Contents

- [Core Commands](#core-commands)
- [Development Commands](#development-commands)
- [Deployment Commands](#deployment-commands)
- [Testing Commands](#testing-commands)
- [Verification Commands](#verification-commands)
- [Plugin Commands](#plugin-commands)
- [Utility Commands](#utility-commands)

## Core Commands

### `soltest init`

Initialize a new Soltest project with interactive setup.

```bash
soltest init
```

**Description**: Creates a new project structure with contracts, tests, and configuration files.

**Options**: None (interactive prompts)

**Example**:
```bash
soltest init
# Follow prompts to configure your project
```

### `soltest compile`

Compile Solidity contracts.

```bash
soltest compile [options]
```

**Options**:
- `-d, --dir <directory>` - Contracts directory (default: `./contracts`)
- `-o, --output <directory>` - Output directory (default: `./build`)

**Examples**:
```bash
# Compile with default settings
soltest compile

# Compile from custom directory
soltest compile --dir ./src/contracts --output ./artifacts
```

## Development Commands

### `soltest test`

Run Solidity tests with Ganache.

```bash
soltest test [options]
```

**Options**:
- `-f, --file <file>` - Run specific test file
- `-d, --dir <directory>` - Test directory (default: `./test`)
- `-w, --watch` - Run tests in watch mode
- `--gas` - Enable gas usage reporting

**Examples**:
```bash
# Run all tests
soltest test

# Run specific test file
soltest test --file Token.test.js

# Run tests with gas reporting
soltest test --gas

# Watch mode for development
soltest test --watch
```

### `soltest coverage`

Generate code coverage reports.

```bash
soltest coverage [options]
```

**Options**:
- `-t, --threshold <percentage>` - Minimum coverage threshold (default: 80)
- `-f, --format <format>` - Report format: html, json, text (default: html)
- `-d, --dir <directory>` - Contracts directory (default: `./contracts`)
- `--clean` - Clean up instrumented files after report generation
- `--no-threshold` - Skip threshold checking

**Examples**:
```bash
# Generate HTML coverage report
soltest coverage

# Generate JSON report with custom threshold
soltest coverage --format json --threshold 90

# Skip threshold checking
soltest coverage --no-threshold
```

## Deployment Commands

### `soltest deploy`

Deploy compiled contracts to network.

```bash
soltest deploy [options]
```

**Options**:
- `-c, --contract <name>` - Contract name to deploy (required)
- `-n, --network <name>` - Network name from config (default: local)
- `--url <url>` - Direct network URL (overrides network config)
- `-a, --args <args>` - Constructor arguments (comma-separated)

**Examples**:
```bash
# Deploy Token contract to local network
soltest deploy --contract Token

# Deploy with constructor arguments
soltest deploy --contract Token --args "MyToken,MTK,18,1000000"

# Deploy to specific network
soltest deploy --contract Token --network sepolia
```

### `soltest deploy-script`

Run deployment scripts in order.

```bash
soltest deploy-script [options]
```

**Options**:
- `-n, --network <name>` - Network name from config (default: local)
- `--url <url>` - Direct network URL (overrides network config)
- `-d, --dir <directory>` - Deployment scripts directory (default: `./deploy`)
- `--stop-on-error` - Stop deployment on first error (default: true)
- `--verify` - Verify deployed contracts after deployment
- `--clear` - Clear existing deployment state before running

**Examples**:
```bash
# Run all deployment scripts
soltest deploy-script

# Run with verification
soltest deploy-script --verify

# Clear state and redeploy
soltest deploy-script --clear
```

### `soltest deploy-proxy`

Deploy a proxy contract with implementation.

```bash
soltest deploy-proxy [options]
```

**Options**:
- `-c, --contract <name>` - Implementation contract name (required)
- `-n, --network <name>` - Network name from config (default: local)
- `--url <url>` - Direct network URL (overrides network config)
- `-a, --args <args>` - Constructor arguments (comma-separated)
- `-p, --pattern <pattern>` - Proxy pattern: transparent, uups, beacon (default: transparent)

**Examples**:
```bash
# Deploy transparent proxy
soltest deploy-proxy --contract Token

# Deploy UUPS proxy
soltest deploy-proxy --contract Token --pattern uups
```

## Testing Commands

### `soltest scan`

Scan smart contracts for security vulnerabilities.

```bash
soltest scan [options]
```

**Options**:
- `--contract <path>` - Path to contract file to scan (required)
- `-o, --output <format>` - Output format: console, json, html (default: console)
- `-s, --severity <level>` - Minimum severity level: critical, high, medium, low (default: low)
- `--save-report` - Save report to file
- `--report-dir <directory>` - Directory to save reports (default: `./security-reports`)

**Examples**:
```bash
# Scan contract with console output
soltest scan --contract ./contracts/Token.sol

# Generate HTML report
soltest scan --contract ./contracts/Token.sol --output html --save-report

# Scan with high severity threshold
soltest scan --contract ./contracts/Token.sol --severity high
```

## Verification Commands

### `soltest verify`

Verify deployed contracts on block explorers.

```bash
soltest verify [options]
```

**Options**:
- `--contract <name>` - Contract name to verify (required)
- `--address <address>` - Contract address to verify (required)
- `-n, --network <name>` - Network name (default: local)
- `-a, --args <args>` - Constructor arguments (comma-separated)
- `-p, --path <path>` - Path to contract source file
- `-v, --version <version>` - Compiler version (default: 0.8.20)
- `--optimization` - Enable optimization (default: true)
- `--runs <runs>` - Optimization runs (default: 200)
- `--wait` - Wait for verification to complete

**Examples**:
```bash
# Verify contract
soltest verify --contract Token --address 0x123... --network sepolia

# Verify with constructor arguments
soltest verify --contract Token --address 0x123... --args "MyToken,MTK,18"

# Wait for verification completion
soltest verify --contract Token --address 0x123... --wait
```

### `soltest upgrade`

Upgrade proxy contracts to new implementations.

```bash
soltest upgrade [options]
```

**Options**:
- `--proxy <address>` - Proxy contract address to upgrade (required)
- `--implementation <name>` - New implementation contract name (required)
- `-n, --network <name>` - Network name from config (default: local)
- `--url <url>` - Direct network URL (overrides network config)
- `-a, --args <args>` - Constructor arguments for new implementation (comma-separated)
- `--pattern <pattern>` - Proxy pattern: transparent, uups, beacon (default: transparent)
- `--no-validate` - Skip storage layout validation

**Examples**:
```bash
# Upgrade transparent proxy
soltest upgrade --proxy 0x123... --implementation TokenV2

# Upgrade UUPS proxy
soltest upgrade --proxy 0x123... --implementation TokenV2 --pattern uups
```

## Plugin Commands

### `soltest plugins`

Manage plugins.

```bash
soltest plugins [options]
```

**Options**:
- `-l, --list` - List all loaded plugins
- `-r, --reload` - Reload all plugins

**Examples**:
```bash
# List all plugins
soltest plugins --list

# Reload plugins
soltest plugins --reload
```

### `soltest plugin <pluginName> <commandName>`

Execute a plugin command.

```bash
soltest plugin <pluginName> <commandName> [options]
```

**Options**:
- `-a, --args <args>` - Command arguments (JSON string)

**Examples**:
```bash
# Execute plugin command
soltest plugin my-plugin custom-command

# Execute with arguments
soltest plugin my-plugin custom-command --args '{"param": "value"}'
```

## Utility Commands

### `soltest networks`

List available networks from configuration.

```bash
soltest networks
```

**Description**: Shows all configured networks with their details.

**Example**:
```bash
soltest networks
# Output:
# 🌐 Available Networks:
# ==================================================
# 📡 local
#    URL: http://127.0.0.1:8545
#    Chain ID: 1337
#    Accounts: ganache
# 
# 📡 sepolia
#    URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
#    Chain ID: 11155111
#    Accounts: 1 configured
```

## Environment Variables

Soltest uses the following environment variables:

### Network Configuration
- `PRIVATE_KEY` - Private key for deployment (without 0x prefix)
- `INFURA_API_KEY` - Infura API key for network access
- `ALCHEMY_API_KEY` - Alchemy API key for network access

### Block Explorer API Keys
- `ETHERSCAN_API_KEY` - Etherscan API key for verification
- `POLYGONSCAN_API_KEY` - Polygonscan API key for verification
- `BSCSCAN_API_KEY` - BSCScan API key for verification
- `ARBISCAN_API_KEY` - Arbiscan API key for verification
- `SNOWTRACE_API_KEY` - Snowtrace API key for verification

### Example `.env` file:
```bash
# Private Keys
PRIVATE_KEY=your_private_key_here

# API Keys
INFURA_API_KEY=your_infura_api_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
```

## Configuration File

Soltest uses `soltest.config.js` for configuration:

```javascript
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
};
```

## Exit Codes

Soltest uses the following exit codes:

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - Network error
- `4` - Compilation error
- `5` - Deployment error
- `6` - Test failure
- `7` - Verification error

## Global Options

All commands support these global options:

- `--help, -h` - Show help information
- `--version, -v` - Show version information
- `--verbose` - Enable verbose output
- `--quiet` - Suppress output (except errors)

## Examples

### Complete Development Workflow

```bash
# 1. Initialize project
soltest init

# 2. Compile contracts
soltest compile

# 3. Run tests
soltest test

# 4. Generate coverage
soltest coverage

# 5. Deploy to testnet
soltest deploy --contract Token --network sepolia

# 6. Verify contract
soltest verify --contract Token --address 0x123... --network sepolia
```

### Plugin Development

```bash
# List available plugins
soltest plugins --list

# Execute plugin command
soltest custom-command

# Execute with arguments
soltest hello-world --args '{"name": "World"}'
```

---

For more examples and advanced usage, see the [Examples](./EXAMPLES.md) documentation.
