/**
 * Tests for MermaidFixer
 * Comprehensive test suite for Mermaid diagram analysis and optimization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidFixer } from '../../src/fixers/mermaid-fixer.js';

describe('MermaidFixer', () => {
  let fixer;

  beforeEach(() => {
    fixer = new MermaidFixer({ verbose: false });
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      expect(fixer.options.dryRun).toBe(false);
      expect(fixer.options.verbose).toBe(false);
      expect(fixer.options.backup).toBe(true);
    });

    it('should have standard color schemes', () => {
      expect(fixer.standardColors.flowchart).toBeDefined();
      expect(fixer.standardColors.sequence).toBeDefined();
      expect(Array.isArray(fixer.standardColors.flowchart)).toBe(true);
    });

    it('should have direction definitions', () => {
      expect(fixer.directions).toContain('TB');
      expect(fixer.directions).toContain('LR');
      expect(fixer.directions).toContain('RL');
    });
  });

  describe('extractMermaidBlocks', () => {
    it('should extract single Mermaid block', () => {
      const content = `# Title
\`\`\`mermaid
graph TB
A --> B
\`\`\`
Some text`;

      const blocks = fixer.extractMermaidBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].startLine).toBe(2);
      expect(blocks[0].content.trim()).toBe('graph TB\nA --> B');
    });

    it('should extract multiple Mermaid blocks', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
\`\`\`

Text between

\`\`\`mermaid
sequenceDiagram
Alice->>Bob: Hello
\`\`\``;

      const blocks = fixer.extractMermaidBlocks(content);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].content.trim()).toBe('graph TB\nA --> B');
      expect(blocks[1].content.trim()).toBe('sequenceDiagram\nAlice->>Bob: Hello');
    });

    it('should handle empty Mermaid blocks', () => {
      const content = `\`\`\`mermaid
\`\`\``;

      const blocks = fixer.extractMermaidBlocks(content);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].content.trim()).toBe('');
    });
  });

  describe('detectDiagramType', () => {
    it('should detect flowchart diagrams', () => {
      expect(fixer.detectDiagramType('graph TB\nA --> B')).toBe('flowchart');
      expect(fixer.detectDiagramType('flowchart LR\nA --> B')).toBe('flowchart');
    });

    it('should detect sequence diagrams', () => {
      expect(fixer.detectDiagramType('sequenceDiagram\nAlice->>Bob: Hello')).toBe('sequence');
    });

    it('should detect class diagrams', () => {
      expect(fixer.detectDiagramType('classDiagram\nclass Animal')).toBe('class');
    });

    it('should detect state diagrams', () => {
      expect(fixer.detectDiagramType('stateDiagram\n[*] --> Still')).toBe('state');
    });

    it('should return unknown for unrecognized types', () => {
      expect(fixer.detectDiagramType('unknown diagram type')).toBe('unknown');
    });
  });

  describe('analyzeDiagram', () => {
    it('should analyze flowchart with direction', () => {
      const content = `graph TB
A[Start] --> B[Process]
B --> C{Decision}
C -->|Yes| D[End]
C -->|No| A`;

      const analysis = fixer.analyzeDiagram(content);
      expect(analysis.type).toBe('flowchart');
      expect(analysis.hasDirection).toBe(true);
      expect(analysis.nodeCount).toBeGreaterThan(0);
    });

    it('should analyze flowchart without direction', () => {
      const content = `graph
A --> B
B --> C`;

      const analysis = fixer.analyzeDiagram(content);
      expect(analysis.type).toBe('flowchart');
      expect(analysis.hasDirection).toBe(false);
    });

    it('should count nodes correctly', () => {
      const content = `graph TB
A[Node 1] --> B[Node 2]
B --> C{Decision}
C --> D((Circle))
C --> E[Node 5]`;

      const analysis = fixer.analyzeDiagram(content);
      expect(analysis.nodeCount).toBe(5);
    });

    it('should detect colors', () => {
      const content = `graph TB
A[Start] --> B[Process]
style A fill:#ff0000
style B fill:blue`;

      const analysis = fixer.analyzeDiagram(content);
      expect(analysis.colors).toContain('#ff0000');
      expect(analysis.colors).toContain('blue');
    });

    it('should detect long labels', () => {
      const content = `graph TB
A[This is a very long label that exceeds the maximum recommended length] --> B[Short]`;

      const analysis = fixer.analyzeDiagram(content);
      expect(analysis.longLabels.length).toBeGreaterThan(0);
      expect(analysis.longLabels[0].length).toBeGreaterThan(30);
    });

    it('should detect custom styling', () => {
      const content = `graph TB
A --> B
style A fill:#f9f,stroke:#333,stroke-width:4px
classDef default fill:#f9f,stroke:#333,stroke-width:2px`;

      const analysis = fixer.analyzeDiagram(content);
      expect(analysis.hasCustomStyling).toBe(true);
    });
  });

  describe('detectIssues', () => {
    it('should detect missing direction in flowchart', () => {
      const content = `# Title
\`\`\`mermaid
graph
A --> B
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const directionIssue = issues.find(issue => issue.type === 'mermaid_no_direction');
      expect(directionIssue).toBeDefined();
      expect(directionIssue.severity).toBe('warning');
    });

    it('should detect too many nodes', () => {
      const nodes = Array.from({ length: 25 }, (_, i) => `N${i}[Node ${i}]`).join('\n');
      const content = `\`\`\`mermaid
graph TB
${nodes}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const nodeIssue = issues.find(issue => issue.type === 'mermaid_too_many_nodes');
      expect(nodeIssue).toBeDefined();
      expect(nodeIssue.description).toContain('25 nodes');
    });

    it('should detect non-standard colors', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
style A fill:#ff00ff
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const colorIssue = issues.find(issue => issue.type === 'mermaid_non_standard_color');
      expect(colorIssue).toBeDefined();
      expect(colorIssue.description).toContain('#ff00ff');
    });

    it('should detect long labels', () => {
      const content = `\`\`\`mermaid
graph TB
A[This is an extremely long label that definitely exceeds the maximum recommended character limit] --> B[Short]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const labelIssue = issues.find(issue => issue.type === 'mermaid_long_label');
      expect(labelIssue).toBeDefined();
    });

    it('should detect missing styling in large diagrams', () => {
      const nodes = Array.from({ length: 8 }, (_, i) => `N${i}[Node ${i}] --> N${i + 1}[Node ${i + 1}]`).join('\n');
      const content = `\`\`\`mermaid
graph TB
${nodes}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const stylingIssue = issues.find(issue => issue.type === 'mermaid_missing_styling');
      expect(stylingIssue).toBeDefined();
    });
  });

  describe('isNodeDefinition', () => {
    it('should identify flowchart node definitions', () => {
      expect(fixer.isNodeDefinition('A[Start]', 'flowchart')).toBe(true);
      expect(fixer.isNodeDefinition('B(Process)', 'flowchart')).toBe(true);
      expect(fixer.isNodeDefinition('C{Decision}', 'flowchart')).toBe(true);
      expect(fixer.isNodeDefinition('A --> B', 'flowchart')).toBe(false);
    });

    it('should identify sequence diagram participants', () => {
      expect(fixer.isNodeDefinition('participant Alice', 'sequence')).toBe(true);
      expect(fixer.isNodeDefinition('actor Bob', 'sequence')).toBe(true);
      expect(fixer.isNodeDefinition('Alice->>Bob: Hello', 'sequence')).toBe(false);
    });
  });

  describe('extractColors', () => {
    it('should extract hex colors', () => {
      const colors = fixer.extractColors('style A fill:#ff0000,stroke:#00ff00');
      expect(colors).toContain('#ff0000');
      expect(colors).toContain('#00ff00');
    });

    it('should extract named colors', () => {
      const colors = fixer.extractColors('style A fill: red, stroke: blue');
      expect(colors).toContain('red');
      expect(colors).toContain('blue');
    });
  });

  describe('extractLabels', () => {
    it('should extract labels from brackets', () => {
      const labels = fixer.extractLabels('A[Start Process] --> B[End Process]');
      expect(labels).toContain('Start Process');
      expect(labels).toContain('End Process');
    });

    it('should extract labels from parentheses and braces', () => {
      const labels = fixer.extractLabels('A(Round) --> B{Diamond}');
      expect(labels).toContain('Round');
      expect(labels).toContain('Diamond');
    });

    it('should extract quoted labels', () => {
      const labels = fixer.extractLabels('A --> B["Quoted Label"]');
      expect(labels).toContain('Quoted Label');
    });
  });

  describe('isStandardWebColor', () => {
    it('should recognize standard web colors', () => {
      expect(fixer.isStandardWebColor('red')).toBe(true);
      expect(fixer.isStandardWebColor('blue')).toBe(true);
      expect(fixer.isStandardWebColor('green')).toBe(true);
      expect(fixer.isStandardWebColor('customcolor')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(fixer.isStandardWebColor('RED')).toBe(true);
      expect(fixer.isStandardWebColor('Blue')).toBe(true);
    });
  });

  describe('shortenLabel', () => {
    it('should remove common words', () => {
      const shortened = fixer.shortenLabel('This is the process for handling the request');
      expect(shortened).not.toContain('the');
      expect(shortened.length).toBeLessThan(50);
    });

    it('should truncate if still too long', () => {
      const longLabel = 'A'.repeat(50);
      const shortened = fixer.shortenLabel(longLabel);
      expect(shortened.length).toBeLessThanOrEqual(30);
      expect(shortened).toContain('...');
    });

    it('should preserve short labels', () => {
      const shortLabel = 'Short';
      const shortened = fixer.shortenLabel(shortLabel);
      expect(shortened).toBe(shortLabel);
    });
  });

  describe('fix method', () => {
    it('should fix missing direction', () => {
      const content = `\`\`\`mermaid
graph
A --> B
\`\`\``;

      const issues = [
        fixer.createIssue('mermaid_no_direction', 2, 'Missing direction', 'warning')
      ];

      const result = fixer.fix(content, issues);
      expect(result.content).toContain('graph TB');
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.summary.fixedIssues).toBe(1);
    });

    it('should standardize colors', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
style A fill:#ff00ff
\`\`\``;

      const issues = [
        fixer.createIssue('mermaid_non_standard_color', 4, 'Non-standard color', 'info')
      ];

      const result = fixer.fix(content, issues);
      expect(result.content).not.toContain('#ff00ff');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should optimize long labels', () => {
      const content = `\`\`\`mermaid
graph TB
A[This is a very long label that exceeds the maximum recommended length] --> B
\`\`\``;

      const issues = [
        fixer.createIssue('mermaid_long_label', 3, 'Long label', 'info')
      ];

      const result = fixer.fix(content, issues);
      expect(result.changes.length).toBeGreaterThan(0);
      // Check that the label was shortened
      const labelMatch = result.content.match(/\[([^\]]+)\]/);
      if (labelMatch) {
        expect(labelMatch[1].length).toBeLessThanOrEqual(30);
      }
    });

    it('should add basic styling', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B --> C --> D --> E --> F --> G
\`\`\``;

      const issues = [
        fixer.createIssue('mermaid_missing_styling', 2, 'Missing styling', 'info')
      ];

      const result = fixer.fix(content, issues);
      expect(result.content).toContain('classDef');
      expect(result.content).toContain('Standard styling');
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('addDirectionDefinition', () => {
    it('should add direction to graph declaration', () => {
      const content = 'graph\nA --> B';
      const lines = content.split('\n');
      const changes = [];

      const result = fixer.addDirectionDefinition(content, lines, changes);
      expect(result.status).toBe('fixed');
      expect(result.content).toContain('graph TB');
      expect(changes.length).toBe(1);
    });

    it('should add direction to flowchart declaration', () => {
      const content = 'flowchart\nA --> B';
      const lines = content.split('\n');
      const changes = [];

      const result = fixer.addDirectionDefinition(content, lines, changes);
      expect(result.status).toBe('fixed');
      expect(result.content).toContain('flowchart TB');
    });

    it('should skip non-flowchart diagrams', () => {
      const content = 'sequenceDiagram\nAlice->>Bob: Hello';
      const lines = content.split('\n');
      const changes = [];

      const result = fixer.addDirectionDefinition(content, lines, changes);
      expect(result.status).toBe('skipped');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty content', () => {
      const issues = fixer.detectIssues('', 'test.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle content without Mermaid blocks', () => {
      const content = '# Title\nSome text\n```javascript\nconsole.log("hello");\n```';
      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle malformed Mermaid blocks', () => {
      const content = '```mermaid\nmalformed content\nno closing tag';
      const issues = fixer.detectIssues(content, 'test.md');
      // Should not crash, may or may not detect issues depending on content
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle multiple issues in same block', () => {
      const content = `\`\`\`mermaid
graph
A[This is a very long label that exceeds the maximum recommended length] --> B
style A fill:#ff00ff
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues.length).toBeGreaterThan(1);
      
      // Should have direction, color, and label issues
      const issueTypes = issues.map(issue => issue.type);
      expect(issueTypes).toContain('mermaid_no_direction');
      expect(issueTypes).toContain('mermaid_non_standard_color');
      expect(issueTypes).toContain('mermaid_long_label');
    });
  });

  describe('Integration tests', () => {
    it('should handle complete workflow', () => {
      const content = `# Mermaid Test
\`\`\`mermaid
graph
A[This is a very long label that definitely exceeds the maximum recommended character limit for readability] --> B[Process]
B --> C{Decision with an extremely long label that should be shortened}
C -->|Yes| D[End]
C -->|No| A
style A fill:#ff00ff
style B fill:#00ffff
\`\`\`

Some text between diagrams.

\`\`\`mermaid
sequenceDiagram
participant Alice as Alice with a very long name
participant Bob
Alice->>Bob: Hello with a very long message
\`\`\``;

      // Detect issues
      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues.length).toBeGreaterThan(0);

      // Fix issues
      const result = fixer.fix(content, issues);
      expect(result.summary.fixedIssues).toBeGreaterThan(0);
      expect(result.content).toContain('graph TB'); // Direction added
      expect(result.content.length).toBeGreaterThan(0);

      // Verify fixes don't break content structure
      const fixedBlocks = fixer.extractMermaidBlocks(result.content);
      expect(fixedBlocks).toHaveLength(2);
    });
  });
});