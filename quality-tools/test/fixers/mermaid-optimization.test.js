/**
 * Tests for MermaidFixer Optimization Features
 * Focused tests for Mermaid diagram optimization functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidFixer } from '../../src/fixers/mermaid-fixer.js';

describe('MermaidFixer Optimization Features', () => {
  let fixer;

  beforeEach(() => {
    fixer = new MermaidFixer({ verbose: false });
  });

  describe('Direction Definition Auto-Addition', () => {
    it('should add TB direction to graph without direction', () => {
      const content = `\`\`\`mermaid
graph
A[Start] --> B[End]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('graph TB');
      expect(result.summary.fixedIssues).toBe(1);
    });

    it('should add TB direction to flowchart without direction', () => {
      const content = `\`\`\`mermaid
flowchart
A --> B
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('flowchart TB');
      expect(result.summary.fixedIssues).toBe(1);
    });

    it('should not modify diagrams that already have direction', () => {
      const content = `\`\`\`mermaid
graph LR
A --> B
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues.find(issue => issue.type === 'mermaid_no_direction')).toBeUndefined();
    });

    it('should not add direction to non-flowchart diagrams', () => {
      const content = `\`\`\`mermaid
sequenceDiagram
Alice->>Bob: Hello
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues.find(issue => issue.type === 'mermaid_no_direction')).toBeUndefined();
    });
  });

  describe('Node Count Optimization', () => {
    it('should detect diagrams with too many nodes', () => {
      // Create a diagram with more than 20 nodes
      const nodes = Array.from({ length: 25 }, (_, i) => `N${i}[Node ${i}]`).join('\n');
      const content = `\`\`\`mermaid
graph TB
${nodes}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const nodeIssue = issues.find(issue => issue.type === 'mermaid_too_many_nodes');
      
      expect(nodeIssue).toBeDefined();
      expect(nodeIssue.description).toContain('25 nodes');
      expect(nodeIssue.description).toContain('max recommended: 20');
    });

    it('should not flag diagrams with acceptable node count', () => {
      const nodes = Array.from({ length: 15 }, (_, i) => `N${i}[Node ${i}]`).join('\n');
      const content = `\`\`\`mermaid
graph TB
${nodes}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const nodeIssue = issues.find(issue => issue.type === 'mermaid_too_many_nodes');
      
      expect(nodeIssue).toBeUndefined();
    });

    it('should count nodes correctly in complex diagrams', () => {
      const content = `\`\`\`mermaid
graph TB
A[Start] --> B{Decision}
B -->|Yes| C[Process 1]
B -->|No| D[Process 2]
C --> E[End]
D --> E
F[Isolated] --> G[Another]
\`\`\``;

      const blocks = fixer.extractMermaidBlocks(content);
      const analysis = fixer.analyzeDiagram(blocks[0].content);
      
      // Should count A, B, C, D, E, F, G = 7 nodes
      expect(analysis.nodeCount).toBe(7);
    });
  });

  describe('Standard Color Scheme Application', () => {
    it('should detect non-standard hex colors', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
style A fill:#ff00ff,stroke:#00ffff
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const colorIssues = issues.filter(issue => issue.type === 'mermaid_non_standard_color');
      
      expect(colorIssues.length).toBe(2); // Both #ff00ff and #00ffff
      expect(colorIssues[0].description).toContain('#ff00ff');
      expect(colorIssues[1].description).toContain('#00ffff');
    });

    it('should replace non-standard colors with standard ones', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
style A fill:#ff00ff
style B fill:#custom123
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).not.toContain('#ff00ff');
      expect(result.content).not.toContain('#custom123');
      expect(result.content).toContain('fill:#e1f5fe'); // Standard flowchart color
    });

    it('should preserve standard web colors', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
style A fill:red
style B fill:blue
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const colorIssues = issues.filter(issue => issue.type === 'mermaid_non_standard_color');
      
      expect(colorIssues.length).toBe(0); // red and blue are standard
    });

    it('should use appropriate color scheme for diagram type', () => {
      const sequenceContent = `\`\`\`mermaid
sequenceDiagram
Alice->>Bob: Hello
style Alice fill:#ff00ff
\`\`\``;

      const issues = fixer.detectIssues(sequenceContent, 'test.md');
      const result = fixer.fix(sequenceContent, issues);
      
      // Should use sequence diagram colors (purple scheme)
      expect(result.content).toContain('#f3e5f5'); // First color in sequence scheme
    });
  });

  describe('Complex Diagram Optimization', () => {
    it('should handle multiple optimization issues in one diagram', () => {
      const content = `\`\`\`mermaid
graph
A[This is an extremely long label that definitely exceeds the maximum recommended character limit for readability and should be shortened] --> B[Process]
B --> C{Decision with another very long label that needs optimization}
C -->|Yes| D[End]
C -->|No| A
style A fill:#ff00ff,stroke:#custom123
style B fill:#another-custom-color
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      
      // Should detect multiple issue types
      const issueTypes = issues.map(issue => issue.type);
      expect(issueTypes).toContain('mermaid_no_direction');
      expect(issueTypes).toContain('mermaid_long_label');
      expect(issueTypes).toContain('mermaid_non_standard_color');
      
      const result = fixer.fix(content, issues);
      
      // Should fix all issues
      expect(result.content).toContain('graph TB'); // Direction added
      expect(result.summary.fixedIssues).toBeGreaterThan(0);
      
      // Labels should be shortened
      const longLabelRegex = /\[.{50,}\]/;
      expect(longLabelRegex.test(result.content)).toBe(false);
    });

    it('should preserve diagram functionality while optimizing', () => {
      const content = `\`\`\`mermaid
graph
Start[Begin Process] --> Check{Is Valid?}
Check -->|Yes| Process[Execute Task]
Check -->|No| Error[Show Error]
Process --> End[Complete]
Error --> End
style Start fill:#ff0000
style End fill:#00ff00
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should maintain all connections
      expect(result.content).toContain('Start');
      expect(result.content).toContain('Check');
      expect(result.content).toContain('Process');
      expect(result.content).toContain('Error');
      expect(result.content).toContain('End');
      expect(result.content).toContain('-->');
      expect(result.content).toContain('|Yes|');
      expect(result.content).toContain('|No|');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty Mermaid blocks gracefully', () => {
      const content = `\`\`\`mermaid
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.summary.failedIssues).toBe(0);
      expect(result.content).toBe(content); // Should not modify empty blocks
    });

    it('should handle malformed Mermaid syntax', () => {
      const content = `\`\`\`mermaid
invalid syntax here
no proper mermaid structure
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should not crash and should handle gracefully
      expect(Array.isArray(result.changes)).toBe(true);
      expect(typeof result.summary.totalIssues).toBe('number');
    });

    it('should handle mixed valid and invalid content', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
invalid line here
C --> D
style A fill:#ff0000
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should fix what it can and preserve the rest
      expect(result.content).toContain('A --> B');
      expect(result.content).toContain('C --> D');
      expect(result.content).toContain('invalid line here'); // Preserve unknown content
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large diagrams efficiently', () => {
      // Create a large but valid diagram
      const nodes = Array.from({ length: 50 }, (_, i) => `N${i}[Node ${i}]`);
      const connections = Array.from({ length: 49 }, (_, i) => `N${i} --> N${i + 1}`);
      const content = `\`\`\`mermaid
graph TB
${nodes.join('\n')}
${connections.join('\n')}
\`\`\``;

      const startTime = Date.now();
      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.summary.totalIssues).toBeGreaterThan(0); // Should detect too many nodes
    });

    it('should handle multiple Mermaid blocks in one document', () => {
      const content = `# Document with multiple diagrams

\`\`\`mermaid
graph
A --> B
\`\`\`

Some text between diagrams.

\`\`\`mermaid
sequenceDiagram
Alice->>Bob: Hello
\`\`\`

More text.

\`\`\`mermaid
graph TB
X[Start] --> Y[End]
style X fill:#ff0000
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should handle all blocks
      const blocks = fixer.extractMermaidBlocks(result.content);
      expect(blocks.length).toBe(3);
      
      // Should fix issues in appropriate blocks
      expect(result.summary.fixedIssues).toBeGreaterThan(0);
    });
  });
});