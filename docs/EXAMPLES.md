# Examples

Real-world examples and use cases for Soltest CLI.

## 📋 Table of Contents

- [Basic ERC20 Token Project](#basic-erc20-token-project)
- [NFT Collection with Metadata](#nft-collection-with-metadata)
- [Upgradeable Smart Contract](#upgradeable-smart-contract)
- [Multi-Network Deployment](#multi-network-deployment)
- [Custom Plugin Development](#custom-plugin-development)
- [CI/CD Integration](#cicd-integration)
- [Advanced Testing Scenarios](#advanced-testing-scenarios)

## Basic ERC20 Token Project

### Project Setup

```bash
# Initialize new project
soltest init

# Choose ERC20 Token when prompted
# Enter token details:
# - Name: MyToken
# - Symbol: MTK
# - Initial Supply: 1000000
# - Decimals: 18
```

### Project Structure

```
my-token-project/
├── contracts/
│   └── MyToken.sol
├── test/
│   └── MyToken.test.js
├── scripts/
│   └── deploy-mytoken.js
├── soltest.config.js
└── package.json
```

### Development Workflow

```bash
# 1. Compile contracts
soltest compile

# 2. Run tests
soltest test

# 3. Generate coverage report
soltest coverage --threshold 80

# 4. Deploy to local network
soltest deploy --contract MyToken --network local

# 5. Deploy to testnet
soltest deploy --contract MyToken --network sepolia
```

### Test File Example

```javascript
// test/MyToken.test.js
const { expect } = require('chai');
const { ethers } = require('ethers');

describe('MyToken', function() {
  let token;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function() {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory('MyToken');
    token = await Token.deploy();
    await token.deployed();
  });

  describe('Deployment', function() {
    it('Should set the right owner', async function() {
      expect(await token.owner()).to.equal(owner.address);
    });

    it('Should assign the total supply of tokens to the owner', async function() {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe('Transactions', function() {
    it('Should transfer tokens between accounts', async function() {
      await token.transfer(addr1.address, 50);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      await token.connect(addr1).transfer(addr2.address, 50);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(50);
    });

    it('Should fail if sender doesn\'t have enough tokens', async function() {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });
});
```

## NFT Collection with Metadata

### Contract Setup

```solidity
// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    string private _baseTokenURI;
    uint256 public maxSupply;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        string memory baseURI
    ) ERC721(name, symbol) {
        maxSupply = _maxSupply;
        _baseTokenURI = baseURI;
    }

    function mint(address to) public onlyOwner {
        require(_tokenIdCounter.current() < maxSupply, "Max supply reached");
        _tokenIdCounter.increment();
        _safeMint(to, _tokenIdCounter.current());
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
```

### Deployment and Testing

```bash
# Deploy NFT contract
soltest deploy --contract MyNFT --args "MyNFT,MNFT,10000,https://api.example.com/metadata/" --network sepolia

# Verify contract
soltest verify --contract MyNFT --address 0x123... --network sepolia --args "MyNFT,MNFT,10000,https://api.example.com/metadata/"
```

### Test Example

```javascript
// test/MyNFT.test.js
describe('MyNFT', function() {
  let nft;
  let owner;
  let addr1;

  beforeEach(async function() {
    [owner, addr1] = await ethers.getSigners();
    
    const NFT = await ethers.getContractFactory('MyNFT');
    nft = await NFT.deploy(
      'MyNFT',
      'MNFT',
      10000,
      'https://api.example.com/metadata/'
    );
    await nft.deployed();
  });

  it('Should mint NFT to address', async function() {
    await nft.mint(addr1.address);
    expect(await nft.ownerOf(1)).to.equal(addr1.address);
  });

  it('Should respect max supply', async function() {
    // Mint up to max supply
    for (let i = 0; i < 10000; i++) {
      await nft.mint(addr1.address);
    }
    
    await expect(nft.mint(addr1.address)).to.be.revertedWith('Max supply reached');
  });
});
```

## Upgradeable Smart Contract

### Transparent Proxy Setup

```solidity
// contracts/TokenV1.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenV1 is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

### Deploy and Upgrade

```bash
# 1. Deploy proxy contract
soltest deploy-proxy --contract TokenV1 --network sepolia --pattern transparent

# 2. Create new implementation (TokenV2.sol)
# Add new features to TokenV2

# 3. Upgrade proxy
soltest upgrade --proxy 0x123... --implementation TokenV2 --network sepolia
```

### UUPS Proxy Example

```solidity
// contracts/TokenV2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

contract TokenV2 is ERC20, Ownable, UUPSUpgradeable {
    function initialize() public initializer {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init();
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

## Multi-Network Deployment

### Configuration Setup

```javascript
// soltest.config.js
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
    },
    polygon: {
      url: 'https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 137
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: ['PRIVATE_KEY_FROM_ENV'],
      chainId: 56
    }
  }
};
```

### Deployment Script

```bash
# Deploy to multiple networks
soltest deploy --contract Token --network sepolia
soltest deploy --contract Token --network polygon
soltest deploy --contract Token --network bsc

# Verify on all networks
soltest verify --contract Token --address 0x123... --network sepolia
soltest verify --contract Token --address 0x456... --network polygon
soltest verify --contract Token --address 0x789... --network bsc
```

## Custom Plugin Development

### Plugin Structure

```
plugins/
└── my-custom-plugin/
    └── index.js
```

### Plugin Implementation

```javascript
// plugins/my-custom-plugin/index.js
export default {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'Custom plugin for advanced contract analysis',
  
  async init(cliAPI) {
    this.cliAPI = cliAPI;
    console.log('🔌 Custom Plugin initialized');
  },

  commands: {
    'analyze-gas': async (args) => {
      const contractPath = args.contract || './contracts/Token.sol';
      
      if (!this.cliAPI.exists(contractPath)) {
        throw new Error(`Contract file not found: ${contractPath}`);
      }

      const contractContent = this.cliAPI.readFile(contractPath);
      
      // Analyze gas usage patterns
      const gasAnalysis = {
        functions: (contractContent.match(/function\s+\w+/g) || []).length,
        loops: (contractContent.match(/for\s*\(/g) || []).length,
        storage: (contractContent.match(/mapping|struct|array/g) || []).length,
        events: (contractContent.match(/event\s+\w+/g) || []).length
      };

      console.log('📊 Gas Analysis Results:');
      console.log(`   Functions: ${gasAnalysis.functions}`);
      console.log(`   Loops: ${gasAnalysis.loops}`);
      console.log(`   Storage: ${gasAnalysis.storage}`);
      console.log(`   Events: ${gasAnalysis.events}`);

      return {
        success: true,
        analysis: gasAnalysis,
        message: 'Gas analysis completed'
      };
    },

    'deploy-with-verification': async (args) => {
      const contractName = args.contract;
      const network = args.network || 'sepolia';
      
      console.log(`🚀 Deploying ${contractName} to ${network}...`);
      
      // Deploy contract
      const deployer = await this.cliAPI.connect(this.cliAPI.getNetworkConfig(network).url);
      const accounts = await this.cliAPI.getAccounts();
      const artifact = this.cliAPI.loadArtifact(contractName);
      
      const result = await this.cliAPI.deploy(
        artifact.abi,
        artifact.bytecode,
        accounts[0],
        args.args || []
      );
      
      console.log(`✅ Contract deployed at: ${result.address}`);
      
      // Verify contract
      console.log('🔍 Verifying contract...');
      const verificationResult = await this.cliAPI.verify(
        result.address,
        network,
        args.args || [],
        { contractName, contractPath: `./contracts/${contractName}.sol` }
      );
      
      return {
        success: true,
        address: result.address,
        verification: verificationResult,
        message: 'Deployment and verification completed'
      };
    }
  },

  hooks: {
    beforeDeploy: async () => {
      console.log('🔌 [Custom Plugin] Pre-deployment analysis...');
    },
    
    afterDeploy: async () => {
      console.log('🔌 [Custom Plugin] Post-deployment verification...');
    }
  }
};
```

### Using the Plugin

```bash
# List plugins
soltest plugins --list

# Execute plugin commands
soltest analyze-gas --contract ./contracts/Token.sol
soltest deploy-with-verification --contract Token --network sepolia --args "MyToken,MTK,18"
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test-and-deploy.yml
name: Test and Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Compile contracts
      run: bun run compile
    
    - name: Run tests
      run: bun run test
    
    - name: Generate coverage
      run: bun run coverage
    
    - name: Security scan
      run: bun run scan --contract ./contracts/Token.sol --output json --save-report
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage.json

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Compile contracts
      run: bun run compile
    
    - name: Deploy to Sepolia
      run: bun run deploy --contract Token --network sepolia
      env:
        PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
        INFURA_API_KEY: ${{ secrets.INFURA_API_KEY }}
    
    - name: Verify contract
      run: bun run verify --contract Token --address ${{ steps.deploy.outputs.address }} --network sepolia
      env:
        ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
```

### Package.json Scripts

```json
{
  "scripts": {
    "compile": "soltest compile",
    "test": "soltest test",
    "test:watch": "soltest test --watch",
    "test:gas": "soltest test --gas",
    "coverage": "soltest coverage",
    "scan": "soltest scan --contract ./contracts/Token.sol",
    "deploy:local": "soltest deploy --contract Token --network local",
    "deploy:sepolia": "soltest deploy --contract Token --network sepolia",
    "verify": "soltest verify --contract Token --address $CONTRACT_ADDRESS --network sepolia"
  }
}
```

## Advanced Testing Scenarios

### Gas Optimization Testing

```javascript
// test/GasOptimization.test.js
describe('Gas Optimization', function() {
  let token;
  let owner;
  let addr1;

  beforeEach(async function() {
    [owner, addr1] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy();
    await token.deployed();
  });

  it('Should optimize transfer gas usage', async function() {
    const tx = await token.transfer(addr1.address, 100);
    const receipt = await tx.wait();
    
    console.log(`Transfer gas used: ${receipt.gasUsed.toString()}`);
    expect(receipt.gasUsed).to.be.lessThan(100000);
  });

  it('Should batch operations efficiently', async function() {
    const batchSize = 10;
    const batchTx = await token.batchTransfer(
      Array(batchSize).fill(addr1.address),
      Array(batchSize).fill(100)
    );
    const receipt = await batchTx.wait();
    
    const gasPerTransfer = receipt.gasUsed.div(batchSize);
    console.log(`Batch gas per transfer: ${gasPerTransfer.toString()}`);
    expect(gasPerTransfer).to.be.lessThan(50000);
  });
});
```

### Stress Testing

```javascript
// test/StressTest.test.js
describe('Stress Testing', function() {
  let token;
  let accounts;

  beforeEach(async function() {
    accounts = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy();
    await token.deployed();
  });

  it('Should handle large number of transfers', async function() {
    const numTransfers = 1000;
    const promises = [];
    
    for (let i = 0; i < numTransfers; i++) {
      promises.push(
        token.transfer(accounts[i % accounts.length].address, 1)
      );
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).to.be.greaterThan(numTransfers * 0.95);
  });

  it('Should handle concurrent operations', async function() {
    const concurrentOps = 50;
    const promises = [];
    
    for (let i = 0; i < concurrentOps; i++) {
      promises.push(
        token.mint(accounts[i % accounts.length].address, 1000)
      );
    }
    
    await expect(Promise.all(promises)).to.not.be.reverted;
  });
});
```

### Integration Testing

```javascript
// test/Integration.test.js
describe('Integration Tests', function() {
  let token;
  let nft;
  let marketplace;
  let owner;
  let buyer;
  let seller;

  beforeEach(async function() {
    [owner, buyer, seller] = await ethers.getSigners();
    
    // Deploy all contracts
    const Token = await ethers.getContractFactory('Token');
    token = await Token.deploy();
    await token.deployed();
    
    const NFT = await ethers.getContractFactory('NFT');
    nft = await NFT.deploy();
    await nft.deployed();
    
    const Marketplace = await ethers.getContractFactory('Marketplace');
    marketplace = await Marketplace.deploy(token.address, nft.address);
    await marketplace.deployed();
  });

  it('Should complete full marketplace flow', async function() {
    // 1. Mint NFT to seller
    await nft.mint(seller.address, 1);
    
    // 2. Seller lists NFT for sale
    await nft.connect(seller).approve(marketplace.address, 1);
    await marketplace.connect(seller).listItem(1, ethers.utils.parseEther('1'));
    
    // 3. Buyer purchases NFT
    await token.mint(buyer.address, ethers.utils.parseEther('10'));
    await token.connect(buyer).approve(marketplace.address, ethers.utils.parseEther('1'));
    await marketplace.connect(buyer).buyItem(1);
    
    // 4. Verify ownership transfer
    expect(await nft.ownerOf(1)).to.equal(buyer.address);
    expect(await token.balanceOf(seller.address)).to.equal(ethers.utils.parseEther('1'));
  });
});
```

---

These examples demonstrate the power and flexibility of Soltest CLI for various smart contract development scenarios. For more advanced usage patterns, check out the [API Documentation](./API.md) and [Plugin Development](./PLUGINS.md) guides.
