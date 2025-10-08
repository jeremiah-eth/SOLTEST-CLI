/**
 * Main type definitions for Soltest CLI
 */

export * from './contracts';
export * from './web3';

// Global type declarations
declare global {
  interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
  }

  interface Process {
    env: NodeJS.ProcessEnv;
    argv: string[];
    cwd(): string;
    chdir(directory: string): void;
    exit(code?: number): never;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
  }

  var process: Process;
  var console: Console;
  var global: typeof globalThis;
}

// Module declarations
declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*.sol' {
  const content: string;
  export default content;
}

declare module 'chalk' {
  interface Chalk {
    (text: string): string;
    red: Chalk;
    green: Chalk;
    blue: Chalk;
    yellow: Chalk;
    cyan: Chalk;
    magenta: Chalk;
    white: Chalk;
    gray: Chalk;
    grey: Chalk;
    black: Chalk;
    redBright: Chalk;
    greenBright: Chalk;
    blueBright: Chalk;
    yellowBright: Chalk;
    cyanBright: Chalk;
    magentaBright: Chalk;
    whiteBright: Chalk;
    grayBright: Chalk;
    greyBright: Chalk;
    blackBright: Chalk;
    bgRed: Chalk;
    bgGreen: Chalk;
    bgBlue: Chalk;
    bgYellow: Chalk;
    bgCyan: Chalk;
    bgMagenta: Chalk;
    bgWhite: Chalk;
    bgGray: Chalk;
    bgGrey: Chalk;
    bgBlack: Chalk;
    bold: Chalk;
    dim: Chalk;
    italic: Chalk;
    underline: Chalk;
    strikethrough: Chalk;
    reset: Chalk;
    inverse: Chalk;
    hidden: Chalk;
    visible: Chalk;
  }
  const chalk: Chalk;
  export default chalk;
}

declare module 'inquirer' {
  interface Question {
    type: string;
    name: string;
    message: string;
    default?: any;
    choices?: Array<string | { name: string; value: any }>;
    validate?: (input: any) => boolean | string;
    filter?: (input: any) => any;
    transformer?: (input: any) => string;
    when?: (answers: any) => boolean;
  }

  interface Inquirer {
    prompt(questions: Question[]): Promise<any>;
  }

  const inquirer: Inquirer;
  export default inquirer;
}

declare module 'commander' {
  interface Command {
    name(name: string): Command;
    description(description: string): Command;
    version(version: string): Command;
    command(name: string, description?: string): Command;
    option(flags: string, description?: string, defaultValue?: any): Command;
    requiredOption(flags: string, description?: string): Command;
    action(fn: (...args: any[]) => void | Promise<void>): Command;
    parse(argv?: string[]): Command;
    help(): void;
    exitOverride(fn: (err: Error) => void): Command;
  }

  interface Program extends Command {
    commands: Command[];
    rawArgs: string[];
    args: any[];
  }

  export function program(): Program;
  export const program: Program;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: any;
    data?: any;
    timeout?: number;
    responseType?: string;
  }

  interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
  }

  interface AxiosInstance {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  }

  const axios: AxiosInstance;
  export default axios;
}

declare module 'dotenv' {
  interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
    debug?: boolean;
    override?: boolean;
  }

  interface DotenvConfigOutput {
    parsed?: Record<string, string>;
    error?: Error;
  }

  function config(options?: DotenvConfigOptions): DotenvConfigOutput;
  export = config;
}

declare module 'fs' {
  interface Stats {
    isFile(): boolean;
    isDirectory(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isSymbolicLink(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    dev: number;
    ino: number;
    mode: number;
    nlink: number;
    uid: number;
    gid: number;
    rdev: number;
    size: number;
    blksize: number;
    blocks: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
  }

  interface ReadDirOptions {
    encoding?: BufferEncoding;
    withFileTypes?: boolean;
  }

  interface WriteFileOptions {
    encoding?: BufferEncoding;
    mode?: number;
    flag?: string;
  }

  function readFileSync(path: string, options?: { encoding: BufferEncoding }): string;
  function writeFileSync(path: string, data: string, options?: WriteFileOptions): void;
  function existsSync(path: string): boolean;
  function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  function readdirSync(path: string, options?: ReadDirOptions): string[];
  function statSync(path: string): Stats;
  function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module 'path' {
  interface ParsedPath {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
  }

  function resolve(...paths: string[]): string;
  function join(...paths: string[]): string;
  function dirname(path: string): string;
  function basename(path: string, ext?: string): string;
  function extname(path: string): string;
  function parse(path: string): ParsedPath;
  function isAbsolute(path: string): boolean;
  function relative(from: string, to: string): string;
}

declare module 'child_process' {
  interface SpawnOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdio?: 'pipe' | 'ignore' | 'inherit' | Array<'pipe' | 'ignore' | 'inherit' | null>;
    shell?: boolean;
    detached?: boolean;
    windowsHide?: boolean;
  }

  interface ChildProcess {
    pid: number;
    stdout: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
    stdin: NodeJS.WritableStream;
    kill(signal?: string): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
  }

  function spawn(command: string, args?: string[], options?: SpawnOptions): ChildProcess;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Function types
export type AsyncFunction<T = any, R = any> = (arg: T) => Promise<R>;
export type SyncFunction<T = any, R = any> = (arg: T) => R;
export type CallbackFunction<T = any, R = any> = (arg: T, callback: (error: Error | null, result?: R) => void) => void;

// Event types
export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type ErrorHandler = (error: Error) => void | Promise<void>;

// Promise types
export type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
export type PromiseReject = (reason?: any) => void;
export type PromiseExecutor<T> = (resolve: PromiseResolve<T>, reject: PromiseReject) => void;

// Array types
export type NonEmptyArray<T> = [T, ...T[]];
export type ReadonlyArray<T> = readonly T[];

// Object types
export type StringRecord<T = any> = Record<string, T>;
export type NumberRecord<T = any> = Record<number, T>;
export type KeyValuePair<K = string, V = any> = [K, V];

// Union types
export type StringOrNumber = string | number;
export type StringOrBuffer = string | Buffer;
export type StringOrNumberOrBigInt = string | number | bigint;

// Conditional types
export type IsArray<T> = T extends any[] ? true : false;
export type IsString<T> = T extends string ? true : false;
export type IsNumber<T> = T extends number ? true : false;
export type IsBoolean<T> = T extends boolean ? true : false;

// Mapped types
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type PickBy<T, K extends keyof T> = Pick<T, K>;
export type OmitBy<T, K extends keyof T> = Omit<T, K>;

// Template literal types
export type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${P1}${Capitalize<CamelCase<`${P2}${P3}`>>}`
  : S;

export type PascalCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Capitalize<P1>}${PascalCase<`${P2}${P3}`>}`
  : Capitalize<S>;

export type SnakeCase<S extends string> = S extends `${infer P1}${infer P2}`
  ? P2 extends Uncapitalize<P2>
    ? `${Uncapitalize<P1>}${SnakeCase<P2>}`
    : `${Uncapitalize<P1>}_${SnakeCase<Uncapitalize<P2>>}`
  : S;
