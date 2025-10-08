/**
 * {{TOKEN_NAME}} Contract Tests
 * Test suite for the {{TOKEN_NAME}} ERC721 NFT contract
 */

describe('{{TOKEN_NAME}} Contract', function() {
  let nft;
  let nftAddress;
  const baseURI = 'https://api.example.com/metadata/';
  
  // Deploy fresh contract before each test
  beforeEach(async function() {
    // Get compiled contract artifact
    const { loadArtifact } = await import('../src/utils.js');
    const artifact = loadArtifact('{{TOKEN_NAME}}');
    
    // Deploy contract with constructor arguments
    const contract = new Contract(artifact.abi);
    const deploy = contract.deploy({
      data: artifact.bytecode,
      arguments: ['{{TOKEN_NAME}}', '{{TOKEN_SYMBOL}}', {{MAX_SUPPLY}}, baseURI]
    });
    
    // Deploy and get instance
    const instance = await deploy.send({
      from: accounts[0],
      gas: 2000000
    });
    
    nft = instance;
    nftAddress = instance.options.address;
  });
  
  describe('Deployment', function() {
    it('should deploy with correct initial values', async function() {
      const name = await nft.methods.name().call();
      const symbol = await nft.methods.symbol().call();
      const maxSupply = await nft.methods.maxSupply().call();
      const totalSupply = await nft.methods.totalSupply().call();
      
      expect(name).toEqual('{{TOKEN_NAME}}');
      expect(symbol).toEqual('{{TOKEN_SYMBOL}}');
      expect(maxSupply).toBe('{{MAX_SUPPLY}}');
      expect(totalSupply).toBe('0');
    });
  });
  
  describe('Minting', function() {
    it('should mint a new token', async function() {
      const receipt = await nft.methods.mint(accounts[0]).send({
        from: accounts[0],
        gas: 200000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('mint', receipt);
      }
      
      const tokenId = receipt.events.Transfer.returnValues.tokenId;
      const owner = await nft.methods.ownerOf(tokenId).call();
      const totalSupply = await nft.methods.totalSupply().call();
      
      expect(owner).toBe(accounts[0]);
      expect(totalSupply).toBe('1');
    });
    
    it('should emit Transfer event on mint', async function() {
      const receipt = await nft.methods.mint(accounts[0]).send({
        from: accounts[0],
        gas: 200000
      });
      
      expect(receipt.events.Transfer).toBeDefined();
      expect(receipt.events.Transfer.returnValues.from).toBe('0x0000000000000000000000000000000000000000');
      expect(receipt.events.Transfer.returnValues.to).toBe(accounts[0]);
    });
    
    it('should fail to mint beyond max supply', async function() {
      // Mint up to max supply
      for (let i = 0; i < {{MAX_SUPPLY}}; i++) {
        await nft.methods.mint(accounts[0]).send({
          from: accounts[0],
          gas: 200000
        });
      }
      
      // Try to mint one more
      try {
        await nft.methods.mint(accounts[0]).send({
          from: accounts[0],
          gas: 200000
        });
        throw new Error('Mint should have failed');
      } catch (error) {
        expect(error.message).toContain('revert');
      }
    });
  });
  
  describe('Transfers', function() {
    let tokenId;
    
    beforeEach(async function() {
      // Mint a token for testing
      const receipt = await nft.methods.mint(accounts[0]).send({
        from: accounts[0],
        gas: 200000
      });
      tokenId = receipt.events.Transfer.returnValues.tokenId;
    });
    
    it('should transfer token between accounts', async function() {
      const receipt = await nft.methods.transferFrom(accounts[0], accounts[1], tokenId).send({
        from: accounts[0],
        gas: 200000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('transferFrom', receipt);
      }
      
      const newOwner = await nft.methods.ownerOf(tokenId).call();
      expect(newOwner).toBe(accounts[1]);
    });
    
    it('should emit Transfer event on transfer', async function() {
      const receipt = await nft.methods.transferFrom(accounts[0], accounts[1], tokenId).send({
        from: accounts[0],
        gas: 200000
      });
      
      expect(receipt.events.Transfer).toBeDefined();
      expect(receipt.events.Transfer.returnValues.from).toBe(accounts[0]);
      expect(receipt.events.Transfer.returnValues.to).toBe(accounts[1]);
      expect(receipt.events.Transfer.returnValues.tokenId).toBe(tokenId);
    });
    
    it('should fail transfer without authorization', async function() {
      try {
        await nft.methods.transferFrom(accounts[0], accounts[1], tokenId).send({
          from: accounts[2], // Not authorized
          gas: 200000
        });
        throw new Error('Transfer should have failed');
      } catch (error) {
        expect(error.message).toContain('revert');
      }
    });
  });
  
  describe('Approvals', function() {
    let tokenId;
    
    beforeEach(async function() {
      // Mint a token for testing
      const receipt = await nft.methods.mint(accounts[0]).send({
        from: accounts[0],
        gas: 200000
      });
      tokenId = receipt.events.Transfer.returnValues.tokenId;
    });
    
    it('should approve address for token', async function() {
      const receipt = await nft.methods.approve(accounts[1], tokenId).send({
        from: accounts[0],
        gas: 200000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('approve', receipt);
      }
      
      const approved = await nft.methods.getApproved(tokenId).call();
      expect(approved).toBe(accounts[1]);
    });
    
    it('should emit Approval event', async function() {
      const receipt = await nft.methods.approve(accounts[1], tokenId).send({
        from: accounts[0],
        gas: 200000
      });
      
      expect(receipt.events.Approval).toBeDefined();
      expect(receipt.events.Approval.returnValues.owner).toBe(accounts[0]);
      expect(receipt.events.Approval.returnValues.approved).toBe(accounts[1]);
      expect(receipt.events.Approval.returnValues.tokenId).toBe(tokenId);
    });
    
    it('should set approval for all', async function() {
      const receipt = await nft.methods.setApprovalForAll(accounts[1], true).send({
        from: accounts[0],
        gas: 200000
      });
      
      const isApproved = await nft.methods.isApprovedForAll(accounts[0], accounts[1]).call();
      expect(isApproved).toBe(true);
    });
  });
  
  describe('Burning', function() {
    let tokenId;
    
    beforeEach(async function() {
      // Mint a token for testing
      const receipt = await nft.methods.mint(accounts[0]).send({
        from: accounts[0],
        gas: 200000
      });
      tokenId = receipt.events.Transfer.returnValues.tokenId;
    });
    
    it('should burn token', async function() {
      const initialSupply = await nft.methods.totalSupply().call();
      const initialBalance = await nft.methods.balanceOf(accounts[0]).call();
      
      const receipt = await nft.methods.burn(tokenId).send({
        from: accounts[0],
        gas: 200000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('burn', receipt);
      }
      
      const finalSupply = await nft.methods.totalSupply().call();
      const finalBalance = await nft.methods.balanceOf(accounts[0]).call();
      
      expect(BigInt(finalSupply)).toBe(BigInt(initialSupply) - BigInt(1));
      expect(BigInt(finalBalance)).toBe(BigInt(initialBalance) - BigInt(1));
    });
    
    it('should emit Transfer event on burn', async function() {
      const receipt = await nft.methods.burn(tokenId).send({
        from: accounts[0],
        gas: 200000
      });
      
      expect(receipt.events.Transfer).toBeDefined();
      expect(receipt.events.Transfer.returnValues.from).toBe(accounts[0]);
      expect(receipt.events.Transfer.returnValues.to).toBe('0x0000000000000000000000000000000000000000');
      expect(receipt.events.Transfer.returnValues.tokenId).toBe(tokenId);
    });
  });
  
  describe('Metadata', function() {
    let tokenId;
    
    beforeEach(async function() {
      // Mint a token for testing
      const receipt = await nft.methods.mint(accounts[0]).send({
        from: accounts[0],
        gas: 200000
      });
      tokenId = receipt.events.Transfer.returnValues.tokenId;
    });
    
    it('should return correct token URI', async function() {
      const tokenURI = await nft.methods.tokenURI(tokenId).call();
      const expectedURI = baseURI + tokenId;
      expect(tokenURI).toBe(expectedURI);
    });
  });
});
