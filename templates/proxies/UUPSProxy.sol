// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UUPSProxy
 * @dev Universal Upgradeable Proxy Standard (UUPS) implementation
 * The upgrade authorization is handled by the implementation contract
 */

contract UUPSProxy {
    bytes32 private constant IMPLEMENTATION_SLOT = keccak256("org.openzeppelin.proxy.implementation");

    event ImplementationChanged(address indexed previousImplementation, address indexed newImplementation);

    constructor(address implementation, bytes memory data) {
        _setImplementation(implementation);
        
        if (data.length > 0) {
            (bool success,) = implementation.delegatecall(data);
            require(success, "UUPSProxy: initialization failed");
        }
    }

    function _getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }

    function _setImplementation(address newImplementation) internal {
        emit ImplementationChanged(_getImplementation(), newImplementation);
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }

    function getImplementation() external view returns (address) {
        return _getImplementation();
    }

    fallback() external payable {
        address implementation = _getImplementation();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}

/**
 * @title UUPSUpgradeable
 * @dev Base contract for UUPS upgradeable contracts
 * The implementation contract must inherit from this
 */
abstract contract UUPSUpgradeable {
    function _authorizeUpgrade(address newImplementation) internal virtual;
    
    modifier onlyProxy() {
        require(address(this) != __self, "UUPSUpgradeable: must not be called through delegatecall");
        _;
    }
    
    modifier notDelegated() {
        require(address(this) == __self, "UUPSUpgradeable: must not be called through delegatecall");
        _;
    }
    
    function __self = address(this);
    
    function upgradeTo(address newImplementation) external virtual onlyProxy {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCall(newImplementation, new bytes(0), false);
    }
    
    function upgradeToAndCall(address newImplementation, bytes memory data) external virtual onlyProxy {
        _authorizeUpgrade(newImplementation);
        _upgradeToAndCall(newImplementation, data, true);
    }
    
    function _upgradeToAndCall(address newImplementation, bytes memory data, bool forceCall) internal {
        _setImplementation(newImplementation);
        if (data.length > 0 || forceCall) {
            (bool success,) = newImplementation.delegatecall(data);
            require(success, "UUPSUpgradeable: upgrade call failed");
        }
    }
    
    function _setImplementation(address newImplementation) internal {
        require(newImplementation != address(0), "UUPSUpgradeable: new implementation is zero address");
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }
    
    bytes32 private constant IMPLEMENTATION_SLOT = keccak256("org.openzeppelin.proxy.implementation");
}

/**
 * @title StorageSlot
 * @dev Library for reading and writing primitive types to specific storage slots
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly {
            r.slot := slot
        }
    }
}
