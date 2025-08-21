/**
 * Tests for ReferenceValidator
 * Validates comprehensive reference integrity validation system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReferenceValidator } from '../../src/fixers/reference-validator.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ReferenceValidator', () => {
  let validator;
  let tempDir;
  let testFiles;

  beforeEach(() => {
    validator = new ReferenceValidator({ verbose: false });
    tempDir = path.join(__dirname, 'temp-ref-validator-test');
    
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create test files
    testFiles = {
      'main.md': `# Main Document

This is a [link to other](other.md) file.
This is a [link to section](#main-section) in same file.
This is a [cross-file link](other.md#other-section).
This is a [broken link](missing.md).
This is a [broken anchor](#missing-anchor).
This is an [external link](https://example.com).

## Main Section

Content here.
`,
      'other.md': `# Other Document

This links back to [main document](main.md).

## Other Section

Content here.
`,
      'orphaned.md': `# Orphaned Document

This file has no incoming links.
`,
      'hub.md': `# Hub Document

This is referenced by multiple files.
`
    };

    // Write test files
    Object.entries(testFiles).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(tempDir, filename), content);
    });

    // Add references to hub.md
    fs.appendFileSync(path.join(tempDir, 'main.md'), '\n[Link to hub](hub.md)\n');
    fs.appendFileSync(path.join(tempDir, 'other.md'), '\n[Another link to hub](hub.md)\n');

    validator.projectRoot = tempDir;
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateFileReferences', () => {
    it('should validate all links in a file', () => {
      const filePath = path.join(tempDir, 'main.md');
      const result = validator.validateFileReferences(filePath);

      expect(result.totalLinks).toBeGreaterThan(0);
      expect(result.validLinks).toBeGreaterThan(0);
      expect(result.brokenLinks).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should identify valid and broken links correctly', () => {
      const filePath = path.join(tempDir, 'main.md');
      const result = validator.validateFileReferences(filePath);

      // Should have broken links (missing.md and missing-anchor)
      expect(result.brokenLinks).toBeGreaterThanOrEqual(2);
      
      // Should have valid links (other.md, main-section, external)
      expect(result.validLinks).toBeGreaterThanOrEqual(3);
    });
  });

  describe('extractAllLinks', () => {
    it('should extract all types of links', () => {
      const content = `# Test Document

[Markdown link](file.md)
[Reference link][ref]
<https://example.com>
<a href="page.html">HTML link</a>

[ref]: reference.md
`;
      const filePath = path.join(tempDir, 'test.md');
      const links = validator.extractAllLinks(content, filePath);

      expect(links.length).toBeGreaterThanOrEqual(3);
      
      const linkTypes = links.map(link => link.type);
      expect(linkTypes).toContain('markdown_link');
      expect(linkTypes).toContain('autolink');
      expect(linkTypes).toContain('html_link');
    });

    it('should capture link details correctly', () => {
      const content = `# Test

[Test link](test.md) on line 3.
`;
      const filePath = path.join(tempDir, 'test.md');
      const links = validator.extractAllLinks(content, filePath);

      expect(links[0]).toMatchObject({
        type: 'markdown_link',
        text: 'Test link',
        url: 'test.md',
        line: 3
      });
    });
  });

  describe('validateSingleLink', () => {
    it('should validate external links correctly', () => {
      const link = {
        type: 'markdown_link',
        text: 'External',
        url: 'https://example.com',
        line: 1
      };

      const result = validator.validateSingleLink(link, tempDir, { checkExternalLinks: false });
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('External link');
    });

    it('should validate anchor-only links', () => {
      const link = {
        type: 'markdown_link',
        text: 'Section',
        url: '#main-section',
        line: 1
      };

      const filePath = path.join(tempDir, 'main.md');
      const result = validator.validateSingleLink(link, filePath);
      expect(result.isValid).toBe(true);
    });

    it('should detect broken anchor links', () => {
      const link = {
        type: 'markdown_link',
        text: 'Missing',
        url: '#missing-section',
        line: 1
      };

      const filePath = path.join(tempDir, 'main.md');
      const result = validator.validateSingleLink(link, filePath);
      expect(result.isValid).toBe(false);
      expect(result.severity).toBe('error');
    });

    it('should validate file references', () => {
      const validLink = {
        type: 'markdown_link',
        text: 'Other',
        url: 'other.md',
        line: 1
      };

      const brokenLink = {
        type: 'markdown_link',
        text: 'Missing',
        url: 'missing.md',
        line: 1
      };

      const filePath = path.join(tempDir, 'main.md');
      
      const validResult = validator.validateSingleLink(validLink, filePath);
      expect(validResult.isValid).toBe(true);

      const brokenResult = validator.validateSingleLink(brokenLink, filePath);
      expect(brokenResult.isValid).toBe(false);
    });

    it('should validate cross-file anchors', () => {
      const validCrossLink = {
        type: 'markdown_link',
        text: 'Other Section',
        url: 'other.md#other-section',
        line: 1
      };

      const brokenCrossLink = {
        type: 'markdown_link',
        text: 'Missing Section',
        url: 'other.md#missing-section',
        line: 1
      };

      const filePath = path.join(tempDir, 'main.md');
      
      const validResult = validator.validateSingleLink(validCrossLink, filePath);
      expect(validResult.isValid).toBe(true);

      const brokenResult = validator.validateSingleLink(brokenCrossLink, filePath);
      expect(brokenResult.isValid).toBe(false);
    });
  });

  describe('extractAndValidateAnchors', () => {
    it('should extract heading anchors', () => {
      const content = `# Main Heading

## Sub Heading

### Another Section
`;
      const filePath = path.join(tempDir, 'test.md');
      const anchors = validator.extractAndValidateAnchors(content, filePath);

      expect(anchors.length).toBe(3);
      expect(anchors[0]).toMatchObject({
        type: 'heading',
        id: 'main-heading',
        level: 1
      });
    });

    it('should extract explicit anchors', () => {
      const content = `# Document

<a id="explicit-anchor">Explicit</a>
<a name="named-anchor">Named</a>
`;
      const filePath = path.join(tempDir, 'test.md');
      const anchors = validator.extractAndValidateAnchors(content, filePath);

      const explicitAnchors = anchors.filter(a => a.type === 'explicit');
      expect(explicitAnchors.length).toBe(2);
      expect(explicitAnchors[0].id).toBe('explicit-anchor');
      expect(explicitAnchors[1].id).toBe('named-anchor');
    });

    it('should detect duplicate anchors', () => {
      const content = `# Document

## Section

Content.

## Section

Duplicate.
`;
      const filePath = path.join(tempDir, 'test.md');
      const anchors = validator.extractAndValidateAnchors(content, filePath);

      const duplicates = anchors.filter(a => a.isDuplicate);
      expect(duplicates.length).toBe(1);
    });
  });

  describe('validateCrossReferences', () => {
    it('should validate cross-references across files', () => {
      const files = [
        path.join(tempDir, 'main.md'),
        path.join(tempDir, 'other.md')
      ];

      const results = validator.validateCrossReferences(files);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Should find valid cross-reference
      const validRefs = results.filter(r => r.isValid);
      expect(validRefs.length).toBeGreaterThan(0);
    });
  });

  describe('validateDocumentAssociations', () => {
    it('should analyze document relationships', () => {
      const files = [
        path.join(tempDir, 'main.md'),
        path.join(tempDir, 'other.md'),
        path.join(tempDir, 'hub.md'),
        path.join(tempDir, 'orphaned.md')
      ];

      const associations = validator.validateDocumentAssociations(files);
      
      expect(associations.length).toBe(4);
      
      // Hub document should have multiple incoming links
      const hubDoc = associations.find(a => a.filePath.includes('hub.md'));
      expect(hubDoc.isHub).toBe(true);
      expect(hubDoc.incomingLinks).toBeGreaterThan(1);

      // Orphaned document should have no incoming links
      const orphanedDoc = associations.find(a => a.filePath.includes('orphaned.md'));
      expect(orphanedDoc.isOrphaned).toBe(true);
      expect(orphanedDoc.incomingLinks).toBe(0);
    });
  });

  describe('buildDocumentGraph', () => {
    it('should build correct document relationship graph', () => {
      const files = [
        path.join(tempDir, 'main.md'),
        path.join(tempDir, 'other.md')
      ];

      const graph = validator.buildDocumentGraph(files);
      
      expect(graph.size).toBe(2);
      
      const mainConnections = graph.get(path.join(tempDir, 'main.md'));
      const otherConnections = graph.get(path.join(tempDir, 'other.md'));
      
      // main.md should have outgoing link to other.md
      expect(mainConnections.outgoingLinks.has(path.join(tempDir, 'other.md'))).toBe(true);
      
      // other.md should have incoming link from main.md
      expect(otherConnections.incomingLinks.has(path.join(tempDir, 'main.md'))).toBe(true);
    });
  });

  describe('validateReferences', () => {
    it('should perform comprehensive validation', () => {
      const files = [
        path.join(tempDir, 'main.md'),
        path.join(tempDir, 'other.md'),
        path.join(tempDir, 'orphaned.md')
      ];

      const results = validator.validateReferences(files, {
        validateCrossReferences: true,
        checkDocumentAssociations: true,
        generateReport: true
      });

      expect(results.summary.totalFiles).toBe(3);
      expect(results.summary.totalLinks).toBeGreaterThan(0);
      expect(results.fileResults.size).toBe(3);
      expect(results.crossReferenceResults.length).toBeGreaterThan(0);
      expect(results.documentAssociations.length).toBe(3);
      expect(results.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify broken links in summary', () => {
      const files = [path.join(tempDir, 'main.md')];
      const results = validator.validateReferences(files);

      expect(results.summary.brokenLinks).toBeGreaterThan(0);
      expect(results.summary.errors).toBeGreaterThan(0);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate appropriate recommendations', () => {
      const mockResults = {
        summary: {
          brokenLinks: 5,
          errors: 3
        },
        fileResults: new Map([
          ['file1.md', { errors: [{ message: 'error' }], warnings: [] }],
          ['file2.md', { errors: [], warnings: [{ message: 'warning' }] }]
        ]),
        orphanedFiles: [{ file: 'orphan.md' }],
        documentAssociations: [
          { isHub: true, incomingLinks: 5 },
          { isLeaf: true, outgoingLinks: 0 }
        ]
      };

      const recommendations = validator.generateRecommendations(mockResults);
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      const categories = recommendations.map(r => r.category);
      expect(categories).toContain('broken_links');
      expect(categories).toContain('orphaned_files');
      expect(categories).toContain('file_errors');
    });
  });

  describe('generateReport', () => {
    it('should generate formatted validation report', () => {
      const mockResults = {
        summary: {
          totalFiles: 3,
          totalLinks: 10,
          validLinks: 7,
          brokenLinks: 3,
          warnings: 2,
          errors: 1
        },
        recommendations: [
          { type: 'error', message: 'Critical issue found' },
          { type: 'warning', message: 'Warning message' }
        ],
        orphanedFiles: [
          { file: 'orphan1.md' },
          { file: 'orphan2.md' }
        ]
      };

      const report = validator.generateReport(mockResults);
      
      expect(report).toContain('# Reference Validation Report');
      expect(report).toContain('Total Files: 3');
      expect(report).toContain('Broken Links: 3');
      expect(report).toContain('## Recommendations');
      expect(report).toContain('## Orphaned Files');
      expect(report).toContain('orphan1.md');
    });
  });

  describe('isExternalLink', () => {
    it('should correctly identify external links', () => {
      expect(validator.isExternalLink('https://example.com')).toBe(true);
      expect(validator.isExternalLink('http://example.com')).toBe(true);
      expect(validator.isExternalLink('ftp://example.com')).toBe(true);
      expect(validator.isExternalLink('file.md')).toBe(false);
      expect(validator.isExternalLink('#anchor')).toBe(false);
      expect(validator.isExternalLink('mailto:test@example.com')).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complex document structures', () => {
      // Create a more complex structure
      const complexFiles = {
        'index.md': `# Index
[Chapter 1](chapter1.md)
[Chapter 2](chapter2.md)
[Appendix](appendix.md#section-a)
`,
        'chapter1.md': `# Chapter 1
[Back to index](index.md)
[Next chapter](chapter2.md)
`,
        'chapter2.md': `# Chapter 2
[Previous chapter](chapter1.md)
[Back to index](index.md)
`,
        'appendix.md': `# Appendix
## Section A
Content here.
`
      };

      // Write complex files
      Object.entries(complexFiles).forEach(([filename, content]) => {
        fs.writeFileSync(path.join(tempDir, filename), content);
      });

      const files = Object.keys(complexFiles).map(f => path.join(tempDir, f));
      const results = validator.validateReferences(files);

      expect(results.summary.totalFiles).toBe(4);
      expect(results.summary.brokenLinks).toBe(0); // All links should be valid
      expect(results.orphanedFiles.length).toBe(0); // No orphaned files
    });

    it('should handle empty files gracefully', () => {
      fs.writeFileSync(path.join(tempDir, 'empty.md'), '');
      
      const result = validator.validateFileReferences(path.join(tempDir, 'empty.md'));
      
      expect(result.totalLinks).toBe(0);
      expect(result.validLinks).toBe(0);
      expect(result.brokenLinks).toBe(0);
      expect(result.errors.length).toBe(0);
    });
  });
});