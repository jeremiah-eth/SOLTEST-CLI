// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BeaconProxy
 * @dev Beacon proxy pattern implementation
 * Multiple proxies share a single beacon contract that holds the implementation
 */

contract BeaconProxy {
    bytes32 private constant BEACON_SLOT = keccak256("org.openzeppelin.proxy.beacon");

    constructor(address beacon, bytes memory data) {
        _setBeacon(beacon);
        
        if (data.length > 0) {
            (bool success,) = _implementation().delegatecall(data);
            require(success, "BeaconProxy: initialization failed");
        }
    }

    function _getBeacon() internal view returns (address) {
        return StorageSlot.getAddressSlot(BEACON_SLOT).value;
    }

    function _setBeacon(address newBeacon) internal {
        require(newBeacon != address(0), "BeaconProxy: beacon is zero address");
        StorageSlot.getAddressSlot(BEACON_SLOT).value = newBeacon;
    }

    function _implementation() internal view returns (address) {
        address beacon = _getBeacon();
        (bool success, bytes memory returndata) = beacon.staticcall("");
        require(success, "BeaconProxy: beacon call failed");
        return abi.decode(returndata, (address));
    }

    function getBeacon() external view returns (address) {
        return _getBeacon();
    }

    function getImplementation() external view returns (address) {
        return _implementation();
    }

    fallback() external payable {
        address implementation = _implementation();
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
 * @title UpgradeableBeacon
 * @dev Beacon contract that holds the implementation address
 * Can be upgraded to point to a new implementation
 */
contract UpgradeableBeacon {
    address private _implementation;
    address private _owner;

    event ImplementationChanged(address indexed previousImplementation, address indexed newImplementation);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == _owner, "UpgradeableBeacon: caller is not owner");
        _;
    }

    constructor(address implementation) {
        _implementation = implementation;
        _owner = msg.sender;
    }

    function implementation() external view returns (address) {
        return _implementation;
    }

    function owner() external view returns (address) {
        return _owner;
    }

    function upgradeTo(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "UpgradeableBeacon: new implementation is zero address");
        address previousImplementation = _implementation;
        _implementation = newImplementation;
        emit ImplementationChanged(previousImplementation, newImplementation);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "UpgradeableBeacon: new owner is zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
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
