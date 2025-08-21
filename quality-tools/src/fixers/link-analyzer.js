/**
 * Link and Reference Analyzer
 * Detects broken links, duplicate anchors, and orphaned files
 * Implements requirements 5.1, 5.2, 5.3 from the specification
 */

import { BaseFixer } from '../core/base-fixer.js';
import fs from 'fs';
import path from 'path';

export class LinkAnalyzer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    this.projectRoot = options.projectRoot || process.cwd();
    this.fileCache = new Map();
    this.anchorCache = new Map();
    this.linkCache = new Map();
  }

  /**
   * Detect link and reference issues in content
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected issues
   */
  detectIssues(content, filePath) {
    this.issues = [];
    
    // Detect broken links
    this.detectBrokenLinks(content, filePath);
    
    // Detect duplicate anchors
    this.detectDuplicateAnchors(content, filePath);
    
    // Detect orphaned files (requires project-wide analysis)
    this.detectOrphanedFiles(filePath);
    
    return this.issues;
  }

  /**
   * Detect broken internal and external links
   * @param {string} content - Content to analyze
   * @param {string} filePath - Current file path
   */
  detectBrokenLinks(content, filePath) {
    // Regex patterns for different link types
    const linkPatterns = [
      // Markdown links: [text](url)
      /\[([^\]]*)\]\(([^)]+)\)/g,
      // Reference links: [text][ref]
      /\[([^\]]*)\]\[([^\]]+)\]/g,
      // Direct links: <url>
      /<([^>]+)>/g,
      // HTML links: <a href="url">
      /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi
    ];

    linkPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const linkUrl = match[2] || match[1];
        const linkText = match[1] || '';
        const line = this.getLineNumber(content, match.index);
        
        this.analyzeLinkTarget(linkUrl, linkText, line, filePath);
      }
    });
  }

  /**
   * Analyze a specific link target
   * @param {string} linkUrl - URL to analyze
   * @param {string} linkText - Link text
   * @param {number} line - Line number
   * @param {string} filePath - Current file path
   */
  analyzeLinkTarget(linkUrl, linkText, line, filePath) {
    // Skip external URLs (http/https)
    if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
      // Could implement external link validation here
      return;
    }

    // Skip email links
    if (linkUrl.startsWith('mailto:')) {
      return;
    }

    // Handle anchor-only links (#anchor)
    if (linkUrl.startsWith('#')) {
      this.validateAnchorLink(linkUrl, line, filePath);
      return;
    }

    // Handle relative file links
    if (linkUrl.includes('#')) {
      const [filePart, anchorPart] = linkUrl.split('#');
      this.validateFileLink(filePart, line, filePath);
      if (anchorPart) {
        this.validateCrossFileAnchor(filePart, anchorPart, line, filePath);
      }
    } else {
      this.validateFileLink(linkUrl, line, filePath);
    }
  }

  /**
   * Validate anchor link within current file
   * @param {string} anchor - Anchor to validate
   * @param {number} line - Line number
   * @param {string} filePath - Current file path
   */
  validateAnchorLink(anchor, line, filePath) {
    const anchorId = anchor.substring(1); // Remove #
    const fileContent = this.getFileContent(filePath);
    
    if (!this.findAnchorInContent(fileContent, anchorId)) {
      this.issues.push(this.createIssue(
        'broken_anchor_link',
        line,
        `Anchor link "${anchor}" not found in current file`,
        'error'
      ));
    }
  }

  /**
   * Validate file link
   * @param {string} filePath - File path to validate
   * @param {number} line - Line number
   * @param {string} currentFile - Current file path
   */
  validateFileLink(filePath, line, currentFile) {
    const resolvedPath = this.resolveFilePath(filePath, currentFile);
    
    if (!fs.existsSync(resolvedPath)) {
      this.issues.push(this.createIssue(
        'broken_file_link',
        line,
        `File link "${filePath}" points to non-existent file: ${resolvedPath}`,
        'error'
      ));
    }
  }

  /**
   * Validate cross-file anchor
   * @param {string} filePath - Target file path
   * @param {string} anchor - Anchor to validate
   * @param {number} line - Line number
   * @param {string} currentFile - Current file path
   */
  validateCrossFileAnchor(filePath, anchor, line, currentFile) {
    const resolvedPath = this.resolveFilePath(filePath, currentFile);
    
    if (!fs.existsSync(resolvedPath)) {
      return; // File link validation will catch this
    }

    const targetContent = this.getFileContent(resolvedPath);
    if (!this.findAnchorInContent(targetContent, anchor)) {
      this.issues.push(this.createIssue(
        'broken_cross_file_anchor',
        line,
        `Cross-file anchor "${anchor}" not found in file: ${filePath}`,
        'error'
      ));
    }
  }

  /**
   * Detect duplicate anchors in content
   * @param {string} content - Content to analyze
   * @param {string} filePath - Current file path
   */
  detectDuplicateAnchors(content, filePath) {
    const anchors = new Map();
    
    // Find all heading anchors
    const headingPattern = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingPattern.exec(content)) !== null) {
      const headingText = match[2].trim();
      const anchorId = this.generateAnchorId(headingText);
      const line = this.getLineNumber(content, match.index);
      
      if (anchors.has(anchorId)) {
        this.issues.push(this.createIssue(
          'duplicate_anchor',
          line,
          `Duplicate anchor ID "${anchorId}" generated from heading "${headingText}"`,
          'warning'
        ));
      } else {
        anchors.set(anchorId, { line, text: headingText });
      }
    }

    // Find explicit anchor tags
    const anchorPattern = /<a\s+[^>]*(?:name|id)\s*=\s*["']([^"']+)["'][^>]*>/gi;
    while ((match = anchorPattern.exec(content)) !== null) {
      const anchorId = match[1];
      const line = this.getLineNumber(content, match.index);
      
      if (anchors.has(anchorId)) {
        this.issues.push(this.createIssue(
          'duplicate_anchor',
          line,
          `Duplicate explicit anchor ID "${anchorId}"`,
          'error'
        ));
      } else {
        anchors.set(anchorId, { line, explicit: true });
      }
    }

    // Cache anchors for this file
    this.anchorCache.set(filePath, anchors);
  }

  /**
   * Detect orphaned files (files not referenced by any other file)
   * @param {string} filePath - Current file path
   */
  detectOrphanedFiles(filePath) {
    // This requires project-wide analysis
    // For now, we'll mark this as a placeholder for the full implementation
    // The actual implementation would need to scan all files and build a reference graph
    
    // Store file for later orphan analysis
    if (!this.fileCache.has(filePath)) {
      this.fileCache.set(filePath, {
        path: filePath,
        referencedBy: new Set(),
        references: new Set()
      });
    }
  }

  /**
   * Perform project-wide orphan analysis
   * @param {Array} allFiles - Array of all project files
   * @returns {Array} Array of orphaned files
   */
  analyzeOrphanedFiles(allFiles) {
    const orphanedFiles = [];
    const referencedFiles = new Set();
    
    // Build reference graph
    allFiles.forEach(filePath => {
      const content = this.getFileContent(filePath);
      const references = this.extractFileReferences(content, filePath);
      
      references.forEach(ref => {
        referencedFiles.add(ref);
      });
    });

    // Find orphaned files
    allFiles.forEach(filePath => {
      // Skip certain file types that are typically not referenced directly
      const skipPatterns = [
        /\.gitignore$/,
        /README\.md$/i,
        /LICENSE$/i,
        /package\.json$/,
        /\.github\//,
        /node_modules\//,
        /main\.md$/i, // Main files are typically entry points
        /index\.md$/i // Index files are typically entry points
      ];

      const shouldSkip = skipPatterns.some(pattern => pattern.test(filePath));
      
      if (!shouldSkip && !referencedFiles.has(filePath)) {
        orphanedFiles.push({
          file: filePath,
          issue: this.createIssue(
            'orphaned_file',
            1,
            `File "${filePath}" is not referenced by any other file`,
            'info'
          )
        });
      }
    });

    return orphanedFiles;
  }

  /**
   * Extract file references from content
   * @param {string} content - Content to analyze
   * @param {string} currentFile - Current file path
   * @returns {Array} Array of referenced file paths
   */
  extractFileReferences(content, currentFile) {
    const references = new Set();
    
    // Markdown links
    const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkPattern.exec(content)) !== null) {
      const linkUrl = match[2];
      
      // Skip external URLs
      if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
        continue;
      }
      
      // Skip anchor-only links
      if (linkUrl.startsWith('#')) {
        continue;
      }
      
      // Extract file path (remove anchor if present)
      const filePart = linkUrl.split('#')[0];
      if (filePart) {
        const resolvedPath = this.resolveFilePath(filePart, currentFile);
        references.add(resolvedPath);
      }
    }

    return Array.from(references);
  }

  /**
   * Generate anchor ID from heading text (GitHub-style)
   * @param {string} text - Heading text
   * @returns {string} Generated anchor ID
   */
  generateAnchorId(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Find anchor in content
   * @param {string} content - Content to search
   * @param {string} anchorId - Anchor ID to find
   * @returns {boolean} True if anchor found
   */
  findAnchorInContent(content, anchorId) {
    // Check headings
    const headingPattern = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingPattern.exec(content)) !== null) {
      const headingText = match[2].trim();
      const generatedId = this.generateAnchorId(headingText);
      if (generatedId === anchorId) {
        return true;
      }
    }

    // Check explicit anchors
    const anchorPattern = new RegExp(`<a\\s+[^>]*(?:name|id)\\s*=\\s*["']${anchorId}["'][^>]*>`, 'i');
    return anchorPattern.test(content);
  }

  /**
   * Resolve relative file path
   * @param {string} relativePath - Relative path to resolve
   * @param {string} currentFile - Current file path
   * @returns {string} Resolved absolute path
   */
  resolveFilePath(relativePath, currentFile) {
    const currentDir = path.dirname(currentFile);
    return path.resolve(currentDir, relativePath);
  }

  /**
   * Get file content with caching
   * @param {string} filePath - File path
   * @returns {string} File content
   */
  getFileContent(filePath) {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath).content;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.fileCache.set(filePath, { content, path: filePath });
      return content;
    } catch (error) {
      this.log(`Error reading file ${filePath}: ${error.message}`, 'error');
      return '';
    }
  }

  /**
   * Get line number from content index
   * @param {string} content - Content string
   * @param {number} index - Character index
   * @returns {number} Line number (1-based)
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Fix method - placeholder for actual fixing implementation
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix
   * @returns {Object} Fix result
   */
  fix(content, issues) {
    // This will be implemented in subtask 6.2
    return {
      content,
      changes: [],
      fixed: 0,
      skipped: issues.length
    };
  }
}