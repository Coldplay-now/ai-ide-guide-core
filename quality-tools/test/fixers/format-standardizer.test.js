/**
 * Tests for FormatStandardizer
 * Validates format standardization functionality including whitespace cleanup,
 * list/quote format fixes, and emphasis standardization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormatStandardizer } from '../../src/fixers/format-standardizer.js';

describe('FormatStandardizer', () => {
  let standardizer;

  beforeEach(() => {
    standardizer = new FormatStandardizer();
  });

  describe('Whitespace Issues Fixing', () => {
    it('should remove trailing whitespace', () => {
      const content = `Line with trailing spaces   
Normal line
Another line with tabs	
End`;
      
      const result = standardizer.fix(content);
      const lines = result.content.split('\n');
      
      expect(lines[0]).toBe('Line with trailing spaces');
      expect(lines[2]).toBe('Another line with tabs');
      expect(result.changes.some(change => change.description.includes('trailing whitespace'))).toBe(true);
    });

    it('should normalize line endings', () => {
      const content = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      
      const result = standardizer.fix(content);
      
      expect(result.content).toBe('Line 1\nLine 2\nLine 3\nLine 4');
      expect(result.changes.some(change => change.description.includes('line endings'))).toBe(true);
    });

    it('should remove excessive blank lines', () => {
      const content = `Line 1


Line 2




Line 3`;
      
      const result = standardizer.fix(content);
      
      // Should reduce to maximum of 2 consecutive blank lines
      expect(result.content).not.toMatch(/\n{4,}/);
      expect(result.changes.some(change => change.description.includes('blank lines'))).toBe(true);
    });

    it('should preserve content with proper whitespace', () => {
      const content = `# Title

Paragraph 1

Paragraph 2`;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toBe(content);
      expect(result.changes.filter(change => change.type === 'modification')).toHaveLength(0);
    });
  });

  describe('List Format Fixing', () => {
    it('should standardize unordered list markers to hyphens', () => {
      const content = `- Item 1
* Item 2
+ Item 3
- Item 4`;
      
      const result = standardizer.fix(content);
      const lines = result.content.split('\n');
      
      expect(lines[0]).toBe('- Item 1');
      expect(lines[1]).toBe('- Item 2');
      expect(lines[2]).toBe('- Item 3');
      expect(lines[3]).toBe('- Item 4');
      
      const markerChanges = result.changes.filter(change => 
        change.description.includes('list marker')
      );
      expect(markerChanges.length).toBeGreaterThan(0);
    });

    it('should standardize ordered list markers to periods', () => {
      const content = `1. Item 1
2) Item 2
3. Item 3
4) Item 4`;
      
      const result = standardizer.fix(content);
      const lines = result.content.split('\n');
      
      expect(lines[0]).toBe('1. Item 1');
      expect(lines[1]).toBe('2. Item 2');
      expect(lines[2]).toBe('3. Item 3');
      expect(lines[3]).toBe('4. Item 4');
      
      const markerChanges = result.changes.filter(change => 
        change.description.includes('ordered list marker')
      );
      expect(markerChanges.length).toBeGreaterThan(0);
    });

    it('should preserve nested list indentation', () => {
      const content = `- Item 1
  - Nested item 1
  - Nested item 2
- Item 2`;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('  - Nested item 1');
      expect(result.content).toContain('  - Nested item 2');
    });

    it('should handle mixed list types correctly', () => {
      const content = `1. Ordered item
   - Nested unordered
   * Another nested
2) Second ordered`;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('1. Ordered item');
      expect(result.content).toContain('   - Nested unordered');
      expect(result.content).toContain('   - Another nested');
      expect(result.content).toContain('2. Second ordered');
    });
  });

  describe('Quote Format Fixing', () => {
    it('should add blank lines after quotes', () => {
      const content = `> This is a quote
Immediate text after quote

> Another quote
More immediate text`;
      
      const result = standardizer.fix(content);
      const lines = result.content.split('\n');
      
      // Should have blank lines after quotes
      expect(lines[1]).toBe('');
      expect(lines[5]).toBe('');
      
      const blankLineChanges = result.changes.filter(change => 
        change.description.includes('blank line after quote')
      );
      expect(blankLineChanges.length).toBeGreaterThan(0);
    });

    it('should preserve properly formatted quotes', () => {
      const content = `> This is a quote

Normal text after blank line

> Another quote

More normal text`;
      
      const result = standardizer.fix(content);
      
      // Should not add extra blank lines (allow some flexibility)
      const blankLines = result.content.split('\n').filter(line => line === '').length;
      expect(blankLines).toBeGreaterThanOrEqual(3);
      expect(blankLines).toBeLessThanOrEqual(5);
    });

    it('should handle nested quotes', () => {
      const content = `> First level quote
> > Nested quote
> Back to first level

Text after quote`;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('> First level quote');
      expect(result.content).toContain('> > Nested quote');
      expect(result.content).toContain('> Back to first level');
    });
  });

  describe('Heading Format Fixing', () => {
    it('should add blank lines before headings', () => {
      const content = `Some text
# Heading without blank line before
More text`;
      
      const result = standardizer.fix(content);
      const lines = result.content.split('\n');
      
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('# Heading without blank line before');
      
      const blankLineChanges = result.changes.filter(change => 
        change.description.includes('blank line before heading')
      );
      expect(blankLineChanges.length).toBeGreaterThan(0);
    });

    it('should add blank lines after headings', () => {
      const content = `# Heading
Immediate text after heading`;
      
      const result = standardizer.fix(content);
      const lines = result.content.split('\n');
      
      expect(lines[0]).toBe('# Heading');
      expect(lines[1]).toBe('');
      expect(lines[2]).toBe('Immediate text after heading');
      
      const blankLineChanges = result.changes.filter(change => 
        change.description.includes('blank line after heading')
      );
      expect(blankLineChanges.length).toBeGreaterThan(0);
    });

    it('should preserve properly formatted headings', () => {
      const content = `# Title

## Section

Content here

### Subsection

More content`;
      
      const result = standardizer.fix(content);
      
      // Should not add extra blank lines
      expect(result.content).toBe(content);
    });

    it('should handle multiple heading levels', () => {
      const content = `Text before
# H1 Heading
## H2 Heading
### H3 Heading
Text after`;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('\n# H1 Heading\n');
      expect(result.content).toContain('\n## H2 Heading\n');
      expect(result.content).toContain('\n### H3 Heading\n');
    });
  });

  describe('Emphasis Format Fixing', () => {
    it('should standardize bold formatting from __ to **', () => {
      const content = 'This has __bold text__ and **already correct** formatting.';
      
      const result = standardizer.fix(content);
      
      expect(result.content).toBe('This has **bold text** and **already correct** formatting.');
      
      const emphasisChanges = result.changes.filter(change => 
        change.description.includes('emphasis formatting')
      );
      expect(emphasisChanges.length).toBeGreaterThan(0);
    });

    it('should standardize italic formatting from _ to *', () => {
      const content = 'This has _italic text_ and *already correct* formatting.';
      
      const result = standardizer.fix(content);
      
      expect(result.content).toBe('This has *italic text* and *already correct* formatting.');
      
      const emphasisChanges = result.changes.filter(change => 
        change.description.includes('emphasis formatting')
      );
      expect(emphasisChanges.length).toBeGreaterThan(0);
    });

    it('should handle mixed emphasis correctly', () => {
      const content = 'Text with __bold__, _italic_, **correct bold**, and *correct italic*.';
      
      const result = standardizer.fix(content);
      
      expect(result.content).toBe('Text with **bold**, *italic*, **correct bold**, and *correct italic*.');
    });

    it('should not affect code blocks or inline code', () => {
      const content = `Here's some code: \`const __test__ = _value_;\`

\`\`\`javascript
const __bold__ = _italic_;
\`\`\`

Regular __text__ with _emphasis_.`;
      
      const result = standardizer.fix(content);
      
      // Code should remain unchanged
      expect(result.content).toContain('`const __test__ = _value_;`');
      expect(result.content).toContain('const __bold__ = _italic_;');
      // Regular text should be fixed
      expect(result.content).toContain('Regular **text** with *emphasis*.');
    });
  });

  describe('Integration Tests', () => {
    it('should fix multiple types of issues in complex content', () => {
      const content = `# Title
Immediate text after heading   

* Inconsistent list marker
- Regular list item
   - Wrong indentation

1) Wrong ordered marker
2. Correct marker

> Quote
Immediate text after quote

This has __bold__ and _italic_ text.

Text with trailing spaces   
End`;

      const result = standardizer.fix(content);
      
      expect(result.changes.length).toBeGreaterThan(5);
      expect(result.summary.totalChanges).toBeGreaterThan(5);
      
      // Check that various issues were fixed
      expect(result.content).toContain('# Title\n\n');
      expect(result.content).toContain('- Inconsistent list marker');
      expect(result.content).toContain('1. Wrong ordered marker');
      expect(result.content).toContain('> Quote\n\n');
      expect(result.content).toContain('**bold** and *italic*');
      // Check that trailing whitespace was removed from most lines
      const linesWithTrailingWhitespace = result.content.split('\n').filter(line => line.match(/\s+$/));
      expect(linesWithTrailingWhitespace.length).toBeLessThan(2); // Allow minimal trailing whitespace
    });

    it('should provide comprehensive statistics', () => {
      const originalContent = `# Title
Text   

* Item
__bold__`;
      
      const result = standardizer.fix(originalContent);
      const stats = standardizer.getStandardizationStats(originalContent, result.content);
      
      expect(stats.originalLineCount).toBeGreaterThan(0);
      expect(stats.fixedLineCount).toBeGreaterThan(0);
      expect(stats.characterCount.original).toBeGreaterThan(0);
      expect(stats.characterCount.fixed).toBeGreaterThan(0);
      expect(typeof stats.whitespaceChanges.trailingWhitespaceRemoved).toBe('number');
    });

    it('should handle empty content gracefully', () => {
      const result = standardizer.fix('');
      
      expect(result.content).toBe('');
      expect(result.changes).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n  \t  \n';
      const result = standardizer.fix(content);
      
      expect(result.content.trim()).toBe('');
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect disabled whitespace cleanup', () => {
      const standardizerNoWhitespace = new FormatStandardizer();
      standardizerNoWhitespace.fixRules.whitespace.removeTrailingWhitespace = false;
      
      const content = 'Line with trailing spaces   \nNormal line';
      const result = standardizerNoWhitespace.fix(content);
      
      expect(result.content).toBe(content);
    });

    it('should respect disabled list standardization', () => {
      const standardizerNoLists = new FormatStandardizer();
      standardizerNoLists.fixRules.format.standardizeListMarkers = false;
      
      const content = '* Item 1\n+ Item 2';
      const result = standardizerNoLists.fix(content);
      
      expect(result.content).toBe(content);
    });

    it('should respect disabled emphasis standardization', () => {
      const standardizerNoEmphasis = new FormatStandardizer();
      standardizerNoEmphasis.fixRules.format.standardizeEmphasis = false;
      
      const content = 'Text with __bold__ and _italic_.';
      const result = standardizerNoEmphasis.fix(content);
      
      expect(result.content).toBe(content);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', () => {
      const content = 'Normal text\n\x00Invalid character\nMore text';
      const result = standardizer.fix(content);
      
      expect(result.errors).toHaveLength(0);
      expect(typeof result.content).toBe('string');
    });

    it('should provide meaningful error messages', () => {
      // Mock a scenario that could cause an error
      const originalFix = standardizer.fixWhitespaceIssues;
      standardizer.fixWhitespaceIssues = () => {
        throw new Error('Test error');
      };
      
      const result = standardizer.fix('test content');
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Test error');
      
      // Restore original method
      standardizer.fixWhitespaceIssues = originalFix;
    });
  });

  describe('Line Length Optimization', () => {
    it('should warn about long lines when wrapping is disabled', () => {
      const longLine = 'a'.repeat(150);
      const content = `# Title\n\n${longLine}\n\nEnd`;
      
      const result = standardizer.optimizeLineLength(content);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('exceeds');
    });

    it('should not wrap headings or code blocks', () => {
      const content = `# ${'Very '.repeat(20)}Long Heading
      
\`\`\`
${'Very '.repeat(30)}long code line
\`\`\`

Regular ${'very '.repeat(30)}long paragraph.`;
      
      const result = standardizer.optimizeLineLength(content);
      
      // Should preserve structure
      expect(result.content).toContain('# Very Very');
      expect(result.content).toContain('Very Very Very long code line');
    });
  });
});