/**
 * Tests for TerminologyStandardizer
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminologyStandardizer } from '../../src/fixers/terminology-standardizer.js';

describe('TerminologyStandardizer', () => {
  let standardizer;

  beforeEach(() => {
    standardizer = new TerminologyStandardizer({ verbose: false });
  });

  describe('fix', () => {
    it('should standardize inconsistent terminology', () => {
      const content = `
        This is about api development.
        We use Api for our system.
        The github repository is here.
      `;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('API development');
      expect(result.content).toContain('API for our system');
      expect(result.content).toContain('GitHub repository');
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.stats.terminologyStandardized).toBeGreaterThan(0);
    });

    it('should expand abbreviations on first occurrence', () => {
      const content = `
        We use API for development.
        The API is important.
        Another API call here.
      `;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('Application Programming Interface (API)');
      expect(result.stats.abbreviationsExpanded).toBeGreaterThan(0);
    });

    it('should add glossary section when terms are found', () => {
      const content = `
        # Development Guide
        
        This guide covers API development and AI integration.
        We also use ML techniques.
      `;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('## Glossary');
      expect(result.content).toContain('**API**:');
      expect(result.content).toContain('**AI**:');
      expect(result.stats.glossaryUpdated).toBeGreaterThan(0);
    });

    it('should fix translation consistency issues', () => {
      const content = `
        This is"quoted text"in English.
        Chinese中文English混合text.
      `;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('"quoted text"');
      expect(result.content).toContain('Chinese 中文 English');
      expect(result.stats.translationsFixed).toBeGreaterThan(0);
    });

    it('should fix mixed Chinese-English terminology', () => {
      const content = `
        我们需要进行代码review。
        项目deploy完成后通知我。
      `;
      
      const result = standardizer.fix(content);
      
      expect(result.content).toContain('代码审查');
      expect(result.content).toContain('项目部署');
      expect(result.stats.terminologyStandardized).toBeGreaterThan(0);
    });
  });

  describe('standardizeTerminology', () => {
    it('should apply standardization rules correctly', () => {
      const content = 'We use api, Api, and github in our project.';
      
      const result = standardizer.standardizeTerminology(content);
      
      expect(result.content).toBe('We use API, API, and GitHub in our project.');
      expect(result.changes.length).toBe(3);
    });

    it('should preserve word boundaries', () => {
      const content = 'The rapid development uses api.';
      
      const result = standardizer.standardizeTerminology(content);
      
      expect(result.content).toBe('The rapid development uses API.');
      expect(result.content).not.toContain('rAPId');
    });
  });

  describe('addAbbreviationDefinitions', () => {
    it('should expand first occurrence of known abbreviations', () => {
      const content = 'API is important. Another API call.';
      const issues = [
        {
          type: 'abbreviation_missing_definition',
          description: 'Abbreviation "API" used without prior definition'
        }
      ];
      
      const result = standardizer.addAbbreviationDefinitions(content, issues);
      
      expect(result.content).toContain('Application Programming Interface (API)');
      expect(result.content).toContain('Another API call');
      expect(result.changes.length).toBe(1);
    });

    it('should skip unknown abbreviations', () => {
      const content = 'XYZ is unknown. Another XYZ reference.';
      const issues = [
        {
          type: 'abbreviation_unknown',
          description: 'Unknown abbreviation "XYZ"'
        }
      ];
      
      const result = standardizer.addAbbreviationDefinitions(content, issues);
      
      expect(result.content).toBe(content);
      expect(result.changes.length).toBe(0);
    });
  });

  describe('maintainGlossary', () => {
    it('should add glossary when terms are found', () => {
      const content = 'This document covers API and AI development.';
      
      const result = standardizer.maintainGlossary(content);
      
      expect(result.content).toContain('## Glossary');
      expect(result.content).toContain('**API**:');
      expect(result.content).toContain('**AI**:');
      expect(result.changes.length).toBe(1);
    });

    it('should not add glossary if already exists', () => {
      const content = `
        # Guide
        Content with API.
        
        ## Glossary
        Existing glossary here.
      `;
      
      const result = standardizer.maintainGlossary(content);
      
      expect(result.content).toBe(content);
      expect(result.changes.length).toBe(0);
    });

    it('should not add glossary if no known terms found', () => {
      const content = 'This document has no technical terms.';
      
      const result = standardizer.maintainGlossary(content);
      
      expect(result.content).toBe(content);
      expect(result.changes.length).toBe(0);
    });
  });

  describe('generateGlossarySection', () => {
    it('should generate properly formatted glossary', () => {
      const terms = ['API', 'AI'];
      
      const glossary = standardizer.generateGlossarySection(terms);
      
      expect(glossary).toContain('## Glossary');
      expect(glossary).toContain('**AI**:');
      expect(glossary).toContain('**API**:');
      expect(glossary).toContain('*中文:');
    });

    it('should sort terms alphabetically', () => {
      const terms = ['ML', 'API', 'AI'];
      
      const glossary = standardizer.generateGlossarySection(terms);
      
      const apiIndex = glossary.indexOf('**API**:');
      const aiIndex = glossary.indexOf('**AI**:');
      const mlIndex = glossary.indexOf('**ML**:');
      
      expect(aiIndex).toBeLessThan(apiIndex);
      expect(apiIndex).toBeLessThan(mlIndex);
    });
  });

  describe('fixTranslationConsistency', () => {
    it('should fix quotation marks', () => {
      const content = 'This is "quoted" and "more quotes".';
      
      const result = standardizer.fixTranslationConsistency(content);
      
      expect(result.content).toContain('"quoted"');
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should add spaces between Chinese and English', () => {
      const content = '中文English混合text中文';
      
      const result = standardizer.fixTranslationConsistency(content);
      
      expect(result.content).toContain('中文 English');
      expect(result.content).toContain('English 混合');
      expect(result.content).toContain('text 中文');
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should validate successful standardization', () => {
      const original = 'Simple api content.';
      const fixed = 'Simple API content.';
      
      const validation = standardizer.validate(original, fixed);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should warn about significant content changes', () => {
      const original = 'Short content.';
      const fixed = 'Much longer content with many additional words and explanations.';
      
      const validation = standardizer.validate(original, fixed);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Content length changed');
    });

    it('should detect content loss', () => {
      const original = `
        Line 1
        Line 2
        Line 3
        Line 4
        Line 5
      `;
      const fixed = 'Only one line remains.';
      
      const validation = standardizer.validate(original, fixed);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('content loss');
    });
  });

  describe('getStandardizationStats', () => {
    it('should return comprehensive statistics', () => {
      const content = `
        This covers api development and github usage.
        We use AI and ML techniques.
        Mixed中文English content here.
      `;
      
      const stats = standardizer.getStandardizationStats(content);
      
      expect(stats).toHaveProperty('originalIssues');
      expect(stats).toHaveProperty('fixedIssues');
      expect(stats).toHaveProperty('remainingIssues');
      expect(stats).toHaveProperty('improvementRate');
      expect(stats).toHaveProperty('categories');
      
      expect(stats.originalIssues).toBeGreaterThan(0);
      expect(stats.fixedIssues).toBeGreaterThan(0);
      expect(stats.categories.terminology).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = standardizer.fix('');
      
      expect(result.content).toBe('');
      expect(result.changes.length).toBe(0);
      expect(result.errors.length).toBe(0);
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n   ';
      const result = standardizer.fix(content);
      
      expect(result.content).toBe(content);
      expect(result.changes.length).toBe(0);
    });

    it('should handle content without any issues', () => {
      const content = 'Perfect content with no terminology issues.';
      const result = standardizer.fix(content);
      
      expect(result.content).toBe(content);
      expect(result.changes.length).toBe(0);
    });

    it('should handle malformed content gracefully', () => {
      const content = 'Content with\x00null bytes and\uFFFDreplacement chars';
      
      expect(() => {
        standardizer.fix(content);
      }).not.toThrow();
    });
  });

  describe('integration', () => {
    it('should work end-to-end with complex content', () => {
      const content = `
        # api Development Guide
        
        This guide covers api development using github.
        We integrate AI and use ML for processing.
        
        The IDE supports various features.
        Mixed中文English content需要处理.
        
        代码review is important for quality.
      `;
      
      const result = standardizer.fix(content);
      
      // Check terminology standardization
      expect(result.content).toContain('API Development Guide');
      expect(result.content).toContain('API development using GitHub');
      
      // Check abbreviation expansion
      expect(result.content).toContain('Artificial Intelligence (AI)');
      expect(result.content).toContain('Machine Learning (ML)');
      
      // Check glossary addition
      expect(result.content).toContain('## Glossary');
      
      // Check translation fixes
      expect(result.content).toContain('Mixed 中文 English content');
      expect(result.content).toContain('代码审查');
      
      // Check statistics
      expect(result.stats.terminologyStandardized).toBeGreaterThan(0);
      expect(result.stats.abbreviationsExpanded).toBeGreaterThan(0);
      expect(result.stats.glossaryUpdated).toBeGreaterThan(0);
      expect(result.stats.translationsFixed).toBeGreaterThan(0);
    });
  });
});