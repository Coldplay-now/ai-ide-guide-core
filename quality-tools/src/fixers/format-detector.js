/**
 * Format Standard Detector
 * Detects markdown format specification violations, list/quote format issues,
 * and file naming convention problems
 */

import { BaseFixer } from '../core/base-fixer.js';
import path from 'path';

export class FormatDetector extends BaseFixer {
  constructor(options = {}) {
    super(options);
    this.formatRules = {
      // Markdown format rules
      markdown: {
        maxLineLength: 120,
        requireBlankLineBeforeHeading: true,
        requireBlankLineAfterHeading: true,
        consistentListMarkers: true,
        consistentQuoteMarkers: true,
        noTrailingWhitespace: true,
        consistentEmphasis: true // Use ** for bold, * for italic
      },
      // List format rules
      lists: {
        unorderedMarker: '-', // Prefer - over * or +
        orderedMarkerStyle: 'period', // 1. over 1)
        consistentIndentation: 2, // 2 spaces for nested items
        blankLinesBetweenItems: false // No blank lines between simple list items
      },
      // Quote format rules
      quotes: {
        marker: '>', // Standard quote marker
        nestedIndentation: 2, // 2 spaces for nested quotes
        blankLineAfterQuote: true
      },
      // File naming conventions
      fileNaming: {
        allowedExtensions: ['.md'],
        namingPattern: /^[a-z0-9]+(-[a-z0-9]+)*\.md$/, // kebab-case pattern (case sensitive)
        maxNameLength: 100,
        reservedNames: ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9']
      }
    };
  }

  /**
   * Detect format standard issues in content
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected issues
   */
  detectIssues(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    // Check file naming conventions
    issues.push(...this.checkFileNaming(filePath));

    // Check markdown format issues
    issues.push(...this.checkMarkdownFormat(lines, content));

    // Check list format issues
    issues.push(...this.checkListFormat(lines));

    // Check quote format issues
    issues.push(...this.checkQuoteFormat(lines));

    this.issues = issues;
    return issues;
  }

  /**
   * Check file naming conventions
   * @param {string} filePath - Path to the file
   * @returns {Array} Array of file naming issues
   */
  checkFileNaming(filePath) {
    const issues = [];
    const fileName = path.basename(filePath);
    const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
    const extension = path.extname(filePath);

    // Check allowed extensions
    if (!this.formatRules.fileNaming.allowedExtensions.includes(extension.toLowerCase())) {
      issues.push(this.createIssue(
        'invalid_file_extension',
        0,
        `File extension '${extension}' is not allowed. Use: ${this.formatRules.fileNaming.allowedExtensions.join(', ')}`,
        'warning'
      ));
    }

    // Check naming pattern
    if (!this.formatRules.fileNaming.namingPattern.test(fileName)) {
      issues.push(this.createIssue(
        'invalid_file_naming',
        0,
        `File name '${fileName}' doesn't follow kebab-case convention. Use lowercase letters, numbers, and hyphens only.`,
        'warning'
      ));
    }

    // Check name length
    if (fileName.length > this.formatRules.fileNaming.maxNameLength) {
      issues.push(this.createIssue(
        'file_name_too_long',
        0,
        `File name is ${fileName.length} characters long, exceeds maximum of ${this.formatRules.fileNaming.maxNameLength}`,
        'warning'
      ));
    }

    // Check reserved names
    if (this.formatRules.fileNaming.reservedNames.includes(fileNameWithoutExt.toLowerCase())) {
      issues.push(this.createIssue(
        'reserved_file_name',
        0,
        `File name '${fileNameWithoutExt}' is a reserved system name`,
        'error'
      ));
    }

    return issues;
  }

