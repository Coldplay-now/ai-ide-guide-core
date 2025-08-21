import { describe, it, expect, beforeEach } from 'vitest';
import { StructureFixer } from '../../src/fixers/structure-fixer.js';

describe('StructureFixer', () => {
  let fixer;

  beforeEach(() => {
    fixer = new StructureFixer({ verbose: false });
  });

  describe('detectIssues', () => {
    it('should detect heading hierarchy issues', () => {
      const content = `# Title
### Skipped Level
# Another H1`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe('heading_level_skip');
      expect(issues[1].type).toBe('multiple_h1');
    });

    it('should detect inconsistent list markers', () => {
      const content = `- Item 1
* Item 2
+ Item 3`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      const markerIssues = issues.filter(i => i.type === 'inconsistent_list_marker');
      expect(markerIssues).toHaveLength(2); // * and + should be flagged
    });

    it('should detect incorrect list indentation', () => {
      const content = `- Item 1
   - Incorrect indent
  - Another incorrect indent`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      const indentIssues = issues.filter(i => i.type === 'incorrect_list_indent');
      expect(indentIssues).toHaveLength(2);
    });

    it('should detect spacing issues', () => {
      const content = `# Title
No space after heading

- List item
Next paragraph without space`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      const spacingIssues = issues.filter(i => i.type.includes('spacing'));
      expect(spacingIssues.length).toBeGreaterThan(0);
    });

    it('should detect duplicate headings', () => {
      const content = `# Introduction
## Overview
## Overview`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      const duplicateIssues = issues.filter(i => i.type === 'duplicate_heading');
      expect(duplicateIssues).toHaveLength(1);
    });

    it('should detect empty headings', () => {
      const content = `# 
## Valid Heading
### `;

      const issues = fixer.detectIssues(content, 'test.md');
      
      const emptyIssues = issues.filter(i => i.type === 'empty_heading');
      expect(emptyIssues).toHaveLength(2);
    });

    it('should detect excessive empty lines', () => {
      const content = `# Title



Too many empty lines above`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      const excessiveIssues = issues.filter(i => i.type === 'excessive_empty_lines');
      expect(excessiveIssues).toHaveLength(1);
    });

    it('should handle code blocks correctly', () => {
      const content = `# Title

\`\`\`javascript
# This is not a heading
- This is not a list
\`\`\`

## Real Heading`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      // Should not detect issues inside code blocks
      const headingIssues = issues.filter(i => i.type.includes('heading'));
      expect(headingIssues).toHaveLength(0);
    });
  });

  describe('analyzeDocumentStructure', () => {
    it('should correctly analyze document structure', () => {
      const content = `# Main Title

## Section 1

Some paragraph content.

- List item 1
- List item 2
  - Nested item

\`\`\`javascript
console.log('code');
\`\`\`

## Section 2`;

      const structure = fixer.analyzeDocumentStructure(content);
      
      expect(structure.headings).toHaveLength(3);
      expect(structure.headings[0].level).toBe(1);
      expect(structure.headings[0].text).toBe('Main Title');
      
      expect(structure.lists).toHaveLength(1);
      expect(structure.lists[0].items).toHaveLength(3);
      
      expect(structure.paragraphs).toHaveLength(1);
      expect(structure.codeBlocks).toHaveLength(2); // start and end
    });

    it('should handle nested lists correctly', () => {
      const content = `- Level 1
  - Level 2
    - Level 3
- Back to Level 1`;

      const structure = fixer.analyzeDocumentStructure(content);
      
      expect(structure.lists).toHaveLength(1);
      expect(structure.lists[0].items).toHaveLength(4);
      expect(structure.lists[0].items[1].level).toBe(1);
      expect(structure.lists[0].items[2].level).toBe(2);
    });
  });

  describe('fix', () => {
    it('should fix heading level skips', () => {
      const content = `# Title
### Skipped Level`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('## Skipped Level');
    });

    it('should fix multiple H1 headings', () => {
      const content = `# First Title
# Second Title`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('## Second Title');
    });

    it('should fix inconsistent list markers', () => {
      const content = `- Item 1
* Item 2
+ Item 3`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      const lines = result.content.split('\n');
      expect(lines[1]).toBe('- Item 2');
      expect(lines[2]).toBe('- Item 3');
    });

    it('should fix incorrect list indentation', () => {
      const content = `- Item 1
   - Incorrect indent`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('  - Incorrect indent');
    });

    it('should fix incorrect list numbering', () => {
      const content = `1. First
3. Should be second
5. Should be third`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      const lines = result.content.split('\n');
      expect(lines[1]).toBe('2. Should be second');
      expect(lines[2]).toBe('3. Should be third');
    });

    it('should fix spacing issues', () => {
      const content = `# Title
No space after heading`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('# Title\n\nNo space after heading');
    });

    it('should fix excessive empty lines', () => {
      const content = `# Title




Too many empty lines`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      // Should reduce to maximum allowed empty lines
      expect(result.content.split('\n\n\n').length).toBe(1);
    });

    it('should remove empty headings', () => {
      const content = `# Valid Title
## 
### Another Valid Title`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).not.toContain('## ');
      expect(result.content).toContain('# Valid Title');
      expect(result.content).toContain('### Another Valid Title');
    });

    it('should fix duplicate headings', () => {
      const content = `# Introduction
## Overview
## Overview`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('## Overview 2');
    });

    it('should preserve code blocks during fixing', () => {
      const content = `# Title

\`\`\`javascript
# Not a real heading
- Not a real list
\`\`\`

### Should be H2`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('```javascript\n# Not a real heading\n- Not a real list\n```');
      expect(result.content).toContain('## Should be H2');
    });
  });

  describe('validate', () => {
    it('should validate fix results', () => {
      const originalContent = `# Title
### Skipped Level`;
      
      const issues = fixer.detectIssues(originalContent, 'test.md');
      const result = fixer.fix(originalContent, issues);
      const validation = fixer.validate(originalContent, result.content);
      
      expect(validation.isValid).toBe(true);
      expect(validation.remainingIssues).toBeLessThan(issues.length);
    });

    it('should warn about significant content changes', () => {
      const originalContent = 'Short content';
      const fixedContent = `Very long content
With many lines
And lots of changes
That might be concerning
For validation purposes`;
      
      const validation = fixer.validate(originalContent, fixedContent);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const issues = fixer.detectIssues('', 'test.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle null content', () => {
      const issues = fixer.detectIssues(null, 'test.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const issues = fixer.detectIssues('   \n\n  \t  \n', 'test.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle malformed markdown', () => {
      const content = `# Title
##Malformed heading
- List item
  * Mixed markers
    + More mixed markers`;

      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues.length).toBeGreaterThan(0);
      
      const result = fixer.fix(content, issues);
      expect(result.status).toBe('success');
    });

    it('should handle very deep nesting', () => {
      const content = `- Level 1
  - Level 2
    - Level 3
      - Level 4
        - Level 5 (too deep)`;

      const issues = fixer.detectIssues(content, 'test.md');
      const deepNestingIssues = issues.filter(i => i.type === 'list_nesting_too_deep');
      expect(deepNestingIssues).toHaveLength(1);
    });

    it('should handle mixed ordered and unordered lists', () => {
      const content = `1. Ordered item
- Unordered item
2. Another ordered item`;

      const structure = fixer.analyzeDocumentStructure(content);
      expect(structure.lists).toHaveLength(3); // Should be treated as separate lists
    });
  });

  describe('performance', () => {
    it('should handle large documents efficiently', () => {
      // Generate a large document
      const sections = [];
      for (let i = 1; i <= 100; i++) {
        sections.push(`## Section ${i}`);
        sections.push('');
        sections.push('Some content here.');
        sections.push('');
        sections.push('- List item 1');
        sections.push('- List item 2');
        sections.push('');
      }
      const largeContent = sections.join('\n');

      const startTime = Date.now();
      const issues = fixer.detectIssues(largeContent, 'large.md');
      const detectTime = Date.now() - startTime;

      const fixStartTime = Date.now();
      const result = fixer.fix(largeContent, issues);
      const fixTime = Date.now() - fixStartTime;

      // Should complete within reasonable time (adjust thresholds as needed)
      expect(detectTime).toBeLessThan(1000); // 1 second
      expect(fixTime).toBeLessThan(2000);    // 2 seconds
      expect(result.status).toBe('success');
    });
  });
});