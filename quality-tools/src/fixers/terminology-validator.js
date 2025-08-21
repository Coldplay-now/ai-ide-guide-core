/**
 * Terminology Validator - Validates terminology consistency and definitions
 * Verifies terminology usage, definitions, and multi-language consistency
 */
import { BaseFixer } from '../core/base-fixer.js';
import { TerminologyAnalyzer } from './terminology-analyzer.js';

export class TerminologyValidator extends BaseFixer {
  constructor(options = {}) {
    super(options);
    
    // Initialize analyzer for issue detection
    this.analyzer = new TerminologyAnalyzer(options);
    
    // Initialize validation rules
    this.validationRules = new Map();
    this.definitionPatterns = new Map();
    this.multiLanguageTerms = new Map();
    
    // Load validation rules
    this.loadValidationRules();
  }

  /**
   * Load validation rules and patterns
   */
  loadValidationRules() {
    // Definition validation patterns
    const definitionPatterns = {
      'API': [
        'Application Programming Interface',
        'application programming interface',
        '应用程序接口',
        'API是',
        'API是一个',
        'API（Application Programming Interface）'
      ],
      'IDE': [
        'Integrated Development Environment',
        'integrated development environment',
        '集成开发环境',
        'IDE是',
        'IDE（Integrated Development Environment）'
      ],
      'AI': [
        'Artificial Intelligence',
        'artificial intelligence',
        '人工智能',
        'AI是',
        'AI（Artificial Intelligence）'
      ],
      'ML': [
        'Machine Learning',
        'machine learning',
        '机器学习',
        'ML是',
        'ML（Machine Learning）'
      ]
    };

    // Initialize definition patterns
    for (const [term, patterns] of Object.entries(definitionPatterns)) {
      this.definitionPatterns.set(term, patterns);
    }

    // Multi-language terminology mappings
    const multiLanguageTerms = {
      'API': {
        'en': ['API', 'Application Programming Interface'],
        'zh': ['API', '应用程序接口', '应用编程接口']
      },
      'IDE': {
        'en': ['IDE', 'Integrated Development Environment'],
        'zh': ['IDE', '集成开发环境']
      },
      'AI': {
        'en': ['AI', 'Artificial Intelligence'],
        'zh': ['AI', '人工智能']
      },
      'ML': {
        'en': ['ML', 'Machine Learning'],
        'zh': ['ML', '机器学习']
      },
      'CI/CD': {
        'en': ['CI/CD', 'Continuous Integration/Continuous Deployment'],
        'zh': ['CI/CD', '持续集成/持续部署']
      }
    };

    // Initialize multi-language terms
    for (const [term, languages] of Object.entries(multiLanguageTerms)) {
      this.multiLanguageTerms.set(term, languages);
    }

    // Validation rules
    this.validationRules.set('definition_consistency', {
      description: 'Verify that terminology definitions are consistent',
      severity: 'major',
      check: this.validateDefinitionConsistency.bind(this)
    });

    this.validationRules.set('usage_consistency', {
      description: 'Verify that terminology usage is consistent throughout document',
      severity: 'minor',
      check: this.validateUsageConsistency.bind(this)
    });

    this.validationRules.set('multilingual_consistency', {
      description: 'Verify consistency between different language versions of terms',
      severity: 'major',
      check: this.validateMultilingualConsistency.bind(this)
    });

    this.validationRules.set('abbreviation_definition', {
      description: 'Verify that abbreviations are properly defined',
      severity: 'warning',
      check: this.validateAbbreviationDefinitions.bind(this)
    });
  }

  /**
   * Detect issues using the analyzer (inherited method)
   * @param {string} content - Content to analyze
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Array} Array of detected issues
   */
  detectIssues(content, filePath) {
    return this.analyzer.detectIssues(content, filePath);
  }

  /**
   * Validate terminology consistency in content
   * @param {string} content - Content to validate
   * @param {Array} issues - Pre-detected issues (optional)
   * @returns {Object} Validation result
   */
  validate(content, issues = null) {
    if (!issues) {
      issues = this.detectIssues(content, 'validation');
    }

    const validationResults = {
      isValid: true,
      warnings: [],
      errors: [],
      validationChecks: [],
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        criticalIssues: 0,
        majorIssues: 0,
        minorIssues: 0
      }
    };

