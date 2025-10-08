/**
 * Gas Reporter Module
 * Tracks gas usage for smart contract functions and generates reports
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import type { GasReport, GasSummary } from '../types';

interface FunctionGasData {
  gasUsed: number[];
  calls: number;
  totalGas: number;
}

export class GasReporter {
  private gasData: Map<string, FunctionGasData> = new Map();
  private totalGas: number = 0;
  private totalTransactions: number = 0;

  constructor() {
    this.gasData = new Map();
    this.totalGas = 0;
    this.totalTransactions = 0;
  }

  /**
   * Record gas usage for a function
   * @param functionName - Name of the function
   * @param gasUsed - Gas consumed by the transaction
   */
  recordGas(functionName: string, gasUsed: number | string | bigint): void {
    // Convert BigInt to number for calculations
    const gas = typeof gasUsed === 'bigint' ? Number(gasUsed) : 
                typeof gasUsed === 'string' ? parseInt(gasUsed, 10) : gasUsed;
    
    if (!this.gasData.has(functionName)) {
      this.gasData.set(functionName, {
        gasUsed: [],
        calls: 0,
        totalGas: 0
      });
    }
    
    const functionData = this.gasData.get(functionName)!;
    functionData.gasUsed.push(gas);
    functionData.calls++;
    functionData.totalGas += gas;
    
    this.totalGas += gas;
    this.totalTransactions++;
  }

  /**
   * Get gas statistics for a function
   * @param functionName - Name of the function
   * @returns Gas statistics
   */
  getFunctionStats(functionName: string): GasSummary | null {
    const data = this.gasData.get(functionName);
    if (!data) {
      return null;
    }

    const averageGas = data.totalGas / data.calls;
    const minGas = Math.min(...data.gasUsed);
    const maxGas = Math.max(...data.gasUsed);

    return {
      function: functionName,
      count: data.calls,
      totalGas: data.totalGas,
      averageGas: Math.round(averageGas),
      minGas,
      maxGas,
      totalCost: 0, // Will be calculated with gas price
      averageCost: 0
    };
  }

  /**
   * Get all function statistics
   * @returns Array of gas summaries
   */
  getAllStats(): GasSummary[] {
    const stats: GasSummary[] = [];
    
    for (const [functionName, data] of this.gasData) {
      const averageGas = data.totalGas / data.calls;
      const minGas = Math.min(...data.gasUsed);
      const maxGas = Math.max(...data.gasUsed);

      stats.push({
        function: functionName,
        count: data.calls,
        totalGas: data.totalGas,
        averageGas: Math.round(averageGas),
        minGas,
        maxGas,
        totalCost: 0,
        averageCost: 0
      });
    }

    return stats.sort((a, b) => b.averageGas - a.averageGas);
  }

  /**
   * Generate gas report
   * @param gasPrice - Gas price in wei (optional)
   * @returns Formatted gas report
   */
  generateReport(gasPrice?: number): string {
    const stats = this.getAllStats();
    
    if (stats.length === 0) {
      return chalk.yellow('No gas data recorded');
    }

    let report = chalk.blue('\n📊 Gas Usage Report\n');
    report += '='.repeat(50) + '\n\n';

    // Summary
    report += chalk.cyan('Summary:\n');
    report += `Total Transactions: ${this.totalTransactions}\n`;
    report += `Total Gas Used: ${this.totalGas.toLocaleString()}\n`;
    
    if (gasPrice) {
      const totalCost = (this.totalGas * gasPrice) / 1e18;
      report += `Total Cost: ${totalCost.toFixed(6)} ETH\n`;
    }
    
    report += '\n';

    // Function breakdown
    report += chalk.cyan('Function Breakdown:\n');
    report += '-'.repeat(80) + '\n';
    report += `${'Function'.padEnd(20)} ${'Calls'.padEnd(8)} ${'Avg Gas'.padEnd(10)} ${'Min Gas'.padEnd(10)} ${'Max Gas'.padEnd(10)} ${'Total Gas'.padEnd(12)}\n`;
    report += '-'.repeat(80) + '\n';

    for (const stat of stats) {
      const functionName = stat.function.length > 18 ? stat.function.substring(0, 15) + '...' : stat.function;
      const avgGas = this.formatGas(stat.averageGas);
      const minGas = this.formatGas(stat.minGas);
      const maxGas = this.formatGas(stat.maxGas);
      const totalGas = this.formatGas(stat.totalGas);

      report += `${functionName.padEnd(20)} ${stat.count.toString().padEnd(8)} ${avgGas.padEnd(10)} ${minGas.padEnd(10)} ${maxGas.padEnd(10)} ${totalGas.padEnd(12)}\n`;
    }

    return report;
  }

  /**
   * Save gas report to file
   * @param filePath - Path to save the report
   * @param gasPrice - Gas price in wei (optional)
   */
  saveReport(filePath: string, gasPrice?: number): void {
    try {
      const report = this.generateReport(gasPrice);
      fs.writeFileSync(filePath, report);
      console.log(chalk.green(`💾 Gas report saved to ${filePath}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save gas report: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Save gas data as JSON
   * @param filePath - Path to save the JSON file
   */
  saveJSON(filePath: string): void {
    try {
      const data = {
        summary: {
          totalTransactions: this.totalTransactions,
          totalGas: this.totalGas,
          functions: this.getAllStats()
        },
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(chalk.green(`💾 Gas data saved to ${filePath}`));
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save gas data: ${(error as Error).message}`));
      throw error;
    }
  }

  /**
   * Format gas number for display
   * @param gas - Gas amount
   * @returns Formatted gas string
   */
  private formatGas(gas: number): string {
    if (gas >= 1000000) {
      return `${(gas / 1000000).toFixed(1)}M`;
    } else if (gas >= 1000) {
      return `${(gas / 1000).toFixed(1)}K`;
    } else {
      return gas.toString();
    }
  }

  /**
   * Get total gas used
   * @returns Total gas used
   */
  getTotalGas(): number {
    return this.totalGas;
  }

  /**
   * Get total transactions
   * @returns Total number of transactions
   */
  getTotalTransactions(): number {
    return this.totalTransactions;
  }

  /**
   * Get average gas per transaction
   * @returns Average gas per transaction
   */
  getAverageGas(): number {
    return this.totalTransactions > 0 ? Math.round(this.totalGas / this.totalTransactions) : 0;
  }

  /**
   * Get gas data for a specific function
   * @param functionName - Name of the function
   * @returns Gas data or null
   */
  getFunctionData(functionName: string): FunctionGasData | null {
    return this.gasData.get(functionName) || null;
  }

  /**
   * Check if function has gas data
   * @param functionName - Name of the function
   * @returns True if function has gas data
   */
  hasFunctionData(functionName: string): boolean {
    return this.gasData.has(functionName);
  }

  /**
   * Get all function names
   * @returns Array of function names
   */
  getFunctionNames(): string[] {
    return Array.from(this.gasData.keys());
  }

  /**
   * Clear all gas data
   */
  clearData(): void {
    this.gasData.clear();
    this.totalGas = 0;
    this.totalTransactions = 0;
  }

  /**
   * Get gas efficiency rating
   * @param gasUsed - Gas used
   * @returns Efficiency rating (1-5 stars)
   */
  getEfficiencyRating(gasUsed: number): string {
    if (gasUsed < 50000) return '⭐⭐⭐⭐⭐';
    if (gasUsed < 100000) return '⭐⭐⭐⭐';
    if (gasUsed < 200000) return '⭐⭐⭐';
    if (gasUsed < 500000) return '⭐⭐';
    return '⭐';
  }

  /**
   * Get gas usage trend
   * @param functionName - Name of the function
   * @returns Trend analysis
   */
  getTrend(functionName: string): 'improving' | 'stable' | 'worsening' | 'insufficient_data' {
    const data = this.gasData.get(functionName);
    if (!data || data.gasUsed.length < 3) {
      return 'insufficient_data';
    }

    const recent = data.gasUsed.slice(-3);
    const older = data.gasUsed.slice(-6, -3);

    if (older.length === 0) {
      return 'insufficient_data';
    }

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change < -0.1) return 'improving';
    if (change > 0.1) return 'worsening';
    return 'stable';
  }

  /**
   * Export gas data
   * @returns Gas data object
   */
  exportData(): {
    summary: {
      totalTransactions: number;
      totalGas: number;
      averageGas: number;
    };
    functions: GasSummary[];
    timestamp: string;
  } {
    return {
      summary: {
        totalTransactions: this.totalTransactions,
        totalGas: this.totalGas,
        averageGas: this.getAverageGas()
      },
      functions: this.getAllStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import gas data
   * @param data - Gas data to import
   */
  importData(data: {
    summary: {
      totalTransactions: number;
      totalGas: number;
    };
    functions: GasSummary[];
  }): void {
    this.clearData();
    
    this.totalTransactions = data.summary.totalTransactions;
    this.totalGas = data.summary.totalGas;

    for (const func of data.functions) {
      this.gasData.set(func.function, {
        gasUsed: Array(func.count).fill(func.averageGas),
        calls: func.count,
        totalGas: func.totalGas
      });
    }
  }
}
