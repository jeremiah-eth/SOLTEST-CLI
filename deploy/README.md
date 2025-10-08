# Deployment Scripts

This directory contains deployment scripts that are executed in order by the soltest CLI.

## Script Structure

Each deployment script should:

1. Export a default async function
2. Accept a context object with `deployer`, `accounts`, `network`, and `deployedContracts`
3. Return deployment result information

## Example Script

```javascript
export default async function({ deployer, accounts, network, deployedContracts }) {
  console.log('🚀 Deploying MyContract...');
  
  // Deploy contract
  const contract = await deployer.deploy('MyContract', [
    'arg1',
    'arg2',
    1000
  ]);
  
  console.log('✅ Contract deployed at:', contract.address);
  
  // Return contract info for tracking
  return {
    name: 'MyContract',
    address: contract.address,
    transactionHash: contract.transactionHash
  };
}
```

## Script Naming

Scripts are executed in alphabetical order. Use numbered prefixes to control execution order:

- `001_deploy_token.js` - Deploy Token contract first
- `002_deploy_factory.js` - Deploy Factory contract second
- `003_upgrade_token.js` - Upgrade Token contract third

## Context Object

Each script receives a context object with:

- `deployer` - Deployer instance for contract deployment
- `accounts` - Array of available accounts
- `network` - Current network name
- `deployedContracts` - Previously deployed contracts

## Deployment State

The deployment manager automatically:

- Tracks deployed contract addresses
- Saves deployment state to `./deployments/{network}.json`
- Loads existing state on subsequent runs
- Provides deployment history

## Usage

Run deployment scripts with:

```bash
# Deploy to local network
soltest deploy-script --network local

# Deploy to specific network with verification
soltest deploy-script --network sepolia --verify

# Clear existing state and redeploy
soltest deploy-script --network local --clear

# Use custom scripts directory
soltest deploy-script --dir ./my-deploy-scripts
```

## Advanced Features

### Upgradeable Contracts

For upgradeable contracts, store proxy addresses and implementation addresses:

```javascript
export default async function({ deployer, accounts, network, deployedContracts }) {
  // Deploy implementation
  const implementation = await deployer.deploy('TokenV2', []);
  
  // Deploy proxy
  const proxy = await deployer.deploy('Proxy', [implementation.address]);
  
  return {
    name: 'TokenProxy',
    address: proxy.address,
    transactionHash: proxy.transactionHash,
    implementation: implementation.address
  };
}
```

### Dependency Management

Access previously deployed contracts:

```javascript
export default async function({ deployer, accounts, network, deployedContracts }) {
  // Get previously deployed Token
  const tokenAddress = deployedContracts.Token?.address;
  if (!tokenAddress) {
    throw new Error('Token contract not found. Deploy Token first.');
  }
  
  // Deploy contract that depends on Token
  const factory = await deployer.deploy('Factory', [tokenAddress]);
  
  return {
    name: 'Factory',
    address: factory.address,
    transactionHash: factory.transactionHash
  };
}
```

### Error Handling

Scripts can handle errors gracefully:

```javascript
export default async function({ deployer, accounts, network, deployedContracts }) {
  try {
    const contract = await deployer.deploy('MyContract', []);
    return {
      name: 'MyContract',
      address: contract.address,
      transactionHash: contract.transactionHash
    };
  } catch (error) {
    console.error('Deployment failed:', error.message);
    // Return null to skip this deployment
    return null;
  }
}
```
