/**
 * Tests for LinkAnalyzer
 * Validates broken link detection, duplicate anchor identification, and orphaned file detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LinkAnalyzer } from '../../src/fixers/link-analyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('LinkAnalyzer', () => {
  let analyzer;
  let tempDir;
  let testFiles;

  beforeEach(() => {
    analyzer = new LinkAnalyzer({ verbose: false });
    tempDir = path.join(__dirname, 'temp-link-test');
    
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create test files
    testFiles = {
      'main.md': `# Main Document

This is a [link to section](#section-1) in the same file.
This is a [link to other file](other.md).
This is a [link to section in other file](other.md#other-section).
This is a [broken link](nonexistent.md).
This is a [broken anchor](#nonexistent-anchor).
This is an [external link](https://example.com).

## Section 1

Content here.

## Section 1

Duplicate section.
`,
      'other.md': `# Other Document

## Other Section

Content here.
`,
      'orphaned.md': `# Orphaned Document

This file is not referenced by any other file.
`
    };

    // Write test files
    Object.entries(testFiles).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(tempDir, filename), content);
    });

    analyzer.projectRoot = tempDir;
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('detectBrokenLinks', () => {
    it('should detect broken file links', () => {
      const content = testFiles['main.md'];
      const filePath = path.join(tempDir, 'main.md');
      
      const issues = analyzer.detectIssues(content, filePath);
      
      const brokenFileLinks = issues.filter(issue => issue.type === 'broken_file_link');
      expect(brokenFileLinks).toHaveLength(1);
      expect(brokenFileLinks[0].description).toContain('nonexistent.md');
    });

    it('should detect broken anchor links', () => {
      const content = testFiles['main.md'];
      const filePath = path.join(tempDir, 'main.md');
      
      const issues = analyzer.detectIssues(content, filePath);
      
      const brokenAnchors = issues.filter(issue => issue.type === 'broken_anchor_link');
      expect(brokenAnchors).toHaveLength(1);
      expect(brokenAnchors[0].description).toContain('nonexistent-anchor');
    });

    it('should validate existing anchor links', () => {
      const content = testFiles['main.md'];
      const filePath = path.join(tempDir, 'main.md');
      
      const issues = analyzer.detectIssues(content, filePath);
      
      // Should not report the valid anchor link as broken
      const validAnchorIssues = issues.filter(issue => 
        issue.type === 'broken_anchor_link' && issue.description.includes('section-1')
      );
      expect(validAnchorIssues).toHaveLength(0);
    });

    it('should validate cross-file anchor links', () => {
      const content = testFiles['main.md'];
      const filePath = path.join(tempDir, 'main.md');
      
      const issues = analyzer.detectIssues(content, filePath);
      
      // Should not report valid cross-file anchor as broken
      const crossFileIssues = issues.filter(issue => 
        issue.type === 'broken_cross_file_anchor'
      );
      expect(crossFileIssues).toHaveLength(0);
    });

    it('should skip external links', () => {
      const content = testFiles['main.md'];
      const filePath = path.join(tempDir, 'main.md');
      
      const issues = analyzer.detectIssues(content, filePath);
      
      // Should not report external links as broken
      const externalLinkIssues = issues.filter(issue => 
        issue.description.includes('example.com')
      );
      expect(externalLinkIssues).toHaveLength(0);
    });
  });

  describe('detectDuplicateAnchors', () => {
    it('should detect duplicate heading anchors', () => {
      const content = testFiles['main.md'];
      const filePath = path.join(tempDir, 'main.md');
      
      const issues = analyzer.detectIssues(content, filePath);
      
      const duplicateAnchors = issues.filter(issue => issue.type === 'duplicate_anchor');
      expect(duplicateAnchors).toHaveLength(1);
      expect(duplicateAnchors[0].description).toContain('section-1');
    });

    it('should detect explicit duplicate anchors', () => {
      const content = `# Test Document

<a id="test-anchor">First anchor</a>

Some content here.

<a name="test-anchor">Duplicate anchor</a>
`;
      const filePath = path.join(tempDir, 'test.md');
      
      const issues = analyzer.detectIssues(content, filePath);
      
      const duplicateAnchors = issues.filter(issue => issue.type === 'duplicate_anchor');
      expect(duplicateAnchors).toHaveLength(1);
      expect(duplicateAnchors[0].description).toContain('test-anchor');
    });
  });

  describe('generateAnchorId', () => {
    it('should generate correct anchor IDs', () => {
      const testCases = [
        { input: 'Simple Heading', expected: 'simple-heading' },
        { input: 'Heading with Numbers 123', expected: 'heading-with-numbers-123' },
        { input: 'Heading with Special!@# Characters', expected: 'heading-with-special-characters' },
        { input: 'Multiple   Spaces', expected: 'multiple-spaces' },
        { input: 'Heading-with-hyphens', expected: 'heading-with-hyphens' },
        { input: '  Leading and Trailing  ', expected: 'leading-and-trailing' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = analyzer.generateAnchorId(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('analyzeOrphanedFiles', () => {
    it('should identify orphaned files', () => {
      const allFiles = [
        path.join(tempDir, 'main.md'),
        path.join(tempDir, 'other.md'),
        path.join(tempDir, 'orphaned.md')
      ];

      const orphanedFiles = analyzer.analyzeOrphanedFiles(allFiles);
      
      expect(orphanedFiles).toHaveLength(1);
      expect(orphanedFiles[0].file).toContain('orphaned.md');
      expect(orphanedFiles[0].issue.type).toBe('orphaned_file');
    });

    it('should not report referenced files as orphaned', () => {
      const allFiles = [
        path.join(tempDir, 'main.md'),
        path.join(tempDir, 'other.md')
      ];

      const orphanedFiles = analyzer.analyzeOrphanedFiles(allFiles);
      
      // other.md is referenced by main.md, so it should not be orphaned
      const orphanedOther = orphanedFiles.find(f => f.file.includes('other.md'));
      expect(orphanedOther).toBeUndefined();
    });

    it('should skip system files', () => {
      // Create system files
      fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Project');
      fs.writeFileSync(path.join(tempDir, 'LICENSE'), 'MIT License');

      const allFiles = [
        path.join(tempDir, 'main.md'),
        path.join(tempDir, '.gitignore'),
        path.join(tempDir, 'README.md'),
        path.join(tempDir, 'LICENSE')
      ];

      const orphanedFiles = analyzer.analyzeOrphanedFiles(allFiles);
      
      // System files should not be reported as orphaned
      const systemFileOrphans = orphanedFiles.filter(f => 
        f.file.includes('.gitignore') || 
        f.file.includes('README.md') || 
        f.file.includes('LICENSE')
      );
      expect(systemFileOrphans).toHaveLength(0);
    });
  });

  describe('extractFileReferences', () => {
    it('should extract file references from markdown links', () => {
      const content = `# Test Document

[Link to file](./other.md)
[Link with anchor](../parent/file.md#section)
[External link](https://example.com)
[Anchor only](#section)
`;
      const currentFile = path.join(tempDir, 'main.md');
      
      const references = analyzer.extractFileReferences(content, currentFile);
      
      expect(references).toHaveLength(2);
      expect(references.some(ref => ref.includes('other.md'))).toBe(true);
      expect(references.some(ref => ref.includes('file.md'))).toBe(true);
    });
  });

  describe('resolveFilePath', () => {
    it('should resolve relative paths correctly', () => {
      const currentFile = path.join(tempDir, 'subdir', 'current.md');
      
      const testCases = [
        { input: './file.md', expected: path.join(tempDir, 'subdir', 'file.md') },
        { input: '../parent.md', expected: path.join(tempDir, 'parent.md') },
        { input: 'sibling.md', expected: path.join(tempDir, 'subdir', 'sibling.md') }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = analyzer.resolveFilePath(input, currentFile);
        expect(result).toBe(expected);
      });
    });
  });

  describe('findAnchorInContent', () => {
    it('should find heading-based anchors', () => {
      const content = `# Main Heading

## Sub Heading

### Another Section
`;
      
      expect(analyzer.findAnchorInContent(content, 'main-heading')).toBe(true);
      expect(analyzer.findAnchorInContent(content, 'sub-heading')).toBe(true);
      expect(analyzer.findAnchorInContent(content, 'another-section')).toBe(true);
      expect(analyzer.findAnchorInContent(content, 'nonexistent')).toBe(false);
    });

    it('should find explicit anchors', () => {
      const content = `# Document

<a id="explicit-anchor">Anchor</a>
<a name="named-anchor">Named</a>
`;
      
      expect(analyzer.findAnchorInContent(content, 'explicit-anchor')).toBe(true);
      expect(analyzer.findAnchorInContent(content, 'named-anchor')).toBe(true);
      expect(analyzer.findAnchorInContent(content, 'missing-anchor')).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complex document with multiple issue types', () => {
      const complexContent = `# Complex Document

This has a [valid link](other.md) and a [broken link](missing.md).
Also has a [valid anchor](#complex-document) and [broken anchor](#missing).

## Duplicate Section

Content here.

## Duplicate Section

More content.

[Cross-file link](other.md#other-section) should work.
[Broken cross-file](other.md#missing-section) should not.
`;
      
      const filePath = path.join(tempDir, 'complex.md');
      fs.writeFileSync(filePath, complexContent);
      
      const issues = analyzer.detectIssues(complexContent, filePath);
      
      // Should detect multiple types of issues
      const issueTypes = [...new Set(issues.map(issue => issue.type))];
      expect(issueTypes).toContain('broken_file_link');
      expect(issueTypes).toContain('broken_anchor_link');
      expect(issueTypes).toContain('duplicate_anchor');
      expect(issueTypes).toContain('broken_cross_file_anchor');
    });
  });
});