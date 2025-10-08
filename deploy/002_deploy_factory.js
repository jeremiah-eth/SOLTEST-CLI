/**
 * Deploy Factory Contract
 * This script deploys a factory contract that can create other contracts
 */

export default async function({ deployer, accounts, network, deployedContracts }) {
  console.log('🚀 Deploying Factory contract...');
  
  // Get previously deployed Token contract address
  const tokenAddress = deployedContracts.Token?.address;
  if (!tokenAddress) {
    throw new Error('Token contract not found. Make sure 001_deploy_token.js ran successfully.');
  }
  
  console.log(`🔗 Using Token at: ${tokenAddress}`);
  
  // Deploy Factory contract
  const factory = await deployer.deploy('Factory', [
    tokenAddress  // Pass Token address as constructor argument
  ]);
  
  console.log('✅ Factory deployed successfully!');
  console.log(`📍 Address: ${factory.address}`);
  console.log(`⛽ Gas used: ${factory.gasUsed}`);
  
  return { 
    factory,
    name: 'Factory',
    address: factory.address,
    transactionHash: factory.transactionHash
  };
}
