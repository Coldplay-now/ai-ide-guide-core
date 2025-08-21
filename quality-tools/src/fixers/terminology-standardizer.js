/**
 * Terminology Standardizer - Fixes terminology consistency issues
 * Standardizes terminology usage, abbreviations, and translations
 */
import { BaseFixer } from '../core/base-fixer.js';
import { TerminologyAnalyzer } from './terminology-analyzer.js';

export class TerminologyStandardizer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    
    // Initialize analyzer for issue detection
    this.analyzer = new TerminologyAnalyzer(options);
    
    // Initialize standardization rules
    this.standardizationRules = new Map();
    this.abbreviationRules = new Map();
    this.glossary = new Map();
    
    // Load default standardization rules
    this.loadStandardizationRules();
  }

  /**
   * Load standardization rules and glossary
   */
  loadStandardizationRules() {
    // Terminology standardization rules
    const standardRules = {
      // Case standardization
      'api': 'API',
      'Api': 'API',
      'ide': 'IDE',
      'Ide': 'IDE',
      'ai': 'AI',
      'Ai': 'AI',
      'ml': 'ML',
      'Ml': 'ML',
      'ui': 'UI',
      'Ui': 'UI',
      'ux': 'UX',
      'Ux': 'UX',
      
      // Spelling standardization
      'Github': 'GitHub',
      'github': 'GitHub',
      'Javascript': 'JavaScript',
      'javascript': 'JavaScript',
      'Typescript': 'TypeScript',
      'typescript': 'TypeScript',
      'Nodejs': 'Node.js',
      'nodejs': 'Node.js',
      'Node\.js': 'Node.js',
      
      // Chinese-English mixed usage
      '代码\\s*review': '代码审查',
      '代码\\s*commit': '代码提交',
      '项目\\s*deploy': '项目部署',
      '系统\\s*debug': '系统调试',
      '数据\\s*backup': '数据备份'
    };

    // Initialize standardization rules
    for (const [incorrect, correct] of Object.entries(standardRules)) {
      this.standardizationRules.set(incorrect, correct);
    }

    // Abbreviation expansion rules
    const abbreviationExpansions = {
      'API': 'Application Programming Interface (API)',
      'IDE': 'Integrated Development Environment (IDE)',
      'AI': 'Artificial Intelligence (AI)',
      'ML': 'Machine Learning (ML)',
      'NLP': 'Natural Language Processing (NLP)',
      'SDK': 'Software Development Kit (SDK)',
      'CI': 'Continuous Integration (CI)',
      'CD': 'Continuous Deployment (CD)',
      'QA': 'Quality Assurance (QA)',
      'UAT': 'User Acceptance Testing (UAT)'
    };

    // Initialize abbreviation rules
    for (const [abbr, expansion] of Object.entries(abbreviationExpansions)) {
      this.abbreviationRules.set(abbr, expansion);
    }

    // Build glossary for terminology definitions
    this.buildGlossary();
  }

  /**
   * Build terminology glossary
   */
  buildGlossary() {
    const glossaryEntries = {
      'API': {
        definition: 'Application Programming Interface - a set of protocols and tools for building software applications',
        category: 'Development',
        translations: {
          'zh': '应用程序接口'
        }
      },
      'IDE': {
        definition: 'Integrated Development Environment - a software application providing comprehensive facilities for software development',
        category: 'Development',
        translations: {
          'zh': '集成开发环境'
        }
      },
      'AI': {
        definition: 'Artificial Intelligence - simulation of human intelligence in machines',
        category: 'Technology',
        translations: {
          'zh': '人工智能'
        }
      },
      'ML': {
        definition: 'Machine Learning - a subset of AI that enables systems to learn from data',
        category: 'Technology',
        translations: {
          'zh': '机器学习'
        }
      },
      'CI/CD': {
        definition: 'Continuous Integration/Continuous Deployment - practices for automating software delivery',
        category: 'DevOps',
        translations: {
          'zh': '持续集成/持续部署'
        }
      }
    };

    for (const [term, info] of Object.entries(glossaryEntries)) {
      this.glossary.set(term, info);
    }
  }

  /**
   * Detect issues using the analyzer
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected issues
   */
  detectIssues(content, filePath) {
    return this.analyzer.detectIssues(content, filePath);
  }

  /**
   * Fix terminology issues in content
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix (optional, will detect if not provided)
   * @returns {Object} Fix result with modified content and changes
   */
  fix(content, issues = null) {
    if (!issues) {
      issues = this.detectIssues(content, 'content');
    }

    let fixedContent = content;
    const changes = [];
    const warnings = [];
    const errors = [];

    try {
      // 1. Fix terminology inconsistencies
      const { content: standardizedContent, changes: standardChanges } = 
        this.standardizeTerminology(fixedContent);
      fixedContent = standardizedContent;
      changes.push(...standardChanges);

      // 2. Add abbreviation definitions
      const { content: expandedContent, changes: expansionChanges } = 
        this.addAbbreviationDefinitions(fixedContent, issues);
      fixedContent = expandedContent;
      changes.push(...expansionChanges);

      // 3. Generate and maintain glossary
      const { content: glossaryContent, changes: glossaryChanges } = 
        this.maintainGlossary(fixedContent);
      fixedContent = glossaryContent;
      changes.push(...glossaryChanges);

      // 4. Fix translation consistency
      const { content: translatedContent, changes: translationChanges } = 
        this.fixTranslationConsistency(fixedContent);
      fixedContent = translatedContent;
      changes.push(...translationChanges);

      this.log(`Applied ${changes.length} terminology fixes`);

    } catch (error) {
      errors.push(`Error during terminology standardization: ${error.message}`);
      this.log(`Error: ${error.message}`, 'error');
    }

    return {
      content: fixedContent,
      changes,
      warnings,
      errors,
      stats: {
        totalChanges: changes.length,
        terminologyStandardized: changes.filter(c => c.type === 'terminology_standardization').length,
        abbreviationsExpanded: changes.filter(c => c.type === 'abbreviation_expansion').length,
        glossaryUpdated: changes.filter(c => c.type === 'glossary_update').length,
        translationsFixed: changes.filter(c => c.type === 'translation_fix').length
      }
    };
  }

  /**
   * Standardize terminology usage
   * @param {string} content - Content to standardize
   * @returns {Object} Result with standardized content and changes
   */
  standardizeTerminology(content) {
    let standardizedContent = content;
    const changes = [];

    // Apply standardization rules
    this.standardizationRules.forEach((correct, incorrect) => {
      // Handle regex patterns (like Chinese-English mixed usage)
      const regex = incorrect.includes('\\s') ? 
        new RegExp(incorrect, 'g') : 
        new RegExp(`\\b${incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      
      const matches = [...standardizedContent.matchAll(regex)];
      
      if (matches.length > 0) {
        standardizedContent = standardizedContent.replace(regex, correct);
        changes.push({
          type: 'terminology_standardization',
          description: `Standardized "${incorrect}" to "${correct}"`,
          count: matches.length,
          locations: matches.map(m => ({
            index: m.index,
            original: m[0],
            replacement: correct
          }))
        });
      }
    });

    return { content: standardizedContent, changes };
  }

  /**
   * Add abbreviation definitions where needed
   * @param {string} content - Content to process
   * @param {Array} issues - Detected issues
   * @returns {Object} Result with expanded content and changes
   */
  addAbbreviationDefinitions(content, issues) {
    let expandedContent = content;
    const changes = [];

    // Find abbreviations that need definitions
    const abbreviationIssues = issues.filter(i => 
      i.type === 'abbreviation_missing_definition' || i.type === 'abbreviation_unknown'
    );

    const processedAbbreviations = new Set();

    abbreviationIssues.forEach(issue => {
      const abbreviationMatch = issue.description.match(/"([^"]+)"/);
      if (!abbreviationMatch) return;

      const abbreviation = abbreviationMatch[1];
      
      // Skip if already processed
      if (processedAbbreviations.has(abbreviation)) return;
      processedAbbreviations.add(abbreviation);

      // Check if we have an expansion rule
      if (this.abbreviationRules.has(abbreviation)) {
        const expansion = this.abbreviationRules.get(abbreviation);
        
        // Find first occurrence of abbreviation
        const firstOccurrence = expandedContent.indexOf(abbreviation);
        if (firstOccurrence !== -1) {
          // Replace first occurrence with expanded form
          expandedContent = expandedContent.substring(0, firstOccurrence) +
                           expansion +
                           expandedContent.substring(firstOccurrence + abbreviation.length);
          
          changes.push({
            type: 'abbreviation_expansion',
            description: `Expanded first occurrence of "${abbreviation}" to "${expansion}"`,
            location: firstOccurrence,
            original: abbreviation,
            replacement: expansion
          });
        }
      }
    });

    return { content: expandedContent, changes };
  }

  /**
   * Maintain terminology glossary
   * @param {string} content - Content to process
   * @returns {Object} Result with glossary updates
   */
  maintainGlossary(content) {
    const changes = [];
    
    // Check if content already has a glossary section
    const hasGlossary = /^##?\s*(?:Glossary|术语表|词汇表)/mi.test(content) || 
                       content.includes('## Glossary') || 
                       content.includes('# Glossary');
    
    if (!hasGlossary) {
      // Find terms in content that are in our glossary
      const termsFound = new Set();
      
      this.glossary.forEach((info, term) => {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(content)) {
          termsFound.add(term);
        }
      });

      if (termsFound.size > 0) {
        // Generate glossary section
        const glossarySection = this.generateGlossarySection(Array.from(termsFound));
        const updatedContent = content + '\n\n' + glossarySection;
        
        changes.push({
          type: 'glossary_update',
          description: `Added glossary section with ${termsFound.size} terms`,
          terms: Array.from(termsFound),
          content: glossarySection
        });

        return { content: updatedContent, changes };
      }
    }

    return { content, changes };
  }

  /**
   * Generate glossary section
   * @param {Array} terms - Terms to include in glossary
   * @returns {string} Formatted glossary section
   */
  generateGlossarySection(terms) {
    let glossaryContent = '## Glossary\n\n';
    
    // Sort terms alphabetically
    terms.sort();
    
    terms.forEach(term => {
      const info = this.glossary.get(term);
      if (info) {
        glossaryContent += `**${term}**: ${info.definition}\n\n`;
        
        // Add translation if available
        if (info.translations && info.translations.zh) {
          glossaryContent += `*中文: ${info.translations.zh}*\n\n`;
        }
      }
    });

    return glossaryContent;
  }

  /**
   * Fix translation consistency issues
   * @param {string} content - Content to fix
   * @returns {Object} Result with translation fixes
   */
  fixTranslationConsistency(content) {
    let fixedContent = content;
    const changes = [];

    // Fix inconsistent quotation marks
    const quoteReplacements = [
      { from: /"/g, to: '"', description: 'Standardized opening quotes' },
      { from: /"/g, to: '"', description: 'Standardized closing quotes' }
    ];

    quoteReplacements.forEach(({ from, to, description }) => {
      const matches = [...fixedContent.matchAll(from)];
      if (matches.length > 0) {
        fixedContent = fixedContent.replace(from, to);
        changes.push({
          type: 'translation_fix',
          description,
          count: matches.length
        });
      }
    });

    // Fix mixed language spacing issues
    const spacingFixes = [
      {
        pattern: /([\u4e00-\u9fff])([a-zA-Z])/g,
        replacement: '$1 $2',
        description: 'Added space between Chinese and English'
      },
      {
        pattern: /([a-zA-Z])([\u4e00-\u9fff])/g,
        replacement: '$1 $2',
        description: 'Added space between English and Chinese'
      }
    ];

    spacingFixes.forEach(({ pattern, replacement, description }) => {
      const originalContent = fixedContent;
      fixedContent = fixedContent.replace(pattern, replacement);
      
      if (originalContent !== fixedContent) {
        changes.push({
          type: 'translation_fix',
          description
        });
      }
    });

    return { content: fixedContent, changes };
  }

  /**
   * Validate terminology standardization
   * @param {string} originalContent - Original content
   * @param {string} fixedContent - Fixed content
   * @returns {Object} Validation result
   */
  validate(originalContent, fixedContent) {
    const warnings = [];
    const errors = [];

    try {
      // Check if content length changed dramatically
      const lengthChange = Math.abs(fixedContent.length - originalContent.length) / originalContent.length;
      if (lengthChange > 0.1) {
        warnings.push(`Content length changed by ${(lengthChange * 100).toFixed(1)}%`);
      }

      // Verify no critical content was lost
      const originalLines = originalContent.split('\n').filter(line => line.trim());
      const fixedLines = fixedContent.split('\n').filter(line => line.trim());
      
      if (fixedLines.length < originalLines.length * 0.9) {
        errors.push('Significant content loss detected');
      }

      // Check for remaining issues
      const remainingIssues = this.detectIssues(fixedContent, 'validation');
      const criticalIssues = remainingIssues.filter(i => i.severity === 'critical');
      
      if (criticalIssues.length > 0) {
        warnings.push(`${criticalIssues.length} critical issues remain`);
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Get standardization statistics
   * @param {string} content - Content to analyze
   * @returns {Object} Standardization statistics
   */
  getStandardizationStats(content) {
    const issues = this.detectIssues(content, 'stats');
    const fixResult = this.fix(content, issues);

    return {
      originalIssues: issues.length,
      fixedIssues: fixResult.changes.length,
      remainingIssues: this.detectIssues(fixResult.content, 'stats').length,
      improvementRate: issues.length > 0 ? 
        ((issues.length - this.detectIssues(fixResult.content, 'stats').length) / issues.length * 100).toFixed(1) + '%' : 
        '0%',
      categories: {
        terminology: fixResult.stats.terminologyStandardized,
        abbreviations: fixResult.stats.abbreviationsExpanded,
        glossary: fixResult.stats.glossaryUpdated,
        translations: fixResult.stats.translationsFixed
      }
    };
  }
}