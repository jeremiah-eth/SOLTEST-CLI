# Upgradeable Contract Templates

This directory contains proxy pattern templates for creating upgradeable smart contracts.

## Supported Proxy Patterns

### 1. Transparent Proxy Pattern
- **File**: `TransparentProxy.sol`
- **Use Case**: Most common pattern, admin and implementation are separate
- **Features**: 
  - Admin can upgrade implementation
  - Admin can change admin
  - Clear separation of concerns
- **Gas Cost**: Higher due to admin checks

### 2. UUPS Proxy Pattern
- **File**: `UUPSProxy.sol`
- **Use Case**: Implementation contract handles upgrades
- **Features**:
  - Implementation contract controls upgrades
  - More gas efficient
  - Requires careful implementation
- **Gas Cost**: Lower than transparent proxy

### 3. Beacon Proxy Pattern
- **File**: `BeaconProxy.sol`
- **Use Case**: Multiple proxies share one beacon
- **Features**:
  - Single beacon controls multiple proxies
  - Efficient for factory patterns
  - All proxies upgrade together
- **Gas Cost**: Very efficient for multiple proxies

## Usage Examples

### Deploying a Transparent Proxy

```bash
# Deploy Token with transparent proxy
soltest deploy-proxy --contract Token --args "MyToken,MTK,18,1000000" --pattern transparent --network local
```

### Deploying a UUPS Proxy

```bash
# Deploy UpgradeableToken with UUPS proxy
soltest deploy-proxy --contract UpgradeableToken --args "MyToken,MTK,18,1000000" --pattern uups --network sepolia
```

### Upgrading a Proxy

```bash
# Upgrade proxy to new implementation
soltest upgrade --proxy 0x1234... --implementation UpgradeableTokenV2 --network sepolia
```

## Implementation Guidelines

### For Transparent Proxy
```solidity
// Your implementation contract
contract MyContract {
    // Implementation logic
    // No special requirements
}
```

### For UUPS Proxy
```solidity
// Your implementation must inherit from UUPSUpgradeable
contract MyContract is UUPSUpgradeable {
    // Implementation logic
    
    function _authorizeUpgrade(address newImplementation) internal override {
        // Add authorization logic
        require(msg.sender == owner, "Only owner can upgrade");
    }
}
```

### For Beacon Proxy
```solidity
// Your implementation contract
contract MyContract {
    // Implementation logic
    // No special requirements
}

// Deploy beacon separately
contract UpgradeableBeacon {
    // Beacon logic
}
```

## Best Practices

1. **Storage Layout**: Never change storage layout between upgrades
2. **Initialization**: Use `initialize()` instead of constructor for proxy contracts
3. **Authorization**: Implement proper upgrade authorization
4. **Testing**: Always test upgrades on testnets first
5. **Validation**: Use storage layout validation tools

## Security Considerations

- **Storage Collisions**: Avoid storage layout conflicts
- **Authorization**: Implement proper access controls
- **Initialization**: Prevent re-initialization attacks
- **Upgrade Safety**: Validate new implementations thoroughly

## Gas Optimization

- **UUPS**: Most gas efficient for single contracts
- **Beacon**: Most efficient for multiple contracts
- **Transparent**: Most secure but higher gas cost

## Common Patterns

### Factory with Beacon
```solidity
contract TokenFactory {
    UpgradeableBeacon public beacon;
    
    function createToken() external returns (address) {
        // Deploy new beacon proxy
        return address(new BeaconProxy(address(beacon), ""));
    }
}
```

### Upgrade with Validation
```solidity
contract UpgradeableContract is UUPSUpgradeable {
    function _authorizeUpgrade(address newImplementation) internal override {
        require(msg.sender == owner, "Unauthorized");
        require(newImplementation != address(0), "Invalid implementation");
        // Add additional validation
    }
}
```

## Troubleshooting

### Common Issues

1. **Storage Layout Conflicts**
   - Solution: Never change storage order
   - Use storage gaps for future variables

2. **Initialization Issues**
   - Solution: Use `initialize()` instead of constructor
   - Prevent re-initialization

3. **Authorization Failures**
   - Solution: Check upgrade authorization logic
   - Verify caller permissions

4. **Proxy Detection Issues**
   - Solution: Ensure proxy contracts are properly deployed
   - Check proxy pattern compatibility
