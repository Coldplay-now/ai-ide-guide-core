import { describe, it, expect, beforeEach } from 'vitest';
import { StructureFixer } from '../../src/fixers/structure-fixer.js';

describe('StructureFixer - Validation System', () => {
  let fixer;

  beforeEach(() => {
    fixer = new StructureFixer({ verbose: false });
  });

  describe('validate method', () => {
    it('should validate successful fixes', () => {
      const originalContent = `# Title
### Skipped Level
# Another H1`;

      const issues = fixer.detectIssues(originalContent, 'test.md');
      const result = fixer.fix(originalContent, issues);
      const validation = fixer.validate(originalContent, result.content);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.improvement.structureFixed).toBe(true);
    });

    it('should detect remaining issues after fixing', () => {
      const originalContent = `# Title
## Section`;
      
      // Simulate a fix that doesn't fully resolve issues
      const brokenFixedContent = `# Title
#### Still Skipped Level`; // This creates a new issue

      const validation = fixer.validate(originalContent, brokenFixedContent);

      expect(validation.remainingIssues).toBeGreaterThan(0);
    });

    it('should warn about significant content changes', () => {
      const originalContent = `# Short`;
      const fixedContent = `# Short

## Added Section

### Added Subsection

#### Added Sub-subsection

##### Added Deep Section

###### Added Very Deep Section

Content added here.

More content.

Even more content.

- List item 1
- List item 2
- List item 3
- List item 4
- List item 5

1. Ordered item 1
2. Ordered item 2
3. Ordered item 3

Final paragraph.`;

      const validation = fixer.validate(originalContent, fixedContent);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('文档行数变化较大');
    });

    it('should report validation errors for critical issues', () => {
      const originalContent = `# Title
## Section`;
      
      // Create content with critical issues
      const fixedContent = `# Title
## 
### Empty heading above`;

      const validation = fixer.validate(originalContent, fixedContent);

      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.isValid).toBe(false);
    });
  });

  describe('structure integrity validation', () => {
    it('should validate heading hierarchy integrity', () => {
      const content = `# Main Title
## Section 1
### Subsection 1.1
### Subsection 1.2
## Section 2
### Subsection 2.1`;

      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues.filter(i => i.type === 'heading_level_skip')).toHaveLength(0);
    });

    it('should validate list structure integrity', () => {
      const content = `- Item 1
  - Subitem 1.1
  - Subitem 1.2
- Item 2
  - Subitem 2.1
    - Sub-subitem 2.1.1`;

      const structure = fixer.analyzeDocumentStructure(content);
      expect(structure.lists).toHaveLength(1);
      expect(structure.lists[0].items).toHaveLength(6);
    });

    it('should validate navigation structure', () => {
      const content = `# Table of Contents

## Introduction
### Overview
### Scope

## Main Content
### Chapter 1
#### Section 1.1
#### Section 1.2
### Chapter 2
#### Section 2.1

## Conclusion`;

      const structure = fixer.analyzeDocumentStructure(content);
      
      // Check that we have proper heading hierarchy
      const headingLevels = structure.headings.map(h => h.level);
      expect(headingLevels).toEqual([1, 2, 3, 3, 2, 3, 4, 4, 3, 4, 2]);
    });
  });

  describe('document logic validation', () => {
    it('should validate document completeness', () => {
      const incompleteContent = `# Title
## Section 1
### Incomplete section...`;

      const completeContent = `# Title
## Section 1
### Complete section with content

This section has proper content and structure.

## Section 2
### Another complete section

More content here.

## Conclusion

Final thoughts.`;

      const incompleteStructure = fixer.analyzeDocumentStructure(incompleteContent);
      const completeStructure = fixer.analyzeDocumentStructure(completeContent);

      expect(completeStructure.paragraphs.length).toBeGreaterThan(incompleteStructure.paragraphs.length);
      expect(completeStructure.headings.length).toBeGreaterThan(incompleteStructure.headings.length);
    });

    it('should validate content organization', () => {
      const wellOrganizedContent = `# Main Title

## Introduction

Brief introduction to the topic.

## Background

Historical context and background information.

## Methodology

Description of the approach used.

### Data Collection

How data was collected.

### Analysis

How the analysis was performed.

## Results

### Key Findings

Main results of the study.

### Secondary Findings

Additional insights discovered.

## Discussion

Interpretation of the results.

## Conclusion

Summary and final thoughts.

## References

List of references used.`;

      const structure = fixer.analyzeDocumentStructure(wellOrganizedContent);
      
      // Well-organized content should have:
      // - Clear hierarchy
      // - Balanced sections
      // - Proper content distribution
      expect(structure.headings.length).toBeGreaterThan(5);
      expect(structure.paragraphs.length).toBeGreaterThan(5);
      
      // Check for logical flow (no major level skips)
      const issues = fixer.detectIssues(wellOrganizedContent, 'test.md');
      const hierarchyIssues = issues.filter(i => i.type === 'heading_level_skip');
      expect(hierarchyIssues).toHaveLength(0);
    });
  });

  describe('accessibility validation', () => {
    it('should validate heading accessibility', () => {
      const accessibleContent = `# Main Title

## Section with Clear Title

Content that explains the section.

### Subsection with Descriptive Title

More detailed content.

## Another Clear Section

Additional content.`;

      const inaccessibleContent = `# Title

## A

Content.

### B

More content.

## C

Final content.`;

      const accessibleStructure = fixer.analyzeDocumentStructure(accessibleContent);
      const inaccessibleStructure = fixer.analyzeDocumentStructure(inaccessibleContent);

      // Accessible content should have longer, more descriptive titles
      const accessibleTitleLengths = accessibleStructure.headings.map(h => h.text.length);
      const inaccessibleTitleLengths = inaccessibleStructure.headings.map(h => h.text.length);

      const avgAccessibleLength = accessibleTitleLengths.reduce((a, b) => a + b, 0) / accessibleTitleLengths.length;
      const avgInaccessibleLength = inaccessibleTitleLengths.reduce((a, b) => a + b, 0) / inaccessibleTitleLengths.length;

      expect(avgAccessibleLength).toBeGreaterThan(avgInaccessibleLength);
    });

    it('should validate list accessibility', () => {
      const accessibleList = `## Task List

- Complete the project documentation
- Review the code for quality issues
- Test the application thoroughly
- Deploy to production environment`;

      const inaccessibleList = `## List

- Do this
- Do that
- Other thing
- Final thing`;

      const accessibleStructure = fixer.analyzeDocumentStructure(accessibleList);
      const inaccessibleStructure = fixer.analyzeDocumentStructure(inaccessibleList);

      // Both should have the same structure, but accessible one has better content
      expect(accessibleStructure.lists[0].items.length).toBe(inaccessibleStructure.lists[0].items.length);
      
      // Check content quality (longer, more descriptive items)
      const accessibleItemLengths = accessibleStructure.lists[0].items.map(item => item.content.length);
      const inaccessibleItemLengths = inaccessibleStructure.lists[0].items.map(item => item.content.length);

      const avgAccessibleItemLength = accessibleItemLengths.reduce((a, b) => a + b, 0) / accessibleItemLengths.length;
      const avgInaccessibleItemLength = inaccessibleItemLengths.reduce((a, b) => a + b, 0) / inaccessibleItemLengths.length;

      expect(avgAccessibleItemLength).toBeGreaterThan(avgInaccessibleItemLength);
    });
  });

  describe('performance validation', () => {
    it('should validate large document processing', () => {
      // Generate a large document
      const sections = [];
      sections.push('# Large Document Test');
      sections.push('');
      
      for (let i = 1; i <= 50; i++) {
        sections.push(`## Section ${i}`);
        sections.push('');
        sections.push(`This is the content for section ${i}.`);
        sections.push('');
        sections.push('### Subsection A');
        sections.push('');
        sections.push('Content for subsection A.');
        sections.push('');
        sections.push('### Subsection B');
        sections.push('');
        sections.push('Content for subsection B.');
        sections.push('');
        sections.push('- List item 1');
        sections.push('- List item 2');
        sections.push('- List item 3');
        sections.push('');
      }
      
      const largeContent = sections.join('\n');

      const startTime = Date.now();
      const structure = fixer.analyzeDocumentStructure(largeContent);
      const analysisTime = Date.now() - startTime;

      const detectStartTime = Date.now();
      const issues = fixer.detectIssues(largeContent, 'large.md');
      const detectTime = Date.now() - detectStartTime;

      // Performance should be reasonable
      expect(analysisTime).toBeLessThan(500); // 500ms
      expect(detectTime).toBeLessThan(1000);  // 1 second

      // Structure should be correctly analyzed
      expect(structure.headings.length).toBe(151); // 1 main + 50 sections + 100 subsections
      expect(structure.lists.length).toBe(50);     // 50 lists
      expect(structure.paragraphs.length).toBe(150); // 100 subsection content + 50 section content
    });
  });
});