  /**
   * Check markdown format standards
   * @param {Array} lines - Array of content lines
   * @param {string} content - Full content string
   * @returns {Array} Array of markdown format issues
   */
  checkMarkdownFormat(lines, content) {
    const issues = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const prevLine = i > 0 ? lines[i - 1] : '';
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

      // Check line length
      if (line.length > this.formatRules.markdown.maxLineLength) {
        issues.push(this.createIssue(
          'line_too_long',
          lineNumber,
          `Line exceeds ${this.formatRules.markdown.maxLineLength} characters (${line.length} chars)`,
          'info'
        ));
      }

      // Check trailing whitespace
      if (this.formatRules.markdown.noTrailingWhitespace && line.match(/\s+$/)) {
        issues.push(this.createIssue(
          'trailing_whitespace',
          lineNumber,
          'Line has trailing whitespace',
          'info'
        ));
      }

      // Check heading format
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // Check blank line before heading (except first line)
        if (this.formatRules.markdown.requireBlankLineBeforeHeading && i > 0 && prevLine.trim() !== '') {
          issues.push(this.createIssue(
            'missing_blank_line_before_heading',
            lineNumber,
            'Heading should have a blank line before it',
            'info'
          ));
        }

        // Check blank line after heading
        if (this.formatRules.markdown.requireBlankLineAfterHeading && nextLine && nextLine.trim() !== '') {
          issues.push(this.createIssue(
            'missing_blank_line_after_heading',
            lineNumber,
            'Heading should have a blank line after it',
            'info'
          ));
        }
      }

