# Troubleshooting

Common issues and solutions for Soltest CLI.

## 📋 Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [Network Connection Issues](#network-connection-issues)
- [Compilation Errors](#compilation-errors)
- [Deployment Problems](#deployment-problems)
- [Testing Issues](#testing-issues)
- [Plugin Problems](#plugin-problems)
- [Performance Issues](#performance-issues)
- [Error Codes](#error-codes)
- [Getting Help](#getting-help)

## Installation Issues

### Bun Not Found

**Error**: `bun: command not found`

**Solution**:
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Or using npm
npm install -g bun

# Verify installation
bun --version
```

### Permission Denied

**Error**: `EACCES: permission denied`

**Solution**:
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use a Node version manager
nvm install node
nvm use node
```

### Module Not Found

**Error**: `Cannot find module 'soltest-cli'`

**Solution**:
```bash
# Install globally
bun install -g soltest-cli

# Or install locally
bun add soltest-cli

# Verify installation
soltest --version
```

## Configuration Problems

### Configuration File Not Found

**Error**: `Configuration file not found`

**Solution**:
```bash
# Initialize project
soltest init

# Or create manual config
touch soltest.config.js
```

### Invalid Configuration

**Error**: `Invalid configuration format`

**Solution**:
```javascript
// soltest.config.js
module.exports = {
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
      accounts: 'ganache',
      chainId: 1337
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

### Network Configuration Issues

**Error**: `Network 'sepolia' not found`

**Solution**:
```javascript
// Add network to soltest.config.js
networks: {
  sepolia: {
    url: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    accounts: ['PRIVATE_KEY_FROM_ENV'],
    chainId: 11155111
  }
}
```

## Network Connection Issues

### Connection Refused

**Error**: `ECONNREFUSED`

**Solutions**:
1. **Check if Ganache is running**:
   ```bash
   # Start Ganache
   soltest test  # This starts Ganache automatically
   ```

2. **Check network URL**:
   ```bash
   # Test network connectivity
   curl -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://127.0.0.1:8545
   ```

3. **Check firewall settings**:
   ```bash
   # Allow port 8545
   sudo ufw allow 8545
   ```

### Invalid Network URL

**Error**: `Invalid network URL`

**Solution**:
```javascript
// Use correct network URLs
networks: {
  local: 'http://127.0.0.1:8545',
  sepolia: 'https://sepolia.infura.io/v3/YOUR_KEY',
  mainnet: 'https://mainnet.infura.io/v3/YOUR_KEY'
}
```

### Account Issues

**Error**: `No accounts available`

**Solutions**:
1. **Check private key format**:
   ```bash
   # Private key should be without 0x prefix
   PRIVATE_KEY=your_private_key_here
   ```

2. **Check account balance**:
   ```bash
   # Ensure account has sufficient funds
   soltest networks  # Check account configuration
   ```

## Compilation Errors

### Solidity Version Mismatch

**Error**: `Pragma version mismatch`

**Solution**:
```solidity
// Use correct pragma version
pragma solidity ^0.8.20;

// Or update compiler version in config
solc: {
  version: '0.8.20'
}
```

### Import Errors

**Error**: `Cannot find module '@openzeppelin/contracts'`

**Solution**:
```bash
# Install OpenZeppelin contracts
bun add @openzeppelin/contracts

# Or install specific version
bun add @openzeppelin/contracts@4.9.0
```

### Compiler Errors

**Error**: `Compilation failed`

**Solutions**:
1. **Check Solidity syntax**:
   ```solidity
   // Ensure proper syntax
   contract MyContract {
       function myFunction() public pure returns (string memory) {
           return "Hello World";
       }
   }
   ```

2. **Check compiler version**:
   ```bash
   # Use compatible compiler version
   solc --version
   ```

3. **Enable optimizer**:
   ```javascript
   solc: {
     optimizer: {
       enabled: true,
       runs: 200
     }
   }
   ```

## Deployment Problems

### Insufficient Funds

**Error**: `insufficient funds for gas`

**Solutions**:
1. **Check account balance**:
   ```bash
   # Get account balance
   curl -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x...","latest"],"id":1}' \
        http://127.0.0.1:8545
   ```

2. **Fund test account**:
   ```bash
   # Use testnet faucet
   # Or use Ganache with funded accounts
   ```

### Gas Limit Exceeded

**Error**: `gas limit exceeded`

**Solutions**:
1. **Increase gas limit**:
   ```bash
   # Deploy with higher gas limit
   soltest deploy --contract Token --gas-limit 5000000
   ```

2. **Optimize contract**:
   ```solidity
   // Use gas-efficient patterns
   uint256 public constant MAX_SUPPLY = 1000000;
   mapping(address => uint256) private balances;
   ```

### Constructor Arguments

**Error**: `Constructor arguments mismatch`

**Solution**:
```bash
# Provide correct constructor arguments
soltest deploy --contract Token --args "MyToken,MTK,18,1000000"

# Check constructor signature
# constructor(string memory name, string memory symbol, uint8 decimals, uint256 initialSupply)
```

## Testing Issues

### Ganache Not Starting

**Error**: `Failed to start Ganache`

**Solutions**:
1. **Check port availability**:
   ```bash
   # Check if port 8545 is available
   lsof -i :8545
   
   # Kill process if needed
   kill -9 $(lsof -t -i:8545)
   ```

2. **Use different port**:
   ```bash
   # Start Ganache on different port
   ganache-cli --port 8546
   ```

### Test Failures

**Error**: `Test failed`

**Solutions**:
1. **Check test syntax**:
   ```javascript
   // Ensure proper test structure
   describe('MyContract', function() {
     it('should work', async function() {
       // Test implementation
     });
   });
   ```

2. **Check contract deployment**:
   ```javascript
   // Ensure contract is deployed in beforeEach
   beforeEach(async function() {
     const Contract = await ethers.getContractFactory('MyContract');
     this.contract = await Contract.deploy();
     await this.contract.deployed();
   });
   ```

### Gas Reporting Issues

**Error**: `Gas reporting failed`

**Solution**:
```bash
# Enable gas reporting
soltest test --gas

# Check gas reporter configuration
# Ensure gas reporter is properly configured
```

## Plugin Problems

### Plugin Not Loading

**Error**: `Plugin not found`

**Solutions**:
1. **Check plugin structure**:
   ```
   plugins/
   └── my-plugin/
       └── index.js
   ```

2. **Check plugin exports**:
   ```javascript
   // Ensure plugin exports default object
   export default {
     name: 'my-plugin',
     commands: {
       'my-command': async (args) => {
         // Command implementation
       }
     }
   };
   ```

### Command Not Found

**Error**: `Unknown command`

**Solutions**:
1. **Check command name**:
   ```bash
   # List available commands
   soltest plugins --list
   ```

2. **Use generic plugin execution**:
   ```bash
   soltest plugin my-plugin my-command
   ```

### Plugin API Errors

**Error**: `CLI API method not found`

**Solution**:
```javascript
// Check available API methods
async init(cliAPI) {
  console.log('Available methods:', Object.keys(cliAPI));
  this.cliAPI = cliAPI;
}
```

## Performance Issues

### Slow Compilation

**Problem**: Compilation takes too long

**Solutions**:
1. **Enable optimizer**:
   ```javascript
   solc: {
     optimizer: {
       enabled: true,
       runs: 200
     }
   }
   ```

2. **Use incremental compilation**:
   ```bash
   # Only compile changed files
   soltest compile --incremental
   ```

### Memory Issues

**Error**: `JavaScript heap out of memory`

**Solutions**:
1. **Increase memory limit**:
   ```bash
   node --max-old-space-size=4096 soltest compile
   ```

2. **Optimize dependencies**:
   ```bash
   # Remove unused dependencies
   bun remove unused-package
   ```

### Slow Tests

**Problem**: Tests run slowly

**Solutions**:
1. **Use watch mode**:
   ```bash
   soltest test --watch
   ```

2. **Parallel testing**:
   ```bash
   # Run tests in parallel
   soltest test --parallel
   ```

## Error Codes

### Exit Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 0 | Success | - |
| 1 | General error | Check error message |
| 2 | Configuration error | Fix soltest.config.js |
| 3 | Network error | Check network connection |
| 4 | Compilation error | Fix Solidity code |
| 5 | Deployment error | Check account/funds |
| 6 | Test failure | Fix test code |
| 7 | Verification error | Check verification parameters |

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module` | Missing dependency | Run `bun install` |
| `ECONNREFUSED` | Network not available | Start Ganache |
| `insufficient funds` | Low account balance | Fund account |
| `gas limit exceeded` | Contract too complex | Optimize contract |
| `Constructor arguments mismatch` | Wrong arguments | Check constructor signature |

## Getting Help

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
export SOLTEST_DEBUG=true

# Run command with debug info
soltest compile --verbose
```

### Verbose Output

```bash
# Get detailed output
soltest deploy --contract Token --verbose

# Check network status
soltest networks --verbose
```

### Log Files

Check log files for detailed error information:

```bash
# Check Bun logs
bun logs

# Check system logs
tail -f /var/log/syslog
```

### Community Support

1. **GitHub Issues**: [Report bugs](https://github.com/jeremiah-eth/SOLTEST-CLI/issues)
2. **GitHub Discussions**: [Ask questions](https://github.com/jeremiah-eth/SOLTEST-CLI/discussions)
3. **Documentation**: Check this troubleshooting guide
4. **Examples**: See [Examples](./EXAMPLES.md) for common patterns

### Creating Issues

When reporting issues, include:

1. **Environment**:
   ```bash
   bun --version
   node --version
   soltest --version
   ```

2. **Configuration**:
   ```bash
   cat soltest.config.js
   ```

3. **Error Details**:
   ```bash
   soltest command --verbose
   ```

4. **Steps to Reproduce**:
   - Clear steps to reproduce the issue
   - Expected vs actual behavior
   - Screenshots or error logs

### Quick Fixes

Common quick fixes:

```bash
# Clear cache
rm -rf node_modules
bun install

# Reset configuration
rm soltest.config.js
soltest init

# Clear build artifacts
rm -rf build
soltest compile

# Restart Ganache
pkill -f ganache
soltest test
```

---

If you're still experiencing issues after trying these solutions, please [create an issue](https://github.com/jeremiah-eth/SOLTEST-CLI/issues) with detailed information about your problem.
