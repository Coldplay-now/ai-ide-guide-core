/**
 * Mermaid Diagram Fixer
 * Analyzes and optimizes Mermaid diagrams for better readability and consistency
 */

import { BaseFixer } from '../core/base-fixer.js';

export class MermaidFixer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    
    // Standard color schemes for different diagram types
    this.standardColors = {
      flowchart: ['#e1f5fe', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5'],
      sequence: ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc'],
      class: ['#e8f5e8', '#c8e6c8', '#a5d6a7', '#81c784', '#66bb6a'],
      state: ['#fff3e0', '#ffe0b2', '#ffcc02', '#ffb74d', '#ffa726'],
      gantt: ['#fce4ec', '#f8bbd9', '#f48fb1', '#f06292', '#ec407a']
    };

    // Standard direction definitions
    this.directions = ['TB', 'TD', 'BT', 'RL', 'LR'];
    
    // Maximum recommended node count per diagram
    this.maxNodeCount = 20;
    
    // Maximum recommended label length
    this.maxLabelLength = 30;
  }

  /**
   * Detect Mermaid diagram issues
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected issues
   */
  detectIssues(content, filePath) {
    const issues = [];
    const mermaidBlocks = this.extractMermaidBlocks(content);

    mermaidBlocks.forEach((block, index) => {
      const analysis = this.analyzeDiagram(block.content);
      const lineOffset = block.startLine;

      // Check for missing direction definition
      if (analysis.type === 'flowchart' && !analysis.hasDirection) {
        issues.push(this.createIssue(
          'mermaid_no_direction',
          lineOffset,
          `Flowchart missing direction definition. Consider adding direction (TB, LR, etc.)`,
          'warning'
        ));
      }

      // Check for too many nodes
      if (analysis.nodeCount > this.maxNodeCount) {
        issues.push(this.createIssue(
          'mermaid_too_many_nodes',
          lineOffset,
          `Diagram has ${analysis.nodeCount} nodes (max recommended: ${this.maxNodeCount}). Consider breaking into smaller diagrams`,
          'warning'
        ));
      }

      // Check for non-standard colors
      analysis.nonStandardColors.forEach(color => {
        issues.push(this.createIssue(
          'mermaid_non_standard_color',
          lineOffset,
          `Non-standard color detected: ${color}. Consider using standard color scheme`,
          'info'
        ));
      });

      // Check for long labels
      analysis.longLabels.forEach(label => {
        issues.push(this.createIssue(
          'mermaid_long_label',
          lineOffset,
          `Label too long (${label.length} chars): "${label.substring(0, 50)}...". Consider shortening to under ${this.maxLabelLength} characters`,
          'info'
        ));
      });

      // Check for missing comprehensive styling (classDef definitions)
      if (analysis.nodeCount > 5) {
        const diagramLines = block.content.split('\n').map(line => line.trim()).filter(line => line);
        const hasClassDefs = diagramLines.some(line => line.includes('classDef '));
        
        if (!hasClassDefs) {
          issues.push(this.createIssue(
            'mermaid_missing_styling',
            lineOffset,
            'Large diagram without comprehensive styling. Consider adding style definitions for better readability',
            'info'
          ));
        }
      }
    });

    return issues;
  }

  /**
   * Extract Mermaid code blocks from content
   * @param {string} content - Content to search
   * @returns {Array} Array of Mermaid blocks with content and position
   */
  extractMermaidBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let inMermaidBlock = false;
    let currentBlock = null;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('```mermaid')) {
        inMermaidBlock = true;
        currentBlock = {
          startLine: index + 1,
          content: '',
          endLine: null
        };
      } else if (trimmedLine === '```' && inMermaidBlock) {
        inMermaidBlock = false;
        currentBlock.endLine = index + 1;
        blocks.push(currentBlock);
        currentBlock = null;
      } else if (inMermaidBlock && currentBlock) {
        currentBlock.content += line + '\n';
      }
    });

    return blocks;
  }

  /**
   * Analyze a Mermaid diagram
   * @param {string} diagramContent - Mermaid diagram content
   * @returns {Object} Analysis result
   */
  analyzeDiagram(diagramContent) {
    const analysis = {
      type: this.detectDiagramType(diagramContent),
      nodeCount: 0,
      hasDirection: false,
      colors: [],
      nonStandardColors: [],
      labels: [],
      longLabels: [],
      hasCustomStyling: false,
      complexity: 'low'
    };

    const lines = diagramContent.split('\n').map(line => line.trim()).filter(line => line);

    // Detect direction
    analysis.hasDirection = lines.some(line => 
      this.directions.some(dir => line.includes(dir) && line.match(new RegExp(`\\b${dir}\\b`)))
    );

    // Count nodes and analyze content
    const nodeIds = new Set();
    
    lines.forEach(line => {
      // Skip comments and empty lines
      if (line.startsWith('%%') || !line) return;

      // Extract node IDs from the line
      const extractedNodes = this.extractNodeIds(line, analysis.type);
      extractedNodes.forEach(nodeId => nodeIds.add(nodeId));

      // Extract colors
      const colors = this.extractColors(line);
      analysis.colors.push(...colors);

      // Extract labels
      const labels = this.extractLabels(line);
      analysis.labels.push(...labels);

      // Check for custom styling
      if (line.includes('style ') || line.includes('classDef ') || line.includes('class ')) {
        analysis.hasCustomStyling = true;
      }
    });

    analysis.nodeCount = nodeIds.size;

    // Identify non-standard colors
    const standardColorSet = new Set(Object.values(this.standardColors).flat());
    analysis.nonStandardColors = analysis.colors.filter(color => {
      // Check if it's a hex color
      if (color.startsWith('#')) {
        // If it's not a valid hex color OR not in our standard set, it's non-standard
        const isValidHex = /^#[0-9a-fA-F]{3,6}$/.test(color);
        return !isValidHex || !standardColorSet.has(color.toLowerCase());
      }
      // Check if it's a named color that's not standard
      return !this.isStandardWebColor(color);
    });

    // Identify long labels
    analysis.longLabels = analysis.labels.filter(label => label.length > this.maxLabelLength);

    // Determine complexity
    if (analysis.nodeCount > 15) {
      analysis.complexity = 'high';
    } else if (analysis.nodeCount > 8) {
      analysis.complexity = 'medium';
    }

    return analysis;
  }

  /**
   * Detect the type of Mermaid diagram
   * @param {string} content - Diagram content
   * @returns {string} Diagram type
   */
  detectDiagramType(content) {
    const firstLine = content.split('\n')[0]?.trim().toLowerCase() || '';
    
    if (firstLine.includes('graph') || firstLine.includes('flowchart')) {
      return 'flowchart';
    } else if (firstLine.includes('sequencediagram')) {
      return 'sequence';
    } else if (firstLine.includes('classdiagram')) {
      return 'class';
    } else if (firstLine.includes('statediagram')) {
      return 'state';
    } else if (firstLine.includes('gantt')) {
      return 'gantt';
    } else if (firstLine.includes('pie')) {
      return 'pie';
    } else if (firstLine.includes('journey')) {
      return 'journey';
    }
    
    return 'unknown';
  }

  /**
   * Extract node IDs from a line
   * @param {string} line - Line to analyze
   * @param {string} diagramType - Type of diagram
   * @returns {Array} Array of node IDs found
   */
  extractNodeIds(line, diagramType) {
    const nodeIds = [];
    
    switch (diagramType) {
      case 'flowchart':
        // Extract node IDs from flowchart syntax
        // Match patterns like A[Label], B(Label), C{Label}, D((Label))
        const nodeMatches = line.match(/(\w+)[\[\(\{]/g);
        if (nodeMatches) {
          nodeIds.push(...nodeMatches.map(match => match.replace(/[\[\(\{].*/, '')));
        }
        
        // Also extract from connections like A --> B, but only if they don't have labels
        if (line.includes('-->') || line.includes('---')) {
          const connectionMatches = line.match(/(\w+)\s*--[->]+\s*(\w+)/g);
          if (connectionMatches) {
            connectionMatches.forEach(match => {
              const parts = match.split(/--[->]+/);
              if (parts.length >= 2) {
                const leftNode = parts[0].trim();
                const rightNode = parts[1].trim();
                // Only add if they don't contain brackets (which would mean they have labels)
                if (!leftNode.includes('[') && !leftNode.includes('(') && !leftNode.includes('{')) {
                  nodeIds.push(leftNode);
                }
                if (!rightNode.includes('[') && !rightNode.includes('(') && !rightNode.includes('{')) {
                  nodeIds.push(rightNode);
                }
              }
            });
          }
        }
        break;
        
      case 'sequence':
        // Extract participant names
        const participantMatch = line.match(/(?:participant|actor)\s+(\w+)/);
        if (participantMatch) {
          nodeIds.push(participantMatch[1]);
        }
        break;
        
      default:
        // Generic extraction
        const genericMatches = line.match(/(\w+)[\[\(\{]/g);
        if (genericMatches) {
          nodeIds.push(...genericMatches.map(match => match.replace(/[\[\(\{].*/, '')));
        }
    }
    
    return nodeIds;
  }

  /**
   * Check if a line represents a node definition
   * @param {string} line - Line to check
   * @param {string} diagramType - Type of diagram
   * @returns {boolean} True if line defines a node
   */
  isNodeDefinition(line, diagramType) {
    switch (diagramType) {
      case 'flowchart':
        // Only consider explicit node definitions with labels, not connections
        return /\w+[\[\(\{]/.test(line) && !line.includes('-->') && !line.includes('---');
      case 'sequence':
        // Look for participant definitions
        return line.includes('participant ') || line.includes('actor ');
      case 'class':
        // Look for class definitions
        return line.includes('class ') && line.includes('{');
      case 'state':
        // Look for state definitions
        return /\w+\s*:/.test(line) && !line.includes('-->');
      default:
        // Generic node detection
        return /\w+[\[\(\{]/.test(line);
    }
  }

  /**
   * Extract colors from a line
   * @param {string} line - Line to analyze
   * @returns {Array} Array of colors found
   */
  extractColors(line) {
    const colors = [];
    
    // Match any hex-like colors (including invalid ones like #custom123)
    const hexMatches = line.match(/#[\w]+/g);
    if (hexMatches) {
      colors.push(...hexMatches);
    }

    // Match named colors in fill and stroke properties
    const fillMatches = line.match(/fill:\s*(\w+)/g);
    if (fillMatches) {
      colors.push(...fillMatches.map(match => match.split(':')[1].trim()));
    }

    const strokeMatches = line.match(/stroke:\s*(\w+)/g);
    if (strokeMatches) {
      colors.push(...strokeMatches.map(match => match.split(':')[1].trim()));
    }

    return colors;
  }

  /**
   * Extract labels from a line
   * @param {string} line - Line to analyze
   * @returns {Array} Array of labels found
   */
  extractLabels(line) {
    const labels = [];
    
    // Extract labels from brackets, parentheses, and braces
    const labelMatches = line.match(/[\[\(\{]([^\]\)\}]+)[\]\)\}]/g);
    if (labelMatches) {
      labels.push(...labelMatches.map(match => 
        match.substring(1, match.length - 1).trim()
      ));
    }

    // Extract labels from quotes
    const quotedMatches = line.match(/"([^"]+)"/g);
    if (quotedMatches) {
      labels.push(...quotedMatches.map(match => 
        match.substring(1, match.length - 1).trim()
      ));
    }

    return labels;
  }

  /**
   * Check if a color is a standard web color
   * @param {string} color - Color to check
   * @returns {boolean} True if standard web color
   */
  isStandardWebColor(color) {
    const standardWebColors = [
      'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
      'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
      'maroon', 'olive', 'teal', 'silver', 'aqua', 'fuchsia'
    ];
    
    return standardWebColors.includes(color.toLowerCase());
  }

  /**
   * Check if a hex color is in our standard color schemes or is a common standard color
   * @param {string} hexColor - Hex color to check
   * @returns {boolean} True if standard hex color
   */
  isStandardHexColor(hexColor) {
    const allStandardColors = Object.values(this.standardColors).flat();
    const commonStandardColors = [
      '#000', '#000000', '#fff', '#ffffff', '#333', '#333333', '#666', '#666666',
      '#999', '#999999', '#ccc', '#cccccc'
      // Note: Bright colors like #ff0000, #ff00ff are valid but not considered "standard" for diagrams
    ];
    
    return allStandardColors.includes(hexColor.toLowerCase()) || 
           commonStandardColors.includes(hexColor.toLowerCase());
  }

  /**
   * Fix Mermaid diagram issues
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix
   * @returns {Object} Fix result
   */
  fix(content, issues) {
    let fixedContent = content;
    const changes = [];
    const fixResults = [];

    // Group issues by Mermaid block
    const mermaidBlocks = this.extractMermaidBlocks(content);
    const issuesByBlock = this.groupIssuesByBlock(issues, mermaidBlocks);

    // Process blocks in reverse order to avoid line number shifts
    const blockIndices = Array.from(issuesByBlock.keys()).sort((a, b) => b - a);
    
    blockIndices.forEach(blockIndex => {
      const blockIssues = issuesByBlock.get(blockIndex);
      const block = mermaidBlocks[blockIndex];
      if (!block) return;

      let blockContent = block.content;
      const blockChanges = [];

      blockIssues.forEach(issue => {
        const fixResult = this.fixSingleIssue(blockContent, issue);
        if (fixResult.status === 'fixed') {
          blockContent = fixResult.content;
          blockChanges.push(...fixResult.changes);
          fixResults.push(this.createFixResult(issue.id, 'fixed', fixResult.changes));
        } else {
          fixResults.push(this.createFixResult(issue.id, 'failed', []));
        }
      });

      // Replace the block content in the main content
      if (blockChanges.length > 0) {
        const lines = fixedContent.split('\n');
        const startLine = block.startLine; // 1-based, points to ```mermaid line
        const endLine = block.endLine;     // 1-based, points to ``` line
        
        // Replace only the content between the markers (not including the markers themselves)
        const beforeBlock = lines.slice(0, startLine); // Everything before and including ```mermaid
        const afterBlock = lines.slice(endLine - 1);   // Everything from ``` onwards
        const newBlockLines = blockContent.split('\n').filter(line => line.trim() !== ''); // Remove empty lines
        
        fixedContent = [...beforeBlock, ...newBlockLines, ...afterBlock].join('\n');
        changes.push(...blockChanges);
      }
    });

    return {
      content: fixedContent,
      changes,
      fixResults,
      summary: {
        totalIssues: issues.length,
        fixedIssues: fixResults.filter(r => r.status === 'fixed').length,
        failedIssues: fixResults.filter(r => r.status === 'failed').length
      }
    };
  }

  /**
   * Group issues by Mermaid block
   * @param {Array} issues - All issues
   * @param {Array} blocks - Mermaid blocks
   * @returns {Map} Map of block index to issues
   */
  groupIssuesByBlock(issues, blocks) {
    const grouped = new Map();
    
    issues.forEach(issue => {
      const blockIndex = blocks.findIndex(block => 
        issue.line >= block.startLine && issue.line <= block.endLine
      );
      
      if (blockIndex >= 0) {
        if (!grouped.has(blockIndex)) {
          grouped.set(blockIndex, []);
        }
        grouped.get(blockIndex).push(issue);
      }
    });

    return grouped;
  }

  /**
   * Fix a single issue in a Mermaid diagram
   * @param {string} content - Diagram content
   * @param {Object} issue - Issue to fix
   * @returns {Object} Fix result
   */
  fixSingleIssue(content, issue) {
    const lines = content.split('\n');
    const changes = [];

    switch (issue.type) {
      case 'mermaid_no_direction':
        return this.addDirectionDefinition(content, lines, changes);
      
      case 'mermaid_non_standard_color':
        return this.standardizeColors(content, lines, changes);
      
      case 'mermaid_long_label':
        return this.optimizeLabels(content, lines, changes);
      
      case 'mermaid_missing_styling':
        return this.addBasicStyling(content, lines, changes);
      
      default:
        return { status: 'skipped', content, changes: [] };
    }
  }

  /**
   * Add direction definition to flowchart
   * @param {string} content - Original content
   * @param {Array} lines - Content lines
   * @param {Array} changes - Changes array to update
   * @returns {Object} Fix result
   */
  addDirectionDefinition(content, lines, changes) {
    const diagramType = this.detectDiagramType(content);
    
    if (diagramType !== 'flowchart') {
      return { status: 'skipped', content, changes: [] };
    }

    // Find the first line (should be graph or flowchart declaration)
    let firstLineIndex = 0;
    while (firstLineIndex < lines.length && !lines[firstLineIndex].trim()) {
      firstLineIndex++;
    }

    if (firstLineIndex >= lines.length) {
      return { status: 'failed', content, changes: [] };
    }

    const firstLine = lines[firstLineIndex].trim();
    let newFirstLine;

    if (firstLine.startsWith('graph')) {
      // Replace 'graph' with 'graph TB' or similar
      newFirstLine = firstLine.includes(' ') ? firstLine : `${firstLine} TB`;
    } else if (firstLine.startsWith('flowchart')) {
      // Add direction to flowchart
      newFirstLine = firstLine.includes(' ') ? firstLine : `${firstLine} TB`;
    } else {
      // Add flowchart declaration
      newFirstLine = `flowchart TB\n${firstLine}`;
    }

    lines[firstLineIndex] = newFirstLine;
    changes.push({
      type: 'modification',
      line: firstLineIndex + 1,
      oldContent: firstLine,
      newContent: newFirstLine,
      reason: 'Added direction definition to flowchart'
    });

    return {
      status: 'fixed',
      content: lines.join('\n'),
      changes
    };
  }

  /**
   * Standardize colors in diagram
   * @param {string} content - Original content
   * @param {Array} lines - Content lines
   * @param {Array} changes - Changes array to update
   * @returns {Object} Fix result
   */
  standardizeColors(content, lines, changes) {
    const diagramType = this.detectDiagramType(content);
    const standardScheme = this.standardColors[diagramType] || this.standardColors.flowchart;
    
    let colorIndex = 0;
    const colorMap = new Map();

    lines.forEach((line, index) => {
      let modifiedLine = line;
      let hasChanges = false;

      // Replace hex colors (including non-standard ones like #custom123)
      modifiedLine = modifiedLine.replace(/#[\w]+/g, (match) => {
        // Only replace if it's not a valid hex color (like #custom123) or if it's a valid hex but non-standard
        const isValidHex = /^#[0-9a-fA-F]{3,6}$/.test(match);
        
        // If it's not a valid hex color (contains non-hex characters), replace it
        if (!isValidHex) {
          if (!colorMap.has(match)) {
            colorMap.set(match, standardScheme[colorIndex % standardScheme.length]);
            colorIndex++;
          }
          hasChanges = true;
          return colorMap.get(match);
        }
        
        // If it's a valid hex color but not in our standard set, replace it
        if (isValidHex && !this.isStandardHexColor(match)) {
          if (!colorMap.has(match)) {
            colorMap.set(match, standardScheme[colorIndex % standardScheme.length]);
            colorIndex++;
          }
          hasChanges = true;
          return colorMap.get(match);
        }
        
        return match;
      });

      // Replace named colors that aren't standard in fill properties
      modifiedLine = modifiedLine.replace(/fill:\s*([#\w-]+)/g, (match, color) => {
        // Skip hex colors (they're handled above) and standard web colors
        if (!color.startsWith('#') && !this.isStandardWebColor(color)) {
          if (!colorMap.has(color)) {
            colorMap.set(color, standardScheme[colorIndex % standardScheme.length]);
            colorIndex++;
          }
          hasChanges = true;
          return `fill:${colorMap.get(color)}`;
        }
        return match;
      });

      // Replace named colors that aren't standard in stroke properties
      modifiedLine = modifiedLine.replace(/stroke:\s*([#\w-]+)/g, (match, color) => {
        // Skip hex colors (they're handled above) and standard web colors
        if (!color.startsWith('#') && !this.isStandardWebColor(color)) {
          if (!colorMap.has(color)) {
            colorMap.set(color, standardScheme[colorIndex % standardScheme.length]);
            colorIndex++;
          }
          hasChanges = true;
          return `stroke:${colorMap.get(color)}`;
        }
        return match;
      });

      if (hasChanges) {
        lines[index] = modifiedLine;
        changes.push({
          type: 'modification',
          line: index + 1,
          oldContent: line,
          newContent: modifiedLine,
          reason: 'Standardized colors'
        });
      }
    });

    return {
      status: changes.length > 0 ? 'fixed' : 'skipped',
      content: lines.join('\n'),
      changes
    };
  }

  /**
   * Optimize long labels
   * @param {string} content - Original content
   * @param {Array} lines - Content lines
   * @param {Array} changes - Changes array to update
   * @returns {Object} Fix result
   */
  optimizeLabels(content, lines, changes) {
    lines.forEach((line, index) => {
      let modifiedLine = line;
      let hasChanges = false;

      // Optimize labels in brackets, parentheses, and braces
      modifiedLine = modifiedLine.replace(/[\[\(\{]([^\]\)\}]+)[\]\)\}]/g, (match, label) => {
        if (label.length > this.maxLabelLength) {
          const optimizedLabel = this.shortenLabel(label);
          hasChanges = true;
          return match.replace(label, optimizedLabel);
        }
        return match;
      });

      // Optimize quoted labels
      modifiedLine = modifiedLine.replace(/"([^"]+)"/g, (match, label) => {
        if (label.length > this.maxLabelLength) {
          const optimizedLabel = this.shortenLabel(label);
          hasChanges = true;
          return `"${optimizedLabel}"`;
        }
        return match;
      });

      if (hasChanges) {
        lines[index] = modifiedLine;
        changes.push({
          type: 'modification',
          line: index + 1,
          oldContent: line,
          newContent: modifiedLine,
          reason: 'Optimized long labels'
        });
      }
    });

    return {
      status: changes.length > 0 ? 'fixed' : 'skipped',
      content: lines.join('\n'),
      changes
    };
  }

  /**
   * Shorten a label while preserving meaning
   * @param {string} label - Original label
   * @returns {string} Shortened label
   */
  shortenLabel(label) {
    // Remove common words and abbreviate
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = label.split(' ');
    
    // First, try removing common words
    let shortened = words.filter(word => 
      !commonWords.includes(word.toLowerCase()) || words.length <= 3
    ).join(' ');

    // If still too long, truncate and add ellipsis
    if (shortened.length > this.maxLabelLength) {
      shortened = shortened.substring(0, this.maxLabelLength - 3) + '...';
    }

    return shortened;
  }

  /**
   * Add basic styling to diagram
   * @param {string} content - Original content
   * @param {Array} lines - Content lines
   * @param {Array} changes - Changes array to update
   * @returns {Object} Fix result
   */
  addBasicStyling(content, lines, changes) {
    const diagramType = this.detectDiagramType(content);
    const standardScheme = this.standardColors[diagramType] || this.standardColors.flowchart;
    
    // Add basic style definitions at the end
    const styleDefinitions = [
      '',
      '%% Standard styling',
      `classDef default fill:${standardScheme[0]},stroke:#333,stroke-width:2px`,
      `classDef highlight fill:${standardScheme[1]},stroke:#333,stroke-width:3px`,
      `classDef process fill:${standardScheme[2]},stroke:#333,stroke-width:2px`,
      `classDef decision fill:${standardScheme[3]},stroke:#333,stroke-width:2px`
    ];

    lines.push(...styleDefinitions);
    
    changes.push({
      type: 'addition',
      line: lines.length - styleDefinitions.length + 1,
      newContent: styleDefinitions.join('\n'),
      reason: 'Added basic styling definitions'
    });

    return {
      status: 'fixed',
      content: lines.join('\n'),
      changes
    };
  }
}