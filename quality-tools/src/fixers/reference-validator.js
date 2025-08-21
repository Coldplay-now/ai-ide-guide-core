/**
 * Reference Integrity Validation System
 * Validates link validity, cross-reference accuracy, and document associations
 * Implements requirements 5.4, 5.5, 5.6 from the specification
 */

import { LinkAnalyzer } from './link-analyzer.js';
import fs from 'fs';
import path from 'path';

export class ReferenceValidator extends LinkAnalyzer {
  constructor(options = {}) {
    super(options);
    this.validationResults = new Map();
    this.crossReferenceMap = new Map();
    this.documentGraph = new Map();
    this.externalLinkCache = new Map();
  }

  /**
   * Validate all references in a document or project
   * @param {string|Array} input - Single file path or array of file paths
   * @param {Object} options - Validation options
   * @returns {Object} Comprehensive validation results
   */
  validateReferences(input, options = {}) {
    const files = Array.isArray(input) ? input : [input];
    const validationOptions = {
      checkExternalLinks: false,
      validateCrossReferences: true,
      checkDocumentAssociations: true,
      generateReport: true,
      ...options
    };

    const results = {
      summary: {
        totalFiles: files.length,
        totalLinks: 0,
        validLinks: 0,
        brokenLinks: 0,
        warnings: 0,
        errors: 0
      },
      fileResults: new Map(),
      crossReferenceResults: [],
      documentAssociations: [],
      orphanedFiles: [],
      recommendations: []
    };

    // Phase 1: Validate individual files
    for (const filePath of files) {
      const fileResult = this.validateFileReferences(filePath, validationOptions);
      results.fileResults.set(filePath, fileResult);
      
      // Update summary
      results.summary.totalLinks += fileResult.totalLinks;
      results.summary.validLinks += fileResult.validLinks;
      results.summary.brokenLinks += fileResult.brokenLinks;
      results.summary.warnings += fileResult.warnings.length;
      results.summary.errors += fileResult.errors.length;
    }

    // Phase 2: Cross-reference validation
    if (validationOptions.validateCrossReferences) {
      results.crossReferenceResults = this.validateCrossReferences(files);
    }

    // Phase 3: Document association validation
    if (validationOptions.checkDocumentAssociations) {
      results.documentAssociations = this.validateDocumentAssociations(files);
      results.orphanedFiles = this.analyzeOrphanedFiles(files);
    }

    // Phase 4: Generate recommendations
    if (validationOptions.generateReport) {
      results.recommendations = this.generateRecommendations(results);
    }

    return results;
  }

  /**
   * Validate references in a single file
   * @param {string} filePath - Path to file to validate
   * @param {Object} options - Validation options
   * @returns {Object} File validation results
   */
  validateFileReferences(filePath, options = {}) {
    const content = this.getFileContent(filePath);
    
    const result = {
      filePath,
      totalLinks: 0,
      validLinks: 0,
      brokenLinks: 0,
      anchors: [],
      links: [],
      errors: [],
      warnings: [],
      info: []
    };

    // Extract and validate all links
    const links = this.extractAllLinks(content, filePath);
    result.totalLinks = links.length;
    result.links = links;

    // Validate each link
    for (const link of links) {
      const validation = this.validateSingleLink(link, filePath, options);
      
      if (validation.isValid) {
        result.validLinks++;
      } else {
        result.brokenLinks++;
        
        if (validation.severity === 'error') {
          result.errors.push(validation);
        } else if (validation.severity === 'warning') {
          result.warnings.push(validation);
        } else {
          result.info.push(validation);
        }
      }
    }

    // Extract and validate anchors
    result.anchors = this.extractAndValidateAnchors(content, filePath);

    return result;
  }

