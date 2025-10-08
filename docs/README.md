# Soltest CLI Documentation

Welcome to Soltest CLI - a powerful command-line tool for Solidity smart contract development, testing, and deployment.

## 🚀 Quick Start

### Installation

```bash
# Install globally
bun install -g soltest-cli

# Or use in your project
bun add soltest-cli
```

### Initialize a New Project

```bash
# Create a new Soltest project
soltest init

# Follow the interactive prompts to set up your project
```

### Basic Workflow

```bash
# 1. Compile your contracts
soltest compile

# 2. Run tests
soltest test

# 3. Deploy to network
soltest deploy --contract Token --network local

# 4. Verify on block explorer
soltest verify --contract Token --address 0x... --network sepolia
```

## 📋 What is Soltest CLI?

Soltest CLI is a comprehensive development toolkit for Solidity smart contracts that provides:

- **🔨 Compilation** - Compile Solidity contracts with customizable settings
- **🧪 Testing** - Run tests with Ganache integration and gas reporting
- **🚀 Deployment** - Deploy contracts to multiple networks
- **🔍 Verification** - Verify contracts on block explorers
- **📊 Coverage** - Generate code coverage reports
- **🔒 Security** - Scan contracts for vulnerabilities
- **🔄 Upgrades** - Manage proxy contract upgrades
- **🔌 Plugins** - Extensible plugin architecture

## 🏗️ Project Structure

After running `soltest init`, your project will have this structure:

```
my-soltest-project/
├── contracts/          # Smart contracts
├── test/              # Test files
├── scripts/           # Deployment scripts
├── build/             # Compiled artifacts
├── plugins/           # Custom plugins
├── soltest.config.js  # Configuration
└── package.json       # Dependencies
```

## ⚙️ Configuration

Soltest uses a configuration file `soltest.config.js` to manage settings:

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

## 🌐 Supported Networks

Soltest supports deployment to various networks:

- **Local Development**: Ganache, Hardhat Network
- **Testnets**: Sepolia, Goerli, Mumbai, BSC Testnet
- **Mainnets**: Ethereum, Polygon, BSC, Arbitrum, Avalanche

## 🔌 Plugin System

Soltest features a powerful plugin architecture that allows you to:

- Add custom commands
- Extend functionality
- Integrate with external tools
- Automate workflows

Learn more about [creating plugins](./PLUGINS.md).

## 📚 Documentation Sections

- **[CLI Reference](./CLI_REFERENCE.md)** - Complete command reference
- **[Examples](./EXAMPLES.md)** - Real-world usage examples
- **[API Documentation](./API.md)** - Programmatic usage
- **[Plugin Development](./PLUGINS.md)** - Creating custom plugins
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## 🆘 Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/jeremiah-eth/SOLTEST-CLI/issues)
- **Documentation**: Browse the complete docs in this site
- **Community**: Join discussions in GitHub Discussions

## 📄 License

MIT License - see the project repository for license details.

---

**Ready to get started?** Check out the [CLI Reference](./CLI_REFERENCE.md) to explore all available commands!
