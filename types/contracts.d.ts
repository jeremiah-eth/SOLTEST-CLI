/**
 * Contract ABI and interface definitions
 */

export interface ContractABI {
  name: string;
  type: string;
  inputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  stateMutability?: string;
  anonymous?: boolean;
}

export interface ContractArtifact {
  contractName: string;
  abi: ContractABI[];
  bytecode: string;
  deployedBytecode: string;
  sourceMap: string;
  deployedSourceMap: string;
  source: string;
  sourcePath: string;
  ast: any;
  legacyAST: any;
  compiler: {
    name: string;
    version: string;
  };
  networks: Record<string, any>;
  schemaVersion: string;
  updatedAt: string;
}

export interface DeploymentResult {
  address: string;
  transactionHash: string;
  gasUsed: number;
  gasPrice: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  value: string;
  nonce: number;
}

export interface ContractInstance {
  address: string;
  abi: ContractABI[];
  methods: Record<string, (...args: any[]) => any>;
  events: Record<string, any>;
  options: {
    address: string;
    jsonInterface: ContractABI[];
  };
}

// Common contract interfaces
export interface ERC20Interface {
  name(): Promise<string>;
  symbol(): Promise<string>;
  decimals(): Promise<number>;
  totalSupply(): Promise<string>;
  balanceOf(account: string): Promise<string>;
  transfer(to: string, amount: string): Promise<boolean>;
  transferFrom(from: string, to: string, amount: string): Promise<boolean>;
  approve(spender: string, amount: string): Promise<boolean>;
  allowance(owner: string, spender: string): Promise<string>;
}

export interface ERC721Interface {
  name(): Promise<string>;
  symbol(): Promise<string>;
  tokenURI(tokenId: string): Promise<string>;
  ownerOf(tokenId: string): Promise<string>;
  balanceOf(owner: string): Promise<string>;
  approve(to: string, tokenId: string): Promise<void>;
  getApproved(tokenId: string): Promise<string>;
  setApprovalForAll(operator: string, approved: boolean): Promise<void>;
  isApprovedForAll(owner: string, operator: string): Promise<boolean>;
  transferFrom(from: string, to: string, tokenId: string): Promise<void>;
  safeTransferFrom(from: string, to: string, tokenId: string): Promise<void>;
}

// Event types
export interface TransferEvent {
  from: string;
  to: string;
  value?: string;
  tokenId?: string;
}

export interface ApprovalEvent {
  owner: string;
  spender: string;
  value?: string;
  tokenId?: string;
}

export interface ApprovalForAllEvent {
  owner: string;
  operator: string;
  approved: boolean;
}

// Transaction types
export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string | null;
  gasUsed: number;
  cumulativeGasUsed: number;
  contractAddress: string | null;
  logs: any[];
  status: boolean;
  logsBloom: string;
}

export interface TransactionOptions {
  from?: string;
  to?: string;
  value?: string;
  gas?: number;
  gasPrice?: string;
  data?: string;
}

// Network configuration types
export interface NetworkConfig {
  url: string;
  accounts: string[] | 'ganache';
  chainId?: number;
  gas?: number;
  gasPrice?: string;
  timeout?: number;
}

export interface SoltestConfig {
  networks: Record<string, NetworkConfig>;
  solc: {
    version: string;
    optimizer: {
      enabled: boolean;
      runs: number;
    };
    evmVersion: string;
  };
  paths: {
    contracts: string;
    tests: string;
    build: string;
    artifacts?: string;
  };
  gasReporter?: {
    enabled: boolean;
    currency: string;
    gasPrice: number;
    outputFile: string;
  };
  test?: {
    timeout: number;
    bail: boolean;
    parallel: boolean;
  };
  deployment?: {
    gasLimit: number;
    gasPrice: string | 'auto';
    timeout: number;
  };
}

// Compiler types
export interface CompilerOptions {
  version: string;
  optimizer: {
    enabled: boolean;
    runs: number;
  };
  evmVersion: string;
  outputSelection: Record<string, any>;
}

export interface CompilationResult {
  contracts: Record<string, any>;
  sources: Record<string, any>;
  errors: any[];
  warnings: any[];
}

// Test types
export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  gasUsed?: number;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  status: 'passed' | 'failed';
}

// Coverage types
export interface CoverageData {
  summary: {
    totalLines: number;
    coveredLines: number;
    totalFunctions: number;
    coveredFunctions: number;
    totalBranches: number;
    coveredBranches: number;
    lineCoverage: number;
    functionCoverage: number;
    branchCoverage: number;
  };
  files: Record<string, FileCoverage>;
}

export interface FileCoverage {
  totalLines: number;
  coveredLines: number;
  totalFunctions: number;
  coveredFunctions: number;
  totalBranches: number;
  coveredBranches: number;
  lineCoverage: number;
  functionCoverage: number;
  branchCoverage: number;
}

// Gas reporting types
export interface GasReport {
  function: string;
  gasUsed: number;
  gasPrice: number;
  cost: number;
  timestamp: number;
}

export interface GasSummary {
  function: string;
  count: number;
  totalGas: number;
  averageGas: number;
  minGas: number;
  maxGas: number;
  totalCost: number;
  averageCost: number;
}

// Verification types
export interface VerificationResult {
  success: boolean;
  guid?: string;
  explorer?: string;
  contractAddress: string;
  network: string;
}

export interface VerificationStatus {
  success: boolean;
  status: 'verified' | 'pending' | 'failed';
  message: string;
}

// Template types
export interface ProjectAnswers {
  projectName: string;
  contractType: 'ERC20' | 'ERC721' | 'Custom';
  includeTests: boolean;
  includeDeployment: boolean;
  useTypeScript: boolean;
}

export interface ContractDetails {
  tokenName: string;
  tokenSymbol?: string;
  initialSupply?: string;
  maxSupply?: string;
  tokenDescription: string;
}