  /**
   * Extract all links from content with detailed information
   * @param {string} content - Content to analyze
   * @param {string} filePath - Current file path
   * @returns {Array} Array of link objects
   */
  extractAllLinks(content, filePath) {
    const links = [];
    const linkPatterns = [
      {
        name: 'markdown_link',
        pattern: /\[([^\]]*)\]\(([^)]+)\)/g,
        textIndex: 1,
        urlIndex: 2
      },
      {
        name: 'reference_link',
        pattern: /\[([^\]]*)\]\[([^\]]+)\]/g,
        textIndex: 1,
        urlIndex: 2
      },
      {
        name: 'autolink',
        pattern: /<([^>]+)>/g,
        textIndex: 1,
        urlIndex: 1
      },
      {
        name: 'html_link',
        pattern: /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,
        textIndex: 2,
        urlIndex: 1
      }
    ];

    linkPatterns.forEach(({ name, pattern, textIndex, urlIndex }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const linkText = match[textIndex] || '';
        const linkUrl = match[urlIndex] || '';
        const line = this.getLineNumber(content, match.index);
        const column = match.index - content.lastIndexOf('\n', match.index - 1) - 1;

        links.push({
          type: name,
          text: linkText,
          url: linkUrl,
          line,
          column,
          fullMatch: match[0],
          filePath
        });
      }
    });

    return links;
  }

  /**
   * Validate a single link
   * @param {Object} link - Link object to validate
   * @param {string} currentFile - Current file path
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateSingleLink(link, currentFile, options = {}) {
    const result = {
      link,
      isValid: true,
      severity: 'info',
      message: 'Link is valid',
      suggestions: []
    };

    // Skip external links unless explicitly requested
    if (this.isExternalLink(link.url)) {
      if (options.checkExternalLinks) {
        return this.validateExternalLink(link);
      } else {
        result.message = 'External link (not validated)';
        return result;
      }
    }

    // Skip email links
    if (link.url.startsWith('mailto:')) {
      result.message = 'Email link (valid)';
      return result;
    }

    // Validate anchor-only links
    if (link.url.startsWith('#')) {
      return this.validateAnchorOnlyLink(link, currentFile);
    }

    // Validate file links (with or without anchors)
    if (link.url.includes('#')) {
      const [filePart, anchorPart] = link.url.split('#');
      const fileValidation = this.validateFileReference(filePart, currentFile);
      
      if (!fileValidation.isValid) {
        return fileValidation;
      }

      // Validate the anchor part
      return this.validateCrossFileAnchor(filePart, anchorPart, currentFile);
    } else {
      return this.validateFileReference(link.url, currentFile);
    }
  }

  /**
   * Validate external link
   * @param {Object} link - Link object
   * @returns {Object} Validation result
   */
  validateExternalLink(link) {
    // This is a placeholder for external link validation
    // In a real implementation, you might use HTTP requests to check link validity
    const result = {
      link,
      isValid: true,
      severity: 'info',
      message: 'External link (assumed valid)',
      suggestions: []
    };

    // Basic URL format validation
    try {
      new URL(link.url);
    } catch (error) {
      result.isValid = false;
      result.severity = 'error';
      result.message = `Invalid URL format: ${error.message}`;
    }

    return result;
  }

  /**
   * Validate anchor-only link
   * @param {Object} link - Link object
   * @param {string} currentFile - Current file path
   * @returns {Object} Validation result
   */
  validateAnchorOnlyLink(link, currentFile) {
    const result = {
      link,
      isValid: true,
      severity: 'info',
      message: 'Anchor link is valid',
      suggestions: []
    };

    const anchorId = link.url.substring(1);
    const content = this.getFileContent(currentFile);
    
    if (!this.findAnchorInContent(content, anchorId)) {
      result.isValid = false;
      result.severity = 'error';
      result.message = `Anchor "${anchorId}" not found in current file`;
      
      // Suggest similar anchors
      const anchors = this.extractAnchors(content);
      const similarAnchor = this.findBestMatch(anchorId, anchors);
      if (similarAnchor) {
        result.suggestions.push(`Did you mean "#${similarAnchor}"?`);
      }
    }

    return result;
  }

  /**
   * Validate file reference
   * @param {string} filePath - File path to validate
   * @param {string} currentFile - Current file path
   * @returns {Object} Validation result
   */
  validateFileReference(filePath, currentFile) {
    const result = {
      isValid: true,
      severity: 'info',
      message: 'File reference is valid',
      suggestions: []
    };

    const resolvedPath = this.resolveFilePath(filePath, currentFile);
    
    if (!fs.existsSync(resolvedPath)) {
      result.isValid = false;
      result.severity = 'error';
      result.message = `File not found: ${filePath}`;
      
      // Could suggest similar files here
      // For now, just note the broken link
      result.suggestions.push('Check the file path and ensure the file exists');
    }

    return result;
  }

  /**
   * Validate cross-file anchor
   * @param {string} filePath - Target file path
   * @param {string} anchorId - Anchor ID to validate
   * @param {string} currentFile - Current file path
   * @returns {Object} Validation result
   */
  validateCrossFileAnchor(filePath, anchorId, currentFile) {
    const result = {
      isValid: true,
      severity: 'info',
      message: 'Cross-file anchor is valid',
      suggestions: []
    };

    const resolvedPath = this.resolveFilePath(filePath, currentFile);
    
    if (!fs.existsSync(resolvedPath)) {
      result.isValid = false;
      result.severity = 'error';
      result.message = `Target file not found: ${filePath}`;
      return result;
    }

    const targetContent = this.getFileContent(resolvedPath);
    if (!this.findAnchorInContent(targetContent, anchorId)) {
      result.isValid = false;
      result.severity = 'error';
      result.message = `Anchor "${anchorId}" not found in file: ${filePath}`;
      
      // Suggest similar anchors in target file
      const anchors = this.extractAnchors(targetContent);
      const similarAnchor = this.findBestMatch(anchorId, anchors);
      if (similarAnchor) {
        result.suggestions.push(`Did you mean "${filePath}#${similarAnchor}"?`);
      }
    }

    return result;
  }

  /**
   * Extract and validate anchors in content
   * @param {string} content - Content to analyze
   * @param {string} filePath - File path
   * @returns {Array} Array of anchor validation results
   */
  extractAndValidateAnchors(content, filePath) {
    const anchors = [];
    const anchorCounts = new Map();

    // Extract heading anchors
    const headingPattern = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingPattern.exec(content)) !== null) {
      const level = match[1].length;
      const headingText = match[2].trim();
      const anchorId = this.generateAnchorId(headingText);
      const line = this.getLineNumber(content, match.index);

      // Track duplicates
      const count = anchorCounts.get(anchorId) || 0;
      anchorCounts.set(anchorId, count + 1);

      anchors.push({
        type: 'heading',
        id: anchorId,
        text: headingText,
        level,
        line,
        isDuplicate: count > 0,
        filePath
      });
    }

    // Extract explicit anchors
    const anchorPattern = /<a\s+[^>]*(?:name|id)\s*=\s*["']([^"']+)["'][^>]*>/gi;
    while ((match = anchorPattern.exec(content)) !== null) {
      const anchorId = match[1];
      const line = this.getLineNumber(content, match.index);

      // Track duplicates
      const count = anchorCounts.get(anchorId) || 0;
      anchorCounts.set(anchorId, count + 1);

      anchors.push({
        type: 'explicit',
        id: anchorId,
        line,
        isDuplicate: count > 0,
        filePath
      });
    }

    return anchors;
  }

  /**
   * Validate cross-references across multiple files
   * @param {Array} files - Array of file paths
   * @returns {Array} Cross-reference validation results
   */
  validateCrossReferences(files) {
    const results = [];
    const allAnchors = new Map();

    // Build anchor index
    for (const filePath of files) {
      const content = this.getFileContent(filePath);
      const anchors = this.extractAndValidateAnchors(content, filePath);
      allAnchors.set(filePath, anchors);
    }

    // Validate cross-references
    for (const filePath of files) {
      const content = this.getFileContent(filePath);
      const links = this.extractAllLinks(content, filePath);

      for (const link of links) {
        if (link.url.includes('#') && !link.url.startsWith('#')) {
          const [targetFile, anchorId] = link.url.split('#');
          const resolvedPath = this.resolveFilePath(targetFile, filePath);
          
          const validation = {
            sourceFile: filePath,
            targetFile: resolvedPath,
            anchorId,
            link,
            isValid: false,
            message: ''
          };

          if (allAnchors.has(resolvedPath)) {
            const targetAnchors = allAnchors.get(resolvedPath);
            const anchorExists = targetAnchors.some(anchor => anchor.id === anchorId);
            
            validation.isValid = anchorExists;
            validation.message = anchorExists 
              ? 'Cross-reference is valid'
              : `Anchor "${anchorId}" not found in target file`;
          } else {
            validation.message = `Target file not found: ${targetFile}`;
          }

          results.push(validation);
        }
      }
    }

    return results;
  }

  /**
   * Validate document associations and relationships
   * @param {Array} files - Array of file paths
   * @returns {Array} Document association results
   */
  validateDocumentAssociations(files) {
    const associations = [];
    const documentGraph = this.buildDocumentGraph(files);

    for (const [filePath, connections] of documentGraph) {
      const association = {
        filePath,
        incomingLinks: connections.incomingLinks.size,
        outgoingLinks: connections.outgoingLinks.size,
        isWellConnected: connections.incomingLinks.size > 0 || connections.outgoingLinks.size > 0,
        isHub: connections.incomingLinks.size > 1,
        isLeaf: connections.outgoingLinks.size === 0 && connections.incomingLinks.size > 0,
        isOrphaned: connections.incomingLinks.size === 0 && connections.outgoingLinks.size === 0,
        connectedFiles: [...connections.outgoingLinks, ...connections.incomingLinks]
      };

      associations.push(association);
    }

    return associations;
  }

  /**
   * Build document relationship graph
   * @param {Array} files - Array of file paths
   * @returns {Map} Document graph
   */
  buildDocumentGraph(files) {
    const graph = new Map();

    // Initialize graph
    for (const filePath of files) {
      graph.set(filePath, {
        incomingLinks: new Set(),
        outgoingLinks: new Set()
      });
    }

    // Build connections
    for (const filePath of files) {
      const content = this.getFileContent(filePath);
      const links = this.extractAllLinks(content, filePath);

      for (const link of links) {
        if (!this.isExternalLink(link.url) && !link.url.startsWith('#')) {
          const targetFile = link.url.split('#')[0];
          const resolvedPath = this.resolveFilePath(targetFile, filePath);

          if (graph.has(resolvedPath)) {
            graph.get(filePath).outgoingLinks.add(resolvedPath);
            graph.get(resolvedPath).incomingLinks.add(filePath);
          }
        }
      }
    }

    return graph;
  }

  /**
   * Generate recommendations based on validation results
   * @param {Object} results - Validation results
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // High-level recommendations
    if (results.summary.brokenLinks > 0) {
      recommendations.push({
        type: 'critical',
        category: 'broken_links',
        message: `Found ${results.summary.brokenLinks} broken links that need immediate attention`,
        priority: 'high'
      });
    }

    if (results.orphanedFiles.length > 0) {
      recommendations.push({
        type: 'warning',
        category: 'orphaned_files',
        message: `Found ${results.orphanedFiles.length} orphaned files that should be linked or removed`,
        priority: 'medium'
      });
    }

    // File-specific recommendations
    for (const [filePath, fileResult] of results.fileResults) {
      if (fileResult.errors.length > 0) {
        recommendations.push({
          type: 'error',
          category: 'file_errors',
          file: filePath,
          message: `File has ${fileResult.errors.length} critical link errors`,
          priority: 'high'
        });
      }

      if (fileResult.warnings.length > 0) {
        recommendations.push({
          type: 'warning',
          category: 'file_warnings',
          file: filePath,
          message: `File has ${fileResult.warnings.length} link warnings`,
          priority: 'medium'
        });
      }
    }

    // Document structure recommendations
    const hubFiles = results.documentAssociations.filter(doc => doc.isHub);
    const leafFiles = results.documentAssociations.filter(doc => doc.isLeaf);

    if (hubFiles.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'document_structure',
        message: `Found ${hubFiles.length} hub documents with many incoming links - consider organizing content`,
        priority: 'low'
      });
    }

    if (leafFiles.length > 0) {
      recommendations.push({
        type: 'info',
        category: 'document_structure',
        message: `Found ${leafFiles.length} leaf documents - consider adding cross-references`,
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Extract anchors from content (simplified version)
   * @param {string} content - Content to analyze
   * @returns {Array} Array of anchor IDs
   */
  extractAnchors(content) {
    const anchors = [];
    
    // Extract heading anchors
    const headingPattern = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingPattern.exec(content)) !== null) {
      const headingText = match[2].trim();
      anchors.push(this.generateAnchorId(headingText));
    }

    // Extract explicit anchors
    const anchorPattern = /<a\s+[^>]*(?:name|id)\s*=\s*["']([^"']+)["'][^>]*>/gi;
    while ((match = anchorPattern.exec(content)) !== null) {
      anchors.push(match[1]);
    }

    return anchors;
  }

  /**
   * Find best matching anchor using simple similarity
   * @param {string} target - Target anchor to match
   * @param {Array} candidates - Array of candidate anchors
   * @returns {string|null} Best match or null
   */
  findBestMatch(target, candidates) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const candidate of candidates) {
      const score = this.calculateSimilarity(target, candidate);
      if (score > bestScore && score > 0.6) { // 60% similarity threshold
        bestScore = score;
        bestMatch = candidate;
      }
    }
    
    return bestMatch;
  }

  /**
   * Calculate simple string similarity
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Check if URL is external
   * @param {string} url - URL to check
   * @returns {boolean} True if external
   */
  isExternalLink(url) {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://');
  }

  /**
   * Generate validation report
   * @param {Object} results - Validation results
   * @returns {string} Formatted report
   */
  generateReport(results) {
    const report = [];
    
    report.push('# Reference Validation Report');
    report.push('');
    report.push('## Summary');
    report.push(`- Total Files: ${results.summary.totalFiles}`);
    report.push(`- Total Links: ${results.summary.totalLinks}`);
    report.push(`- Valid Links: ${results.summary.validLinks}`);
    report.push(`- Broken Links: ${results.summary.brokenLinks}`);
    report.push(`- Warnings: ${results.summary.warnings}`);
    report.push(`- Errors: ${results.summary.errors}`);
    report.push('');

    if (results.recommendations.length > 0) {
      report.push('## Recommendations');
      for (const rec of results.recommendations) {
        report.push(`- **${rec.type.toUpperCase()}**: ${rec.message}`);
      }
      report.push('');
    }

    if (results.orphanedFiles.length > 0) {
      report.push('## Orphaned Files');
      for (const orphan of results.orphanedFiles) {
        report.push(`- ${orphan.file}`);
      }
      report.push('');
    }

    return report.join('\n');
  }
}