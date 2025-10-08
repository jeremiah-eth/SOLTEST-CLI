/**
 * {{TOKEN_NAME}} Contract Tests
 * Test suite for the {{TOKEN_NAME}} ERC20 token contract
 */

describe('{{TOKEN_NAME}} Contract', function() {
  let token;
  let tokenAddress;
  const initialSupply = web3.utils.toWei('{{INITIAL_SUPPLY}}', 'ether');
  
  // Deploy fresh contract before each test
  beforeEach(async function() {
    // Get compiled contract artifact
    const { loadArtifact } = await import('../src/utils.js');
    const artifact = loadArtifact('{{TOKEN_NAME}}');
    
    // Deploy contract with constructor arguments
    const contract = new Contract(artifact.abi);
    const deploy = contract.deploy({
      data: artifact.bytecode,
      arguments: ['{{TOKEN_NAME}}', '{{TOKEN_SYMBOL}}', 18, '{{INITIAL_SUPPLY}}']
    });
    
    // Deploy and get instance
    const instance = await deploy.send({
      from: accounts[0],
      gas: 2000000
    });
    
    token = instance;
    tokenAddress = instance.options.address;
  });
  
  describe('Deployment', function() {
    it('should deploy with correct initial supply', async function() {
      const totalSupply = await token.methods.totalSupply().call();
      expect(totalSupply).toBe(initialSupply);
    });
    
    it('should have correct name and symbol', async function() {
      const name = await token.methods.name().call();
      const symbol = await token.methods.symbol().call();
      
      expect(name).toEqual('{{TOKEN_NAME}}');
      expect(symbol).toEqual('{{TOKEN_SYMBOL}}');
    });
    
    it('should assign initial supply to deployer', async function() {
      const deployerBalance = await token.methods.balanceOf(accounts[0]).call();
      expect(deployerBalance).toBe(initialSupply);
    });
  });
  
  describe('Transfers', function() {
    it('should transfer tokens between accounts', async function() {
      const transferAmount = web3.utils.toWei('100', 'ether');
      
      // Transfer from accounts[0] to accounts[1]
      const receipt = await token.methods.transfer(accounts[1], transferAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('transfer', receipt);
      }
      
      // Check balances
      const balance0 = await token.methods.balanceOf(accounts[0]).call();
      const balance1 = await token.methods.balanceOf(accounts[1]).call();
      
      expect(balance1).toBe(transferAmount);
      expect(BigInt(balance0)).toBe(BigInt(initialSupply) - BigInt(transferAmount));
    });
    
    it('should emit Transfer event', async function() {
      const transferAmount = web3.utils.toWei('50', 'ether');
      
      const receipt = await token.methods.transfer(accounts[1], transferAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      expect(receipt.events.Transfer).toBeDefined();
      expect(receipt.events.Transfer.returnValues.from).toBe(accounts[0]);
      expect(receipt.events.Transfer.returnValues.to).toBe(accounts[1]);
      expect(receipt.events.Transfer.returnValues.value).toBe(transferAmount);
    });
    
    it('should fail transfer with insufficient balance', async function() {
      const excessiveAmount = web3.utils.toWei('2000000', 'ether'); // More than total supply
      
      try {
        await token.methods.transfer(accounts[1], excessiveAmount).send({
          from: accounts[0],
          gas: 100000
        });
        throw new Error('Transfer should have failed');
      } catch (error) {
        expect(error.message).toContain('revert');
      }
    });
  });
  
  describe('Approvals', function() {
    it('should approve spending', async function() {
      const approveAmount = web3.utils.toWei('1000', 'ether');
      
      const receipt = await token.methods.approve(accounts[1], approveAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('approve', receipt);
      }
      
      const allowance = await token.methods.allowance(accounts[0], accounts[1]).call();
      expect(allowance).toBe(approveAmount);
    });
    
    it('should emit Approval event', async function() {
      const approveAmount = web3.utils.toWei('500', 'ether');
      
      const receipt = await token.methods.approve(accounts[1], approveAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      expect(receipt.events.Approval).toBeDefined();
      expect(receipt.events.Approval.returnValues.owner).toBe(accounts[0]);
      expect(receipt.events.Approval.returnValues.spender).toBe(accounts[1]);
      expect(receipt.events.Approval.returnValues.value).toBe(approveAmount);
    });
  });
  
  describe('TransferFrom', function() {
    beforeEach(async function() {
      // Approve accounts[1] to spend tokens from accounts[0]
      const approveAmount = web3.utils.toWei('1000', 'ether');
      await token.methods.approve(accounts[1], approveAmount).send({
        from: accounts[0],
        gas: 100000
      });
    });
    
    it('should transferFrom with approval', async function() {
      const transferAmount = web3.utils.toWei('300', 'ether');
      
      const receipt = await token.methods.transferFrom(accounts[0], accounts[2], transferAmount).send({
        from: accounts[1],
        gas: 100000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('transferFrom', receipt);
      }
      
      const balance2 = await token.methods.balanceOf(accounts[2]).call();
      const allowance = await token.methods.allowance(accounts[0], accounts[1]).call();
      
      expect(balance2).toBe(transferAmount);
      expect(BigInt(allowance)).toBe(BigInt(web3.utils.toWei('700', 'ether'))); // 1000 - 300
    });
  });
  
  describe('Burn and Mint', function() {
    it('should burn tokens', async function() {
      const burnAmount = web3.utils.toWei('100', 'ether');
      const initialBalance = await token.methods.balanceOf(accounts[0]).call();
      const initialSupply = await token.methods.totalSupply().call();
      
      await token.methods.burn(burnAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      const finalBalance = await token.methods.balanceOf(accounts[0]).call();
      const finalSupply = await token.methods.totalSupply().call();
      
      expect(BigInt(finalBalance)).toBe(BigInt(initialBalance) - BigInt(burnAmount));
      expect(BigInt(finalSupply)).toBe(BigInt(initialSupply) - BigInt(burnAmount));
    });
    
    it('should mint new tokens', async function() {
      const mintAmount = web3.utils.toWei('1000', 'ether');
      const initialBalance = await token.methods.balanceOf(accounts[1]).call();
      const initialSupply = await token.methods.totalSupply().call();
      
      await token.methods.mint(accounts[1], mintAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      const finalBalance = await token.methods.balanceOf(accounts[1]).call();
      const finalSupply = await token.methods.totalSupply().call();
      
      expect(BigInt(finalBalance)).toBe(BigInt(initialBalance) + BigInt(mintAmount));
      expect(BigInt(finalSupply)).toBe(BigInt(initialSupply) + BigInt(mintAmount));
    });
  });
});
