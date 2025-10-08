/**
 * Example Plugin for Soltest CLI
 * Demonstrates how to create custom commands and hooks
 */

export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'An example plugin demonstrating plugin capabilities',
  
  // Plugin initialization (optional)
  async init(cliAPI) {
    console.log('🔌 My Plugin initialized with CLI API');
    this.cliAPI = cliAPI;
  },

  // Custom commands
  commands: {
    /**
     * Custom command: soltest custom-command
     */
    'custom-command': async (args) => {
      console.log('🎉 Custom command executed!');
      console.log('📋 Arguments received:', args);
      
      // Example: Use CLI API to read a file
      if (args.file && this.cliAPI.exists(args.file)) {
        const content = this.cliAPI.readFile(args.file);
        console.log('📄 File content preview:', content.substring(0, 100) + '...');
      }
      
      return {
        success: true,
        message: 'Custom command completed successfully',
        timestamp: new Date().toISOString()
      };
    },

    /**
     * Another custom command: soltest hello-world
     */
    'hello-world': async (args) => {
      const name = args.name || 'World';
      console.log(`👋 Hello, ${name}!`);
      
      // Example: Use CLI API to create a file
      const outputFile = 'hello-output.txt';
      const content = `Hello, ${name}!\nGenerated at: ${new Date().toISOString()}`;
      
      this.cliAPI.writeFile(outputFile, content);
      console.log(`📝 Output written to: ${outputFile}`);
      
      return {
        success: true,
        outputFile,
        message: `Hello message generated for ${name}`
      };
    },

    /**
     * Contract analysis command: soltest analyze-contract
     */
    'analyze-contract': async (args) => {
      const contractPath = args.contract || './contracts/Token.sol';
      
      if (!this.cliAPI.exists(contractPath)) {
        throw new Error(`Contract file not found: ${contractPath}`);
      }

      console.log(`🔍 Analyzing contract: ${contractPath}`);
      
      try {
        // Read and analyze the contract
        const contractContent = this.cliAPI.readFile(contractPath);
        
        // Simple analysis
        const lines = contractContent.split('\n').length;
        const functions = (contractContent.match(/function\s+\w+/g) || []).length;
        const events = (contractContent.match(/event\s+\w+/g) || []).length;
        const modifiers = (contractContent.match(/modifier\s+\w+/g) || []).length;
        
        const analysis = {
          file: contractPath,
          lines,
          functions,
          events,
          modifiers,
          hasConstructor: contractContent.includes('constructor'),
          hasFallback: contractContent.includes('fallback') || contractContent.includes('receive'),
          pragmaVersion: contractContent.match(/pragma\s+solidity\s+([^;]+)/)?.[1] || 'Unknown'
        };

        console.log('📊 Contract Analysis Results:');
        console.log(`   📄 Lines of code: ${analysis.lines}`);
        console.log(`   🔧 Functions: ${analysis.functions}`);
        console.log(`   📢 Events: ${analysis.events}`);
        console.log(`   🛡️  Modifiers: ${analysis.modifiers}`);
        console.log(`   🏗️  Has constructor: ${analysis.hasConstructor ? 'Yes' : 'No'}`);
        console.log(`   💰 Has fallback/receive: ${analysis.hasFallback ? 'Yes' : 'No'}`);
        console.log(`   📦 Solidity version: ${analysis.pragmaVersion}`);

        return {
          success: true,
          analysis,
          message: 'Contract analysis completed'
        };
      } catch (error) {
        throw new Error(`Failed to analyze contract: ${error.message}`);
      }
    },

    /**
     * Network status command: soltest network-status
     */
    'network-status': async (args) => {
      const networkName = args.network || 'local';
      
      try {
        console.log(`🌐 Checking network status: ${networkName}`);
        
        // Get network configuration
        const networkConfig = this.cliAPI.getNetworkConfig(networkName);
        console.log(`📡 Network URL: ${networkConfig.url}`);
        
        // Try to connect and get accounts
        const deployer = await this.cliAPI.connect(networkConfig.url);
        const accounts = await this.cliAPI.getAccounts();
        
        console.log(`✅ Network connection successful`);
        console.log(`👥 Available accounts: ${accounts.length}`);
        console.log(`💰 First account: ${accounts[0]}`);
        
        return {
          success: true,
          network: networkName,
          url: networkConfig.url,
          accounts: accounts.length,
          firstAccount: accounts[0],
          message: 'Network status check completed'
        };
      } catch (error) {
        console.log(`❌ Network connection failed: ${error.message}`);
        return {
          success: false,
          network: networkName,
          error: error.message,
          message: 'Network status check failed'
        };
      }
    }
  },

  // Plugin hooks (optional)
  hooks: {
    /**
     * Hook executed before compilation
     */
    beforeCompile: async () => {
      console.log('🔌 [My Plugin] Pre-compilation hook executed');
    },

    /**
     * Hook executed after compilation
     */
    afterCompile: async () => {
      console.log('🔌 [My Plugin] Post-compilation hook executed');
    },

    /**
     * Hook executed before deployment
     */
    beforeDeploy: async () => {
      console.log('🔌 [My Plugin] Pre-deployment hook executed');
    },

    /**
     * Hook executed after deployment
     */
    afterDeploy: async () => {
      console.log('🔌 [My Plugin] Post-deployment hook executed');
    },

    /**
     * Hook executed before testing
     */
    beforeTest: async () => {
      console.log('🔌 [My Plugin] Pre-testing hook executed');
    },

    /**
     * Hook executed after testing
     */
    afterTest: async () => {
      console.log('🔌 [My Plugin] Post-testing hook executed');
    }
  }
};
