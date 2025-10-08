/**
 * Security Scanner Module
 * Analyzes Solidity contracts for common security vulnerabilities
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export class SecurityScanner {
  constructor() {
    this.issues = [];
    this.contractPath = '';
    this.sourceCode = '';
    this.ast = null;
  }

  /**
   * Scan a contract for security vulnerabilities
   * @param {string} contractPath - Path to the contract file
   * @returns {Object} Security scan results
   */
  async scanContract(contractPath) {
    console.log(chalk.blue(`🔍 Scanning contract: ${contractPath}`));
    
    try {
      // Load contract source code
      this.contractPath = contractPath;
      this.sourceCode = fs.readFileSync(contractPath, 'utf8');
      
      // Initialize issues array
      this.issues = [];
      
      // Run all security checks
      await this.checkReentrancy();
      await this.checkUncheckedExternalCalls();
      await this.checkIntegerOverflow();
      await this.checkUnprotectedSelfdestruct();
      await this.checkDelegatecallToUntrusted();
      await this.checkAccessControl();
      await this.checkTimestampDependence();
      await this.checkRandomnessIssues();
      await this.checkGasLimitIssues();
      await this.checkUninitializedStorage();
      
      // Generate report
      const report = this.generateSecurityReport();
      
      console.log(chalk.green(`✅ Security scan completed`));
      console.log(chalk.blue(`📊 Found ${this.issues.length} potential issues`));
      
      return report;
      
    } catch (error) {
      console.error(chalk.red(`❌ Security scan failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Check for reentrancy vulnerabilities
   */
  async checkReentrancy() {
    console.log(chalk.blue(`🔍 Checking for reentrancy vulnerabilities...`));
    
    const reentrancyPatterns = [
      {
        pattern: /\.call\s*\(/g,
        message: 'External call detected - ensure state changes before external calls',
        severity: 'high'
      },
      {
        pattern: /\.send\s*\(/g,
        message: 'send() call detected - consider using transfer() or call()',
        severity: 'medium'
      },
      {
        pattern: /\.transfer\s*\(/g,
        message: 'transfer() call detected - ensure proper reentrancy protection',
        severity: 'medium'
      }
    ];

    // Check for external calls without proper protection
    const externalCallRegex = /(\w+\.call\s*\([^)]*\)|\.send\s*\([^)]*\)|\.transfer\s*\([^)]*\))/g;
    const matches = this.sourceCode.match(externalCallRegex);
    
    if (matches) {
      matches.forEach((match, index) => {
        const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
        const lineNumber = lines.length;
        
        this.issues.push({
          type: 'reentrancy',
          severity: 'high',
          line: lineNumber,
          message: 'Potential reentrancy vulnerability',
          description: `External call detected: ${match.trim()}`,
          recommendation: 'Use checks-effects-interactions pattern or reentrancy guards'
        });
      });
    }

    // Check for missing reentrancy guards
    const hasReentrancyGuard = /reentrancyGuard|nonReentrant|ReentrancyGuard/i.test(this.sourceCode);
    const hasExternalCalls = /\.call\s*\(|\.send\s*\(|\.transfer\s*\(/g.test(this.sourceCode);
    
    if (hasExternalCalls && !hasReentrancyGuard) {
      this.issues.push({
        type: 'reentrancy',
        severity: 'high',
        line: 0,
        message: 'Missing reentrancy protection',
        description: 'Contract has external calls but no reentrancy guard detected',
        recommendation: 'Implement reentrancy guards or use checks-effects-interactions pattern'
      });
    }
  }

  /**
   * Check for unchecked external calls
   */
  async checkUncheckedExternalCalls() {
    console.log(chalk.blue(`🔍 Checking for unchecked external calls...`));
    
    const uncheckedPatterns = [
      {
        pattern: /(\w+\.call\s*\([^)]*\))(?!\s*;)/g,
        message: 'External call without return value check',
        severity: 'high'
      },
      {
        pattern: /(\w+\.send\s*\([^)]*\))(?!\s*;)/g,
        message: 'send() call without return value check',
        severity: 'high'
      }
    ];

    uncheckedPatterns.forEach(({ pattern, message, severity }) => {
      const matches = this.sourceCode.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
          const lineNumber = lines.length;
          
          this.issues.push({
            type: 'unchecked_external_call',
            severity: severity,
            line: lineNumber,
            message: message,
            description: `Unchecked external call: ${match.trim()}`,
            recommendation: 'Always check return values of external calls'
          });
        });
      }
    });
  }

  /**
   * Check for integer overflow/underflow (for older Solidity versions)
   */
  async checkIntegerOverflow() {
    console.log(chalk.blue(`🔍 Checking for integer overflow/underflow...`));
    
    // Check for arithmetic operations without SafeMath
    const arithmeticPatterns = [
      /(\w+\s*\+\s*\w+)/g,
      /(\w+\s*-\s*\w+)/g,
      /(\w+\s*\*\s*\w+)/g,
      /(\w+\s*\/\s*\w+)/g
    ];

    const hasSafeMath = /SafeMath|@openzeppelin\/contracts\/math\/SafeMath/i.test(this.sourceCode);
    const hasSolidityVersion = /pragma solidity\s+([0-9.]+)/i.exec(this.sourceCode);
    const solidityVersion = hasSolidityVersion ? hasSolidityVersion[1] : '0.8.0';
    
    // Only check for older Solidity versions that don't have built-in overflow protection
    if (solidityVersion < '0.8.0') {
      arithmeticPatterns.forEach((pattern) => {
        const matches = this.sourceCode.match(pattern);
        if (matches && !hasSafeMath) {
          matches.forEach((match) => {
            const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
            const lineNumber = lines.length;
            
            this.issues.push({
              type: 'integer_overflow',
              severity: 'high',
              line: lineNumber,
              message: 'Potential integer overflow/underflow',
              description: `Arithmetic operation without SafeMath: ${match.trim()}`,
              recommendation: 'Use SafeMath library or upgrade to Solidity 0.8+'
            });
          });
        }
      });
    }
  }

  /**
   * Check for unprotected selfdestruct
   */
  async checkUnprotectedSelfdestruct() {
    console.log(chalk.blue(`🔍 Checking for unprotected selfdestruct...`));
    
    const selfdestructPattern = /selfdestruct\s*\(/g;
    const matches = this.sourceCode.match(selfdestructPattern);
    
    if (matches) {
      matches.forEach((match) => {
        const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
        const lineNumber = lines.length;
        
        // Check if selfdestruct is protected by access control
        const context = this.getFunctionContext(lineNumber);
        const hasAccessControl = /onlyOwner|onlyAdmin|require\s*\([^)]*msg\.sender/i.test(context);
        
        this.issues.push({
          type: 'unprotected_selfdestruct',
          severity: hasAccessControl ? 'medium' : 'critical',
          line: lineNumber,
          message: hasAccessControl ? 'Selfdestruct with access control' : 'Unprotected selfdestruct',
          description: `selfdestruct() call detected: ${match.trim()}`,
          recommendation: hasAccessControl ? 'Consider additional safety measures' : 'Add proper access control to selfdestruct'
        });
      });
    }
  }

  /**
   * Check for delegatecall to untrusted addresses
   */
  async checkDelegatecallToUntrusted() {
    console.log(chalk.blue(`🔍 Checking for delegatecall to untrusted addresses...`));
    
    const delegatecallPattern = /delegatecall\s*\(/g;
    const matches = this.sourceCode.match(delegatecallPattern);
    
    if (matches) {
      matches.forEach((match) => {
        const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
        const lineNumber = lines.length;
        
        // Check if delegatecall target is validated
        const context = this.getFunctionContext(lineNumber);
        const hasValidation = /require\s*\([^)]*==\s*[^)]*\)|require\s*\([^)]*isValid/i.test(context);
        
        this.issues.push({
          type: 'delegatecall_untrusted',
          severity: hasValidation ? 'medium' : 'critical',
          line: lineNumber,
          message: hasValidation ? 'Delegatecall with validation' : 'Delegatecall to untrusted address',
          description: `delegatecall() detected: ${match.trim()}`,
          recommendation: hasValidation ? 'Ensure validation is comprehensive' : 'Validate delegatecall target address'
        });
      });
    }
  }

  /**
   * Check for proper access control
   */
  async checkAccessControl() {
    console.log(chalk.blue(`🔍 Checking for access control issues...`));
    
    // Check for state-changing functions without access control
    const stateChangingFunctions = [
      /function\s+\w+.*public\s*[^{]*{/g,
      /function\s+\w+.*external\s*[^{]*{/g
    ];

    stateChangingFunctions.forEach((pattern) => {
      const matches = this.sourceCode.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
          const lineNumber = lines.length;
          
          // Check if function has access control
          const functionBody = this.getFunctionBody(lineNumber);
          const hasAccessControl = /onlyOwner|onlyAdmin|require\s*\([^)]*msg\.sender/i.test(functionBody);
          const isViewOrPure = /view|pure/.test(match);
          
          if (!hasAccessControl && !isViewOrPure) {
            this.issues.push({
              type: 'access_control',
              severity: 'high',
              line: lineNumber,
              message: 'Function without access control',
              description: `Public/external function without access control: ${match.trim()}`,
              recommendation: 'Add proper access control modifiers'
            });
          }
        });
      }
    });
  }

  /**
   * Check for timestamp dependence
   */
  async checkTimestampDependence() {
    console.log(chalk.blue(`🔍 Checking for timestamp dependence...`));
    
    const timestampPatterns = [
      /block\.timestamp/g,
      /now\s*[<>=]/g
    ];

    timestampPatterns.forEach((pattern) => {
      const matches = this.sourceCode.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
          const lineNumber = lines.length;
          
          this.issues.push({
            type: 'timestamp_dependence',
            severity: 'medium',
            line: lineNumber,
            message: 'Timestamp dependence detected',
            description: `Timestamp usage: ${match.trim()}`,
            recommendation: 'Be aware of miner manipulation of timestamps'
          });
        });
      }
    });
  }

  /**
   * Check for randomness issues
   */
  async checkRandomnessIssues() {
    console.log(chalk.blue(`🔍 Checking for randomness issues...`));
    
    const randomnessPatterns = [
      /block\.hash/g,
      /block\.number/g,
      /keccak256\s*\([^)]*block\./g
    ];

    randomnessPatterns.forEach((pattern) => {
      const matches = this.sourceCode.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
          const lineNumber = lines.length;
          
          this.issues.push({
            type: 'randomness',
            severity: 'high',
            line: lineNumber,
            message: 'Weak randomness source',
            description: `Block-based randomness: ${match.trim()}`,
            recommendation: 'Use commit-reveal scheme or external randomness source'
          });
        });
      }
    });
  }

  /**
   * Check for gas limit issues
   */
  async checkGasLimitIssues() {
    console.log(chalk.blue(`🔍 Checking for gas limit issues...`));
    
    const gasLimitPatterns = [
      /for\s*\([^)]*\)\s*{/g,
      /while\s*\([^)]*\)\s*{/g
    ];

    gasLimitPatterns.forEach((pattern) => {
      const matches = this.sourceCode.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
          const lineNumber = lines.length;
          
          this.issues.push({
            type: 'gas_limit',
            severity: 'medium',
            line: lineNumber,
            message: 'Potential gas limit issue',
            description: `Loop detected: ${match.trim()}`,
            recommendation: 'Consider gas limit and loop bounds'
          });
        });
      }
    });
  }

  /**
   * Check for uninitialized storage
   */
  async checkUninitializedStorage() {
    console.log(chalk.blue(`🔍 Checking for uninitialized storage...`));
    
    const storagePatterns = [
      /mapping\s*\([^)]*\)\s+public\s+\w+;/g,
      /mapping\s*\([^)]*\)\s+\w+;/g
    ];

    storagePatterns.forEach((pattern) => {
      const matches = this.sourceCode.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const lines = this.sourceCode.substring(0, this.sourceCode.indexOf(match)).split('\n');
          const lineNumber = lines.length;
          
          this.issues.push({
            type: 'uninitialized_storage',
            severity: 'low',
            line: lineNumber,
            message: 'Storage variable declaration',
            description: `Storage variable: ${match.trim()}`,
            recommendation: 'Ensure proper initialization of storage variables'
          });
        });
      }
    });
  }

  /**
   * Get function context around a line number
   * @param {number} lineNumber - Line number to get context for
   * @returns {string} Function context
   */
  getFunctionContext(lineNumber) {
    const lines = this.sourceCode.split('\n');
    const startLine = Math.max(0, lineNumber - 10);
    const endLine = Math.min(lines.length, lineNumber + 10);
    return lines.slice(startLine, endLine).join('\n');
  }

  /**
   * Get function body for a line number
   * @param {number} lineNumber - Line number to get function body for
   * @returns {string} Function body
   */
  getFunctionBody(lineNumber) {
    const lines = this.sourceCode.split('\n');
    let braceCount = 0;
    let startLine = lineNumber;
    let endLine = lineNumber;
    
    // Find function start
    for (let i = lineNumber; i >= 0; i--) {
      if (lines[i].includes('function')) {
        startLine = i;
        break;
      }
    }
    
    // Find function end
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0 && line.includes('}')) {
        endLine = i;
        break;
      }
    }
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }

  /**
   * Check severity level of an issue
   * @param {Object} issue - Issue object
   * @returns {string} Severity level
   */
  checkSeverity(issue) {
    const severityMap = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    return severityMap[issue.severity] || 1;
  }

  /**
   * Generate comprehensive security report
   * @returns {Object} Security report
   */
  generateSecurityReport() {
    const report = {
      contract: this.contractPath,
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      severityCounts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      issues: this.issues,
      summary: '',
      recommendations: []
    };

    // Count issues by severity
    this.issues.forEach(issue => {
      report.severityCounts[issue.severity]++;
    });

    // Generate summary
    if (report.totalIssues === 0) {
      report.summary = 'No security issues detected';
    } else {
      const criticalCount = report.severityCounts.critical;
      const highCount = report.severityCounts.high;
      const mediumCount = report.severityCounts.medium;
      const lowCount = report.severityCounts.low;
      
      report.summary = `Found ${report.totalIssues} issues: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low`;
    }

    // Generate recommendations
    const uniqueTypes = [...new Set(this.issues.map(issue => issue.type))];
    uniqueTypes.forEach(type => {
      const typeIssues = this.issues.filter(issue => issue.type === type);
      const highestSeverity = typeIssues.reduce((max, issue) => 
        this.checkSeverity(issue) > this.checkSeverity(max) ? issue : max
      );
      
      report.recommendations.push({
        type: type,
        severity: highestSeverity.severity,
        count: typeIssues.length,
        recommendation: highestSeverity.recommendation
      });
    });

    return report;
  }

  /**
   * Display security report in console
   * @param {Object} report - Security report
   */
  displayReport(report) {
    console.log(chalk.blue('\n📊 Security Report'));
    console.log('='.repeat(50));
    console.log(chalk.white(`📄 Contract: ${report.contract}`));
    console.log(chalk.white(`⏰ Scan Time: ${report.timestamp}`));
    console.log(chalk.white(`📈 Total Issues: ${report.totalIssues}`));
    console.log('');
    
    // Display severity counts
    if (report.severityCounts.critical > 0) {
      console.log(chalk.red(`🚨 Critical: ${report.severityCounts.critical}`));
    }
    if (report.severityCounts.high > 0) {
      console.log(chalk.yellow(`⚠️  High: ${report.severityCounts.high}`));
    }
    if (report.severityCounts.medium > 0) {
      console.log(chalk.blue(`ℹ️  Medium: ${report.severityCounts.medium}`));
    }
    if (report.severityCounts.low > 0) {
      console.log(chalk.green(`ℹ️  Low: ${report.severityCounts.low}`));
    }
    
    console.log('');
    console.log(chalk.blue('📋 Summary:'));
    console.log(chalk.white(report.summary));
    
    // Display issues
    if (report.issues.length > 0) {
      console.log(chalk.blue('\n🔍 Issues Found:'));
      report.issues.forEach((issue, index) => {
        const severityColor = {
          'critical': chalk.red,
          'high': chalk.yellow,
          'medium': chalk.blue,
          'low': chalk.green
        }[issue.severity] || chalk.white;
        
        console.log(severityColor(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`));
        console.log(chalk.white(`   Line ${issue.line}: ${issue.description}`));
        console.log(chalk.gray(`   💡 ${issue.recommendation}`));
      });
    }
    
    // Display recommendations
    if (report.recommendations.length > 0) {
      console.log(chalk.blue('\n💡 Recommendations:'));
      report.recommendations.forEach((rec, index) => {
        const severityColor = {
          'critical': chalk.red,
          'high': chalk.yellow,
          'medium': chalk.blue,
          'low': chalk.green
        }[rec.severity] || chalk.white;
        
        console.log(severityColor(`\n${index + 1}. [${rec.severity.toUpperCase()}] ${rec.type.replace(/_/g, ' ').toUpperCase()}`));
        console.log(chalk.white(`   Count: ${rec.count}`));
        console.log(chalk.gray(`   💡 ${rec.recommendation}`));
      });
    }
  }
}

// Export convenience functions
export function createSecurityScanner() {
  return new SecurityScanner();
}

export async function scanContract(contractPath) {
  const scanner = new SecurityScanner();
  return await scanner.scanContract(contractPath);
}
