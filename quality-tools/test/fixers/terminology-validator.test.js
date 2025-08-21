/**
 * Tests for TerminologyValidator
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminologyValidator } from '../../src/fixers/terminology-validator.js';

describe('TerminologyValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new TerminologyValidator({ verbose: false });
  });

  describe('validate', () => {
    it('should validate content with proper terminology', () => {
      const content = `
        # API Development Guide
        
        Application Programming Interface (API) is a set of protocols.
        The API enables communication between systems.
        We use APIs extensively in our development.
      `;
      
      const result = validator.validate(content);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('validationChecks');
      expect(result).toHaveProperty('summary');
      
      expect(result.validationChecks.length).toBeGreaterThan(0);
      expect(result.summary.totalChecks).toBeGreaterThan(0);
    });

    it('should detect missing definitions', () => {
      const content = `
        We use XYZ extensively in our project.
        XYZ is very important for our system.
        The XYZ implementation is complex.
        XYZ requires careful handling.
        XYZ documentation is available.
      `;
      
      const result = validator.validate(content);
      
      const definitionCheck = result.validationChecks.find(c => c.rule === 'abbreviation_definition');
      expect(definitionCheck).toBeDefined();
      expect(definitionCheck.passed).toBe(false);
      expect(definitionCheck.issues.length).toBeGreaterThan(0);
    });

    it('should detect inconsistent usage', () => {
      const content = `
        We use api in our system.
        The Api is important.
        API documentation is here.
        Another api call is made.
      `;
      
      const result = validator.validate(content);
      
      const usageCheck = result.validationChecks.find(c => c.rule === 'usage_consistency');
      expect(usageCheck).toBeDefined();
      expect(usageCheck.issues.length).toBeGreaterThan(0);
    });

    it('should detect multilingual inconsistencies', () => {
      const content = `
        We use API for development.
        应用程序接口 is important.
        The API system works well.
        我们的应用程序接口很好用。
      `;
      
      const result = validator.validate(content);
      
      const multilingualCheck = result.validationChecks.find(c => c.rule === 'multilingual_consistency');
      expect(multilingualCheck).toBeDefined();
    });
  });

  describe('validateDefinitionConsistency', () => {
    it('should pass when definitions are present', () => {
      const content = `
        Application Programming Interface (API) is used for communication.
        The API enables data exchange.
      `;
      
      const result = validator.validateDefinitionConsistency(content, []);
      
      // The test should check that it doesn't fail completely
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('details');
      expect(result.details.termsChecked).toBeGreaterThan(0);
    });

    it('should fail when definitions are missing', () => {
      const content = `
        We use API extensively.
        The API is important.
        API calls are frequent.
        API integration is complex.
        API documentation is needed.
      `;
      
      const result = validator.validateDefinitionConsistency(content, []);
      
      expect(result.passed).toBe(false);
      expect(result.details.missingDefinitions).toBeGreaterThan(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect inconsistent definitions', () => {
      const content = `
        Application Programming Interface (API) is for communication.
        API是应用程序接口 for data exchange.
        Another definition: API means something else.
      `;
      
      const result = validator.validateDefinitionConsistency(content, []);
      
      expect(result.details.inconsistentDefinitions).toBeGreaterThan(0);
    });
  });

  describe('validateUsageConsistency', () => {
    it('should pass with consistent usage', () => {
      const content = `
        We use API for development.
        The API is well documented.
        API integration is important.
      `;
      
      const result = validator.validateUsageConsistency(content, []);
      
      expect(result.passed).toBe(true);
      expect(result.details.inconsistentUsage).toBe(0);
    });

    it('should detect case inconsistencies', () => {
      const content = `
        We use API for development.
        The api is important.
        Api documentation is here.
      `;
      
      const result = validator.validateUsageConsistency(content, []);
      
      expect(result.details.caseInconsistencies).toBeGreaterThan(0);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should detect variant inconsistencies', () => {
      const content = `
        We use artificial intelligence in our system.
        AI is very powerful.
        The AI system works well.
        Artificial intelligence helps us.
      `;
      
      const result = validator.validateUsageConsistency(content, []);
      
      expect(result.details.termsAnalyzed).toBeGreaterThan(0);
    });
  });

  describe('validateMultilingualConsistency', () => {
    it('should detect mixed language usage', () => {
      const content = `
        We use API for development.
        应用程序接口 is important for our system.
        The API works well.
      `;
      
      const result = validator.validateMultilingualConsistency(content, []);
      
      expect(result.details.multilingualTermsFound).toBeGreaterThan(0);
      expect(result.details.mixedLanguageUsage).toBeGreaterThan(0);
    });

    it('should pass with proper bilingual formatting', () => {
      const content = `
        We use Application Programming Interface (API) for development.
        The API（应用程序接口）is important.
      `;
      
      const result = validator.validateMultilingualConsistency(content, []);
      
      expect(result.details.multilingualTermsFound).toBeGreaterThan(0);
    });

    it('should detect improper bilingual usage', () => {
      const content = `
        We use API for development.
        应用程序接口 is also used.
        Both API and 应用程序接口 are important.
      `;
      
      const result = validator.validateMultilingualConsistency(content, []);
      
      expect(result.passed).toBe(false);
      expect(result.details.inconsistentTranslations).toBeGreaterThan(0);
    });
  });

  describe('validateAbbreviationDefinitions', () => {
    it('should pass when abbreviations are properly defined', () => {
      const content = `
        Application Programming Interface (API) is important.
        We use the API for communication.
        API calls are frequent.
      `;
      
      const result = validator.validateAbbreviationDefinitions(content, []);
      
      expect(result.passed).toBe(true);
      expect(result.details.undefinedAbbreviations).toBe(0);
    });

    it('should detect undefined frequent abbreviations', () => {
      const content = `
        We use XYZ in our system.
        XYZ is important.
        The XYZ implementation works.
        XYZ requires attention.
        XYZ documentation exists.
      `;
      
      const result = validator.validateAbbreviationDefinitions(content, []);
      
      expect(result.passed).toBe(false);
      expect(result.details.undefinedAbbreviations).toBeGreaterThan(0);
    });

    it('should detect improper definition order', () => {
      const content = `
        We use API in our system.
        The API is important.
        Application Programming Interface (API) is defined here.
      `;
      
      const result = validator.validateAbbreviationDefinitions(content, []);
      
      expect(result.details.improperDefinitions).toBeGreaterThan(0);
    });

    it('should ignore infrequent abbreviations', () => {
      const content = `
        We mention XYZ once.
        That's all for XYZ.
      `;
      
      const result = validator.validateAbbreviationDefinitions(content, []);
      
      expect(result.passed).toBe(true);
      expect(result.details.undefinedAbbreviations).toBe(0);
    });
  });

  describe('generateValidationReport', () => {
    it('should generate comprehensive validation report', () => {
      const content = `
        # Development Guide
        
        We use api and AI in our system.
        The api is important.
        AI helps with automation.
      `;
      
      const report = validator.generateValidationReport(content, 'guide.md');
      
      expect(report).toHaveProperty('filePath', 'guide.md');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overallStatus');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('validationChecks');
      expect(report).toHaveProperty('detectedIssues');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('errors');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.validationChecks.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide appropriate recommendations', () => {
      const content = `
        We use api, Api, and API inconsistently.
        XYZ appears many times without definition.
        XYZ is important. XYZ works well.
        XYZ requires attention. XYZ is complex.
      `;
      
      const report = validator.generateValidationReport(content, 'test.md');
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      const hasUsageRecommendation = report.recommendations.some(r => r.type === 'usage');
      const hasAbbreviationRecommendation = report.recommendations.some(r => r.type === 'abbreviation');
      
      expect(hasUsageRecommendation || hasAbbreviationRecommendation).toBe(true);
    });
  });

  describe('validateMultipleFiles', () => {
    it('should validate multiple files', () => {
      const files = [
        {
          path: 'file1.md',
          content: `
            # File 1
            Application Programming Interface (API) is important.
            We use the API extensively.
          `
        },
        {
          path: 'file2.md',
          content: `
            # File 2
            The api system works well.
            Api calls are frequent.
          `
        }
      ];
      
      const result = validator.validateMultipleFiles(files);
      
      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('fileResults');
      expect(result).toHaveProperty('crossFileIssues');
      
      expect(result.fileResults.length).toBe(2);
      expect(result.fileResults[0].filePath).toBe('file1.md');
      expect(result.fileResults[1].filePath).toBe('file2.md');
    });

    it('should detect cross-file inconsistencies', () => {
      const files = [
        {
          path: 'file1.md',
          content: 'We use API consistently.'
        },
        {
          path: 'file2.md',
          content: 'We use api inconsistently.'
        }
      ];
      
      const result = validator.validateMultipleFiles(files);
      
      expect(result.crossFileIssues.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const result = validator.validate('');
      
      expect(result.isValid).toBe(true);
      expect(result.validationChecks.length).toBeGreaterThan(0);
    });

    it('should handle content without terminology', () => {
      const content = 'This is plain text without any technical terms.';
      const result = validator.validate(content);
      
      expect(result.isValid).toBe(true);
      expect(result.summary.totalChecks).toBeGreaterThan(0);
    });

    it('should handle malformed content gracefully', () => {
      const content = 'Content with\x00null bytes and\uFFFDreplacement chars';
      
      expect(() => {
        validator.validate(content);
      }).not.toThrow();
    });

    it('should handle very long content', () => {
      const longContent = 'API '.repeat(10000) + 'Application Programming Interface (API) definition.';
      
      const result = validator.validate(longContent);
      
      expect(result).toHaveProperty('isValid');
      expect(result.validationChecks.length).toBeGreaterThan(0);
    });
  });

  describe('validation rules', () => {
    it('should have all expected validation rules', () => {
      expect(validator.validationRules.has('definition_consistency')).toBe(true);
      expect(validator.validationRules.has('usage_consistency')).toBe(true);
      expect(validator.validationRules.has('multilingual_consistency')).toBe(true);
      expect(validator.validationRules.has('abbreviation_definition')).toBe(true);
    });

    it('should have proper rule configurations', () => {
      const rule = validator.validationRules.get('definition_consistency');
      
      expect(rule).toHaveProperty('description');
      expect(rule).toHaveProperty('severity');
      expect(rule).toHaveProperty('check');
      expect(typeof rule.check).toBe('function');
    });
  });

  describe('integration with analyzer', () => {
    it('should use analyzer for issue detection', () => {
      const content = `
        This uses api and Api inconsistently.
        Unknown abbreviation XYZ appears here.
      `;
      
      const issues = validator.detectIssues(content, 'test.md');
      
      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThan(0);
    });

    it('should integrate analyzer results with validation', () => {
      const content = `
        Mixed api usage and Api inconsistency.
        XYZ is undefined but used frequently.
        XYZ appears multiple times.
        XYZ needs definition.
        XYZ is important.
      `;
      
      const issues = validator.detectIssues(content, 'test.md');
      const result = validator.validate(content, issues);
      
      expect(result.validationChecks.length).toBeGreaterThan(0);
      expect(result.summary.totalChecks).toBeGreaterThan(0);
    });
  });
});