      // Check emphasis consistency
      if (this.formatRules.markdown.consistentEmphasis) {
        // Check for inconsistent bold formatting
        if (line.includes('__') && line.includes('**')) {
          issues.push(this.createIssue(
            'inconsistent_bold_formatting',
            lineNumber,
            'Use consistent bold formatting: prefer ** over __',
            'info'
          ));
        }

        // Check for inconsistent italic formatting
        if (line.includes('_') && line.includes('*') && !line.includes('**') && !line.includes('__')) {
          const singleAsterisks = (line.match(/(?<!\*)\*(?!\*)/g) || []).length;
          const singleUnderscores = (line.match(/(?<!_)_(?!_)/g) || []).length;
          if (singleAsterisks > 0 && singleUnderscores > 0) {
            issues.push(this.createIssue(
              'inconsistent_italic_formatting',
              lineNumber,
              'Use consistent italic formatting: prefer * over _',
              'info'
            ));
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check list format standards
   * @param {Array} lines - Array of content lines
   * @returns {Array} Array of list format issues
   */
  checkListFormat(lines) {
    const issues = [];
    let inList = false;
    let listType = null; // 'unordered' or 'ordered'
    let listIndentLevel = 0;
    let listMarkers = new Set(); // Track all markers used in current list
    const unorderedMarkers = ['-', '*', '+'];
    const orderedMarkerRegex = /^(\s*)(\d+)([.)]\s+)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for unordered list items
      const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
      if (unorderedMatch) {
        const [, indent, marker, content] = unorderedMatch;
        const currentIndentLevel = indent.length;

        if (!inList) {
          inList = true;
          listType = 'unordered';
          listIndentLevel = currentIndentLevel;
          listMarkers.clear();
        }

        // Track markers used in this list
        listMarkers.add(marker);

        // Check for mixed markers within the same list
        if (this.formatRules.lists.consistentListMarkers && listMarkers.size > 1) {
          issues.push(this.createIssue(
            'inconsistent_list_marker',
            lineNumber,
            `Inconsistent list markers in same list. Use consistent marker throughout.`,
            'info'
          ));
        }

        // Check if using preferred marker
        if (this.formatRules.lists.consistentListMarkers && marker !== this.formatRules.lists.unorderedMarker) {
          issues.push(this.createIssue(
            'inconsistent_list_marker',
            lineNumber,
            `Use consistent list marker: prefer '${this.formatRules.lists.unorderedMarker}' over '${marker}'`,
            'info'
          ));
        }

        // Check indentation consistency
        const expectedIndent = Math.floor(currentIndentLevel / this.formatRules.lists.consistentIndentation) * this.formatRules.lists.consistentIndentation;
        if (currentIndentLevel !== expectedIndent && currentIndentLevel > 0) {
          issues.push(this.createIssue(
            'inconsistent_list_indentation',
            lineNumber,
            `List item indentation should be ${this.formatRules.lists.consistentIndentation} spaces per level`,
            'info'
          ));
        }
      }

      // Check for ordered list items
      const orderedMatch = line.match(orderedMarkerRegex);
      if (orderedMatch) {
        const [, indent, number, marker] = orderedMatch;
        const currentIndentLevel = indent.length;

        if (!inList) {
          inList = true;
          listType = 'ordered';
          listIndentLevel = currentIndentLevel;
          listMarkers.clear();
        }

        // Track markers used in this list
        listMarkers.add(marker);

        // Check marker style consistency
        if (this.formatRules.lists.orderedMarkerStyle === 'period' && marker.includes(')')) {
          issues.push(this.createIssue(
            'inconsistent_ordered_marker',
            lineNumber,
            'Use period (.) instead of parenthesis ()) for ordered lists',
            'info'
          ));
        } else if (this.formatRules.lists.orderedMarkerStyle === 'parenthesis' && marker.includes('.')) {
          issues.push(this.createIssue(
            'inconsistent_ordered_marker',
            lineNumber,
            'Use parenthesis ()) instead of period (.) for ordered lists',
            'info'
          ));
        }
      }

      // Reset list tracking if we're no longer in a list
      if (inList && !unorderedMatch && !orderedMatch) {
        if (line.trim() === '') {
          // Empty line - continue list tracking for now
        } else {
          // Check if this line continues a list item (indented content)
          const isListContinuation = line.match(/^\s+\S/) && line.length > listIndentLevel;
          if (!isListContinuation) {
            inList = false;
            listType = null;
            listIndentLevel = 0;
            listMarkers.clear();
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check quote format standards
   * @param {Array} lines - Array of content lines
   * @returns {Array} Array of quote format issues
   */
  checkQuoteFormat(lines) {
    const issues = [];
    let inQuote = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

      // Check for quote lines
      const quoteMatch = line.match(/^(\s*)(>+)\s*(.*)$/);
      if (quoteMatch) {
        const [, indent, markers, content] = quoteMatch;
        
        if (!inQuote) {
          inQuote = true;
        }

        // Check quote marker consistency for nested quotes
        if (markers.length > 1) {
          // For nested quotes, check if there's proper spacing between > markers
          // Pattern should be "> > " for nested, not ">>"
          const hasProperSpacing = line.match(/^(\s*)>\s+>\s/);
          if (!hasProperSpacing) {
            issues.push(this.createIssue(
              'inconsistent_quote_indentation',
              lineNumber,
              'Nested quote should have space between > markers',
              'info'
            ));
          }
        }
      } else if (inQuote && line.trim() !== '') {
        // We were in a quote but this line isn't a quote and isn't empty
        inQuote = false;
        
        // Check for blank line after quote
        if (this.formatRules.quotes.blankLineAfterQuote) {
          issues.push(this.createIssue(
            'missing_blank_line_after_quote',
            lineNumber,
            'Quote should have a blank line after it',
            'info'
          ));
        }
      } else if (inQuote && line.trim() === '') {
        // Empty line after quote - this is good
        inQuote = false;
      }
    }

    return issues;
  }

  /**
   * Get format statistics
   * @param {string} content - Content to analyze
   * @returns {Object} Format statistics
   */
  getFormatStatistics(content) {
    const lines = content.split('\n');
    const stats = {
      totalLines: lines.length,
      totalCharacters: content.length,
      averageLineLength: Math.round(content.length / lines.length),
      maxLineLength: Math.max(...lines.map(line => line.length)),
      emptyLines: lines.filter(line => line.trim() === '').length,
      headings: {
        h1: (content.match(/^# /gm) || []).length,
        h2: (content.match(/^## /gm) || []).length,
        h3: (content.match(/^### /gm) || []).length,
        h4: (content.match(/^#### /gm) || []).length,
        h5: (content.match(/^##### /gm) || []).length,
        h6: (content.match(/^###### /gm) || []).length
      },
      lists: {
        unordered: (content.match(/^\s*[-*+] /gm) || []).length,
        ordered: (content.match(/^\s*\d+[.)] /gm) || []).length
      },
      quotes: (content.match(/^\s*> /gm) || []).length,
      codeBlocks: (content.match(/```/g) || []).length / 2,
      inlineCode: (content.match(/`[^`\n]+`/g) || []).length,
      links: (content.match(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
      images: (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length
    };

    return stats;
  }

  /**
   * Fix method - not implemented for detector (read-only)
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix
   * @returns {Object} Fix result indicating this is a detector only
   */
  fix(content, issues) {
    return {
      content,
      changes: [],
      message: 'FormatDetector is read-only. Use FormatStandardizer to fix issues.'
    };
  }
}