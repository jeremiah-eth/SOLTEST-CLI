// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../proxies/UUPSProxy.sol";

/**
 * @title UpgradeableTokenV2
 * @dev Upgraded version of UpgradeableToken with additional features
 * This contract demonstrates how to upgrade a UUPS proxy implementation
 */
contract UpgradeableTokenV2 is UUPSUpgradeable {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    address public owner;
    
    // New features in V2
    uint256 public maxSupply;
    bool public transfersPaused;
    mapping(address => bool) public blacklisted;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event TransfersPaused(address account);
    event TransfersUnpaused(address account);
    event BlacklistUpdated(address indexed account, bool isBlacklisted);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "UpgradeableTokenV2: caller is not owner");
        _;
    }
    
    modifier whenNotPaused() {
        require(!transfersPaused, "UpgradeableTokenV2: transfers are paused");
        _;
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "UpgradeableTokenV2: account is blacklisted");
        _;
    }
    
    // This function is called during proxy initialization
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply,
        uint256 _maxSupply
    ) external {
        require(bytes(name).length == 0, "UpgradeableTokenV2: already initialized");
        
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply;
        maxSupply = _maxSupply;
        owner = msg.sender;
        
        balanceOf[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }
    
    function transfer(address to, uint256 amount) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(to) returns (bool) {
        require(to != address(0), "UpgradeableTokenV2: transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "UpgradeableTokenV2: insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(spender) returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external whenNotPaused notBlacklisted(from) notBlacklisted(to) returns (bool) {
        require(to != address(0), "UpgradeableTokenV2: transfer to zero address");
        require(balanceOf[from] >= amount, "UpgradeableTokenV2: insufficient balance");
        require(allowance[from][msg.sender] >= amount, "UpgradeableTokenV2: insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "UpgradeableTokenV2: mint to zero address");
        require(totalSupply + amount <= maxSupply, "UpgradeableTokenV2: would exceed max supply");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "UpgradeableTokenV2: insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "UpgradeableTokenV2: new owner is zero address");
        
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // New V2 functions
    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
        emit TransfersPaused(msg.sender);
    }
    
    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
        emit TransfersUnpaused(msg.sender);
    }
    
    function setBlacklist(address account, bool isBlacklisted) external onlyOwner {
        blacklisted[account] = isBlacklisted;
        emit BlacklistUpdated(account, isBlacklisted);
    }
    
    function setMaxSupply(uint256 newMaxSupply) external onlyOwner {
        require(newMaxSupply >= totalSupply, "UpgradeableTokenV2: max supply too low");
        maxSupply = newMaxSupply;
    }
    
    // UUPS upgrade authorization
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        // Add any additional authorization logic here
        require(newImplementation != address(0), "UpgradeableTokenV2: new implementation is zero address");
    }
    
    // Version function for upgrade tracking
    function version() external pure returns (string memory) {
        return "2.0.0";
    }
}
