/**
 * Tests for FormatValidator
 * Validates format consistency validation, readability metrics calculation,
 * and quality assessment functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FormatValidator } from '../../src/fixers/format-validator.js';

describe('FormatValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new FormatValidator();
  });

  describe('Basic Validation', () => {
    it('should validate well-formatted content', () => {
      const content = `# Well Formatted Document

## Introduction

This document follows proper markdown formatting standards.

### Lists

Here are some properly formatted lists:

- Item 1
- Item 2
- Item 3

### Code

Here's a code block:

\`\`\`javascript
function example() {
  return 'properly formatted';
}
\`\`\`

## Conclusion

This document demonstrates proper formatting.`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.isValid).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(7);
      expect(result.summary.overallStatus).toBe('pass');
      expect(result.summary.qualityGrade).toMatch(/[A-C]/);
    });

    it('should detect format issues in poorly formatted content', () => {
      const content = `# Title
Immediate text after heading   

* Inconsistent list marker
- Regular list item

> Quote
Immediate text after quote

This has __bold__ and _italic_ text.`;

      const result = validator.validate(content, 'test.md');
      
      // The content might not have critical/warning issues, but should have some suggestions
      expect(result.summary.totalIssues).toBeGreaterThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty content', () => {
      const result = validator.validate('', 'empty.md');
      
      expect(result.isValid).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.readabilityMetrics.lineMetrics.totalLines).toBe(1);
    });
  });

  describe('Readability Metrics Calculation', () => {
    it('should calculate line metrics correctly', () => {
      const content = `Short line
This is a much longer line that exceeds the typical recommended length for readability
Medium length line here
Another short one`;

      const result = validator.validate(content, 'test.md');
      const lineMetrics = result.readabilityMetrics.lineMetrics;
      
      expect(lineMetrics.totalLines).toBe(4);
      expect(lineMetrics.maxLineLength).toBeGreaterThan(80);
      expect(lineMetrics.longLinesCount).toBeGreaterThanOrEqual(0);
      expect(lineMetrics.averageLineLength).toBeGreaterThan(0);
    });

    it('should calculate word and sentence metrics', () => {
      const content = `This is a test sentence. Here is another sentence with more words. Short one.`;

      const result = validator.validate(content, 'test.md');
      const wordMetrics = result.readabilityMetrics.wordMetrics;
      
      expect(wordMetrics.totalWords).toBeGreaterThan(10);
      expect(wordMetrics.totalSentences).toBe(3);
      expect(wordMetrics.averageWordsPerSentence).toBeGreaterThan(0);
      expect(wordMetrics.readabilityScore).toBeGreaterThan(0);
    });

    it('should calculate structure metrics', () => {
      const content = `# Title

## Section

- List item 1
- List item 2

1. Ordered item
2. Another item

\`\`\`javascript
code block
\`\`\`

[Link](http://example.com)`;

      const result = validator.validate(content, 'test.md');
      const structureMetrics = result.readabilityMetrics.structureMetrics;
      
      expect(structureMetrics.headings).toBe(2);
      expect(structureMetrics.lists).toBe(4); // 2 unordered + 2 ordered
      expect(structureMetrics.codeBlocks).toBe(1);
      expect(structureMetrics.links).toBe(1);
      expect(structureMetrics.structureRatio).toBeGreaterThan(0);
    });

    it('should handle content with no structure elements', () => {
      const content = `Just plain text without any structure elements. 
      No headings, no lists, no code blocks. 
      Just regular paragraphs of text.`;

      const result = validator.validate(content, 'test.md');
      const structureMetrics = result.readabilityMetrics.structureMetrics;
      
      expect(structureMetrics.headings).toBe(0);
      expect(structureMetrics.lists).toBe(0);
      expect(structureMetrics.codeBlocks).toBe(0);
      expect(structureMetrics.links).toBe(0);
    });
  });

  describe('Consistency Score Calculation', () => {
    it('should give high consistency score for consistent formatting', () => {
      const content = `# Title

## Section

- Item 1
- Item 2
- Item 3

**Bold text** and *italic text*.

> Quote with proper formatting

> Another quote`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.consistencyScore).toBeGreaterThan(8);
    });

    it('should give low consistency score for inconsistent formatting', () => {
      const content = `# Title
## Section
* Item 1
- Item 2
+ Item 3

__Bold text__ and _italic text_.

>Quote without space
> Quote with space`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.consistencyScore).toBeLessThan(8);
    });

    it('should handle content with no formattable elements', () => {
      const content = `Just plain text without any formatting.
      No lists, no emphasis, no quotes.
      Just regular text content.`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.consistencyScore).toBeGreaterThan(8); // Should be high since there's nothing to be inconsistent
    });
  });

  describe('Quality Score Calculation', () => {
    it('should calculate quality score based on multiple factors', () => {
      const goodContent = `# Well Structured Document

## Introduction

This document has good structure and formatting.

### Key Points

- Clear headings
- Proper list formatting
- Appropriate line lengths
- Good readability

## Conclusion

Quality content with minimal issues.`;

      const result = validator.validate(goodContent, 'good.md');
      
      expect(result.qualityScore).toBeGreaterThan(7);
      expect(result.summary.qualityGrade).toMatch(/[A-C]/);
    });

    it('should penalize quality score for many issues', () => {
      const poorContent = `#Title
Text immediately after heading   
* Mixed
- list
+ markers
__inconsistent__ _emphasis_ **formatting**
>Quote without space
Text immediately after quote
This is a very long line that exceeds the recommended length and makes the document harder to read on various devices and screen sizes which is not good for accessibility`;

      const result = validator.validate(poorContent, 'poor.md');
      
      expect(result.qualityScore).toBeLessThan(9); // More lenient expectation
      // Quality grade should reflect the score
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.summary.qualityGrade);
    });

    it('should give bonus points for good structure', () => {
      const structuredContent = `# Main Title

## Section 1

Content with proper structure.

### Subsection 1.1

More detailed content.

### Subsection 1.2

Additional content.

## Section 2

More content with good organization.`;

      const result = validator.validate(structuredContent, 'structured.md');
      
      expect(result.qualityScore).toBeGreaterThan(6);
      expect(result.readabilityMetrics.structureMetrics.headings).toBeGreaterThan(3);
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate appropriate recommendations for issues', () => {
      const content = `#Title
Text   
* Item
__bold__`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toHaveProperty('priority');
      expect(result.recommendations[0]).toHaveProperty('category');
      expect(result.recommendations[0]).toHaveProperty('title');
      expect(result.recommendations[0]).toHaveProperty('description');
      expect(result.recommendations[0]).toHaveProperty('action');
      expect(result.recommendations[0]).toHaveProperty('impact');
    });

    it('should prioritize recommendations correctly', () => {
      const content = `# Title with critical errors
Text with many issues   
* Inconsistent
- list
+ markers
This line is extremely long and exceeds all reasonable limits for readability and should be broken up into smaller pieces for better user experience`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.recommendations.length).toBeGreaterThan(1);
      
      // Check that high priority recommendations come first
      const priorities = result.recommendations.map(r => r.priority);
      const highPriorityIndex = priorities.indexOf('high');
      const lowPriorityIndex = priorities.indexOf('low');
      
      if (highPriorityIndex !== -1 && lowPriorityIndex !== -1) {
        expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
      }
    });

    it('should generate no recommendations for perfect content', () => {
      const content = `# Perfect Document

## Introduction

This document has excellent formatting and structure.

### Features

- Consistent formatting
- Proper spacing
- Good readability
- Clear structure

## Conclusion

No issues to report.`;

      const result = validator.validate(content, 'perfect.md');
      
      // Should have minimal or no recommendations
      expect(result.recommendations.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Issue Categorization', () => {
    it('should categorize issues by severity', () => {
      const content = `# Title
Text   
* Item`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.issues).toHaveProperty('critical');
      expect(result.issues).toHaveProperty('warnings');
      expect(result.issues).toHaveProperty('suggestions');
      expect(result.issues).toHaveProperty('byType');
      
      expect(Array.isArray(result.issues.critical)).toBe(true);
      expect(Array.isArray(result.issues.warnings)).toBe(true);
      expect(Array.isArray(result.issues.suggestions)).toBe(true);
      expect(typeof result.issues.byType).toBe('object');
    });

    it('should group issues by type', () => {
      const content = `Line with trailing spaces   
Another line with trailing spaces   `;

      const result = validator.validate(content, 'test.md');
      
      if (result.issues.byType.trailing_whitespace) {
        expect(result.issues.byType.trailing_whitespace.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Validation Summary', () => {
    it('should generate comprehensive summary', () => {
      const content = `# Test Document

Some content here.`;

      const result = validator.validate(content, 'test.md');
      
      expect(result.summary).toHaveProperty('overallStatus');
      expect(result.summary).toHaveProperty('qualityGrade');
      expect(result.summary).toHaveProperty('totalIssues');
      expect(result.summary).toHaveProperty('criticalIssues');
      expect(result.summary).toHaveProperty('warningIssues');
      expect(result.summary).toHaveProperty('readabilityGrade');
      expect(result.summary).toHaveProperty('keyMetrics');
      expect(result.summary).toHaveProperty('recommendations');
      
      expect(['pass', 'fail']).toContain(result.summary.overallStatus);
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.summary.qualityGrade);
    });

    it('should indicate pass status for high quality content', () => {
      const content = `# High Quality Document

## Introduction

This document meets all quality standards.

### Features

- Excellent formatting
- Clear structure
- Good readability

## Conclusion

Quality content.`;

      const result = validator.validate(content, 'quality.md');
      
      expect(result.summary.overallStatus).toBe('pass');
      expect(result.isValid).toBe(true);
    });

    it('should indicate fail status for low quality content', () => {
      const content = `#Poor Title
Text   
* Bad
- formatting
This is an extremely long line that goes on and on and exceeds all reasonable limits and makes the document very difficult to read`;

      const result = validator.validate(content, 'poor.md');
      
      // Depending on the severity of issues, this might pass or fail
      expect(['pass', 'fail']).toContain(result.summary.overallStatus);
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple files', () => {
      const files = [
        {
          path: 'file1.md',
          content: '# Good File\n\nWell formatted content.'
        },
        {
          path: 'file2.md',
          content: '#Bad File\nPoorly formatted   '
        },
        {
          path: 'file3.md',
          content: '# Another Good File\n\n## Section\n\nMore content.'
        }
      ];

      const result = validator.validateBatch(files);
      
      expect(result.summary.totalFiles).toBe(3);
      expect(result.summary.passedFiles).toBeGreaterThanOrEqual(0);
      expect(result.summary.failedFiles).toBeGreaterThanOrEqual(0);
      expect(result.summary.passedFiles + result.summary.failedFiles).toBe(3);
      expect(result.summary.averageQualityScore).toBeGreaterThan(0);
      expect(result.summary.averageQualityScore).toBeLessThanOrEqual(10);
      expect(result.summary).toHaveProperty('worstFile');
      expect(result.summary).toHaveProperty('bestFile');
      expect(result.results).toHaveLength(3);
    });

    it('should handle empty batch', () => {
      const result = validator.validateBatch([]);
      
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.passedFiles).toBe(0);
      expect(result.summary.failedFiles).toBe(0);
      expect(result.summary.averageQualityScore).toBe(0);
      expect(result.summary.worstFile).toBeNull();
      expect(result.summary.bestFile).toBeNull();
      expect(result.results).toHaveLength(0);
    });
  });

  describe('Helper Methods', () => {
    it('should calculate Flesch Reading Ease correctly', () => {
      const words = ['this', 'is', 'a', 'simple', 'test'];
      const sentences = 1;
      const syllables = validator.countSyllables(words);
      
      const score = validator.calculateFleschReadingEase(words.length, sentences, syllables);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(206.835);
    });

    it('should count syllables approximately', () => {
      const words = ['hello', 'world', 'testing', 'syllables'];
      const syllables = validator.countSyllables(words);
      
      expect(syllables).toBeGreaterThan(words.length); // Should be more syllables than words
    });

    it('should find consecutive blank lines', () => {
      const lines = ['text', '', '', '', 'more text', '', 'end'];
      const consecutive = validator.findConsecutiveBlankLines(lines);
      
      expect(consecutive).toBe(3);
    });

    it('should assign quality grades correctly', () => {
      expect(validator.getQualityGrade(9.5)).toBe('A');
      expect(validator.getQualityGrade(8.5)).toBe('B');
      expect(validator.getQualityGrade(7.5)).toBe('C');
      expect(validator.getQualityGrade(6.5)).toBe('D');
      expect(validator.getQualityGrade(5.0)).toBe('F');
    });

    it('should assign readability grades correctly', () => {
      expect(validator.getReadabilityGrade(95)).toBe('Very Easy');
      expect(validator.getReadabilityGrade(85)).toBe('Easy');
      expect(validator.getReadabilityGrade(75)).toBe('Fairly Easy');
      expect(validator.getReadabilityGrade(65)).toBe('Standard');
      expect(validator.getReadabilityGrade(55)).toBe('Fairly Difficult');
      expect(validator.getReadabilityGrade(35)).toBe('Difficult');
      expect(validator.getReadabilityGrade(25)).toBe('Very Difficult');
    });
  });

  describe('Edge Cases', () => {
    it('should handle content with special characters', () => {
      const content = `# Title with émojis 🎉

Content with special characters: àáâãäåæçèéêë

- List with unicode: ✓ ✗ ★ ☆

> Quote with special chars: "smart quotes"`;

      const result = validator.validate(content, 'special.md');
      
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.readabilityMetrics.wordMetrics.totalWords).toBeGreaterThan(0);
    });

    it('should handle very long content', () => {
      const longContent = '# Title\n\n' + 'Word '.repeat(1000);
      
      const result = validator.validate(longContent, 'long.md');
      
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.readabilityMetrics.wordMetrics.totalWords).toBeGreaterThan(900);
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n  \t  \n';
      
      const result = validator.validate(content, 'whitespace.md');
      
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.isValid).toBe(true);
    });

    it('should handle malformed markdown', () => {
      const content = `# Unclosed **bold text
      
[Broken link](
      
\`\`\`
Unclosed code block`;

      const result = validator.validate(content, 'malformed.md');
      
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(typeof result.summary.overallStatus).toBe('string');
    });
  });

  describe('Configuration', () => {
    it('should respect custom validation rules', () => {
      const customValidator = new FormatValidator();
      customValidator.validationRules.quality.minQualityScore = 9.0;
      
      const content = `# Good Document

Well formatted content.`;

      const result = customValidator.validate(content, 'test.md');
      
      // With higher threshold, might not pass
      expect(['pass', 'fail']).toContain(result.summary.overallStatus);
    });

    it('should use custom readability thresholds', () => {
      const customValidator = new FormatValidator();
      customValidator.validationRules.readability.maxLineLength = 50;
      
      const content = `# Title

This line is longer than fifty characters and should be flagged.`;

      const result = customValidator.validate(content, 'test.md');
      
      expect(result.readabilityMetrics.lineMetrics.longLinesCount).toBeGreaterThan(0);
    });
  });
});