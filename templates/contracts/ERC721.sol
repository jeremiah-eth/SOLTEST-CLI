// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title {{TOKEN_NAME}}
 * @dev ERC721 NFT implementation
 * @notice {{TOKEN_DESCRIPTION}}
 */
contract {{TOKEN_NAME}} {
    // State variables
    string public name;
    string public symbol;
    string public baseURI;
    uint256 public totalSupply;
    uint256 public maxSupply;
    
    // Mapping to store token ownership
    mapping(uint256 => address) public ownerOf;
    
    // Mapping to store token approvals
    mapping(uint256 => address) public getApproved;
    
    // Mapping to store operator approvals
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    
    // Mapping to store balance of each address
    mapping(address => uint256) public balanceOf;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    /**
     * @dev Constructor that initializes the NFT
     * @param _name The name of the NFT
     * @param _symbol The symbol of the NFT
     * @param _maxSupply The maximum supply of tokens
     * @param _baseURI The base URI for token metadata
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        string memory _baseURI
    ) {
        name = _name;
        symbol = _symbol;
        maxSupply = _maxSupply;
        baseURI = _baseURI;
    }
    
    /**
     * @dev Mints a new token to a specified address
     * @param to The address to mint the token to
     * @return tokenId The ID of the minted token
     */
    function mint(address to) public returns (uint256 tokenId) {
        require(to != address(0), "Mint to zero address");
        require(totalSupply < maxSupply, "Max supply reached");
        
        tokenId = totalSupply + 1;
        totalSupply++;
        
        ownerOf[tokenId] = to;
        balanceOf[to]++;
        
        emit Transfer(address(0), to, tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev Transfers a token from one address to another
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param tokenId The ID of the token to transfer
     */
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(ownerOf[tokenId] == from, "Not the owner");
        require(to != address(0), "Transfer to zero address");
        require(
            msg.sender == from || 
            msg.sender == getApproved[tokenId] || 
            isApprovedForAll[from][msg.sender],
            "Not authorized"
        );
        
        ownerOf[tokenId] = to;
        balanceOf[from]--;
        balanceOf[to]++;
        
        delete getApproved[tokenId];
        
        emit Transfer(from, to, tokenId);
    }
    
    /**
     * @dev Approves an address to transfer a specific token
     * @param to The address to approve
     * @param tokenId The ID of the token to approve
     */
    function approve(address to, uint256 tokenId) public {
        require(ownerOf[tokenId] == msg.sender, "Not the owner");
        
        getApproved[tokenId] = to;
        
        emit Approval(msg.sender, to, tokenId);
    }
    
    /**
     * @dev Sets approval for all tokens for an operator
     * @param operator The address to set approval for
     * @param approved Whether to approve or not
     */
    function setApprovalForAll(address operator, bool approved) public {
        isApprovedForAll[msg.sender][operator] = approved;
        
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    /**
     * @dev Burns a token
     * @param tokenId The ID of the token to burn
     */
    function burn(uint256 tokenId) public {
        require(ownerOf[tokenId] == msg.sender, "Not the owner");
        
        ownerOf[tokenId] = address(0);
        balanceOf[msg.sender]--;
        totalSupply--;
        
        delete getApproved[tokenId];
        
        emit Transfer(msg.sender, address(0), tokenId);
    }
    
    /**
     * @dev Returns the token URI for a given token ID
     * @param tokenId The ID of the token
     * @return The token URI
     */
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(ownerOf[tokenId] != address(0), "Token does not exist");
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }
    
    /**
     * @dev Returns the owner of a given token ID
     * @param tokenId The ID of the token
     * @return The owner address
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        require(ownerOf[tokenId] != address(0), "Token does not exist");
        return ownerOf[tokenId];
    }
}
