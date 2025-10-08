/**
 * TypeScript declarations for Plugin Manager
 */

export interface Plugin {
  name: string;
  version?: string;
  description?: string;
  commands: Record<string, (args: any) => Promise<any> | any>;
  hooks?: {
    beforeCompile?: () => Promise<void> | void;
    afterCompile?: () => Promise<void> | void;
    beforeDeploy?: () => Promise<void> | void;
    afterDeploy?: () => Promise<void> | void;
    beforeTest?: () => Promise<void> | void;
    afterTest?: () => Promise<void> | void;
  };
  init?: (cliAPI: CLIAPI) => Promise<void> | void;
}

export interface CLIAPI {
  // Core utilities
  log: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  error: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  
  // File operations
  readFile: (filePath: string) => string;
  writeFile: (filePath: string, content: string) => void;
  exists: (filePath: string) => boolean;
  mkdir: (dirPath: string) => void;
  
  // Configuration
  getConfig: () => any;
  getNetworkConfig: (networkName: string) => any;
  
  // Contract operations
  compileContract: (contractPath: string) => any;
  loadArtifact: (contractName: string) => any;
  
  // Network operations
  connect: (networkUrl: string) => Promise<any>;
  getAccounts: () => Promise<string[]>;
  
  // Deployment
  deploy: (abi: any, bytecode: string, account: string, args: any[]) => Promise<any>;
  
  // Testing
  runTests: (testDir: string) => Promise<number>;
  
  // Verification
  verify: (address: string, network: string, args: any[], options: any) => Promise<any>;
}

export class PluginManager {
  constructor(pluginDir?: string);
  
  loadPlugins(pluginDir?: string): Promise<void>;
  registerPlugin(name: string, plugin: Plugin): void;
  executePlugin(pluginName: string, commandName: string, args?: any): Promise<any>;
  getPlugins(): Map<string, Plugin>;
  getPlugin(name: string): Plugin | undefined;
  getAllCommands(): Record<string, { plugin: string; command: string; description?: string }>;
  executeHook(hookName: string): Promise<void>;
  listPlugins(): void;
}

export function createPluginManager(pluginDir?: string): PluginManager;
