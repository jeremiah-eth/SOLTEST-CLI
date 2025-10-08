/**
 * Gas Reporter Module
 * Tracks gas usage for smart contract functions and generates reports
 */

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export class GasReporter {
  constructor() {
    this.gasData = new Map(); // functionName -> { gasUsed: [], calls: 0 }
    this.totalGas = 0;
    this.totalTransactions = 0;
  }

  /**
   * Record gas usage for a function
   * @param {string} functionName - Name of the function
   * @param {number|string} gasUsed - Gas consumed by the transaction
   */
  recordGas(functionName, gasUsed) {
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
    
    const functionData = this.gasData.get(functionName);
    functionData.gasUsed.push(gas);
    functionData.calls++;
    functionData.totalGas += gas;
    
    this.totalGas += gas;
    this.totalTransactions++;
  }

  /**
   * Get gas statistics for a function
   * @param {string} functionName - Name of the function
   * @returns {Object} - Gas statistics
   */
  getFunctionStats(functionName) {
    const data = this.gasData.get(functionName);
    if (!data || data.gasUsed.length === 0) {
      return null;
    }

    const gasUsed = data.gasUsed;
    const average = Math.round(data.totalGas / data.calls);
    const min = Math.min(...gasUsed);
    const max = Math.max(...gasUsed);
    
    return {
      functionName,
      calls: data.calls,
      totalGas: data.totalGas,
      average,
      min,
      max
    };
  }

  /**
   * Get color for gas usage based on thresholds
   * @param {number} gas - Gas amount
   * @param {number} average - Average gas for comparison
   * @returns {Function} - Chalk color function
   */
  getGasColor(gas, average) {
    if (gas <= average * 0.8) {
      return chalk.green; // Low gas usage
    } else if (gas <= average * 1.2) {
      return chalk.yellow; // Normal gas usage
    } else {
      return chalk.red; // High gas usage
    }
  }

  /**
   * Format number with commas
   * @param {number} num - Number to format
   * @returns {string} - Formatted number
   */
  formatNumber(num) {
    return num.toLocaleString();
  }

  /**
   * Generate gas report table
   * @returns {string} - Formatted table string
   */
  generateReport() {
    if (this.gasData.size === 0) {
      return chalk.yellow('📊 No gas data recorded');
    }

    const lines = [];
    lines.push(chalk.blue.bold('\n📊 Gas Usage Report'));
    lines.push(chalk.blue('═'.repeat(80)));
    
    // Header
    lines.push(
      chalk.bold(
        'Function'.padEnd(20) +
        'Calls'.padEnd(8) +
        'Total Gas'.padEnd(12) +
        'Avg Gas'.padEnd(10) +
        'Min Gas'.padEnd(10) +
        'Max Gas'.padEnd(10)
      )
    );
    lines.push(chalk.gray('─'.repeat(80)));

    // Calculate overall average for color coding
    const overallAverage = this.totalGas / this.totalTransactions;

    // Sort functions by total gas usage (descending)
    const sortedFunctions = Array.from(this.gasData.keys()).sort((a, b) => {
      const aTotal = this.gasData.get(a).totalGas;
      const bTotal = this.gasData.get(b).totalGas;
      return bTotal - aTotal;
    });

    // Function rows
    sortedFunctions.forEach(functionName => {
      const stats = this.getFunctionStats(functionName);
      if (!stats) return;

      const avgColor = this.getGasColor(stats.average, overallAverage);
      const minColor = this.getGasColor(stats.min, overallAverage);
      const maxColor = this.getGasColor(stats.max, overallAverage);

      lines.push(
        chalk.white(stats.functionName.padEnd(20)) +
        chalk.cyan(stats.calls.toString().padEnd(8)) +
        chalk.white(this.formatNumber(stats.totalGas).padEnd(12)) +
        avgColor(this.formatNumber(stats.average).padEnd(10)) +
        minColor(this.formatNumber(stats.min).padEnd(10)) +
        maxColor(this.formatNumber(stats.max).padEnd(10))
      );
    });

    // Summary
    lines.push(chalk.gray('─'.repeat(80)));
    lines.push(
      chalk.bold(
        'TOTAL'.padEnd(20) +
        this.totalTransactions.toString().padEnd(8) +
        this.formatNumber(this.totalGas).padEnd(12) +
        this.formatNumber(Math.round(this.totalGas / this.totalTransactions)).padEnd(10) +
        'N/A'.padEnd(10) +
        'N/A'.padEnd(10)
      )
    );

    // Legend
    lines.push(chalk.blue('\n📋 Legend:'));
    lines.push(chalk.green('  🟢 Low gas usage    ') + chalk.yellow('🟡 Normal gas usage    ') + chalk.red('🔴 High gas usage'));
    lines.push(chalk.gray('  (Based on overall average gas usage)'));
    
    lines.push(chalk.blue('\n💡 Tips:'));
    lines.push(chalk.white('  • Optimize functions with high average gas usage'));
    lines.push(chalk.white('  • Consider gas-efficient patterns for frequently called functions'));
    lines.push(chalk.white('  • Monitor gas usage across different test scenarios'));

    return lines.join('\n');
  }

  /**
   * Save gas report to JSON file
   * @param {string} filePath - Path to save the report
   */
  saveReport(filePath) {
    try {
      const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTransactions: this.totalTransactions,
          totalGas: this.totalGas,
          averageGas: Math.round(this.totalGas / this.totalTransactions)
        },
        functions: {}
      };

      // Add function data
      this.gasData.forEach((data, functionName) => {
        const stats = this.getFunctionStats(functionName);
        if (stats) {
          reportData.functions[functionName] = {
            calls: stats.calls,
            totalGas: stats.totalGas,
            average: stats.average,
            min: stats.min,
            max: stats.max,
            gasHistory: data.gasUsed
          };
        }
      });

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
      
      console.log(chalk.green(`💾 Gas report saved to: ${filePath}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save gas report: ${error.message}`));
    }
  }

  /**
   * Clear all recorded gas data
   */
  clear() {
    this.gasData.clear();
    this.totalGas = 0;
    this.totalTransactions = 0;
  }

  /**
   * Get all recorded functions
   * @returns {Array} - Array of function names
   */
  getFunctions() {
    return Array.from(this.gasData.keys());
  }

  /**
   * Get total gas usage
   * @returns {number} - Total gas consumed
   */
  getTotalGas() {
    return this.totalGas;
  }

  /**
   * Get total number of transactions
   * @returns {number} - Total transactions recorded
   */
  getTotalTransactions() {
    return this.totalTransactions;
  }
}

// Export convenience functions
export function createGasReporter() {
  return new GasReporter();
}

export function formatGasReport(reporter) {
  return reporter.generateReport();
}
