// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title {{TOKEN_NAME}}
 * @dev ERC20 Token implementation
 * @notice {{TOKEN_DESCRIPTION}}
 */
contract {{TOKEN_NAME}} {
    // State variables
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    // Mapping to store balances
    mapping(address => uint256) public balanceOf;
    
    // Mapping to store allowances (owner => spender => amount)
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    /**
     * @dev Constructor that initializes the token
     * @param _name The name of the token
     * @param _symbol The symbol of the token
     * @param _decimals The number of decimals
     * @param _initialSupply The initial supply of tokens
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _initialSupply * 10**_decimals;
        balanceOf[msg.sender] = totalSupply;
        
        // Emit initial transfer event
        emit Transfer(address(0), msg.sender, totalSupply);
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
    
    /**
     * @dev Burns tokens from the caller's balance
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) public {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance to burn");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
    }
    
    /**
     * @dev Mints new tokens to a specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public {
        require(to != address(0), "Mint to zero address");
        
        balanceOf[to] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), to, amount);
    }
}
