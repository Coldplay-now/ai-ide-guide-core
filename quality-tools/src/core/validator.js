import fs from 'fs-extra';
import { glob } from 'glob';

/**
 * Validation system for quality fixing operations
 * Ensures fixes are correct and don't introduce new issues
 */
export class Validator {
  constructor(options = {}) {
    this.options = {
      strictMode: false,
      checkSyntax: true,
      checkRendering: true,
      ...options
    };
    this.validationRules = new Map();
    this.setupDefaultRules();
  }

  /**
   * Setup default validation rules
   */
  setupDefaultRules() {
    // Code block validation rules
    this.addRule('code-block-closed', (content) => {
      // Find all code block starts
      const codeBlockStarts = [...content.matchAll(/```/g)];
      const isUnclosed = codeBlockStarts.length % 2 !== 0;
      
      return {
        isValid: !isUnclosed,
        message: isUnclosed ? 'Found unclosed code blocks' : 'All code blocks are properly closed',
        issues: isUnclosed ? [{
          type: 'unclosed_code_block',
          line: this.getLineNumber(content, codeBlockStarts[codeBlockStarts.length - 1][0]),
          description: 'Code block is not properly closed'
        }] : []
      };
    });

    // Table validation rules
    this.addRule('table-structure', (content) => {
      const tables = this.extractTables(content);
      const issues = [];
      
      tables.forEach((table) => {
        const rows = table.split('\n').filter(row => row.trim());
        if (rows.length < 2) return;
        
        const headerCols = (rows[0].match(/\|/g) || []).length - 1;
        
        rows.slice(2).forEach((row) => {
          const cols = (row.match(/\|/g) || []).length - 1;
          if (cols !== headerCols) {
            issues.push({
              type: 'table_column_mismatch',
              line: this.getLineNumber(content, row),
              description: `Row has ${cols} columns, expected ${headerCols}`
            });
          }
        });
      });
      
      return {
        isValid: issues.length === 0,
        message: `Found ${issues.length} table structure issues`,
        issues
      };
    });

    // Mermaid diagram validation rules
    this.addRule('mermaid-syntax', (content) => {
      const mermaidBlocks = this.extractMermaidBlocks(content);
      const issues = [];
      
      mermaidBlocks.forEach((block) => {
        // Check for direction definition
        if (!block.match(/^\s*(graph|flowchart)\s+(TB|TD|BT|RL|LR)/m)) {
          issues.push({
            type: 'mermaid_missing_direction',
            line: this.getLineNumber(content, block),
            description: 'Mermaid diagram missing direction definition'
          });
        }
        
        // Check node count (approximate)
        const nodeCount = (block.match(/\w+\[.*?\]/g) || []).length;
        if (nodeCount > 20) {
          issues.push({
            type: 'mermaid_too_many_nodes',
            line: this.getLineNumber(content, block),
            description: `Diagram has ${nodeCount} nodes, consider splitting`
          });
        }
      });
      
      return {
        isValid: issues.length === 0,
        message: `Found ${issues.length} Mermaid diagram issues`,
        issues
      };
    });

    // Heading hierarchy validation
    this.addRule('heading-hierarchy', (content) => {
      const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
      const issues = [];
      let lastLevel = 0;
      
      headings.forEach((heading) => {
        const level = heading.match(/^#+/)[0].length;
        
        if (level > lastLevel + 1) {
          issues.push({
            type: 'heading_hierarchy_skip',
            line: this.getLineNumber(content, heading),
            description: `Heading level ${level} follows level ${lastLevel}, skipping levels`
          });
        }
        
        lastLevel = level;
      });
      
      return {
        isValid: issues.length === 0,
        message: `Found ${issues.length} heading hierarchy issues`,
        issues
      };
    });
  }

  /**
   * Add a custom validation rule
   * @param {string} name - Rule name
   * @param {Function} validator - Validation function
   */
  addRule(name, validator) {
    this.validationRules.set(name, validator);
  }

  /**
   * Validate content against all rules
   * @param {string} content - Content to validate
   * @param {Array} rulesToRun - Specific rules to run (optional)
   * @returns {Object} Validation result
   */
  validate(content, rulesToRun = null) {
    const results = {
      isValid: true,
      totalIssues: 0,
      ruleResults: {},
      allIssues: []
    };

    const rulesToExecute = rulesToRun || Array.from(this.validationRules.keys());
    
    for (const ruleName of rulesToExecute) {
      if (this.validationRules.has(ruleName)) {
        try {
          const ruleResult = this.validationRules.get(ruleName)(content);
          results.ruleResults[ruleName] = ruleResult;
          
          if (!ruleResult.isValid) {
            results.isValid = false;
            results.totalIssues += ruleResult.issues.length;
            results.allIssues.push(...ruleResult.issues);
          }
        } catch (error) {
          results.ruleResults[ruleName] = {
            isValid: false,
            message: `Rule execution failed: ${error.message}`,
            issues: []
          };
          results.isValid = false;
        }
      }
    }

    return results;
  }

  /**
   * Validate a file
   * @param {string} filePath - Path to file to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const result = this.validate(content);
      result.filePath = filePath;
      return result;
    } catch (error) {
      return {
        isValid: false,
        filePath,
        error: error.message,
        totalIssues: 0,
        ruleResults: {},
        allIssues: []
      };
    }
  }

  /**
   * Validate multiple files
   * @param {Array|string} patterns - File patterns to validate
   * @returns {Promise<Object>} Aggregated validation results
   */
  async validateFiles(patterns) {
    const filePatterns = Array.isArray(patterns) ? patterns : [patterns];
    const files = [];
    
    for (const pattern of filePatterns) {
      const matchedFiles = await glob(pattern);
      files.push(...matchedFiles);
    }

    const results = {
      isValid: true,
      totalFiles: files.length,
      validFiles: 0,
      invalidFiles: 0,
      totalIssues: 0,
      fileResults: []
    };

    for (const file of files) {
      const fileResult = await this.validateFile(file);
      results.fileResults.push(fileResult);
      
      if (fileResult.isValid) {
        results.validFiles++;
      } else {
        results.invalidFiles++;
        results.isValid = false;
        results.totalIssues += fileResult.totalIssues;
      }
    }

    return results;
  }

  /**
   * Extract tables from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of table strings
   */
  extractTables(content) {
    const tableRegex = /^\|.*\|$/gm;
    const matches = content.match(tableRegex);
    if (!matches) return [];
    
    const tables = [];
    let currentTable = [];
    
    for (const match of matches) {
      if (match.includes('---') || match.includes('===')) {
        if (currentTable.length > 0) {
          currentTable.push(match);
        }
      } else if (currentTable.length > 0 && match.trim().startsWith('|')) {
        currentTable.push(match);
      } else {
        if (currentTable.length > 0) {
          tables.push(currentTable.join('\n'));
          currentTable = [];
        }
        currentTable.push(match);
      }
    }
    
    if (currentTable.length > 0) {
      tables.push(currentTable.join('\n'));
    }
    
    return tables;
  }

  /**
   * Extract Mermaid blocks from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of Mermaid diagram strings
   */
  extractMermaidBlocks(content) {
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    const blocks = [];
    let match;
    
    while ((match = mermaidRegex.exec(content)) !== null) {
      blocks.push(match[1]);
    }
    
    return blocks;
  }

  /**
   * Get line number of a substring in content
   * @param {string} content - Full content
   * @param {string} substring - Substring to find
   * @returns {number} Line number (1-based)
   */
  getLineNumber(content, substring) {
    const index = content.indexOf(substring);
    if (index === -1) return 0;
    
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Generate validation report
   * @param {Object} results - Validation results
   * @returns {string} Formatted report
   */
  generateReport(results) {
    let report = '# Validation Report\n\n';
    report += `**Overall Status:** ${results.isValid ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `**Total Issues:** ${results.totalIssues}\n\n`;

    if (results.fileResults) {
      report += '## File Summary\n';
      report += `- Total Files: ${results.totalFiles}\n`;
      report += `- Valid Files: ${results.validFiles}\n`;
      report += `- Invalid Files: ${results.invalidFiles}\n\n`;

      if (results.invalidFiles > 0) {
        report += '## Issues by File\n\n';
        results.fileResults.forEach(fileResult => {
          if (!fileResult.isValid) {
            report += `### ${fileResult.filePath}\n`;
            report += `Issues: ${fileResult.totalIssues}\n\n`;
            
            Object.entries(fileResult.ruleResults).forEach(([ruleName, ruleResult]) => {
              if (!ruleResult.isValid) {
                report += `**${ruleName}:** ${ruleResult.message}\n`;
                ruleResult.issues.forEach(issue => {
                  report += `- Line ${issue.line}: ${issue.description}\n`;
                });
                report += '\n';
              }
            });
          }
        });
      }
    }

    return report;
  }
}