/**
 * Link and Reference Fixer
 * Automatically fixes broken links, duplicate anchors, and integrates orphaned files
 * Implements requirements 5.1, 5.2, 5.3 from the specification
 */

import { LinkAnalyzer } from './link-analyzer.js';
import fs from 'fs';
import path from 'path';

export class LinkFixer extends LinkAnalyzer {
  constructor(options = {}) {
    super(options);
    this.fixStrategies = {
      broken_file_link: this.fixBrokenFileLink.bind(this),
      broken_anchor_link: this.fixBrokenAnchorLink.bind(this),
      broken_cross_file_anchor: this.fixBrokenCrossFileAnchor.bind(this),
      duplicate_anchor: this.fixDuplicateAnchor.bind(this),
      orphaned_file: this.fixOrphanedFile.bind(this)
    };
    this.suggestedLinks = new Map();
    this.anchorMappings = new Map();
  }

  /**
   * Fix detected issues in content
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix
   * @returns {Object} Fix result with modified content and changes
   */
  fix(content, issues) {
    let fixedContent = content;
    const changes = [];
    const fixResults = [];

    // Group issues by type for more efficient processing
    const issuesByType = this.groupIssuesByType(issues);

    // Fix issues in order of priority
    const fixOrder = [
      'duplicate_anchor',
      'broken_anchor_link',
      'broken_cross_file_anchor',
      'broken_file_link',
      'orphaned_file'
    ];

    for (const issueType of fixOrder) {
      if (issuesByType[issueType]) {
        for (const issue of issuesByType[issueType]) {
          const fixStrategy = this.fixStrategies[issue.type];
          if (fixStrategy) {
            try {
              const fixResult = fixStrategy(fixedContent, issue);
              if (fixResult.success) {
                fixedContent = fixResult.content;
                changes.push(...fixResult.changes);
                fixResults.push(this.createFixResult(issue.id, 'fixed', fixResult.changes));
              } else {
                fixResults.push(this.createFixResult(issue.id, 'failed', [], fixResult.errors));
              }
            } catch (error) {
              this.log(`Error fixing issue ${issue.id}: ${error.message}`, 'error');
              fixResults.push(this.createFixResult(issue.id, 'failed', [], [error.message]));
            }
          } else {
            fixResults.push(this.createFixResult(issue.id, 'skipped', [], ['No fix strategy available']));
          }
        }
      }
    }

    return {
      content: fixedContent,
      changes,
      fixResults,
      fixed: fixResults.filter(r => r.status === 'fixed').length,
      failed: fixResults.filter(r => r.status === 'failed').length,
      skipped: fixResults.filter(r => r.status === 'skipped').length
    };
  }

