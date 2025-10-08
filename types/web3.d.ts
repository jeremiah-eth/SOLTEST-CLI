/**
 * Web3 type extensions and utilities
 */

import { ContractABI, ContractInstance, TransactionReceipt, TransactionOptions } from './contracts';

// Extend Web3 types
declare module 'web3' {
  interface Web3 {
    eth: {
      isSyncing(): Promise<boolean | object>;
      net: {
        getId(): Promise<number>;
      };
      getAccounts(): Promise<string[]>;
      getBalance(address: string): Promise<string>;
      getTransactionCount(address: string): Promise<number>;
      sendTransaction(tx: TransactionOptions): Promise<TransactionReceipt>;
      call(tx: TransactionOptions): Promise<string>;
      estimateGas(tx: TransactionOptions): Promise<number>;
      getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
      getBlock(blockNumber: number | string): Promise<any>;
      getBlockNumber(): Promise<number>;
      getGasPrice(): Promise<string>;
      getCode(address: string): Promise<string>;
    };
    utils: {
      toWei(value: string | number, unit?: string): string;
      fromWei(value: string | number, unit?: string): string;
      toHex(value: string | number): string;
      toNumber(value: string | number): number;
      toBigInt(value: string | number): bigint;
      isAddress(address: string): boolean;
      isHex(hex: string): boolean;
      keccak256(data: string): string;
      sha3(data: string): string;
      soliditySha3(...args: any[]): string;
      encodeParameter(type: string, parameter: any): string;
      encodeParameters(types: string[], parameters: any[]): string;
      decodeParameter(type: string, encoded: string): any;
      decodeParameters(types: string[], encoded: string): any[];
      padLeft(value: string, characterAmount: number, sign?: string): string;
      padRight(value: string, characterAmount: number, sign?: string): string;
      stripHexPrefix(hex: string): string;
      checkAddressChecksum(address: string): boolean;
      toChecksumAddress(address: string): string;
      randomHex(size: number): string;
      BN: any;
    };
    Contract: {
      new (abi: ContractABI[], address?: string, options?: any): ContractInstance;
    };
  }
}

// Web3 contract method types
export interface ContractMethod {
  call(options?: TransactionOptions): Promise<any>;
  send(options: TransactionOptions): Promise<TransactionReceipt>;
  estimateGas(options?: TransactionOptions): Promise<number>;
  encodeABI(): string;
  decodeABI(encoded: string): any[];
}

// Web3 event types
export interface ContractEvent {
  on(event: string, callback: (error: Error, result: any) => void): void;
  once(event: string, callback: (error: Error, result: any) => void): void;
  removeAllListeners(event?: string): void;
  getPastEvents(event: string, options?: any): Promise<any[]>;
}

// Web3 provider types
export interface Web3Provider {
  send(payload: any, callback: (error: Error | null, result?: any) => void): void;
  sendAsync(payload: any, callback: (error: Error | null, result?: any) => void): void;
  isConnected(): boolean;
  disconnect(): void;
}

// Web3 account types
export interface Web3Account {
  address: string;
  privateKey: string;
  signTransaction(tx: any): Promise<any>;
  sign(data: string): Promise<any>;
  encrypt(password: string): Promise<any>;
}

// Web3 transaction types
export interface Web3Transaction {
  from: string;
  to?: string;
  value?: string;
  gas?: number;
  gasPrice?: string;
  data?: string;
  nonce?: number;
  chainId?: number;
}

export interface Web3TransactionConfig extends Web3Transaction {
  gas?: number;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  type?: number;
}

// Web3 block types
export interface Web3Block {
  number: number;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionsRoot: string;
  stateRoot: string;
  receiptsRoot: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  extraData: string;
  size: number;
  gasLimit: number;
  gasUsed: number;
  timestamp: number;
  transactions: string[] | Web3Transaction[];
  uncles: string[];
}

// Web3 filter types
export interface Web3Filter {
  fromBlock?: number | string;
  toBlock?: number | string;
  address?: string | string[];
  topics?: (string | string[] | null)[];
}

// Web3 subscription types
export interface Web3Subscription {
  id: string;
  subscribe(callback: (error: Error | null, result?: any) => void): void;
  unsubscribe(callback?: (error: Error | null, result?: any) => void): void;
}

// Web3 error types
export interface Web3Error extends Error {
  code: number;
  data?: any;
  receipt?: TransactionReceipt;
}

// Web3 utility types
export type Web3Unit = 'wei' | 'kwei' | 'mwei' | 'gwei' | 'szabo' | 'finney' | 'ether';

export interface Web3Utils {
  toWei(value: string | number, unit?: Web3Unit): string;
  fromWei(value: string | number, unit?: Web3Unit): string;
  toHex(value: string | number): string;
  toNumber(value: string | number): number;
  toBigInt(value: string | number): bigint;
  isAddress(address: string): boolean;
  isHex(hex: string): boolean;
  keccak256(data: string): string;
  sha3(data: string): string;
  soliditySha3(...args: any[]): string;
  encodeParameter(type: string, parameter: any): string;
  encodeParameters(types: string[], parameters: any[]): string;
  decodeParameter(type: string, encoded: string): any;
  decodeParameters(types: string[], encoded: string): any[];
  padLeft(value: string, characterAmount: number, sign?: string): string;
  padRight(value: string, characterAmount: number, sign?: string): string;
  stripHexPrefix(hex: string): string;
  checkAddressChecksum(address: string): boolean;
  toChecksumAddress(address: string): string;
  randomHex(size: number): string;
}

// Web3 contract factory types
export interface Web3ContractFactory {
  new (abi: ContractABI[], bytecode?: string): Web3Contract;
}

export interface Web3Contract {
  deploy(options: {
    data: string;
    arguments?: any[];
  }): {
    send(options: TransactionOptions): Promise<ContractInstance>;
    estimateGas(options?: TransactionOptions): Promise<number>;
    encodeABI(): string;
  };
  methods: Record<string, (...args: any[]) => ContractMethod>;
  events: Record<string, ContractEvent>;
  getPastEvents(event: string, options?: any): Promise<any[]>;
  once(event: string, callback: (error: Error, result: any) => void): void;
  on(event: string, callback: (error: Error, result: any) => void): void;
  removeAllListeners(event?: string): void;
}

// Web3 provider factory types
export interface Web3ProviderFactory {
  new (url: string): Web3Provider;
}

// Web3 instance types
export interface Web3Instance {
  eth: {
    isSyncing(): Promise<boolean | object>;
    net: {
      getId(): Promise<number>;
    };
    getAccounts(): Promise<string[]>;
    getBalance(address: string): Promise<string>;
    getTransactionCount(address: string): Promise<number>;
    sendTransaction(tx: TransactionOptions): Promise<TransactionReceipt>;
    call(tx: TransactionOptions): Promise<string>;
    estimateGas(tx: TransactionOptions): Promise<number>;
    getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
    getBlock(blockNumber: number | string): Promise<Web3Block>;
    getBlockNumber(): Promise<number>;
    getGasPrice(): Promise<string>;
    getCode(address: string): Promise<string>;
    Contract: Web3ContractFactory;
  };
  utils: Web3Utils;
  providers: {
    HttpProvider: Web3ProviderFactory;
    WebsocketProvider: Web3ProviderFactory;
  };
  version: {
    api: string;
    node: string;
    network: string;
    ethereum: string;
  };
}
