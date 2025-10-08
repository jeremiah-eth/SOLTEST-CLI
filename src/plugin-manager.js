/**
 * Plugin Manager for Soltest CLI
 * Handles loading, registration, and execution of plugins
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Plugin interface definition
 * @typedef {Object} Plugin
 * @property {string} name - Plugin name
 * @property {string} [version] - Plugin version
 * @property {string} [description] - Plugin description
 * @property {Object.<string, Function>} commands - Plugin commands
 * @property {Object} [hooks] - Plugin hooks
 */

/**
 * CLI API interface for plugins
 * @typedef {Object} CLIAPI
 */

/**
 * Plugin Manager Class
 */
export class PluginManager {
  constructor(pluginDir = './plugins') {
    this.plugins = new Map();
    this.pluginDir = path.resolve(pluginDir);
    this.cliAPI = this.createCLIAPI();
  }

  /**
   * Create CLI API for plugins
   */
  createCLIAPI() {
    return {
      // Logging utilities
      log: (message, type = 'info') => {
        const colors = {
          info: chalk.blue,
          success: chalk.green,
          warning: chalk.yellow,
          error: chalk.red
        };
        console.log(colors[type](message));
      },
      error: (message) => console.error(chalk.red(message)),
      success: (message) => console.log(chalk.green(message)),
      warning: (message) => console.log(chalk.yellow(message)),
      info: (message) => console.log(chalk.blue(message)),

      // File operations
      readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
      writeFile: (filePath, content) => fs.writeFileSync(filePath, content, 'utf8'),
      exists: (filePath) => fs.existsSync(filePath),
      mkdir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),

      // Configuration (imported from utils)
      getConfig: () => {
        try {
          const { loadConfig } = require('./utils.js');
          return loadConfig();
        } catch (error) {
          return {};
        }
      },
      getNetworkConfig: (networkName) => {
        try {
          const { getNetworkConfig } = require('./utils.js');
          return getNetworkConfig(networkName);
        } catch (error) {
          throw new Error(`Network '${networkName}' not found`);
        }
      },

      // Contract operations
      compileContract: (contractPath) => {
        try {
          const { Compiler } = require('./compiler.js');
          const compiler = new Compiler();
          return compiler.compileFile(contractPath);
        } catch (error) {
          throw new Error(`Failed to compile contract: ${error.message}`);
        }
      },
      loadArtifact: (contractName) => {
        try {
          const { loadArtifact } = require('./utils.js');
          return loadArtifact(contractName);
        } catch (error) {
          throw new Error(`Failed to load artifact for ${contractName}: ${error.message}`);
        }
      },

      // Network operations
      connect: async (networkUrl) => {
        try {
          const { Deployer } = require('./deployer.js');
          const deployer = new Deployer();
          await deployer.connect(networkUrl);
          return deployer;
        } catch (error) {
          throw new Error(`Failed to connect to network: ${error.message}`);
        }
      },
      getAccounts: async () => {
        try {
          const { Deployer } = require('./deployer.js');
          const deployer = new Deployer();
          return await deployer.getAccounts();
        } catch (error) {
          throw new Error(`Failed to get accounts: ${error.message}`);
        }
      },

      // Deployment
      deploy: async (abi, bytecode, account, args) => {
        try {
          const { Deployer } = require('./deployer.js');
          const deployer = new Deployer();
          return await deployer.deploy(abi, bytecode, account, args);
        } catch (error) {
          throw new Error(`Failed to deploy contract: ${error.message}`);
        }
      },

      // Testing
      runTests: async (testDir) => {
        try {
          const { TestRunner } = require('./test-runner.js');
          const testRunner = new TestRunner();
          return await testRunner.runTests(testDir);
        } catch (error) {
          throw new Error(`Failed to run tests: ${error.message}`);
        }
      },

      // Verification
      verify: async (address, network, args, options) => {
        try {
          const { ContractVerifier } = require('./verifier.js');
          const verifier = new ContractVerifier();
          return await verifier.verify(address, network, args, options);
        } catch (error) {
          throw new Error(`Failed to verify contract: ${error.message}`);
        }
      }
    };
  }

  /**
   * Load all plugins from the plugins directory
   */
  async loadPlugins(pluginDir) {
    const targetDir = pluginDir ? path.resolve(pluginDir) : this.pluginDir;
    
    if (!fs.existsSync(targetDir)) {
      console.log(chalk.yellow(`⚠️  Plugin directory not found: ${targetDir}`));
      return;
    }

    console.log(chalk.blue(`🔌 Loading plugins from: ${targetDir}`));

    try {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this.loadPluginFromDirectory(path.join(targetDir, entry.name));
        }
      }

      console.log(chalk.green(`✅ Loaded ${this.plugins.size} plugin(s)`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load plugins: ${error.message}`));
    }
  }

  /**
   * Load a single plugin from a directory
   */
  async loadPluginFromDirectory(pluginPath) {
    const pluginName = path.basename(pluginPath);
    const indexPath = path.join(pluginPath, 'index.js');

    if (!fs.existsSync(indexPath)) {
      console.log(chalk.yellow(`⚠️  Plugin ${pluginName} missing index.js`));
      return;
    }

    try {
      // Import the plugin
      const pluginModule = await import(`file://${indexPath}`);
      const plugin = pluginModule.default || pluginModule;

      if (!plugin || typeof plugin !== 'object') {
        console.log(chalk.yellow(`⚠️  Plugin ${pluginName} does not export a valid plugin object`));
        return;
      }

      if (!plugin.name) {
        plugin.name = pluginName;
      }

      if (!plugin.commands || typeof plugin.commands !== 'object') {
        console.log(chalk.yellow(`⚠️  Plugin ${pluginName} does not define any commands`));
        return;
      }

      // Inject CLI API into plugin
      if (typeof plugin.init === 'function') {
        await plugin.init(this.cliAPI);
      }

      this.registerPlugin(plugin.name, plugin);
      console.log(chalk.green(`✅ Loaded plugin: ${plugin.name}${plugin.version ? ` v${plugin.version}` : ''}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load plugin ${pluginName}: ${error.message}`));
    }
  }

  /**
   * Register a plugin
   */
  registerPlugin(name, plugin) {
    if (this.plugins.has(name)) {
      console.log(chalk.yellow(`⚠️  Plugin ${name} is already registered, overwriting...`));
    }

    this.plugins.set(name, plugin);
    console.log(chalk.blue(`📝 Registered plugin: ${name}`));
  }

  /**
   * Execute a plugin command
   */
  async executePlugin(pluginName, commandName, args = {}) {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }

    const command = plugin.commands[commandName];
    if (!command) {
      throw new Error(`Command '${commandName}' not found in plugin '${pluginName}'`);
    }

    try {
      console.log(chalk.blue(`🔌 Executing plugin command: ${pluginName}:${commandName}`));
      const result = await command(args);
      return result;
    } catch (error) {
      console.error(chalk.red(`❌ Plugin command failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get all registered plugins
   */
  getPlugins() {
    return new Map(this.plugins);
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }

  /**
   * Get all available commands from all plugins
   */
  getAllCommands() {
    const commands = {};
    
    for (const [pluginName, plugin] of this.plugins) {
      for (const [commandName, command] of Object.entries(plugin.commands)) {
        commands[commandName] = {
          plugin: pluginName,
          command: commandName,
          description: plugin.description
        };
      }
    }
    
    return commands;
  }

  /**
   * Execute plugin hooks
   */
  async executeHook(hookName) {
    for (const [pluginName, plugin] of this.plugins) {
      if (plugin.hooks && plugin.hooks[hookName]) {
        try {
          console.log(chalk.blue(`🔌 Executing hook ${hookName} for plugin ${pluginName}`));
          await plugin.hooks[hookName]();
        } catch (error) {
          console.error(chalk.red(`❌ Hook ${hookName} failed for plugin ${pluginName}: ${error.message}`));
        }
      }
    }
  }

  /**
   * List all loaded plugins
   */
  listPlugins() {
    if (this.plugins.size === 0) {
      console.log(chalk.yellow('📭 No plugins loaded'));
      return;
    }

    console.log(chalk.blue('🔌 Loaded Plugins:'));
    console.log('='.repeat(50));

    for (const [name, plugin] of this.plugins) {
      console.log(chalk.cyan(`📦 ${name}${plugin.version ? ` v${plugin.version}` : ''}`));
      if (plugin.description) {
        console.log(chalk.white(`   ${plugin.description}`));
      }
      
      const commandCount = Object.keys(plugin.commands).length;
      console.log(chalk.white(`   Commands: ${commandCount}`));
      
      if (commandCount > 0) {
        console.log(chalk.gray('   Available commands:'));
        for (const commandName of Object.keys(plugin.commands)) {
          console.log(chalk.gray(`     - ${commandName}`));
        }
      }
      console.log('');
    }
  }
}

/**
 * Create a new plugin manager instance
 */
export function createPluginManager(pluginDir) {
  return new PluginManager(pluginDir);
}

export default PluginManager;