    try {
      // Run all validation rules
      this.validationRules.forEach((rule, ruleName) => {
        const checkResult = rule.check(content, issues);
        
        validationResults.validationChecks.push({
          rule: ruleName,
          description: rule.description,
          severity: rule.severity,
          passed: checkResult.passed,
          issues: checkResult.issues,
          details: checkResult.details
        });

        validationResults.summary.totalChecks++;
        
        if (checkResult.passed) {
          validationResults.summary.passedChecks++;
        } else {
          validationResults.summary.failedChecks++;
          
          // Add issues to appropriate arrays
          checkResult.issues.forEach(issue => {
            if (rule.severity === 'critical') {
              validationResults.errors.push(issue);
              validationResults.summary.criticalIssues++;
            } else if (rule.severity === 'major') {
              validationResults.errors.push(issue);
              validationResults.summary.majorIssues++;
            } else {
              validationResults.warnings.push(issue);
              validationResults.summary.minorIssues++;
            }
          });
        }
      });

      // Determine overall validation status
      validationResults.isValid = validationResults.summary.criticalIssues === 0 && 
                                  validationResults.summary.majorIssues === 0;

      this.log(`Validation completed: ${validationResults.summary.passedChecks}/${validationResults.summary.totalChecks} checks passed`);

    } catch (error) {
      validationResults.errors.push(`Validation error: ${error.message}`);
      validationResults.isValid = false;
      this.log(`Validation error: ${error.message}`, 'error');
    }

