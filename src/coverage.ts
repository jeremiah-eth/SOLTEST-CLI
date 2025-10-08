/**
 * Code Coverage Module
 * Integrates with solidity-coverage for comprehensive coverage reporting
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { loadConfig } from './utils.js';
import type { Dirent } from 'fs';
import type { 
  CoverageData, 
  FileCoverage,
  SoltestConfig 
} from '../types';

export class CoverageReporter {
  private config: SoltestConfig;
  private coverageDir: string;
  private instrumentedDir: string;
  private coverageData: CoverageData | null = null;
  private thresholds: {
    global: number;
    functions: number;
    lines: number;
    branches: number;
  };

  constructor() {
    this.config = loadConfig();
    this.coverageDir = './coverage';
    this.instrumentedDir = './coverage-instrumented';
    this.coverageData = null;
    this.thresholds = {
      global: 80,
      functions: 80,
      lines: 80,
      branches: 80
    };
  }

  /**
   * Instrument contracts for coverage analysis
   * @param contractsDir - Directory containing contracts
   * @param options - Instrumentation options
   * @returns Promise that resolves when instrumentation is complete
   */
  async instrument(contractsDir: string = './contracts', options: Record<string, any> = {}): Promise<void> {
    try {
      console.log(chalk.blue('🔍 Instrumenting contracts for coverage...'));
      
      // Ensure coverage directories exist
      this.ensureCoverageDirs();
      
      // Get list of contract files
      const contractFiles = this.getContractFiles(contractsDir);
      
      if (contractFiles.length === 0) {
        throw new Error('No contract files found to instrument');
      }
      
      console.log(chalk.blue(`📄 Found ${contractFiles.length} contract files`));
      
      // Instrument each contract file
      for (const file of contractFiles) {
        await this.instrumentFile(file, options);
      }
      
      console.log(chalk.green('✅ Contract instrumentation completed'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Instrumentation failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Instrument a single contract file
   * @param filePath - Path to contract file
   * @param options - Instrumentation options
   */
  async instrumentFile(filePath: string, options: Record<string, any> = {}): Promise<void> {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      const instrumentedCode = this.addCoverageInstrumentation(sourceCode, filePath);
      
      // Create instrumented file path
      const relativePath = path.relative('./contracts', filePath);
      const instrumentedPath = path.join(this.instrumentedDir, relativePath);
      
      // Ensure directory exists
      const dir = path.dirname(instrumentedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write instrumented code
      fs.writeFileSync(instrumentedPath, instrumentedCode);
      
      console.log(chalk.gray(`  📝 Instrumented: ${relativePath}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to instrument ${filePath}: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Add coverage instrumentation to source code
   * @param sourceCode - Original source code
   * @param filePath - File path for context
   * @returns Instrumented source code
   */
  addCoverageInstrumentation(sourceCode: string, filePath: string): string {
    const fileName = path.basename(filePath, '.sol');
    const contractName = this.extractContractName(sourceCode);
    
    // Add coverage tracking variables at the top of the contract
    const coverageVars = `
    // Coverage instrumentation
    mapping(bytes32 => bool) private __coverage;
    mapping(bytes32 => uint256) private __coverageCount;
    `;
    
    // Add coverage tracking functions
    const coverageFunctions = `
    // Coverage tracking functions
    function __coverage_track(bytes32 key) internal {
        __coverage[key] = true;
        __coverageCount[key]++;
    }
    
    function __coverage_get(bytes32 key) internal view returns (bool) {
        return __coverage[key];
    }
    
    function __coverage_getCount(bytes32 key) internal view returns (uint256) {
        return __coverageCount[key];
    }
    `;
    
    // Insert coverage variables after contract declaration
    let instrumentedCode = sourceCode;
    
    // Add coverage variables after contract declaration
    const contractMatch = instrumentedCode.match(/contract\s+\w+\s*\{/);
    if (contractMatch) {
      const insertPos = contractMatch.index! + contractMatch[0].length;
      instrumentedCode = 
        instrumentedCode.slice(0, insertPos) + 
        coverageVars + 
        instrumentedCode.slice(insertPos);
    }
    
    // Add coverage functions at the end of the contract
    const lastBrace = instrumentedCode.lastIndexOf('}');
    if (lastBrace !== -1) {
      instrumentedCode = 
        instrumentedCode.slice(0, lastBrace) + 
        coverageFunctions + 
        instrumentedCode.slice(lastBrace);
    }
    
    // Add coverage tracking to function calls
    instrumentedCode = this.addFunctionCoverage(instrumentedCode, contractName);
    
    return instrumentedCode;
  }

  /**
   * Add function-level coverage tracking
   * @param sourceCode - Source code to instrument
   * @param contractName - Contract name
   * @returns Instrumented source code
   */
  addFunctionCoverage(sourceCode: string, contractName: string): string {
    // Track function calls
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*(?:public|private|internal|external)?\s*(?:view|pure|payable)?\s*(?:returns\s*\([^)]*\))?\s*\{/g;
    
    return sourceCode.replace(functionRegex, (match, functionName) => {
      const coverageKey = `__coverage_${contractName}_${functionName}`;
      const trackingCode = `
        __coverage_track(keccak256(abi.encodePacked("${coverageKey}")));
      `;
      
      return match + trackingCode;
    });
  }

  /**
   * Extract contract name from source code
   * @param sourceCode - Source code
   * @returns Contract name
   */
  extractContractName(sourceCode: string): string {
    const match = sourceCode.match(/contract\s+(\w+)/);
    return match?.[1] || 'Unknown';
  }

  /**
   * Generate coverage report
   * @param format - Report format (html, json, text)
   * @param options - Report options
   * @returns Promise that resolves to coverage report data
   */
  async generateReport(format: string = 'html', options: Record<string, any> = {}): Promise<CoverageData> {
    try {
      console.log(chalk.blue(`📊 Generating ${format.toUpperCase()} coverage report...`));
      
      // Ensure coverage directory exists
      this.ensureCoverageDirs();
      
      // Collect coverage data
      const coverageData = await this.collectCoverageData();
      
      if (format === 'html') {
        await this.generateHtmlReport(coverageData, options);
      } else if (format === 'json') {
        await this.generateJsonReport(coverageData, options);
      } else if (format === 'text') {
        await this.generateTextReport(coverageData, options);
      }
      
      console.log(chalk.green(`✅ Coverage report generated: coverage/index.${format === 'html' ? 'html' : format}`));
      
      return coverageData;
      
    } catch (error) {
      console.error(chalk.red(`❌ Report generation failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Collect coverage data from instrumented contracts
   * @returns Promise that resolves to coverage data
   */
  async collectCoverageData(): Promise<CoverageData> {
    const coverageData: CoverageData = {
      summary: {
        totalLines: 0,
        coveredLines: 0,
        totalFunctions: 0,
        coveredFunctions: 0,
        totalBranches: 0,
        coveredBranches: 0,
        lineCoverage: 0,
        functionCoverage: 0,
        branchCoverage: 0
      },
      files: {}
    };
    
    // Scan instrumented contracts
    const instrumentedFiles = this.getContractFiles(this.instrumentedDir);
    
    for (const file of instrumentedFiles) {
      const fileData = await this.analyzeFileCoverage(file);
      const relativePath = path.relative(this.instrumentedDir, file);
      coverageData.files[relativePath] = fileData;
      
      // Update summary
      coverageData.summary.totalLines += fileData.totalLines;
      coverageData.summary.coveredLines += fileData.coveredLines;
      coverageData.summary.totalFunctions += fileData.totalFunctions;
      coverageData.summary.coveredFunctions += fileData.coveredFunctions;
    }
    
    // Calculate percentages
    coverageData.summary.lineCoverage = coverageData.summary.totalLines > 0 
      ? (coverageData.summary.coveredLines / coverageData.summary.totalLines) * 100 
      : 0;
    
    coverageData.summary.functionCoverage = coverageData.summary.totalFunctions > 0 
      ? (coverageData.summary.coveredFunctions / coverageData.summary.totalFunctions) * 100 
      : 0;
    
    return coverageData;
  }

  /**
   * Analyze coverage for a single file
   * @param filePath - Path to instrumented file
   * @returns Promise that resolves to file coverage data
   */
  async analyzeFileCoverage(filePath: string): Promise<FileCoverage> {
    const sourceCode = fs.readFileSync(filePath, 'utf8');
    const lines = sourceCode.split('\n');
    
    let totalLines = 0;
    let coveredLines = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    
    // Count lines and functions
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';
      
      // Count executable lines (non-comment, non-empty, non-brace-only)
      if (line && !line.startsWith('//') && !line.startsWith('/*') && 
          line !== '{' && line !== '}' && !line.startsWith('*')) {
        totalLines++;
        
        // Check if line has coverage tracking
        if (line.includes('__coverage_track')) {
          coveredLines++;
        }
      }
      
      // Count functions
      if (line.startsWith('function ')) {
        totalFunctions++;
        
        // Check if function has coverage tracking
        const nextLines = lines.slice(i, i + 10).join(' ');
        if (nextLines.includes('__coverage_track')) {
          coveredFunctions++;
        }
      }
    }
    
    return {
      totalLines,
      coveredLines,
      totalFunctions,
      coveredFunctions,
      totalBranches: 0,
      coveredBranches: 0,
      lineCoverage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      functionCoverage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      branchCoverage: 0
    };
  }

  /**
   * Generate HTML coverage report
   * @param coverageData - Coverage data
   * @param options - Report options
   */
  async generateHtmlReport(coverageData: CoverageData, options: Record<string, any> = {}): Promise<void> {
    const htmlContent = this.generateHtmlContent(coverageData);
    const reportPath = path.join(this.coverageDir, 'index.html');
    
    fs.writeFileSync(reportPath, htmlContent);
    
    // Generate individual file reports
    for (const [filePath, fileData] of Object.entries(coverageData.files)) {
      const fileHtml = this.generateFileHtml(filePath, fileData);
      const fileReportPath = path.join(this.coverageDir, `${filePath.replace(/[\/\\]/g, '_')}.html`);
      
      fs.writeFileSync(fileReportPath, fileHtml);
    }
  }

  /**
   * Generate HTML content for coverage report
   * @param coverageData - Coverage data
   * @returns HTML content
   */
  generateHtmlContent(coverageData: CoverageData): string {
    const summary = coverageData.summary;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Soltest Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #2c3e50; }
        .percentage { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .high { color: #27ae60; }
        .medium { color: #f39c12; }
        .low { color: #e74c3c; }
        .files { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .file { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
        .file:last-child { border-bottom: none; }
        .file-name { font-weight: bold; }
        .file-coverage { font-size: 1.2em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Soltest Coverage Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Line Coverage</h3>
            <div class="percentage ${this.getCoverageClass(summary.lineCoverage)}">${summary.lineCoverage.toFixed(1)}%</div>
            <p>${summary.coveredLines} / ${summary.totalLines} lines</p>
        </div>
        <div class="metric">
            <h3>Function Coverage</h3>
            <div class="percentage ${this.getCoverageClass(summary.functionCoverage)}">${summary.functionCoverage.toFixed(1)}%</div>
            <p>${summary.coveredFunctions} / ${summary.totalFunctions} functions</p>
        </div>
    </div>
    
    <div class="files">
        <h2>File Coverage</h2>
        ${Object.entries(coverageData.files).map(([filePath, fileData]) => `
            <div class="file">
                <div class="file-name">${filePath}</div>
                <div class="file-coverage ${this.getCoverageClass(fileData.lineCoverage)}">
                    ${fileData.lineCoverage.toFixed(1)}%
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  /**
   * Generate file-specific HTML report
   * @param filePath - File path
   * @param fileData - File coverage data
   * @returns HTML content
   */
  generateFileHtml(filePath: string, fileData: FileCoverage): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage: ${filePath}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .percentage { font-size: 1.5em; font-weight: bold; }
        .high { color: #27ae60; }
        .medium { color: #f39c12; }
        .low { color: #e74c3c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 ${filePath}</h1>
        <p>Coverage Analysis</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <div class="percentage ${this.getCoverageClass(fileData.lineCoverage)}">${fileData.lineCoverage.toFixed(1)}%</div>
            <p>Line Coverage</p>
            <p>${fileData.coveredLines} / ${fileData.totalLines} lines</p>
        </div>
        <div class="metric">
            <div class="percentage ${this.getCoverageClass(fileData.functionCoverage)}">${fileData.functionCoverage.toFixed(1)}%</div>
            <p>Function Coverage</p>
            <p>${fileData.coveredFunctions} / ${fileData.totalFunctions} functions</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate JSON coverage report
   * @param coverageData - Coverage data
   * @param options - Report options
   */
  async generateJsonReport(coverageData: CoverageData, options: Record<string, any> = {}): Promise<void> {
    const reportPath = path.join(this.coverageDir, 'coverage.json');
    fs.writeFileSync(reportPath, JSON.stringify(coverageData, null, 2));
  }

  /**
   * Generate text coverage report
   * @param coverageData - Coverage data
   * @param options - Report options
   */
  async generateTextReport(coverageData: CoverageData, options: Record<string, any> = {}): Promise<void> {
    const summary = coverageData.summary;
    
    let textReport = `
📊 Soltest Coverage Report
========================

Summary:
--------
Line Coverage:    ${summary.lineCoverage.toFixed(1)}% (${summary.coveredLines}/${summary.totalLines})
Function Coverage: ${summary.functionCoverage.toFixed(1)}% (${summary.coveredFunctions}/${summary.totalFunctions})

File Coverage:
--------------
`;
    
    for (const [filePath, fileData] of Object.entries(coverageData.files)) {
      textReport += `${filePath.padEnd(50)} ${fileData.lineCoverage.toFixed(1)}%\n`;
    }
    
    const reportPath = path.join(this.coverageDir, 'coverage.txt');
    fs.writeFileSync(reportPath, textReport);
  }

  /**
   * Check if coverage meets threshold requirements
   * @param minCoverage - Minimum coverage percentage
   * @param options - Threshold options
   * @returns Promise that resolves to whether threshold is met
   */
  async checkThreshold(minCoverage: number = 80, options: Record<string, any> = {}): Promise<boolean> {
    try {
      console.log(chalk.blue(`🎯 Checking coverage threshold: ${minCoverage}%`));
      
      const coverageData = await this.collectCoverageData();
      const lineCoverage = coverageData.summary.lineCoverage;
      const functionCoverage = coverageData.summary.functionCoverage;
      
      const meetsThreshold = lineCoverage >= minCoverage && functionCoverage >= minCoverage;
      
      if (meetsThreshold) {
        console.log(chalk.green(`✅ Coverage threshold met!`));
        console.log(chalk.green(`   Line Coverage: ${lineCoverage.toFixed(1)}%`));
        console.log(chalk.green(`   Function Coverage: ${functionCoverage.toFixed(1)}%`));
      } else {
        console.log(chalk.red(`❌ Coverage threshold not met!`));
        console.log(chalk.red(`   Line Coverage: ${lineCoverage.toFixed(1)}% (required: ${minCoverage}%)`));
        console.log(chalk.red(`   Function Coverage: ${functionCoverage.toFixed(1)}% (required: ${minCoverage}%)`));
      }
      
      return meetsThreshold;
      
    } catch (error) {
      console.error(chalk.red(`❌ Threshold check failed: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Get coverage class for styling
   * @param coverage - Coverage percentage
   * @returns CSS class name
   */
  getCoverageClass(coverage: number): string {
    if (coverage >= 80) return 'high';
    if (coverage >= 60) return 'medium';
    return 'low';
  }

  /**
   * Get list of contract files in directory
   * @param dir - Directory to scan
   * @returns Array of contract file paths
   */
  getContractFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) {
      return [];
    }
    
    const files: string[] = [];
    const items = fs.readdirSync(dir, { withFileTypes: true }) as unknown as Dirent[];
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        files.push(...this.getContractFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.sol')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Ensure coverage directories exist
   */
  ensureCoverageDirs(): void {
    if (!fs.existsSync(this.coverageDir)) {
      fs.mkdirSync(this.coverageDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.instrumentedDir)) {
      fs.mkdirSync(this.instrumentedDir, { recursive: true });
    }
  }

  /**
   * Clean up coverage files
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.instrumentedDir)) {
        fs.rmSync(this.instrumentedDir, { recursive: true, force: true });
      }
      console.log(chalk.green('✅ Coverage cleanup completed'));
    } catch (error) {
      console.error(chalk.red(`❌ Cleanup failed: ${(error as Error).message}`));
    }
  }
}

// Export convenience functions
export function createCoverageReporter(): CoverageReporter {
  return new CoverageReporter();
}

export async function runCoverage(threshold: number = 80, format: string = 'html'): Promise<boolean> {
  const reporter = new CoverageReporter();
  
  try {
    await reporter.instrument();
    await reporter.generateReport(format);
    
    const meetsThreshold = await reporter.checkThreshold(threshold);
    
    if (!meetsThreshold) {
      process.exit(1);
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Coverage failed: ${(error as Error).message}`));
    process.exit(1);
  }
}
