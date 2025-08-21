/**
 * Format Standardizer
 * Fixes markdown format specification violations, standardizes list/quote formats,
 * and cleans up whitespace issues
 */

import { BaseFixer } from '../core/base-fixer.js';
import { FormatDetector } from './format-detector.js';

export class FormatStandardizer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    this.detector = new FormatDetector(options);
    this.fixRules = {
      // Whitespace cleanup rules
      whitespace: {
        removeTrailingWhitespace: true,
        normalizeLineEndings: true,
        removeExtraBlankLines: true,
        maxConsecutiveBlankLines: 2
      },
      // Line length optimization
      lineLength: {
        maxLength: 120,
        wrapLongLines: false, // Don't auto-wrap by default to preserve content
        breakOnWords: true
      },
      // Format standardization
      format: {
        standardizeListMarkers: true,
        standardizeQuoteMarkers: true,
        standardizeEmphasis: true,
        addBlankLinesAroundHeadings: true,
        standardizeHeadingSpacing: true
      }
    };
  }

  /**
   * Detect issues using the format detector
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected issues
   */
  detectIssues(content, filePath) {
    return this.detector.detectIssues(content, filePath);
  }

  /**
   * Fix format standardization issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix (optional, will detect if not provided)
   * @returns {Object} Fix result with modified content and changes
   */
  fix(content, issues = null) {
    if (!issues) {
      issues = this.detectIssues(content, 'unknown');
    }

    let fixedContent = content;
    const changes = [];
    const warnings = [];
    const errors = [];

    try {
      // Apply fixes in order of priority
      const fixResult1 = this.fixWhitespaceIssues(fixedContent, issues);
      fixedContent = fixResult1.content;
      changes.push(...fixResult1.changes);
      warnings.push(...fixResult1.warnings);

      const fixResult2 = this.fixListFormatIssues(fixedContent, issues);
      fixedContent = fixResult2.content;
      changes.push(...fixResult2.changes);
      warnings.push(...fixResult2.warnings);

      const fixResult3 = this.fixQuoteFormatIssues(fixedContent, issues);
      fixedContent = fixResult3.content;
      changes.push(...fixResult3.changes);
      warnings.push(...fixResult3.warnings);

      const fixResult4 = this.fixHeadingFormatIssues(fixedContent, issues);
      fixedContent = fixResult4.content;
      changes.push(...fixResult4.changes);
      warnings.push(...fixResult4.warnings);

      const fixResult5 = this.fixEmphasisFormatIssues(fixedContent, issues);
      fixedContent = fixResult5.content;
      changes.push(...fixResult5.changes);
      warnings.push(...fixResult5.warnings);

      this.log(`Applied ${changes.length} format standardization fixes`);

    } catch (error) {
      errors.push(`Format standardization failed: ${error.message}`);
      this.log(`Format standardization error: ${error.message}`, 'error');
    }

    return {
      content: fixedContent,
      changes,
      warnings,
      errors,
      summary: {
        totalChanges: changes.length,
        issuesFixed: changes.length,
        issuesSkipped: issues.length - changes.length
      }
    };
  }

  /**
   * Fix whitespace-related issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Detected issues
   * @returns {Object} Fix result
   */
  fixWhitespaceIssues(content, issues) {
    let fixedContent = content;
    const changes = [];
    const warnings = [];

    // Remove trailing whitespace
    if (this.fixRules.whitespace.removeTrailingWhitespace) {
      const trailingWhitespaceIssues = issues.filter(issue => issue.type === 'trailing_whitespace');
      if (trailingWhitespaceIssues.length > 0) {
        const lines = fixedContent.split('\n');
        let hasChanges = false;

        for (let i = 0; i < lines.length; i++) {
          const originalLine = lines[i];
          const trimmedLine = originalLine.replace(/\s+$/, '');
          if (originalLine !== trimmedLine) {
            lines[i] = trimmedLine;
            hasChanges = true;
            changes.push({
              type: 'modification',
              line: i + 1,
              description: 'Removed trailing whitespace',
              oldContent: originalLine,
              newContent: trimmedLine
            });
          }
        }

        if (hasChanges) {
          fixedContent = lines.join('\n');
        }
      }
    }

    // Normalize line endings
    if (this.fixRules.whitespace.normalizeLineEndings) {
      const normalizedContent = fixedContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      if (normalizedContent !== fixedContent) {
        fixedContent = normalizedContent;
        changes.push({
          type: 'modification',
          line: 0,
          description: 'Normalized line endings to LF'
        });
      }
    }

    // Remove excessive blank lines
    if (this.fixRules.whitespace.removeExtraBlankLines) {
      const maxBlankLines = this.fixRules.whitespace.maxConsecutiveBlankLines;
      const blankLineRegex = new RegExp(`\n{${maxBlankLines + 1},}`, 'g');
      const replacement = '\n'.repeat(maxBlankLines);
      
      const cleanedContent = fixedContent.replace(blankLineRegex, replacement);
      if (cleanedContent !== fixedContent) {
        fixedContent = cleanedContent;
        changes.push({
          type: 'modification',
          line: 0,
          description: `Reduced excessive blank lines to maximum of ${maxBlankLines}`
        });
      }
    }

    return { content: fixedContent, changes, warnings };
  }

  /**
   * Fix list format issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Detected issues
   * @returns {Object} Fix result
   */
  fixListFormatIssues(content, issues) {
    let fixedContent = content;
    const changes = [];
    const warnings = [];

    if (!this.fixRules.format.standardizeListMarkers) {
      return { content: fixedContent, changes, warnings };
    }

    // Always check for list markers, not just based on detected issues
    // since the detector might not catch all cases

    const lines = fixedContent.split('\n');
    let hasChanges = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Fix unordered list markers
      const unorderedMatch = line.match(/^(\s*)([-*+])(\s+.+)$/);
      if (unorderedMatch) {
        const [, indent, marker, rest] = unorderedMatch;
        const preferredMarker = '-';
        
        if (marker !== preferredMarker) {
          const newLine = `${indent}${preferredMarker}${rest}`;
          lines[i] = newLine;
          hasChanges = true;
          changes.push({
            type: 'modification',
            line: i + 1,
            description: `Standardized list marker from '${marker}' to '${preferredMarker}'`,
            oldContent: line,
            newContent: newLine
          });
        }
      }

      // Fix ordered list markers
      const orderedMatch = line.match(/^(\s*)(\d+)([)])(\s+.+)$/);
      if (orderedMatch) {
        const [, indent, number, marker, rest] = orderedMatch;
        if (marker === ')') {
          const newLine = `${indent}${number}.${rest}`;
          lines[i] = newLine;
          hasChanges = true;
          changes.push({
            type: 'modification',
            line: i + 1,
            description: `Standardized ordered list marker from ')' to '.'`,
            oldContent: line,
            newContent: newLine
          });
        }
      }
    }

    if (hasChanges) {
      fixedContent = lines.join('\n');
    }

    return { content: fixedContent, changes, warnings };
  }

  /**
   * Fix quote format issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Detected issues
   * @returns {Object} Fix result
   */
  fixQuoteFormatIssues(content, issues) {
    let fixedContent = content;
    const changes = [];
    const warnings = [];

    if (!this.fixRules.format.standardizeQuoteMarkers) {
      return { content: fixedContent, changes, warnings };
    }

    // Always check for quote issues

    const lines = fixedContent.split('\n');
    let hasChanges = false;

    // Add blank lines after quotes where missing
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // Check if current line is a quote and next line is not empty and not a quote
      if (line.match(/^\s*>\s/) && nextLine.trim() !== '' && !nextLine.match(/^\s*>\s/)) {
        lines.splice(i + 1, 0, '');
        hasChanges = true;
        changes.push({
          type: 'addition',
          line: i + 2,
          description: 'Added blank line after quote',
          newContent: ''
        });
        i++; // Skip the newly added line
      }
    }

    if (hasChanges) {
      fixedContent = lines.join('\n');
    }

    return { content: fixedContent, changes, warnings };
  }

  /**
   * Fix heading format issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Detected issues
   * @returns {Object} Fix result
   */
  fixHeadingFormatIssues(content, issues) {
    let fixedContent = content;
    const changes = [];
    const warnings = [];

    if (!this.fixRules.format.addBlankLinesAroundHeadings) {
      return { content: fixedContent, changes, warnings };
    }

    // Always check for heading issues

    const lines = fixedContent.split('\n');
    let hasChanges = false;

    // Process from bottom to top to maintain line numbers
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        // Check for blank line after heading
        if (i < lines.length - 1) {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.trim() !== '') {
            lines.splice(i + 1, 0, '');
            hasChanges = true;
            changes.push({
              type: 'addition',
              line: i + 2,
              description: 'Added blank line after heading',
              newContent: ''
            });
          }
        }
        
        // Check for blank line before heading (except first line)
        if (i > 0) {
          const prevLine = lines[i - 1];
          if (prevLine && prevLine.trim() !== '') {
            lines.splice(i, 0, '');
            hasChanges = true;
            changes.push({
              type: 'addition',
              line: i + 1,
              description: 'Added blank line before heading',
              newContent: ''
            });
          }
        }
      }
    }

    if (hasChanges) {
      fixedContent = lines.join('\n');
    }

    return { content: fixedContent, changes, warnings };
  }

  /**
   * Fix emphasis format issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Detected issues
   * @returns {Object} Fix result
   */
  fixEmphasisFormatIssues(content, issues) {
    let fixedContent = content;
    const changes = [];
    const warnings = [];

    if (!this.fixRules.format.standardizeEmphasis) {
      return { content: fixedContent, changes, warnings };
    }

    // Always check for emphasis issues

    const lines = fixedContent.split('\n');
    let inCodeBlock = false;
    let hasChanges = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Track code blocks
      if (line.match(/^```/)) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      // Skip lines in code blocks or inline code
      if (inCodeBlock || line.includes('`')) {
        continue;
      }
      
      // Standardize bold formatting: prefer ** over __
      const originalLine = line;
      line = line.replace(/__([^_]+)__/g, '**$1**');
      
      // Standardize italic formatting: prefer * over _ (but not inside bold)
      line = line.replace(/(?<!\*)_([^_]+)_(?!\*)/g, '*$1*');
      
      if (line !== originalLine) {
        lines[i] = line;
        hasChanges = true;
        changes.push({
          type: 'modification',
          line: i + 1,
          description: 'Standardized emphasis formatting',
          oldContent: originalLine,
          newContent: line
        });
      }
    }

    if (hasChanges) {
      fixedContent = lines.join('\n');
    }

    return { content: fixedContent, changes, warnings };
  }

  /**
   * Optimize line length (optional feature)
   * @param {string} content - Content to optimize
   * @returns {Object} Optimization result
   */
  optimizeLineLength(content) {
    const lines = content.split('\n');
    const changes = [];
    const warnings = [];
    const maxLength = this.fixRules.lineLength.maxLength;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > maxLength) {
        // Only wrap if it's not a heading, code block, or link
        if (!line.match(/^#+\s/) && !line.match(/^```/) && !line.includes('](')) {
          if (this.fixRules.lineLength.wrapLongLines) {
            // Would implement wrapping here
            warnings.push(`Line ${i + 1} exceeds ${maxLength} characters but was not wrapped to preserve content integrity`);
          } else {
            warnings.push(`Line ${i + 1} exceeds ${maxLength} characters (${line.length} chars)`);
          }
        }
      }
    }

    return { content, changes, warnings };
  }

  /**
   * Get format standardization statistics
   * @param {string} originalContent - Original content
   * @param {string} fixedContent - Fixed content
   * @returns {Object} Statistics about the standardization
   */
  getStandardizationStats(originalContent, fixedContent) {
    const originalLines = originalContent.split('\n');
    const fixedLines = fixedContent.split('\n');

    return {
      originalLineCount: originalLines.length,
      fixedLineCount: fixedLines.length,
      linesAdded: Math.max(0, fixedLines.length - originalLines.length),
      linesRemoved: Math.max(0, originalLines.length - fixedLines.length),
      characterCount: {
        original: originalContent.length,
        fixed: fixedContent.length,
        difference: fixedContent.length - originalContent.length
      },
      whitespaceChanges: {
        trailingWhitespaceRemoved: originalLines.filter(line => line.match(/\s+$/)).length,
        blankLinesNormalized: Math.abs(fixedLines.filter(line => line.trim() === '').length - originalLines.filter(line => line.trim() === '').length)
      }
    };
  }
}