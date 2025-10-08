// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../proxies/UUPSProxy.sol";

/**
 * @title UpgradeableToken
 * @dev UUPS upgradeable ERC20 token implementation
 * This contract can be upgraded using the UUPS proxy pattern
 */
contract UpgradeableToken is UUPSUpgradeable {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "UpgradeableToken: caller is not owner");
        _;
    }
    
    // This function is called during proxy initialization
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) external {
        require(bytes(name).length == 0, "UpgradeableToken: already initialized");
        
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply;
        owner = msg.sender;
        
        balanceOf[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "UpgradeableToken: transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "UpgradeableToken: insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(to != address(0), "UpgradeableToken: transfer to zero address");
        require(balanceOf[from] >= amount, "UpgradeableToken: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "UpgradeableToken: insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "UpgradeableToken: mint to zero address");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "UpgradeableToken: insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "UpgradeableToken: new owner is zero address");
        
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // UUPS upgrade authorization
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Add any additional authorization logic here
        // For example, check if the new implementation is valid
        require(newImplementation != address(0), "UpgradeableToken: new implementation is zero address");
    }
    
    // Version function for upgrade tracking
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}