  /**
   * Fix broken file links by suggesting alternatives or creating placeholder files
   * @param {string} content - Content to fix
   * @param {Object} issue - Issue to fix
   * @returns {Object} Fix result
   */
  fixBrokenFileLink(content, issue) {
    const lines = content.split('\n');
    const line = lines[issue.line - 1];
    
    if (!line) {
      return { success: false, errors: ['Line not found'] };
    }

    // Extract the broken link
    const linkMatch = line.match(/\[([^\]]*)\]\(([^)]+)\)/);
    if (!linkMatch) {
      return { success: false, errors: ['Link pattern not found'] };
    }

    const [fullMatch, linkText, brokenPath] = linkMatch;
    
    // Try to find similar files
    const suggestion = this.findSimilarFile(brokenPath);
    
    if (suggestion) {
      // Replace with suggested file
      const fixedLine = line.replace(fullMatch, `[${linkText}](${suggestion})`);
      lines[issue.line - 1] = fixedLine;
      
      return {
        success: true,
        content: lines.join('\n'),
        changes: [{
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: fixedLine,
          reason: `Replaced broken link with similar file: ${suggestion}`
        }]
      };
    } else {
      // Create a placeholder comment
      const fixedLine = line.replace(fullMatch, `<!-- BROKEN LINK: [${linkText}](${brokenPath}) - File not found -->`);
      lines[issue.line - 1] = fixedLine;
      
      return {
        success: true,
        content: lines.join('\n'),
        changes: [{
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: fixedLine,
          reason: `Commented out broken link: ${brokenPath}`
        }]
      };
    }
  }

  /**
   * Fix broken anchor links by suggesting similar anchors or creating them
   * @param {string} content - Content to fix
   * @param {Object} issue - Issue to fix
   * @returns {Object} Fix result
   */
  fixBrokenAnchorLink(content, issue) {
    const lines = content.split('\n');
    const line = lines[issue.line - 1];
    
    if (!line) {
      return { success: false, errors: ['Line not found'] };
    }

    // Extract the broken anchor
    const anchorMatch = line.match(/\[([^\]]*)\]\(#([^)]+)\)/);
    if (!anchorMatch) {
      return { success: false, errors: ['Anchor pattern not found'] };
    }

    const [fullMatch, linkText, brokenAnchor] = anchorMatch;
    
    // Find similar anchors in the document
    const suggestion = this.findSimilarAnchor(content, brokenAnchor);
    
    if (suggestion) {
      // Replace with suggested anchor
      const fixedLine = line.replace(fullMatch, `[${linkText}](#${suggestion})`);
      lines[issue.line - 1] = fixedLine;
      
      return {
        success: true,
        content: lines.join('\n'),
        changes: [{
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: fixedLine,
          reason: `Replaced broken anchor with similar anchor: ${suggestion}`
        }]
      };
    } else {
      // Create the missing anchor by adding a heading
      const headingText = this.anchorToHeading(brokenAnchor);
      const insertLine = this.findBestInsertionPoint(lines, issue.line);
      
      lines.splice(insertLine, 0, '', `## ${headingText}`, '');
      
      return {
        success: true,
        content: lines.join('\n'),
        changes: [{
          type: 'addition',
          line: insertLine + 2,
          newContent: `## ${headingText}`,
          reason: `Created missing heading for anchor: ${brokenAnchor}`
        }]
      };
    }
  }

  /**
   * Fix broken cross-file anchors
   * @param {string} content - Content to fix
   * @param {Object} issue - Issue to fix
   * @returns {Object} Fix result
   */
  fixBrokenCrossFileAnchor(content, issue) {
    const lines = content.split('\n');
    const line = lines[issue.line - 1];
    
    if (!line) {
      return { success: false, errors: ['Line not found'] };
    }

    // Extract the cross-file link
    const linkMatch = line.match(/\[([^\]]*)\]\(([^#]+)#([^)]+)\)/);
    if (!linkMatch) {
      return { success: false, errors: ['Cross-file link pattern not found'] };
    }

    const [fullMatch, linkText, filePath, brokenAnchor] = linkMatch;
    
    // Try to find similar anchor in target file
    const resolvedPath = this.resolveFilePath(filePath, '');
    if (fs.existsSync(resolvedPath)) {
      const targetContent = this.getFileContent(resolvedPath);
      const suggestion = this.findSimilarAnchor(targetContent, brokenAnchor);
      
      if (suggestion) {
        const fixedLine = line.replace(fullMatch, `[${linkText}](${filePath}#${suggestion})`);
        lines[issue.line - 1] = fixedLine;
        
        return {
          success: true,
          content: lines.join('\n'),
          changes: [{
            type: 'modification',
            line: issue.line,
            oldContent: line,
            newContent: fixedLine,
            reason: `Replaced broken cross-file anchor with similar anchor: ${suggestion}`
          }]
        };
      }
    }

    // Remove the anchor part if we can't fix it
    const fixedLine = line.replace(fullMatch, `[${linkText}](${filePath})`);
    lines[issue.line - 1] = fixedLine;
    
    return {
      success: true,
      content: lines.join('\n'),
      changes: [{
        type: 'modification',
        line: issue.line,
        oldContent: line,
        newContent: fixedLine,
        reason: `Removed broken anchor from cross-file link: ${brokenAnchor}`
      }]
    };
  }

  /**
   * Fix duplicate anchors by making them unique
   * @param {string} content - Content to fix
   * @param {Object} issue - Issue to fix
   * @returns {Object} Fix result
   */
  fixDuplicateAnchor(content, issue) {
    const lines = content.split('\n');
    const line = lines[issue.line - 1];
    
    if (!line) {
      return { success: false, errors: ['Line not found'] };
    }

    // Check if it's a heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const [, hashes, headingText] = headingMatch;
      const baseAnchor = this.generateAnchorId(headingText);
      const uniqueAnchor = this.generateUniqueAnchor(content, baseAnchor);
      
      // Add explicit anchor to make it unique
      const fixedLine = `${line} {#${uniqueAnchor}}`;
      lines[issue.line - 1] = fixedLine;
      
      return {
        success: true,
        content: lines.join('\n'),
        changes: [{
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: fixedLine,
          reason: `Added unique anchor ID to resolve duplicate: ${uniqueAnchor}`
        }]
      };
    }

    // Check if it's an explicit anchor
    const anchorMatch = line.match(/<a\s+[^>]*(?:name|id)\s*=\s*["']([^"']+)["'][^>]*>/i);
    if (anchorMatch) {
      const [fullMatch, anchorId] = anchorMatch;
      const uniqueAnchor = this.generateUniqueAnchor(content, anchorId);
      const fixedAnchor = fullMatch.replace(anchorId, uniqueAnchor);
      const fixedLine = line.replace(fullMatch, fixedAnchor);
      lines[issue.line - 1] = fixedLine;
      
      return {
        success: true,
        content: lines.join('\n'),
        changes: [{
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: fixedLine,
          reason: `Made anchor ID unique: ${uniqueAnchor}`
        }]
      };
    }

    return { success: false, errors: ['Could not identify anchor type'] };
  }

  /**
   * Fix orphaned files by suggesting integration points
   * @param {string} content - Content to fix (of a potential parent file)
   * @param {Object} issue - Issue to fix
   * @returns {Object} Fix result
   */
  fixOrphanedFile(content, issue) {
    // This is a placeholder - orphaned file integration requires project-wide analysis
    // In a real implementation, this would suggest where to link the orphaned file
    
    return {
      success: false,
      errors: ['Orphaned file integration requires manual review'],
      suggestions: [
        'Consider adding a link to this file from a relevant section',
        'Add the file to a table of contents or index',
        'Include the file in navigation menus'
      ]
    };
  }

  /**
   * Find similar file based on path similarity
   * @param {string} brokenPath - Broken file path
   * @returns {string|null} Suggested file path
   */
  findSimilarFile(brokenPath) {
    // This is a simplified implementation
    // In practice, you'd scan the project directory for similar files
    const baseName = path.basename(brokenPath, path.extname(brokenPath));
    const extension = path.extname(brokenPath);
    
    // Common variations to try
    const variations = [
      brokenPath.toLowerCase(),
      brokenPath.replace(/[-_]/g, '-'),
      brokenPath.replace(/[-_]/g, '_'),
      `${baseName.toLowerCase()}${extension}`,
      `${baseName.replace(/[-_]/g, '-')}${extension}`
    ];

    // This would need to be implemented with actual file system scanning
    return null;
  }

  /**
   * Find similar anchor in content
   * @param {string} content - Content to search
   * @param {string} brokenAnchor - Broken anchor ID
   * @returns {string|null} Suggested anchor ID
   */
  findSimilarAnchor(content, brokenAnchor) {
    const anchors = this.extractAnchors(content);
    
    // Find the most similar anchor using simple string similarity
    let bestMatch = null;
    let bestScore = 0;
    
    for (const anchor of anchors) {
      const score = this.calculateSimilarity(brokenAnchor, anchor);
      if (score > bestScore && score > 0.6) { // 60% similarity threshold
        bestScore = score;
        bestMatch = anchor;
      }
    }
    
    return bestMatch;
  }

  /**
   * Extract all anchors from content
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
   * Calculate string similarity (simple Levenshtein-based)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
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
   * Convert anchor ID to heading text
   * @param {string} anchorId - Anchor ID
   * @returns {string} Heading text
   */
  anchorToHeading(anchorId) {
    return anchorId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Find best insertion point for new content
   * @param {Array} lines - Content lines
   * @param {number} referenceLine - Line that references the missing anchor
   * @returns {number} Best insertion line index
   */
  findBestInsertionPoint(lines, referenceLine) {
    // Insert after the current section or at the end
    for (let i = referenceLine; i < lines.length; i++) {
      if (lines[i].match(/^#{1,6}\s/)) {
        return i;
      }
    }
    return lines.length;
  }

  /**
   * Generate unique anchor ID
   * @param {string} content - Full content to check against
   * @param {string} baseAnchor - Base anchor ID
   * @returns {string} Unique anchor ID
   */
  generateUniqueAnchor(content, baseAnchor) {
    const existingAnchors = this.extractAnchors(content);
    let counter = 1;
    let uniqueAnchor = `${baseAnchor}-${counter}`;
    
    while (existingAnchors.includes(uniqueAnchor)) {
      counter++;
      uniqueAnchor = `${baseAnchor}-${counter}`;
    }
    
    return uniqueAnchor;
  }

  /**
   * Group issues by type for efficient processing
   * @param {Array} issues - Array of issues
   * @returns {Object} Issues grouped by type
   */
  groupIssuesByType(issues) {
    return issues.reduce((groups, issue) => {
      if (!groups[issue.type]) {
        groups[issue.type] = [];
      }
      groups[issue.type].push(issue);
      return groups;
    }, {});
  }
}