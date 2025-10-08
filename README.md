# 🧪 Soltest CLI

> A powerful command-line tool for Solidity smart contract development, testing, and deployment built with Bun.

[![GitHub](https://img.shields.io/github/license/jeremiah-eth/SOLTEST-CLI)](https://github.com/jeremiah-eth/SOLTEST-CLI)
[![Bun](https://img.shields.io/badge/Bun-1.0+-blue)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org)

## ✨ Features

- 🔨 **Smart Compilation** - Advanced Solidity compiler with optimization
- 🧪 **Comprehensive Testing** - Mocha + Ganache integration with gas reporting
- 🚀 **Multi-Network Deployment** - Deploy to any Ethereum-compatible network
- 🔍 **Contract Verification** - Verify contracts on block explorers
- 📊 **Code Coverage** - Generate detailed coverage reports
- 🔒 **Security Scanning** - Built-in vulnerability detection
- 🔄 **Proxy Upgrades** - Manage upgradeable contracts (Transparent, UUPS, Beacon)
- 🔌 **Plugin System** - Extensible architecture with custom commands
- ⚡ **Bun Runtime** - Lightning-fast execution with modern JavaScript
- 🎨 **Beautiful CLI** - Colored output and intuitive command structure

## 📦 Installation

### Global Installation
```bash
# Install globally with Bun
bun install -g soltest-cli

# Or install with npm
npm install -g soltest-cli
```

### Local Development
```bash
# Clone the repository
git clone https://github.com/jeremiah-eth/SOLTEST-CLI.git
cd SOLTEST-CLI

# Install dependencies
bun install

# Link globally for CLI access
bun link
```

### Quick Start
```bash
# Initialize a new project
soltest init

# Follow the interactive prompts to set up your project
```

## 🚀 Quick Start

### Basic Workflow
```bash
# 1. Initialize a new project
soltest init

# 2. Compile contracts
soltest compile

# 3. Run tests
soltest test

# 4. Deploy to network
soltest deploy --contract Token --network local

# 5. Verify on block explorer
soltest verify --contract Token --address 0x... --network sepolia
```

### Advanced Features
```bash
# Generate coverage report
soltest coverage

# Security scan
soltest scan --contract ./contracts/Token.sol

# Deploy proxy contract
soltest deploy-proxy --contract Token --pattern transparent

# Upgrade proxy
soltest upgrade --proxy 0x... --implementation TokenV2

# Plugin management
soltest plugins --list
```

## 📋 Core Commands

| Command | Description |
|---------|-------------|
| `soltest init` | Initialize a new project with interactive setup |
| `soltest compile` | Compile Solidity contracts |
| `soltest test` | Run tests with Ganache integration |
| `soltest deploy` | Deploy contracts to networks |
| `soltest verify` | Verify contracts on block explorers |
| `soltest coverage` | Generate code coverage reports |
| `soltest scan` | Security vulnerability scanning |
| `soltest networks` | List available networks |

## 🔌 Plugin System

Soltest features a powerful plugin architecture:

```bash
# List loaded plugins
soltest plugins --list

# Execute plugin commands
soltest custom-command
soltest hello-world --args '{"name": "Developer"}'

# Generic plugin execution
soltest plugin my-plugin custom-command
```

### Creating Plugins

```javascript
// plugins/my-plugin/index.js
export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  
  commands: {
    'custom-command': async (args) => {
      console.log('Custom command executed!');
      return { success: true };
    }
  }
};
```

## 📚 Documentation

- **[Getting Started](docs/README.md)** - Installation and quick start guide
- **[CLI Reference](docs/CLI_REFERENCE.md)** - Complete command reference
- **[Examples](docs/EXAMPLES.md)** - Real-world usage examples
- **[API Documentation](docs/API.md)** - Programmatic usage
- **[Plugin Development](docs/PLUGINS.md)** - Creating custom plugins
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Local Documentation
```bash
# Start documentation server
bun run docs:dev

# Build documentation
bun run docs:build
```

## 📁 Project Structure

```
SOLTEST-CLI/
├── bin/
│   └── soltest.ts          # 🚀 CLI entry point
├── src/
│   ├── compiler.js         # 🔨 Solidity compilation
│   ├── deployer.js         # 🌐 Contract deployment
│   ├── test-runner.js      # 🧪 Test execution
│   ├── verifier.js         # 🔍 Contract verification
│   ├── security-scanner.js # 🔒 Security scanning
│   ├── upgrade-manager.js  # 🔄 Proxy upgrades
│   ├── plugin-manager.js   # 🔌 Plugin system
│   └── utils.js            # 🛠️ Utility functions
├── plugins/
│   └── my-plugin/          # 🔌 Example plugin
├── docs/                   # 📚 Documentation site
├── contracts/
│   └── Token.sol           # 📄 Example contracts
├── test/
│   └── Token.test.js       # 🧪 Example tests
├── build/                  # 📦 Compiled artifacts
└── package.json            # 📋 Dependencies
```

## 🛠️ Development

### Prerequisites
- **Bun** >= 1.0.0
- **Node.js** >= 18.0.0
- **Git**

### Setup Development Environment
```bash
# Clone repository
git clone https://github.com/jeremiah-eth/SOLTEST-CLI.git
cd SOLTEST-CLI

# Install dependencies
bun install

# Link globally for testing
bun link

# Run tests
bun run test

# Start documentation
bun run docs:dev
```

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🌍 Environment Variables

```bash
# Network Configuration
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_api_key_here

# Block Explorer API Keys
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here
ARBISCAN_API_KEY=your_arbiscan_api_key_here
```

## 📄 License

MIT License - see the project repository for license details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/jeremiah-eth/SOLTEST-CLI/issues).

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

## 📞 Contact

- **GitHub**: [jeremiah-eth](https://github.com/jeremiah-eth)
- **Repository**: [SOLTEST-CLI](https://github.com/jeremiah-eth/SOLTEST-CLI)

---

**Built with ❤️ by [jeremiah-eth](https://github.com/jeremiah-eth)**