    return validationResults;
  }

  /**
   * Validate definition consistency
   * @param {string} content - Content to validate
   * @param {Array} issues - Detected issues
   * @returns {Object} Validation check result
   */
  validateDefinitionConsistency(content, issues) {
    const checkResult = {
      passed: true,
      issues: [],
      details: {
        termsChecked: 0,
        inconsistentDefinitions: 0,
        missingDefinitions: 0
      }
    };

    // Check each term that has definition patterns
    this.definitionPatterns.forEach((patterns, term) => {
      checkResult.details.termsChecked++;
      
      // Find all occurrences of the term
      const termRegex = new RegExp(`\\b${term}\\b`, 'gi');
      const termMatches = [...content.matchAll(termRegex)];
      
      if (termMatches.length > 0) {
        // Check if any definition pattern exists
        const hasDefinition = patterns.some(pattern => {
          const patternRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          return patternRegex.test(content);
        });

        if (!hasDefinition && termMatches.length > 3) {
          checkResult.passed = false;
          checkResult.details.missingDefinitions++;
          checkResult.issues.push(`Term "${term}" is used ${termMatches.length} times but no definition found`);
        } else if (hasDefinition) {
          // Check for consistent definitions
          const foundDefinitions = patterns.filter(pattern => {
            const patternRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            return patternRegex.test(content);
          });

          if (foundDefinitions.length > 1) {
            checkResult.passed = false;
            checkResult.details.inconsistentDefinitions++;
            checkResult.issues.push(`Term "${term}" has multiple different definitions: ${foundDefinitions.join(', ')}`);
          }
        }
      }
    });

    return checkResult;
  }

  /**
   * Validate usage consistency
   * @param {string} content - Content to validate
   * @param {Array} issues - Detected issues
   * @returns {Object} Validation check result
   */
  validateUsageConsistency(content, issues) {
    const checkResult = {
      passed: true,
      issues: [],
      details: {
        termsAnalyzed: 0,
        inconsistentUsage: 0,
        caseInconsistencies: 0
      }
    };

    // Analyze terminology usage patterns
    const terminologyUsage = new Map();
    const lines = content.split('\n');

    // Track usage of common terms (simplified approach)
    const commonTerms = ['API', 'IDE', 'AI', 'ML', 'UI', 'UX'];
    
    commonTerms.forEach(term => {
      const usageVariants = new Map();
      
      // Check for different case variations
      const variations = [term, term.toLowerCase(), term.charAt(0) + term.slice(1).toLowerCase()];
      
      variations.forEach(variant => {
        const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const matches = [...content.matchAll(regex)];
        
        if (matches.length > 0) {
          matches.forEach(match => {
            const actualText = match[0];
            usageVariants.set(actualText, (usageVariants.get(actualText) || 0) + 1);
          });
        }
      });

      if (usageVariants.size > 0) {
        terminologyUsage.set(term, usageVariants);
        checkResult.details.termsAnalyzed++;
      }
    });

    // Check for inconsistent usage
    terminologyUsage.forEach((variants, term) => {
      if (variants.size > 1) {
        const sortedVariants = Array.from(variants.entries()).sort((a, b) => b[1] - a[1]);
        const mostCommon = sortedVariants[0];
        const others = sortedVariants.slice(1);

        // Check if variations are just case differences
        const isCaseOnly = others.every(([variant]) => 
          variant.toLowerCase() === mostCommon[0].toLowerCase()
        );

        if (isCaseOnly) {
          checkResult.details.caseInconsistencies++;
          checkResult.issues.push(
            `Term "${term}" has case inconsistencies: "${mostCommon[0]}" (${mostCommon[1]}x) vs ${others.map(([v, c]) => `"${v}" (${c}x)`).join(', ')}`
          );
        } else {
          checkResult.passed = false;
          checkResult.details.inconsistentUsage++;
          checkResult.issues.push(
            `Term "${term}" has inconsistent usage: "${mostCommon[0]}" (${mostCommon[1]}x) vs ${others.map(([v, c]) => `"${v}" (${c}x)`).join(', ')}`
          );
        }
      }
    });

    return checkResult;
  }

  /**
   * Validate multilingual consistency
   * @param {string} content - Content to validate
   * @param {Array} issues - Detected issues
   * @returns {Object} Validation check result
   */
  validateMultilingualConsistency(content, issues) {
    const checkResult = {
      passed: true,
      issues: [],
      details: {
        multilingualTermsFound: 0,
        inconsistentTranslations: 0,
        mixedLanguageUsage: 0
      }
    };

    // Check each multilingual term
    this.multiLanguageTerms.forEach((languages, term) => {
      const foundLanguages = new Set();
      const usageCount = { en: 0, zh: 0 };

      // Check English variants
      if (languages.en) {
        languages.en.forEach(variant => {
          const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
          const matches = [...content.matchAll(regex)];
          if (matches.length > 0) {
            foundLanguages.add('en');
            usageCount.en += matches.length;
          }
        });
      }

      // Check Chinese variants
      if (languages.zh) {
        languages.zh.forEach(variant => {
          const regex = new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          const matches = [...content.matchAll(regex)];
          if (matches.length > 0) {
            foundLanguages.add('zh');
            usageCount.zh += matches.length;
          }
        });
      }

      if (foundLanguages.size > 0) {
        checkResult.details.multilingualTermsFound++;

        // Check for mixed language usage in same document
        if (foundLanguages.size > 1) {
          checkResult.details.mixedLanguageUsage++;
          checkResult.issues.push(
            `Term "${term}" uses mixed languages: English (${usageCount.en}x), Chinese (${usageCount.zh}x)`
          );
        }

        // Check for translation consistency
        if (foundLanguages.has('en') && foundLanguages.has('zh')) {
          // Both languages present - check if they appear together properly
          const englishTerms = languages.en.join('|');
          const chineseTerms = languages.zh.join('|');
          
          // Look for patterns like "API（应用程序接口）" or "API (Application Programming Interface)"
          const bilingualPattern = new RegExp(`(${englishTerms})\\s*[（(]\\s*(${chineseTerms}|${englishTerms})\\s*[）)]`, 'g');
          const bilingualMatches = [...content.matchAll(bilingualPattern)];
          
          if (bilingualMatches.length === 0 && usageCount.en > 0 && usageCount.zh > 0) {
            checkResult.passed = false;
            checkResult.details.inconsistentTranslations++;
            checkResult.issues.push(
              `Term "${term}" appears in both languages but lacks proper bilingual formatting`
            );
          }
        }
      }
    });

    return checkResult;
  }

  /**
   * Validate abbreviation definitions
   * @param {string} content - Content to validate
   * @param {Array} issues - Detected issues
   * @returns {Object} Validation check result
   */
  validateAbbreviationDefinitions(content, issues) {
    const checkResult = {
      passed: true,
      issues: [],
      details: {
        abbreviationsFound: 0,
        undefinedAbbreviations: 0,
        improperDefinitions: 0
      }
    };

    // Find all abbreviations in content
    const abbreviationPattern = /\b[A-Z]{2,5}\b/g;
    const abbreviations = new Set([...content.matchAll(abbreviationPattern)].map(m => m[0]));

    abbreviations.forEach(abbr => {
      checkResult.details.abbreviationsFound++;

      // Check if abbreviation has a definition
      const hasDefinition = this.definitionPatterns.has(abbr) && 
        this.definitionPatterns.get(abbr).some(pattern => {
          const patternRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          return patternRegex.test(content);
        });

      if (!hasDefinition) {
        // Check if it appears frequently (more than 3 times)
        const abbrevRegex = new RegExp(`\\b${abbr}\\b`, 'g');
        const occurrences = [...content.matchAll(abbrevRegex)];
        
        if (occurrences.length > 3) {
          checkResult.passed = false;
          checkResult.details.undefinedAbbreviations++;
          checkResult.issues.push(
            `Abbreviation "${abbr}" appears ${occurrences.length} times but is not defined`
          );
        }
      } else {
        // Check if definition appears before first usage
        const firstUsage = content.indexOf(abbr);
        const definitionPatterns = this.definitionPatterns.get(abbr);
        
        let earliestDefinition = Infinity;
        definitionPatterns.forEach(pattern => {
          const patternRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          const match = patternRegex.exec(content);
          if (match && match.index < earliestDefinition) {
            earliestDefinition = match.index;
          }
        });

        if (earliestDefinition > firstUsage) {
          checkResult.details.improperDefinitions++;
          checkResult.issues.push(
            `Abbreviation "${abbr}" is used before it is defined`
          );
        }
      }
    });

    return checkResult;
  }

  /**
   * Generate comprehensive validation report
   * @param {string} content - Content to validate
   * @param {string} filePath - File path for context
   * @returns {Object} Comprehensive validation report
   */
  generateValidationReport(content, filePath) {
    const issues = this.detectIssues(content, filePath);
    const validationResult = this.validate(content, issues);
    const stats = this.analyzer.getTerminologyStats(content);

    return {
      filePath,
      timestamp: new Date().toISOString(),
      overallStatus: validationResult.isValid ? 'PASSED' : 'FAILED',
      summary: {
        ...validationResult.summary,
        terminologyStats: stats
      },
      validationChecks: validationResult.validationChecks,
      detectedIssues: issues.map(issue => ({
        type: issue.type,
        line: issue.line,
        description: issue.description,
        severity: issue.severity
      })),
      warnings: validationResult.warnings,
      errors: validationResult.errors,
      recommendations: this.generateRecommendations(validationResult, stats)
    };
  }

  /**
   * Generate recommendations based on validation results
   * @param {Object} validationResult - Validation result
   * @param {Object} stats - Terminology statistics
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(validationResult, stats) {
    const recommendations = [];

    // Check validation results for specific recommendations
    validationResult.validationChecks.forEach(check => {
      if (!check.passed) {
        switch (check.rule) {
          case 'definition_consistency':
            recommendations.push({
              type: 'definition',
              priority: 'high',
              message: 'Add consistent definitions for all technical terms',
              action: 'Review and standardize terminology definitions'
            });
            break;
          case 'usage_consistency':
            recommendations.push({
              type: 'usage',
              priority: 'medium',
              message: 'Standardize terminology usage throughout the document',
              action: 'Use terminology standardizer to fix inconsistencies'
            });
            break;
          case 'multilingual_consistency':
            recommendations.push({
              type: 'translation',
              priority: 'high',
              message: 'Improve consistency between different language versions',
              action: 'Review and align multilingual terminology usage'
            });
            break;
          case 'abbreviation_definition':
            recommendations.push({
              type: 'abbreviation',
              priority: 'medium',
              message: 'Define abbreviations before first use',
              action: 'Add definitions for frequently used abbreviations'
            });
            break;
        }
      }
    });

    // Add recommendations based on statistics
    if (stats.undefinedAbbreviations > 5) {
      recommendations.push({
        type: 'abbreviation',
        priority: 'medium',
        message: `${stats.undefinedAbbreviations} undefined abbreviations found`,
        action: 'Create a glossary or define abbreviations inline'
      });
    }

    if (stats.inconsistencies > 10) {
      recommendations.push({
        type: 'consistency',
        priority: 'high',
        message: `${stats.inconsistencies} terminology inconsistencies found`,
        action: 'Run terminology standardizer to fix inconsistencies'
      });
    }

    return recommendations;
  }

  /**
   * Validate terminology across multiple files
   * @param {Array} files - Array of {path, content} objects
   * @returns {Object} Cross-file validation result
   */
  validateMultipleFiles(files) {
    const crossFileResult = {
      overallStatus: 'PASSED',
      fileResults: [],
      crossFileIssues: [],
      globalTerminologyUsage: new Map(),
      recommendations: []
    };

    // Validate each file individually
    files.forEach(file => {
      const fileResult = this.generateValidationReport(file.content, file.path);
      crossFileResult.fileResults.push(fileResult);
      
      if (fileResult.overallStatus === 'FAILED') {
        crossFileResult.overallStatus = 'FAILED';
      }
    });

    // Analyze cross-file terminology consistency
    this.analyzeCrossFileConsistency(files, crossFileResult);

    return crossFileResult;
  }

  /**
   * Analyze terminology consistency across multiple files
   * @param {Array} files - Array of files
   * @param {Object} result - Cross-file result to update
   */
  analyzeCrossFileConsistency(files, result) {
    const globalUsage = new Map();

    // Collect terminology usage from all files
    files.forEach(file => {
      const stats = this.analyzer.getTerminologyStats(file.content);
      // This would need to be implemented to track specific term usage
      // For now, we'll do a basic analysis
    });

    // Check for inconsistencies across files
    // This is a simplified implementation
    result.crossFileIssues.push({
      type: 'cross_file_analysis',
      description: 'Cross-file terminology analysis completed',
      severity: 'info'
    });
  }
}