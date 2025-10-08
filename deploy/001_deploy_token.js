/**
 * Deploy Token Contract
 * This script deploys the Token contract with initial parameters
 */

export default async function({ deployer, accounts, network }) {
  console.log('🚀 Deploying Token contract...');
  console.log(`📡 Network: ${network}`);
  console.log(`👤 Deployer: ${accounts[0]}`);
  
  // Deploy Token contract with constructor arguments
  const token = await deployer.deploy('Token', [
    'MyToken',     // name
    'MTK',         // symbol  
    18,            // decimals
    1000000        // initial supply
  ]);
  
  console.log('✅ Token deployed successfully!');
  console.log(`📍 Address: ${token.address}`);
  console.log(`⛽ Gas used: ${token.gasUsed}`);
  console.log(`🔗 Transaction: ${token.transactionHash}`);
  
  // Return deployed contract info for tracking
  return { 
    token,
    name: 'Token',
    address: token.address,
    transactionHash: token.transactionHash
  };
}
