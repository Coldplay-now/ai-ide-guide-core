/**
 * Tests for TerminologyAnalyzer
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminologyAnalyzer } from '../../src/fixers/terminology-analyzer.js';

describe('TerminologyAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new TerminologyAnalyzer({ verbose: false });
  });

  describe('detectIssues', () => {
    it('should detect inconsistent terminology', () => {
      const content = `
        This is about api development.
        We use Api for our system.
        The API documentation is here.
      `;
      
      const issues = analyzer.detectIssues(content, 'test.md');
      const inconsistencyIssues = issues.filter(i => i.type === 'terminology_inconsistency');
      
      expect(inconsistencyIssues).toHaveLength(2);
      expect(inconsistencyIssues[0].description).toContain('api');
      expect(inconsistencyIssues[1].description).toContain('Api');
    });

    it('should detect undefined abbreviations', () => {
      const content = `
        We use ML for machine learning.
        The AI system works well.
        XYZ is not defined anywhere.
      `;
      
      const issues = analyzer.detectIssues(content, 'test.md');
      const abbreviationIssues = issues.filter(i => i.type === 'abbreviation_unknown');
      
      expect(abbreviationIssues).toHaveLength(1);
      expect(abbreviationIssues[0].description).toContain('XYZ');
    });

    it('should detect abbreviations without prior definition', () => {
      const content = `
        We start with API development.
        Application Programming Interface is important.
      `;
      
      const issues = analyzer.detectIssues(content, 'test.md');
      const definitionIssues = issues.filter(i => i.type === 'abbreviation_missing_definition');
      
      expect(definitionIssues).toHaveLength(1);
      expect(definitionIssues[0].description).toContain('API');
    });

    it('should detect mixed language usage', () => {
      const content = `
        这是一个 API 开发的项目。
        我们使用 machine learning 技术。
      `;
      
      const issues = analyzer.detectIssues(content, 'test.md');
      const mixedLanguageIssues = issues.filter(i => i.type.includes('mixed_language'));
      
      expect(mixedLanguageIssues.length).toBeGreaterThan(0);
    });

    it('should detect inconsistent quotes', () => {
      const content = `
        This is "quoted text" in English.
        这是"中文引号"的例子。
      `;
      
      const issues = analyzer.detectIssues(content, 'test.md');
      const quoteIssues = issues.filter(i => i.type.includes('inconsistent_quotes'));
      
      expect(quoteIssues.length).toBeGreaterThan(0);
    });
  });

  describe('getTerminologyStats', () => {
    it('should return correct terminology statistics', () => {
      const content = `
        API development with artificial intelligence.
        Machine learning and ML are important.
        The IDE supports various features.
        Unknown abbreviation XYZ appears here.
        这是一个 mixed language 示例。
      `;
      
      const stats = analyzer.getTerminologyStats(content);
      
      expect(stats.totalTerms).toBeGreaterThan(0);
      expect(stats.uniqueTerms).toBeGreaterThan(0);
      expect(stats.abbreviations).toBeGreaterThan(0);
      expect(stats.undefinedAbbreviations).toBeGreaterThan(0);
      expect(stats.mixedLanguage).toBeGreaterThan(0);
    });
  });

  describe('generateTerminologyReport', () => {
    it('should generate comprehensive terminology report', () => {
      const content = `
        # API Development Guide
        
        This guide covers api development using AI.
        Machine learning (ML) is important.
        The IDE provides good support.
        
        ## Features
        - api integration
        - AI assistance
        - ml capabilities
      `;
      
      const report = analyzer.generateTerminologyReport(content, 'guide.md');
      
      expect(report).toHaveProperty('filePath', 'guide.md');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('stats');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('summary');
      
      expect(report.stats.totalTerms).toBeGreaterThan(0);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.summary.totalIssues).toBe(report.issues.length);
    });
  });

  describe('trackTerminologyUsage', () => {
    it('should track terminology usage correctly', () => {
      const terminologyUsage = new Map();
      const abbreviationUsage = new Map();
      
      analyzer.trackTerminologyUsage(
        'API and artificial intelligence are important',
        terminologyUsage,
        abbreviationUsage
      );
      
      expect(terminologyUsage.size).toBeGreaterThan(0);
      expect(abbreviationUsage.size).toBeGreaterThan(0);
    });
  });

  describe('analyzeOverallConsistency', () => {
    it('should identify single usage terms', () => {
      const terminologyUsage = new Map([
        ['artificial intelligence', 1],
        ['machine learning', 5]
      ]);
      const abbreviationUsage = new Map([
        ['API', 3],
        ['XYZ', 1]
      ]);
      
      const issues = analyzer.analyzeOverallConsistency(
        terminologyUsage,
        abbreviationUsage,
        'test.md'
      );
      
      const singleUsageIssues = issues.filter(i => i.type === 'terminology_single_usage');
      expect(singleUsageIssues).toHaveLength(1);
      expect(singleUsageIssues[0].description).toContain('artificial intelligence');
    });

    it('should identify overused undefined abbreviations', () => {
      const terminologyUsage = new Map();
      const abbreviationUsage = new Map([
        ['API', 3],
        ['XYZ', 10] // Overused undefined abbreviation
      ]);
      
      const issues = analyzer.analyzeOverallConsistency(
        terminologyUsage,
        abbreviationUsage,
        'test.md'
      );
      
      const overusedIssues = issues.filter(i => i.type === 'abbreviation_overused');
      expect(overusedIssues).toHaveLength(1);
      expect(overusedIssues[0].description).toContain('XYZ');
    });
  });

  describe('loadDefaultTerminology', () => {
    it('should load default terminology dictionaries', () => {
      expect(analyzer.terminologyDict.size).toBeGreaterThan(0);
      expect(analyzer.abbreviationDict.size).toBeGreaterThan(0);
      expect(analyzer.inconsistentPatterns.length).toBeGreaterThan(0);
    });

    it('should have correct mappings for common terms', () => {
      expect(analyzer.terminologyDict.has('artificial intelligence')).toBe(true);
      expect(analyzer.abbreviationDict.has('API')).toBe(true);
      expect(analyzer.abbreviationDict.get('API')).toBe('application programming interface');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const issues = analyzer.detectIssues('', 'empty.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle content with only whitespace', () => {
      const issues = analyzer.detectIssues('   \n\n   ', 'whitespace.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle content without any terminology', () => {
      const content = 'This is just plain text without any technical terms.';
      const issues = analyzer.detectIssues(content, 'plain.md');
      // Should not crash and may have minimal issues
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle very long lines', () => {
      const longLine = 'API '.repeat(1000);
      const issues = analyzer.detectIssues(longLine, 'long.md');
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('severity levels', () => {
    it('should assign appropriate severity levels', () => {
      const content = `
        api should be API (minor)
        XYZ is undefined (info)
        Mixed 语言 usage (minor)
      `;
      
      const issues = analyzer.detectIssues(content, 'test.md');
      
      const minorIssues = issues.filter(i => i.severity === 'minor');
      const infoIssues = issues.filter(i => i.severity === 'info');
      
      expect(minorIssues.length).toBeGreaterThan(0);
      expect(infoIssues.length).toBeGreaterThan(0);
    });
  });
});