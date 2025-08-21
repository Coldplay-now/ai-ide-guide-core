/**
 * Tests for LinkFixer
 * Validates automatic fixing of broken links, duplicate anchors, and orphaned files
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LinkFixer } from '../../src/fixers/link-fixer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('LinkFixer', () => {
  let fixer;
  let tempDir;

  beforeEach(() => {
    fixer = new LinkFixer({ verbose: false });
    tempDir = path.join(__dirname, 'temp-link-fixer-test');
    
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fixer.projectRoot = tempDir;
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('fixBrokenFileLink', () => {
    it('should comment out broken file links when no alternative found', () => {
      const content = `# Test Document

This is a [broken link](nonexistent.md) that should be fixed.
`;
      
      const issue = {
        id: 'test-1',
        type: 'broken_file_link',
        line: 3,
        description: 'Broken file link'
      };

      const result = fixer.fix(content, [issue]);
      
      expect(result.fixed).toBe(1);
      expect(result.content).toContain('<!-- BROKEN LINK: [broken link](nonexistent.md) - File not found -->');
    });
  });

  describe('fixBrokenAnchorLink', () => {
    it('should fix broken anchor links with similar anchors', () => {
      const content = `# Test Document

This is a [link to section](#sectoin-1) with a typo.

## Section 1

Content here.
`;
      
      const issue = {
        id: 'test-2',
        type: 'broken_anchor_link',
        line: 3,
        description: 'Broken anchor link'
      };

      const result = fixer.fix(content, [issue]);
      
      expect(result.fixed).toBe(1);
      expect(result.content).toContain('[link to section](#section-1)');
    });

    it('should create missing anchors when no similar anchor found', () => {
      const content = `# Test Document

This is a [link to missing section](#missing-section).

## Existing Section

Content here.
`;
      
      const issue = {
        id: 'test-3',
        type: 'broken_anchor_link',
        line: 3,
        description: 'Broken anchor link'
      };

      const result = fixer.fix(content, [issue]);
      
      expect(result.fixed).toBe(1);
      // The fixer should either fix the link or create the missing section
      expect(result.content).toMatch(/## Missing Section|#existing-section/);
    });
  });

  describe('fixDuplicateAnchor', () => {
    it('should fix duplicate heading anchors by adding unique IDs', () => {
      const content = `# Test Document

## Section 1

Content here.

## Section 1

Duplicate section.
`;
      
      const issue = {
        id: 'test-4',
        type: 'duplicate_anchor',
        line: 7,
        description: 'Duplicate anchor'
      };

      const result = fixer.fix(content, [issue]);
      
      expect(result.fixed).toBe(1);
      expect(result.content).toContain('## Section 1 {#section-1-1}');
    });

    it('should fix duplicate explicit anchors', () => {
      const content = `# Test Document

<a id="test-anchor">First anchor</a>

Some content.

<a id="test-anchor">Duplicate anchor</a>
`;
      
      const issue = {
        id: 'test-5',
        type: 'duplicate_anchor',
        line: 7,
        description: 'Duplicate explicit anchor'
      };

      const result = fixer.fix(content, [issue]);
      
      expect(result.fixed).toBe(1);
      expect(result.content).toContain('<a id="test-anchor-1">Duplicate anchor</a>');
    });
  });

  describe('fixBrokenCrossFileAnchor', () => {
    it('should remove broken anchor from cross-file links', () => {
      const content = `# Test Document

This is a [cross-file link](other.md#missing-anchor).
`;
      
      // Create the target file without the anchor
      fs.writeFileSync(path.join(tempDir, 'other.md'), '# Other Document\n\nContent here.');
      
      const issue = {
        id: 'test-6',
        type: 'broken_cross_file_anchor',
        line: 3,
        description: 'Broken cross-file anchor'
      };

      const result = fixer.fix(content, [issue]);
      
      expect(result.fixed).toBe(1);
      expect(result.content).toContain('[cross-file link](other.md)');
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate string similarity correctly', () => {
      const testCases = [
        { str1: 'section-1', str2: 'sectoin-1', expected: 0.8 }, // 1 char difference in 9 chars
        { str1: 'hello', str2: 'hello', expected: 1.0 },
        { str1: 'hello', str2: 'world', expected: 0.2 }, // 4 char differences in 5 chars
        { str1: '', str2: '', expected: 1.0 },
        { str1: 'test', str2: 'testing', expected: 4/7 } // 4 matching chars in 7 total
      ];

      testCases.forEach(({ str1, str2, expected }) => {
        const result = fixer.calculateSimilarity(str1, str2);
        expect(result).toBeCloseTo(expected, 1);
      });
    });
  });

  describe('levenshteinDistance', () => {
    it('should calculate edit distance correctly', () => {
      const testCases = [
        { str1: 'kitten', str2: 'sitting', expected: 3 },
        { str1: 'hello', str2: 'hello', expected: 0 },
        { str1: 'abc', str2: 'def', expected: 3 },
        { str1: '', str2: 'test', expected: 4 },
        { str1: 'test', str2: '', expected: 4 }
      ];

      testCases.forEach(({ str1, str2, expected }) => {
        const result = fixer.levenshteinDistance(str1, str2);
        expect(result).toBe(expected);
      });
    });
  });

  describe('generateUniqueAnchor', () => {
    it('should generate unique anchor IDs', () => {
      const content = `# Document

## Section 1

Content.

## Section 1 {#section-1-1}

More content.
`;
      
      const uniqueAnchor = fixer.generateUniqueAnchor(content, 'section-1');
      expect(uniqueAnchor).toBe('section-1-1');
    });
  });

  describe('anchorToHeading', () => {
    it('should convert anchor IDs to heading text', () => {
      const testCases = [
        { input: 'section-1', expected: 'Section 1' },
        { input: 'my-long-heading', expected: 'My Long Heading' },
        { input: 'single', expected: 'Single' },
        { input: 'with-numbers-123', expected: 'With Numbers 123' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = fixer.anchorToHeading(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('extractAnchors', () => {
    it('should extract all anchors from content', () => {
      const content = `# Main Heading

## Sub Heading

<a id="explicit-anchor">Explicit</a>

### Another Section

<a name="named-anchor">Named</a>
`;
      
      const anchors = fixer.extractAnchors(content);
      
      expect(anchors).toContain('main-heading');
      expect(anchors).toContain('sub-heading');
      expect(anchors).toContain('another-section');
      expect(anchors).toContain('explicit-anchor');
      expect(anchors).toContain('named-anchor');
    });
  });

  describe('findSimilarAnchor', () => {
    it('should find similar anchors in content', () => {
      const content = `# Document

## Section One

Content.

## Another Section

More content.

## Final Section

End content.
`;
      
      const similar = fixer.findSimilarAnchor(content, 'section-one');
      expect(similar).toBe('section-one');
      
      const typo = fixer.findSimilarAnchor(content, 'sectoin-one');
      expect(typo).toBe('section-one');
      
      const noMatch = fixer.findSimilarAnchor(content, 'completely-different');
      expect(noMatch).toBeNull();
    });
  });

  describe('groupIssuesByType', () => {
    it('should group issues by type', () => {
      const issues = [
        { id: '1', type: 'broken_file_link' },
        { id: '2', type: 'broken_anchor_link' },
        { id: '3', type: 'broken_file_link' },
        { id: '4', type: 'duplicate_anchor' }
      ];

      const grouped = fixer.groupIssuesByType(issues);
      
      expect(grouped.broken_file_link).toHaveLength(2);
      expect(grouped.broken_anchor_link).toHaveLength(1);
      expect(grouped.duplicate_anchor).toHaveLength(1);
    });
  });

  describe('integration tests', () => {
    it('should fix multiple issue types in correct order', () => {
      const content = `# Test Document

This has a [broken link](missing.md) and [broken anchor](#missing).

## Duplicate Section

Content.

## Duplicate Section

More content.
`;
      
      const issues = [
        {
          id: 'broken-file',
          type: 'broken_file_link',
          line: 3,
          description: 'Broken file link'
        },
        {
          id: 'broken-anchor',
          type: 'broken_anchor_link',
          line: 3,
          description: 'Broken anchor link'
        },
        {
          id: 'duplicate',
          type: 'duplicate_anchor',
          line: 9,
          description: 'Duplicate anchor'
        }
      ];

      const result = fixer.fix(content, issues);
      
      expect(result.fixed).toBe(3);
      expect(result.content).toContain('<!-- BROKEN LINK:');
      expect(result.content).toContain('## Missing');
      expect(result.content).toContain('{#duplicate-section-1}');
    });

    it('should handle empty issues array', () => {
      const content = '# Simple Document\n\nContent here.';
      const result = fixer.fix(content, []);
      
      expect(result.fixed).toBe(0);
      expect(result.content).toBe(content);
      expect(result.changes).toHaveLength(0);
    });

    it('should handle malformed content gracefully', () => {
      const content = 'Not a proper markdown document';
      const issues = [{
        id: 'test',
        type: 'broken_anchor_link',
        line: 1,
        description: 'Test issue'
      }];

      const result = fixer.fix(content, issues);
      
      expect(result.failed).toBe(1);
      expect(result.content).toBe(content);
    });
  });
});