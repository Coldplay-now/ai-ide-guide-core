/**
 * Table Format Fixer
 * Detects and fixes table formatting issues in Markdown documents
 * 
 * Handles:
 * - Column count mismatches between header and data rows
 * - Empty cells identification and filling
 * - Wide table detection and optimization
 */

import { BaseFixer } from '../core/base-fixer.js';

export class TableFixer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    this.maxColumns = options.maxColumns || 8;
    this.emptyPlaceholder = options.emptyPlaceholder || '-';
  }

  /**
   * Detect table issues in content
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected table issues
   */
  detectIssues(content, filePath) {
    this.issues = [];
    const tables = this.extractTables(content);
    
    tables.forEach((table, tableIndex) => {
      this.analyzeTable(table, tableIndex, filePath);
    });

    return this.issues;
  }

  /**
   * Extract all tables from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of table objects with metadata
   */
  extractTables(content) {
    const tables = [];
    const lines = content.split('\n');
    let currentTable = null;
    let tableStartLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line looks like a table row (contains |)
      if (line.includes('|') && line.length > 0) {
        if (!currentTable) {
          // Start of new table
          currentTable = {
            startLine: i + 1, // 1-based line numbers
            endLine: i + 1,
            rows: [],
            rawLines: []
          };
          tableStartLine = i;
        }
        
        currentTable.rows.push(this.parseTableRow(line));
        currentTable.rawLines.push(line);
        currentTable.endLine = i + 1;
      } else if (currentTable) {
        // End of current table
        if (currentTable.rows.length > 0) {
          tables.push(currentTable);
        }
        currentTable = null;
      }
    }

    // Handle table at end of file
    if (currentTable && currentTable.rows.length > 0) {
      tables.push(currentTable);
    }

    return tables;
  }

  /**
   * Parse a table row into cells
   * @param {string} line - Table row line
   * @returns {Object} Parsed row with cells and metadata
   */
  parseTableRow(line) {
    // Remove leading/trailing pipes and split
    const cleanLine = line.replace(/^\||\|$/g, '').trim();
    const cells = cleanLine.split('|').map(cell => cell.trim());
    
    // Check if this is a separator row (contains only -, :, |, and spaces)
    const isSeparator = /^[\s\-:|]*$/.test(cleanLine);
    
    return {
      cells,
      cellCount: cells.length,
      isSeparator,
      rawLine: line
    };
  }

  /**
   * Analyze a single table for issues
   * @param {Object} table - Table object to analyze
   * @param {number} tableIndex - Index of table in document
   * @param {string} filePath - File path for issue reporting
   */
  analyzeTable(table, tableIndex, filePath) {
    if (table.rows.length < 2) {
      // Need at least header and separator
      return;
    }

    // Find header row (first non-separator row)
    let headerRow = null;
    let headerIndex = -1;
    
    for (let i = 0; i < table.rows.length; i++) {
      if (!table.rows[i].isSeparator) {
        headerRow = table.rows[i];
        headerIndex = i;
        break;
      }
    }

    if (!headerRow) {
      return;
    }

    const expectedColumns = headerRow.cellCount;

    // Check for column count mismatches
    this.checkColumnMismatches(table, expectedColumns, tableIndex, filePath);
    
    // Check for empty cells
    this.checkEmptyCells(table, tableIndex, filePath);
    
    // Check for wide tables
    this.checkWideTable(table, expectedColumns, tableIndex, filePath);
  }

  /**
   * Check for column count mismatches
   * @param {Object} table - Table to check
   * @param {number} expectedColumns - Expected number of columns
   * @param {number} tableIndex - Table index
   * @param {string} filePath - File path
   */
  checkColumnMismatches(table, expectedColumns, tableIndex, filePath) {
    table.rows.forEach((row, rowIndex) => {
      if (!row.isSeparator && row.cellCount !== expectedColumns) {
        const issue = this.createIssue(
          'table_column_mismatch',
          table.startLine + rowIndex,
          `Table ${tableIndex + 1}, row ${rowIndex + 1}: Expected ${expectedColumns} columns, found ${row.cellCount}`,
          'major'
        );
        
        issue.tableIndex = tableIndex;
        issue.rowIndex = rowIndex;
        issue.expected = expectedColumns;
        issue.actual = row.cellCount;
        issue.category = 'table';
        
        this.issues.push(issue);
      }
    });
  }

  /**
   * Check for empty cells
   * @param {Object} table - Table to check
   * @param {number} tableIndex - Table index
   * @param {string} filePath - File path
   */
  checkEmptyCells(table, tableIndex, filePath) {
    table.rows.forEach((row, rowIndex) => {
      if (!row.isSeparator) {
        row.cells.forEach((cell, cellIndex) => {
          if (cell === '' || cell.trim() === '') {
            const issue = this.createIssue(
              'table_empty_cell',
              table.startLine + rowIndex,
              `Table ${tableIndex + 1}, row ${rowIndex + 1}, column ${cellIndex + 1}: Empty cell detected`,
              'minor'
            );
            
            issue.tableIndex = tableIndex;
            issue.rowIndex = rowIndex;
            issue.columnIndex = cellIndex;
            issue.category = 'table';
            
            this.issues.push(issue);
          }
        });
      }
    });
  }

  /**
   * Check for tables that are too wide
   * @param {Object} table - Table to check
   * @param {number} columnCount - Number of columns
   * @param {number} tableIndex - Table index
   * @param {string} filePath - File path
   */
  checkWideTable(table, columnCount, tableIndex, filePath) {
    if (columnCount > this.maxColumns) {
      const issue = this.createIssue(
        'table_too_wide',
        table.startLine,
        `Table ${tableIndex + 1}: Has ${columnCount} columns, exceeds recommended maximum of ${this.maxColumns}`,
        'warning'
      );
      
      issue.tableIndex = tableIndex;
      issue.columnCount = columnCount;
      issue.maxColumns = this.maxColumns;
      issue.category = 'table';
      
      this.issues.push(issue);
    }
  }

  /**
   * Fix detected table issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix
   * @returns {Object} Fix result with modified content and changes
   */
  fix(content, issues) {
    if (!issues || issues.length === 0) {
      return {
        content,
        changes: [],
        fixed: 0
      };
    }

    let fixedContent = content;
    const changes = [];
    let fixedCount = 0;

    // Group issues by table for efficient processing
    const issuesByTable = this.groupIssuesByTable(issues);
    
    // Process tables in reverse order to maintain line numbers
    const tableIndices = Object.keys(issuesByTable).map(Number).sort((a, b) => b - a);
    
    for (const tableIndex of tableIndices) {
      const tableIssues = issuesByTable[tableIndex];
      const fixResult = this.fixTableIssues(fixedContent, tableIndex, tableIssues);
      
      fixedContent = fixResult.content;
      changes.push(...fixResult.changes);
      fixedCount += fixResult.fixed;
    }

    return {
      content: fixedContent,
      changes,
      fixed: fixedCount
    };
  }

  /**
   * Group issues by table index
   * @param {Array} issues - Array of issues
   * @returns {Object} Issues grouped by table index
   */
  groupIssuesByTable(issues) {
    const grouped = {};
    
    issues.forEach(issue => {
      if (issue.tableIndex !== undefined) {
        if (!grouped[issue.tableIndex]) {
          grouped[issue.tableIndex] = [];
        }
        grouped[issue.tableIndex].push(issue);
      }
    });
    
    return grouped;
  }

  /**
   * Fix issues for a specific table
   * @param {string} content - Content to fix
   * @param {number} tableIndex - Index of table to fix
   * @param {Array} issues - Issues for this table
   * @returns {Object} Fix result
   */
  fixTableIssues(content, tableIndex, issues) {
    const tables = this.extractTables(content);
    
    if (tableIndex >= tables.length) {
      return { content, changes: [], fixed: 0 };
    }

    const table = tables[tableIndex];
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;

    // Fix column mismatches
    const columnMismatchIssues = issues.filter(i => i.type === 'table_column_mismatch');
    if (columnMismatchIssues.length > 0) {
      const fixResult = this.fixColumnMismatches(table, columnMismatchIssues);
      if (fixResult.fixed) {
        // Replace table lines in content
        for (let i = 0; i < table.rows.length; i++) {
          const lineIndex = table.startLine - 1 + i;
          lines[lineIndex] = fixResult.fixedRows[i];
        }
        changes.push(...fixResult.changes);
        fixedCount += fixResult.fixed;
      }
    }

    // Fix empty cells
    const emptyCellIssues = issues.filter(i => i.type === 'table_empty_cell');
    if (emptyCellIssues.length > 0) {
      const fixResult = this.fixEmptyCells(table, emptyCellIssues);
      if (fixResult.fixed) {
        // Replace table lines in content
        for (let i = 0; i < table.rows.length; i++) {
          const lineIndex = table.startLine - 1 + i;
          lines[lineIndex] = fixResult.fixedRows[i];
        }
        changes.push(...fixResult.changes);
        fixedCount += fixResult.fixed;
      }
    }

    return {
      content: lines.join('\n'),
      changes,
      fixed: fixedCount
    };
  }

  /**
   * Fix column count mismatches in a table
   * @param {Object} table - Table to fix
   * @param {Array} issues - Column mismatch issues
   * @returns {Object} Fix result
   */
  fixColumnMismatches(table, issues) {
    // Find the most common column count (likely the correct one)
    const columnCounts = table.rows
      .filter(row => !row.isSeparator)
      .map(row => row.cellCount);
    
    const expectedColumns = this.getMostCommonValue(columnCounts);
    const fixedRows = [];
    const changes = [];
    let fixedCount = 0;

    table.rows.forEach((row, rowIndex) => {
      if (row.isSeparator) {
        // Keep separator rows as-is
        fixedRows.push(row.rawLine);
      } else if (row.cellCount !== expectedColumns) {
        // Fix the row
        const fixedCells = [...row.cells];
        
        if (row.cellCount < expectedColumns) {
          // Add missing cells
          while (fixedCells.length < expectedColumns) {
            fixedCells.push(this.emptyPlaceholder);
          }
        } else {
          // Remove extra cells (truncate)
          fixedCells.splice(expectedColumns);
        }
        
        const fixedLine = `| ${fixedCells.join(' | ')} |`;
        fixedRows.push(fixedLine);
        
        changes.push({
          type: 'modification',
          line: table.startLine + rowIndex,
          oldContent: row.rawLine,
          newContent: fixedLine,
          reason: `Fixed column count from ${row.cellCount} to ${expectedColumns}`
        });
        
        fixedCount++;
      } else {
        // Keep correct rows as-is
        fixedRows.push(row.rawLine);
      }
    });

    return {
      fixedRows,
      changes,
      fixed: fixedCount
    };
  }

  /**
   * Fix empty cells in a table
   * @param {Object} table - Table to fix
   * @param {Array} issues - Empty cell issues
   * @returns {Object} Fix result
   */
  fixEmptyCells(table, issues) {
    const fixedRows = [];
    const changes = [];
    let fixedCount = 0;

    table.rows.forEach((row, rowIndex) => {
      if (row.isSeparator) {
        fixedRows.push(row.rawLine);
      } else {
        const fixedCells = row.cells.map((cell, cellIndex) => {
          if (cell === '' || cell.trim() === '') {
            fixedCount++;
            changes.push({
              type: 'modification',
              line: table.startLine + rowIndex,
              column: cellIndex + 1,
              oldContent: cell,
              newContent: this.emptyPlaceholder,
              reason: 'Filled empty cell with placeholder'
            });
            return this.emptyPlaceholder;
          }
          return cell;
        });
        
        const fixedLine = `| ${fixedCells.join(' | ')} |`;
        fixedRows.push(fixedLine);
      }
    });

    return {
      fixedRows,
      changes,
      fixed: fixedCount
    };
  }

  /**
   * Get the most common value in an array
   * @param {Array} values - Array of values
   * @returns {*} Most common value
   */
  getMostCommonValue(values) {
    const counts = {};
    let maxCount = 0;
    let mostCommon = values[0];

    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
      if (counts[value] > maxCount) {
        maxCount = counts[value];
        mostCommon = value;
      }
    });

    return mostCommon;
  }

  /**
   * Validate table fix results
   * @param {string} originalContent - Original content
   * @param {string} fixedContent - Fixed content
   * @returns {Object} Validation result
   */
  validate(originalContent, fixedContent) {
    const warnings = [];
    const errors = [];

    try {
      const originalTables = this.extractTables(originalContent);
      const fixedTables = this.extractTables(fixedContent);

      if (originalTables.length !== fixedTables.length) {
        warnings.push(`Table count changed from ${originalTables.length} to ${fixedTables.length}`);
      }

      // Validate each table
      fixedTables.forEach((table, index) => {
        const issues = [];
        this.analyzeTable(table, index, 'validation');
        
        if (issues.length > 0) {
          warnings.push(`Table ${index + 1} still has ${issues.length} issues after fixing`);
        }
      });

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}