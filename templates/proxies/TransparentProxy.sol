// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TransparentProxy
 * @dev Transparent proxy pattern implementation
 * This proxy delegates all calls to an implementation contract
 * and handles admin functions separately
 */

contract TransparentProxy {
    bytes32 private constant ADMIN_SLOT = keccak256("org.openzeppelin.proxy.admin");
    bytes32 private constant IMPLEMENTATION_SLOT = keccak256("org.openzeppelin.proxy.implementation");

    event AdminChanged(address indexed previousAdmin, address indexed newAdmin);
    event ImplementationChanged(address indexed previousImplementation, address indexed newImplementation);

    constructor(address implementation, bytes memory data) {
        _setImplementation(implementation);
        _setAdmin(msg.sender);
        
        if (data.length > 0) {
            (bool success,) = implementation.delegatecall(data);
            require(success, "TransparentProxy: initialization failed");
        }
    }

    modifier onlyAdmin() {
        require(msg.sender == _getAdmin(), "TransparentProxy: caller is not admin");
        _;
    }

    function _getAdmin() internal view returns (address) {
        return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }

    function _setAdmin(address newAdmin) internal {
        emit AdminChanged(_getAdmin(), newAdmin);
        StorageSlot.getAddressSlot(ADMIN_SLOT).value = newAdmin;
    }

    function _getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }

    function _setImplementation(address newImplementation) internal {
        emit ImplementationChanged(_getImplementation(), newImplementation);
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }

    function changeAdmin(address newAdmin) external onlyAdmin {
        _setAdmin(newAdmin);
    }

    function upgradeTo(address newImplementation) external onlyAdmin {
        _setImplementation(newImplementation);
    }

    function upgradeToAndCall(address newImplementation, bytes calldata data) external onlyAdmin {
        _setImplementation(newImplementation);
        if (data.length > 0) {
            (bool success,) = newImplementation.delegatecall(data);
            require(success, "TransparentProxy: upgrade call failed");
        }
    }

    function getAdmin() external view returns (address) {
        return _getAdmin();
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
