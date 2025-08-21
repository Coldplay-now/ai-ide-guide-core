/**
 * Tests for MermaidFixer Style Enhancement Features
 * Focused tests for Mermaid diagram styling and readability improvements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MermaidFixer } from '../../src/fixers/mermaid-fixer.js';

describe('MermaidFixer Style Enhancement Features', () => {
  let fixer;

  beforeEach(() => {
    fixer = new MermaidFixer({ verbose: false });
  });

  describe('Unified Style Definition Addition', () => {
    it('should add basic styling to large diagrams without styling', () => {
      const content = `\`\`\`mermaid
graph TB
A[Start] --> B[Process 1]
B --> C[Process 2]
C --> D[Process 3]
D --> E[Process 4]
E --> F[End]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const stylingIssue = issues.find(issue => issue.type === 'mermaid_missing_styling');
      
      expect(stylingIssue).toBeDefined();
      expect(stylingIssue.description).toContain('comprehensive styling');
    });

    it('should add comprehensive style definitions when fixing styling issues', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B --> C --> D --> E --> F --> G
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('classDef default');
      expect(result.content).toContain('classDef highlight');
      expect(result.content).toContain('classDef process');
      expect(result.content).toContain('classDef decision');
      expect(result.content).toContain('%% Standard styling');
    });

    it('should not add styling to small diagrams', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const stylingIssue = issues.find(issue => issue.type === 'mermaid_missing_styling');
      
      expect(stylingIssue).toBeUndefined();
    });

    it('should not add styling to diagrams that already have classDef styling', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B --> C --> D --> E --> F --> G
classDef default fill:#f9f,stroke:#333,stroke-width:2px
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const stylingIssue = issues.find(issue => issue.type === 'mermaid_missing_styling');
      
      expect(stylingIssue).toBeUndefined();
    });

    it('should use appropriate colors for different diagram types', () => {
      const flowchartContent = `\`\`\`mermaid
graph TB
A --> B --> C --> D --> E --> F --> G
\`\`\``;

      const issues = fixer.detectIssues(flowchartContent, 'test.md');
      const result = fixer.fix(flowchartContent, issues);
      
      // Should use flowchart colors (blue scheme)
      expect(result.content).toContain('#e1f5fe'); // First flowchart color
      expect(result.content).toContain('#bbdefb'); // Second flowchart color
    });
  });

  describe('Label Length Optimization', () => {
    it('should detect labels that are too long', () => {
      const content = `\`\`\`mermaid
graph TB
A[This is an extremely long label that definitely exceeds the maximum recommended character limit for readability] --> B[Short]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const labelIssue = issues.find(issue => issue.type === 'mermaid_long_label');
      
      expect(labelIssue).toBeDefined();
      expect(labelIssue.description).toContain('Label too long');
    });

    it('should shorten long labels while preserving meaning', () => {
      const content = `\`\`\`mermaid
graph TB
A[This is a very long process description that needs to be shortened for better readability] --> B[End]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Check that labels are shortened
      const labelMatches = result.content.match(/\[([^\]]+)\]/g);
      if (labelMatches) {
        labelMatches.forEach(match => {
          const label = match.slice(1, -1); // Remove brackets
          expect(label.length).toBeLessThanOrEqual(30);
        });
      }
    });

    it('should remove common words when shortening labels', () => {
      const content = `\`\`\`mermaid
graph TB
A[The process for handling the user request and the validation] --> B[End]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should remove common words like "the", "and", "for"
      expect(result.content).not.toMatch(/\[.*\bthe\b.*\]/);
      expect(result.content).not.toMatch(/\[.*\band\b.*\]/);
    });

    it('should add ellipsis when truncating labels', () => {
      const longLabel = 'A'.repeat(50);
      const content = `\`\`\`mermaid
graph TB
A[${longLabel}] --> B[End]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('...');
    });

    it('should handle labels in different bracket types', () => {
      const content = `\`\`\`mermaid
graph TB
A[Very long rectangular label that exceeds the maximum recommended length] --> B(Very long rounded label that also exceeds the maximum recommended length)
B --> C{Very long decision label that definitely exceeds the maximum recommended character limit}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // All labels should be shortened
      const allLabels = [
        ...result.content.match(/\[([^\]]+)\]/g) || [],
        ...result.content.match(/\(([^\)]+)\)/g) || [],
        ...result.content.match(/\{([^\}]+)\}/g) || []
      ];
      
      allLabels.forEach(match => {
        const label = match.slice(1, -1); // Remove brackets/parentheses/braces
        expect(label.length).toBeLessThanOrEqual(30);
      });
    });

    it('should handle quoted labels', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B["This is a very long quoted label that definitely exceeds the maximum recommended character limit"]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      const quotedMatch = result.content.match(/"([^"]+)"/);
      if (quotedMatch) {
        expect(quotedMatch[1].length).toBeLessThanOrEqual(30);
      }
    });
  });

  describe('Readability Enhancement Mechanisms', () => {
    it('should improve overall diagram readability through multiple enhancements', () => {
      const content = `\`\`\`mermaid
graph
A[This is an extremely long label that needs optimization] --> B[Another very long process description]
B --> C{A decision point with an unnecessarily verbose description}
C -->|Yes| D[Final step with long description]
C -->|No| A
style A fill:#ff00ff
style B fill:#custom123
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should have multiple improvements:
      // 1. Direction added
      expect(result.content).toContain('graph TB');
      
      // 2. Labels shortened
      const labelMatches = result.content.match(/[\[\(\{]([^\]\)\}]+)[\]\)\}]/g);
      if (labelMatches) {
        labelMatches.forEach(match => {
          const label = match.slice(1, -1);
          expect(label.length).toBeLessThanOrEqual(30);
        });
      }
      
      // 3. Colors standardized
      expect(result.content).not.toContain('#ff00ff');
      expect(result.content).not.toContain('#custom123');
      
      // 4. Should maintain functionality
      expect(result.content).toContain('-->');
      expect(result.content).toContain('|Yes|');
      expect(result.content).toContain('|No|');
    });

    it('should add consistent spacing and formatting', () => {
      const content = `\`\`\`mermaid
graph TB
A-->B
B-->C
C-->D
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should maintain proper arrow formatting
      expect(result.content).toContain('-->');
      // Content should be properly structured
      expect(result.content.split('\n').length).toBeGreaterThan(1);
    });

    it('should handle complex diagrams with multiple readability issues', () => {
      const content = `\`\`\`mermaid
graph
Start[Begin the comprehensive process for handling user authentication and authorization] --> Validate{Check if the user credentials are valid and the account is active}
Validate -->|Valid credentials and active account| Process[Execute the main business logic and process the user request]
Validate -->|Invalid credentials or inactive account| Error[Display appropriate error message and log the failed attempt]
Process --> Success[Complete the process and return success response to the user]
Error --> End[Terminate the process and clean up resources]
Success --> End
style Start fill:#ff0000,stroke:#000000,stroke-width:3px
style End fill:#00ff00,stroke:#000000,stroke-width:3px
style Error fill:#ffff00,stroke:#000000,stroke-width:2px
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues.length).toBeGreaterThan(0);
      
      const result = fixer.fix(content, issues);
      
      // Should fix multiple issues while preserving diagram structure
      expect(result.content).toContain('graph TB'); // Direction added
      expect(result.summary.fixedIssues).toBeGreaterThan(0);
      
      // Should maintain all connections
      expect(result.content).toContain('Start');
      expect(result.content).toContain('Validate');
      expect(result.content).toContain('Process');
      expect(result.content).toContain('Error');
      expect(result.content).toContain('Success');
      expect(result.content).toContain('End');
    });
  });

  describe('Style Consistency', () => {
    it('should apply consistent styling across similar elements', () => {
      const content = `\`\`\`mermaid
graph TB
A[Process 1] --> B[Process 2]
B --> C[Process 3]
C --> D[Process 4]
D --> E[Process 5]
E --> F[Process 6]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should add consistent class definitions
      expect(result.content).toContain('classDef default');
      expect(result.content).toContain('classDef highlight');
      expect(result.content).toContain('classDef process');
      
      // All class definitions should use consistent color scheme
      const classDefMatches = result.content.match(/classDef \w+ fill:#[\w]+/g);
      if (classDefMatches) {
        expect(classDefMatches.length).toBeGreaterThan(0);
      }
    });

    it('should preserve existing styling while adding missing elements', () => {
      const content = `\`\`\`mermaid
graph TB
A --> B --> C --> D --> E --> F
style A fill:#e1f5fe,stroke:#333,stroke-width:2px
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should preserve existing style
      expect(result.content).toContain('style A fill:#e1f5fe,stroke:#333,stroke-width:2px');
      
      // Should add additional styling
      expect(result.content).toContain('classDef');
    });
  });

  describe('Integration with Other Optimizations', () => {
    it('should work together with direction and color optimizations', () => {
      const content = `\`\`\`mermaid
graph
A[Very long label that needs to be shortened for better readability] --> B[Another long label]
B --> C[Third long label]
C --> D[Fourth long label]
D --> E[Fifth long label]
E --> F[Sixth long label]
style A fill:#ff00ff
style B fill:#custom123
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should apply all optimizations
      expect(result.content).toContain('graph TB'); // Direction
      expect(result.content).not.toContain('#ff00ff'); // Color standardization
      expect(result.content).not.toContain('#custom123'); // Color standardization
      expect(result.content).toContain('classDef'); // Styling addition
      
      // Labels should be shortened (check for individual labels longer than 35 characters)
      const labelMatches = result.content.match(/[\[\(\{]([^\]\)\}]+)[\]\)\}]/g);
      if (labelMatches) {
        labelMatches.forEach(match => {
          const label = match.slice(1, -1); // Remove brackets
          expect(label.length).toBeLessThanOrEqual(35);
        });
      }
    });

    it('should maintain diagram semantics while applying style enhancements', () => {
      const content = `\`\`\`mermaid
graph
Login[User enters login credentials that are very long] --> Validate{System validates the credentials and checks account status}
Validate -->|Success| Dashboard[Redirect to user dashboard with personalized content]
Validate -->|Failure| Error[Show error message and allow retry with helpful hints]
Dashboard --> Logout[User can logout and end the session safely]
Error --> Login
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should maintain all semantic elements
      expect(result.content).toContain('Login');
      expect(result.content).toContain('Validate');
      expect(result.content).toContain('Dashboard');
      expect(result.content).toContain('Error');
      expect(result.content).toContain('Logout');
      expect(result.content).toContain('|Success|');
      expect(result.content).toContain('|Failure|');
      expect(result.content).toContain('-->');
      
      // Should apply enhancements
      expect(result.summary.fixedIssues).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle diagrams with mixed styling approaches', () => {
      const content = `\`\`\`mermaid
graph TB
A[Start] --> B[Process]
B --> C[End]
style A fill:red
classDef myClass fill:#blue
class B myClass
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should not break existing styling
      expect(result.content).toContain('style A');
      expect(result.content).toContain('classDef myClass');
      expect(result.content).toContain('class B myClass');
    });

    it('should handle empty or minimal labels gracefully', () => {
      const content = `\`\`\`mermaid
graph TB
A[] --> B[X]
B --> C[""]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should not break on empty labels
      expect(result.content).toContain('A[]');
      expect(result.content).toContain('B[X]');
      expect(result.content).toContain('C[""]');
    });

    it('should handle special characters in labels', () => {
      const content = `\`\`\`mermaid
graph TB
A[Process with special chars: @#$%^&*()_+-={}|[]\\:";'<>?,./] --> B[End]
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should handle special characters without breaking
      expect(result.content).toContain('A[');
      expect(result.content).toContain('] --> B[End]');
    });
  });
});