/**
 * Token Contract Tests
 * Test suite for the Token contract using Mocha
 */

describe('Token Contract', function() {
  let token;
  let tokenAddress;
  const initialSupply = web3.utils.toWei('1000000', 'ether');
  
  // Deploy fresh contract before each test
  beforeEach(async function() {
    // Get compiled contract artifact
    const { loadArtifact } = await import('../src/utils.js');
    const artifact = loadArtifact('Token');
    
    // Deploy contract with constructor arguments
    const contract = new Contract(artifact.abi);
    const deploy = contract.deploy({
      data: artifact.bytecode,
      arguments: ['Test Token', 'TEST', initialSupply]
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
      
      expect(name).toEqual('Test Token');
      expect(symbol).toEqual('TEST');
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
    
    it('should update balances after transfer', async function() {
      const transferAmount = web3.utils.toWei('500', 'ether');
      const initialBalance0 = await token.methods.balanceOf(accounts[0]).call();
      const initialBalance1 = await token.methods.balanceOf(accounts[1]).call();
      
      const receipt = await token.methods.transfer(accounts[1], transferAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      // Track gas usage if available
      if (typeof global.trackGas === 'function') {
        global.trackGas('transfer', receipt);
      }
      
      const finalBalance0 = await token.methods.balanceOf(accounts[0]).call();
      const finalBalance1 = await token.methods.balanceOf(accounts[1]).call();
      
      expect(BigInt(finalBalance0)).toBe(BigInt(initialBalance0) - BigInt(transferAmount));
      expect(BigInt(finalBalance1)).toBe(BigInt(initialBalance1) + BigInt(transferAmount));
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
      expect(receipt.events.Transfer.returnValues.amount).toBe(transferAmount);
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
    
    it('should fail transfer to zero address', async function() {
      const transferAmount = web3.utils.toWei('100', 'ether');
      
      try {
        await token.methods.transfer('0x0000000000000000000000000000000000000000', transferAmount).send({
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
      expect(receipt.events.Approval.returnValues.amount).toBe(approveAmount);
    });
    
    it('should fail approval to zero address', async function() {
      const approveAmount = web3.utils.toWei('100', 'ether');
      
      try {
        await token.methods.approve('0x0000000000000000000000000000000000000000', approveAmount).send({
          from: accounts[0],
          gas: 100000
        });
        throw new Error('Approval should have failed');
      } catch (error) {
        expect(error.message).toContain('revert');
      }
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
      
      await token.methods.transferFrom(accounts[0], accounts[2], transferAmount).send({
        from: accounts[1],
        gas: 100000
      });
      
      const balance2 = await token.methods.balanceOf(accounts[2]).call();
      const allowance = await token.methods.allowance(accounts[0], accounts[1]).call();
      
      expect(balance2).toBe(transferAmount);
      expect(BigInt(allowance)).toBe(BigInt(web3.utils.toWei('700', 'ether'))); // 1000 - 300
    });
    
    it('should emit Transfer event for transferFrom', async function() {
      const transferAmount = web3.utils.toWei('200', 'ether');
      
      const receipt = await token.methods.transferFrom(accounts[0], accounts[2], transferAmount).send({
        from: accounts[1],
        gas: 100000
      });
      
      expect(receipt.events.Transfer).toBeDefined();
      expect(receipt.events.Transfer.returnValues.from).toBe(accounts[0]);
      expect(receipt.events.Transfer.returnValues.to).toBe(accounts[2]);
      expect(receipt.events.Transfer.returnValues.amount).toBe(transferAmount);
    });
    
    it('should fail transferFrom with insufficient allowance', async function() {
      const excessiveAmount = web3.utils.toWei('2000', 'ether'); // More than approved
      
      try {
        await token.methods.transferFrom(accounts[0], accounts[2], excessiveAmount).send({
          from: accounts[1],
          gas: 100000
        });
        throw new Error('TransferFrom should have failed');
      } catch (error) {
        expect(error.message).toContain('revert');
      }
    });
    
    it('should fail transferFrom with insufficient balance', async function() {
      // First, transfer most tokens away from accounts[0]
      const drainAmount = web3.utils.toWei('999000', 'ether');
      await token.methods.transfer(accounts[3], drainAmount).send({
        from: accounts[0],
        gas: 100000
      });
      
      // Now try to transfer more than remaining balance
      const excessiveAmount = web3.utils.toWei('2000', 'ether');
      
      try {
        await token.methods.transferFrom(accounts[0], accounts[2], excessiveAmount).send({
          from: accounts[1],
          gas: 100000
        });
        throw new Error('TransferFrom should have failed');
      } catch (error) {
        expect(error.message).toContain('revert');
      }
    });
  });
});
