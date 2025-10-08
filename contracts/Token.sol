// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Token
 * @dev A simple ERC20-like token contract for testing purposes
 * @notice This contract implements basic token functionality with transfer, approval, and allowance features
 */
contract Token {
    // State variables
    string public name;
    string public symbol;
    uint256 public totalSupply;
    
    // Mapping to store balances
    mapping(address => uint256) public balanceOf;
    
    // Mapping to store allowances (owner => spender => amount)
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    
    /**
     * @dev Constructor that initializes the token
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     * @param _initialSupply The initial supply of tokens
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
        
        // Emit initial transfer event
        emit Transfer(address(0), msg.sender, _initialSupply);
    }
    
    /**
     * @dev Transfers tokens from msg.sender to a specified address
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return success True if the transfer was successful
     */
    function transfer(address to, uint256 amount) public returns (bool success) {
        // Check for zero address
        require(to != address(0), "Transfer to zero address");
        
        // Check for sufficient balance
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        // Update balances
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        // Emit transfer event
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * @dev Approves a spender to spend tokens on behalf of the owner
     * @param spender The address to approve for spending
     * @param amount The amount of tokens to approve
     * @return success True if the approval was successful
     */
    function approve(address spender, uint256 amount) public returns (bool success) {
        // Check for zero address
        require(spender != address(0), "Approve to zero address");
        
        // Set allowance
        allowance[msg.sender][spender] = amount;
        
        // Emit approval event
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * @dev Transfers tokens from one address to another using allowance
     * @param from The address to transfer tokens from
     * @param to The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return success True if the transfer was successful
     */
    function transferFrom(address from, address to, uint256 amount) public returns (bool success) {
        // Check for zero addresses
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        
        // Check for sufficient balance
        require(balanceOf[from] >= amount, "Insufficient balance");
        
        // Check for sufficient allowance
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        // Update balances
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        // Update allowance
        allowance[from][msg.sender] -= amount;
        
        // Emit transfer event
        emit Transfer(from, to, amount);
        
        return true;
    }
}
