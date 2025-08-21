/**
 * Terminology Analyzer - Detects terminology consistency issues
 * Analyzes terminology usage, abbreviations, and translation consistency
 */
import { BaseFixer } from '../core/base-fixer.js';

export class TerminologyAnalyzer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    
    // Initialize terminology dictionaries
    this.terminologyDict = new Map();
    this.abbreviationDict = new Map();
    this.translationDict = new Map();
    this.inconsistencies = new Map();
    
    // Load default terminology rules
    this.loadDefaultTerminology();
  }

  /**
   * Load default terminology rules and dictionaries
   */
  loadDefaultTerminology() {
    // Common AI/IDE terminology with preferred forms
    const aiIdeTerms = {
      // AI terms
      'artificial intelligence': ['AI', '人工智能'],
      'machine learning': ['ML', '机器学习'],
      'large language model': ['LLM', '大语言模型'],
      'natural language processing': ['NLP', '自然语言处理'],
      'integrated development environment': ['IDE', '集成开发环境'],
      
      // Development terms
      'version control': ['版本控制'],
      'continuous integration': ['CI', '持续集成'],
      'continuous deployment': ['CD', '持续部署'],
      'application programming interface': ['API', '应用程序接口'],
      'software development kit': ['SDK', '软件开发工具包'],
      
      // Quality terms
      'code review': ['代码审查', '代码评审'],
      'unit testing': ['单元测试'],
      'integration testing': ['集成测试'],
      'user acceptance testing': ['UAT', '用户验收测试'],
      'quality assurance': ['QA', '质量保证']
    };

    // Initialize dictionaries
    for (const [fullForm, variants] of Object.entries(aiIdeTerms)) {
      this.terminologyDict.set(fullForm, variants);
      
      // Add abbreviations
      variants.forEach(variant => {
        if (variant.length <= 5 && variant.toUpperCase() === variant) {
          this.abbreviationDict.set(variant, fullForm);
        }
      });
    }

    // Common inconsistent terminology patterns
    this.inconsistentPatterns = [
      // Case variations
      { pattern: /\b(api|API|Api)\b/g, preferred: 'API' },
      { pattern: /\b(ide|IDE|Ide)\b/g, preferred: 'IDE' },
      { pattern: /\b(ai|AI|Ai)\b/g, preferred: 'AI' },
      { pattern: /\b(ml|ML|Ml)\b/g, preferred: 'ML' },
      { pattern: /\b(ui|UI|Ui)\b/g, preferred: 'UI' },
      { pattern: /\b(ux|UX|Ux)\b/g, preferred: 'UX' },
      
      // Spelling variations
      { pattern: /\b(Github|github)\b/g, preferred: 'GitHub' },
      { pattern: /\b(Javascript|javascript)\b/g, preferred: 'JavaScript' },
      { pattern: /\b(Typescript|typescript)\b/g, preferred: 'TypeScript' },
      { pattern: /\b(Nodejs|nodejs|Node\.js)\b/g, preferred: 'Node.js' },
      
      // Chinese-English mixed usage
      { pattern: /代码review/g, preferred: '代码审查' },
      { pattern: /代码commit/g, preferred: '代码提交' },
      { pattern: /项目deploy/g, preferred: '项目部署' }
    ];
  }

  /**
   * Detect terminology issues in content
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected terminology issues
   */
  detectIssues(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    // Track terminology usage throughout the document
    const terminologyUsage = new Map();
    const abbreviationUsage = new Map();

    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;

      // 1. Detect inconsistent terminology usage
      const inconsistencyIssues = this.detectInconsistentTerminology(line, lineNumber);
      issues.push(...inconsistencyIssues);

      // 2. Detect abbreviation issues
      const abbreviationIssues = this.detectAbbreviationIssues(line, lineNumber, content);
      issues.push(...abbreviationIssues);

      // 3. Detect translation consistency issues
      const translationIssues = this.detectTranslationIssues(line, lineNumber);
      issues.push(...translationIssues);

      // 4. Track terminology usage for consistency analysis
      this.trackTerminologyUsage(line, terminologyUsage, abbreviationUsage);
    });

    // 5. Analyze overall terminology consistency
    const consistencyIssues = this.analyzeOverallConsistency(terminologyUsage, abbreviationUsage, filePath);
    issues.push(...consistencyIssues);

    this.log(`Found ${issues.length} terminology issues in ${filePath}`);
    return issues;
  }

  /**
   * Detect inconsistent terminology patterns
   * @param {string} line - Line to analyze
   * @param {number} lineNumber - Line number
   * @returns {Array} Array of inconsistency issues
   */
  detectInconsistentTerminology(line, lineNumber) {
    const issues = [];

    this.inconsistentPatterns.forEach(({ pattern, preferred }) => {
      const matches = [...line.matchAll(pattern)];
      matches.forEach(match => {
        if (match[0] !== preferred) {
          issues.push(this.createIssue(
            'terminology_inconsistency',
            lineNumber,
            `Inconsistent terminology: "${match[0]}" should be "${preferred}"`,
            'minor'
          ));
        }
      });
    });

    return issues;
  }

  /**
   * Detect abbreviation-related issues
   * @param {string} line - Line to analyze
   * @param {number} lineNumber - Line number
   * @param {string} fullContent - Full document content for context
   * @returns {Array} Array of abbreviation issues
   */
  detectAbbreviationIssues(line, lineNumber, fullContent) {
    const issues = [];

    // Find abbreviations in the line
    const abbreviationPattern = /\b[A-Z]{2,5}\b/g;
    const matches = [...line.matchAll(abbreviationPattern)];

    matches.forEach(match => {
      const abbreviation = match[0];
      
      // Check if abbreviation is in our dictionary
      if (this.abbreviationDict.has(abbreviation)) {
        const fullForm = this.abbreviationDict.get(abbreviation);
        
        // Check if full form appears before abbreviation in document
        const abbreviationIndex = fullContent.indexOf(abbreviation);
        const fullFormIndex = fullContent.indexOf(fullForm);
        
        if (fullFormIndex === -1 || fullFormIndex > abbreviationIndex) {
          issues.push(this.createIssue(
            'abbreviation_missing_definition',
            lineNumber,
            `Abbreviation "${abbreviation}" used without prior definition of "${fullForm}"`,
            'info'
          ));
        }
      } else if (abbreviation.length >= 3) {
        // Unknown abbreviation that might need definition
        issues.push(this.createIssue(
          'abbreviation_unknown',
          lineNumber,
          `Unknown abbreviation "${abbreviation}" may need definition`,
          'info'
        ));
      }
    });

    return issues;
  }

  /**
   * Detect translation consistency issues
   * @param {string} line - Line to analyze
   * @param {number} lineNumber - Line number
   * @returns {Array} Array of translation issues
   */
  detectTranslationIssues(line, lineNumber) {
    const issues = [];

    // Detect mixed language usage patterns
    const mixedPatterns = [
      // English terms in Chinese context
      { pattern: /[\u4e00-\u9fff]+\s+[a-zA-Z]+\s+[\u4e00-\u9fff]+/g, type: 'mixed_language' },
      // Inconsistent quotation marks
      { pattern: /[""]/g, type: 'inconsistent_quotes' },
      // Inconsistent punctuation
      { pattern: /[，。；：！？]\s*[a-zA-Z]/g, type: 'punctuation_inconsistency' }
    ];

    mixedPatterns.forEach(({ pattern, type }) => {
      const matches = [...line.matchAll(pattern)];
      matches.forEach(match => {
        issues.push(this.createIssue(
          `translation_${type}`,
          lineNumber,
          `Translation consistency issue: ${match[0]}`,
          'minor'
        ));
      });
    });

    return issues;
  }

  /**
   * Track terminology usage throughout the document
   * @param {string} line - Line to analyze
   * @param {Map} terminologyUsage - Map to track terminology usage
   * @param {Map} abbreviationUsage - Map to track abbreviation usage
   */
  trackTerminologyUsage(line, terminologyUsage, abbreviationUsage) {
    // Track full terminology usage
    this.terminologyDict.forEach((variants, fullForm) => {
      variants.forEach(variant => {
        const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = [...line.matchAll(regex)];
        if (matches.length > 0) {
          const key = fullForm;
          terminologyUsage.set(key, (terminologyUsage.get(key) || 0) + matches.length);
        }
      });
    });

    // Track abbreviation usage
    const abbreviationPattern = /\b[A-Z]{2,5}\b/g;
    const matches = [...line.matchAll(abbreviationPattern)];
    matches.forEach(match => {
      const abbr = match[0];
      abbreviationUsage.set(abbr, (abbreviationUsage.get(abbr) || 0) + 1);
    });
  }

  /**
   * Analyze overall terminology consistency across the document
   * @param {Map} terminologyUsage - Terminology usage statistics
   * @param {Map} abbreviationUsage - Abbreviation usage statistics
   * @param {string} filePath - File path for context
   * @returns {Array} Array of consistency issues
   */
  analyzeOverallConsistency(terminologyUsage, abbreviationUsage, filePath) {
    const issues = [];

    // Check for terminology that appears infrequently (might be inconsistent)
    terminologyUsage.forEach((count, term) => {
      if (count === 1) {
        issues.push(this.createIssue(
          'terminology_single_usage',
          0,
          `Term "${term}" appears only once - check for consistency`,
          'info'
        ));
      }
    });

    // Check for overused abbreviations without definitions
    abbreviationUsage.forEach((count, abbr) => {
      if (count > 5 && !this.abbreviationDict.has(abbr)) {
        issues.push(this.createIssue(
          'abbreviation_overused',
          0,
          `Abbreviation "${abbr}" used ${count} times but not defined`,
          'warning'
        ));
      }
    });

    return issues;
  }

  /**
   * Get terminology statistics for a document
   * @param {string} content - Document content
   * @returns {Object} Terminology statistics
   */
  getTerminologyStats(content) {
    const stats = {
      totalTerms: 0,
      uniqueTerms: 0,
      abbreviations: 0,
      undefinedAbbreviations: 0,
      inconsistencies: 0,
      mixedLanguage: 0
    };

    const lines = content.split('\n');
    const uniqueTerms = new Set();
    const abbreviations = new Set();

    lines.forEach(line => {
      // Count terminology
      this.terminologyDict.forEach((variants, fullForm) => {
        variants.forEach(variant => {
          const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          const matches = [...line.matchAll(regex)];
          if (matches.length > 0) {
            stats.totalTerms += matches.length;
            uniqueTerms.add(fullForm);
          }
        });
      });

      // Count abbreviations
      const abbreviationPattern = /\b[A-Z]{2,5}\b/g;
      const matches = [...line.matchAll(abbreviationPattern)];
      matches.forEach(match => {
        abbreviations.add(match[0]);
        if (!this.abbreviationDict.has(match[0])) {
          stats.undefinedAbbreviations++;
        }
      });

      // Count inconsistencies
      this.inconsistentPatterns.forEach(({ pattern, preferred }) => {
        const matches = [...line.matchAll(pattern)];
        matches.forEach(match => {
          if (match[0] !== preferred) {
            stats.inconsistencies++;
          }
        });
      });

      // Count mixed language usage
      const mixedPattern = /[\u4e00-\u9fff]+.*[a-zA-Z]+|[a-zA-Z]+.*[\u4e00-\u9fff]+/g;
      const mixedMatches = [...line.matchAll(mixedPattern)];
      stats.mixedLanguage += mixedMatches.length;
    });

    stats.uniqueTerms = uniqueTerms.size;
    stats.abbreviations = abbreviations.size;

    return stats;
  }

  /**
   * Generate terminology report
   * @param {string} content - Document content
   * @param {string} filePath - File path
   * @returns {Object} Terminology report
   */
  generateTerminologyReport(content, filePath) {
    const issues = this.detectIssues(content, filePath);
    const stats = this.getTerminologyStats(content);

    return {
      filePath,
      timestamp: new Date().toISOString(),
      stats,
      issues: issues.map(issue => ({
        type: issue.type,
        line: issue.line,
        description: issue.description,
        severity: issue.severity
      })),
      summary: {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        majorIssues: issues.filter(i => i.severity === 'major').length,
        minorIssues: issues.filter(i => i.severity === 'minor').length,
        infoIssues: issues.filter(i => i.severity === 'info').length
      }
    };
  }
}