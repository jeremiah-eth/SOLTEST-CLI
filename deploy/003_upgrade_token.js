/**
 * Upgrade Token Contract
 * This script demonstrates upgradeable contract deployment
 */

export default async function({ deployer, accounts, network, deployedContracts }) {
  console.log('🔄 Upgrading Token contract...');
  
  // Check if Token is already deployed
  const existingToken = deployedContracts.Token;
  if (!existingToken) {
    throw new Error('Token contract not found. Deploy Token first.');
  }
  
  console.log(`📍 Current Token address: ${existingToken.address}`);
  
  // Deploy new version of Token
  const tokenV2 = await deployer.deploy('TokenV2', [
    'MyTokenV2',   // name
    'MTK2',        // symbol
    18,            // decimals
    2000000        // new initial supply
  ]);
  
  console.log('✅ TokenV2 deployed successfully!');
  console.log(`📍 New address: ${tokenV2.address}`);
  
  // In a real upgrade scenario, you would:
  // 1. Deploy proxy contract
  // 2. Initialize with new implementation
  // 3. Transfer ownership
  // 4. Verify upgrade
  
  return { 
    tokenV2,
    name: 'TokenV2',
    address: tokenV2.address,
    transactionHash: tokenV2.transactionHash,
    isUpgrade: true,
    previousVersion: existingToken.address
  };
}
