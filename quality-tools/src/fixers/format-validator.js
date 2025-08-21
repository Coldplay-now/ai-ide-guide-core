/**
 * Format Validator
 * Validates format consistency, calculates readability metrics,
 * and provides format quality assessment
 */

import { BaseFixer } from '../core/base-fixer.js';
import { FormatDetector } from './format-detector.js';

export class FormatValidator extends BaseFixer {
  constructor(options = {}) {
    super(options);
    this.detector = new FormatDetector(options);
    this.validationRules = {
      // Format consistency rules
      consistency: {
        requireConsistentListMarkers: true,
        requireConsistentEmphasis: true,
        requireConsistentHeadingSpacing: true,
        requireConsistentQuoteFormat: true,
        maxInconsistencies: 5 // Maximum allowed inconsistencies before failing validation
      },
      // Readability metrics
      readability: {
        maxLineLength: 120,
        maxParagraphLength: 500, // characters
        minBlankLinesBetweenSections: 1,
        maxConsecutiveBlankLines: 2,
        preferredSentenceLength: 25, // words
        maxSentenceLength: 40 // words
      },
      // Quality thresholds
      quality: {
        minQualityScore: 7.0, // out of 10
        maxErrorsPerFile: 10,
        maxWarningsPerFile: 20,
        requireProperStructure: true,
        requireAccessibleFormat: true
      }
    };
  }

  /**
   * Validate format consistency and quality
   * @param {string} content - Content to validate
   * @param {string} filePath - Path to the file being validated
   * @returns {Object} Validation result with scores and recommendations
   */
  validate(content, filePath = 'unknown') {
    const issues = this.detector.detectIssues(content, filePath);
    const readabilityMetrics = this.calculateReadabilityMetrics(content);
    const consistencyScore = this.calculateConsistencyScore(issues, content);
    const qualityScore = this.calculateQualityScore(issues, readabilityMetrics, content);
    const recommendations = this.generateRecommendations(issues, readabilityMetrics, qualityScore);

    const validationResult = {
      isValid: this.isValidFormat(issues, qualityScore),
      qualityScore,
      consistencyScore,
      readabilityMetrics,
      issues: this.categorizeIssues(issues),
      recommendations,
      summary: this.generateSummary(issues, qualityScore, readabilityMetrics),
      filePath,
      timestamp: new Date().toISOString()
    };

    this.log(`Validation completed for ${filePath}: Quality Score ${qualityScore.toFixed(1)}/10`);
    return validationResult;
  }

  /**
   * Calculate readability metrics
   * @param {string} content - Content to analyze
   * @returns {Object} Readability metrics
   */
  calculateReadabilityMetrics(content) {
    const lines = content.split('\n');
    const words = content.match(/\b\w+\b/g) || [];
    const sentences = content.match(/[.!?]+/g) || [];
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // Calculate line length statistics
    const lineLengths = lines.map(line => line.length);
    const avgLineLength = lineLengths.reduce((sum, len) => sum + len, 0) / lineLengths.length || 0;
    const maxLineLength = Math.max(...lineLengths);
    const longLines = lineLengths.filter(len => len > this.validationRules.readability.maxLineLength).length;

    // Calculate sentence length statistics
    const wordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    
    // Calculate paragraph statistics
    const avgParagraphLength = paragraphs.length > 0 
      ? paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length 
      : 0;

    // Calculate blank line statistics
    const blankLines = lines.filter(line => line.trim() === '').length;
    const consecutiveBlankLines = this.findConsecutiveBlankLines(lines);

    // Calculate structure metrics
    const headings = (content.match(/^#+\s/gm) || []).length;
    const lists = (content.match(/^\s*[-*+]\s/gm) || []).length + (content.match(/^\s*\d+[.)]\s/gm) || []).length;
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    const links = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;

    return {
      lineMetrics: {
        totalLines: lines.length,
        averageLineLength: Math.round(avgLineLength),
        maxLineLength,
        longLinesCount: longLines,
        longLinesPercentage: Math.round((longLines / lines.length) * 100)
      },
      wordMetrics: {
        totalWords: words.length,
        totalSentences: sentences.length,
        averageWordsPerSentence: Math.round(wordsPerSentence),
        readabilityScore: this.calculateFleschReadingEase(words.length, sentences.length, this.countSyllables(words))
      },
      paragraphMetrics: {
        totalParagraphs: paragraphs.length,
        averageParagraphLength: Math.round(avgParagraphLength),
        longParagraphs: paragraphs.filter(p => p.length > this.validationRules.readability.maxParagraphLength).length
      },
      structureMetrics: {
        headings,
        lists,
        codeBlocks,
        links,
        blankLines,
        maxConsecutiveBlankLines: consecutiveBlankLines,
        structureRatio: Math.round(((headings + lists + codeBlocks) / lines.length) * 100)
      }
    };
  }

  /**
   * Calculate consistency score based on format issues
   * @param {Array} issues - Detected format issues
   * @param {string} content - Content being analyzed
   * @returns {number} Consistency score (0-10)
   */
  calculateConsistencyScore(issues, content) {
    const consistencyIssues = issues.filter(issue => 
      issue.type.includes('inconsistent') || 
      issue.type.includes('missing_blank_line') ||
      issue.type.includes('trailing_whitespace')
    );

    const totalElements = this.countFormattableElements(content);
    const inconsistencyRate = totalElements > 0 ? consistencyIssues.length / totalElements : 0;
    
    // Score from 0-10, where 10 is perfect consistency
    const baseScore = Math.max(0, 10 - (inconsistencyRate * 20));
    
    // Apply penalties for specific types of inconsistencies
    let penalties = 0;
    const issueTypes = [...new Set(consistencyIssues.map(issue => issue.type))];
    
    if (issueTypes.includes('inconsistent_list_marker')) penalties += 0.5;
    if (issueTypes.includes('inconsistent_bold_formatting')) penalties += 0.3;
    if (issueTypes.includes('inconsistent_italic_formatting')) penalties += 0.3;
    if (issueTypes.includes('inconsistent_quote_indentation')) penalties += 0.4;
    
    return Math.max(0, Math.min(10, baseScore - penalties));
  }

  /**
   * Calculate overall quality score
   * @param {Array} issues - All detected issues
   * @param {Object} readabilityMetrics - Readability metrics
   * @param {string} content - Content being analyzed
   * @returns {number} Quality score (0-10)
   */
  calculateQualityScore(issues, readabilityMetrics, content) {
    let score = 10; // Start with perfect score

    // Deduct points for issues by severity
    const errorIssues = issues.filter(issue => issue.severity === 'error');
    const warningIssues = issues.filter(issue => issue.severity === 'warning');
    const infoIssues = issues.filter(issue => issue.severity === 'info');

    score -= errorIssues.length * 1.0;   // 1 point per error
    score -= warningIssues.length * 0.5; // 0.5 points per warning
    score -= infoIssues.length * 0.1;    // 0.1 points per info issue

    // Deduct points for readability issues
    if (readabilityMetrics.lineMetrics.longLinesPercentage > 20) {
      score -= 1.0;
    }
    if (readabilityMetrics.wordMetrics.readabilityScore < 30) {
      score -= 1.5; // Very difficult to read
    } else if (readabilityMetrics.wordMetrics.readabilityScore < 50) {
      score -= 0.5; // Somewhat difficult to read
    }
    if (readabilityMetrics.paragraphMetrics.longParagraphs > 0) {
      score -= readabilityMetrics.paragraphMetrics.longParagraphs * 0.3;
    }

    // Bonus points for good structure
    if (readabilityMetrics.structureMetrics.structureRatio > 5) {
      score += 0.5; // Well-structured document
    }
    if (readabilityMetrics.structureMetrics.headings > 0) {
      score += 0.3; // Has headings
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Generate recommendations based on validation results
   * @param {Array} issues - Detected issues
   * @param {Object} readabilityMetrics - Readability metrics
   * @param {number} qualityScore - Overall quality score
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(issues, readabilityMetrics, qualityScore) {
    const recommendations = [];

    // Critical issues first
    const criticalIssues = issues.filter(issue => issue.severity === 'error');
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'critical',
        title: 'Fix Critical Format Errors',
        description: `Found ${criticalIssues.length} critical format errors that must be fixed.`,
        action: 'Run format standardizer to automatically fix these issues.',
        impact: 'High - These errors prevent proper document rendering.'
      });
    }

    // Consistency recommendations
    const consistencyIssues = issues.filter(issue => issue.type.includes('inconsistent'));
    if (consistencyIssues.length > 3) {
      recommendations.push({
        priority: 'medium',
        category: 'consistency',
        title: 'Improve Format Consistency',
        description: `Found ${consistencyIssues.length} format consistency issues.`,
        action: 'Standardize list markers, emphasis formatting, and spacing.',
        impact: 'Medium - Improves document professionalism and readability.'
      });
    }

    // Readability recommendations
    if (readabilityMetrics.lineMetrics.longLinesPercentage > 15) {
      recommendations.push({
        priority: 'medium',
        category: 'readability',
        title: 'Reduce Line Length',
        description: `${readabilityMetrics.lineMetrics.longLinesPercentage}% of lines exceed recommended length.`,
        action: 'Break long lines at natural points or restructure content.',
        impact: 'Medium - Improves readability across different devices.'
      });
    }

    if (readabilityMetrics.wordMetrics.readabilityScore < 50) {
      recommendations.push({
        priority: 'low',
        category: 'readability',
        title: 'Improve Text Readability',
        description: `Readability score is ${readabilityMetrics.wordMetrics.readabilityScore.toFixed(1)} (difficult to read).`,
        action: 'Use shorter sentences and simpler vocabulary where appropriate.',
        impact: 'Low - Makes content more accessible to broader audience.'
      });
    }

    // Structure recommendations
    if (readabilityMetrics.structureMetrics.headings === 0 && readabilityMetrics.lineMetrics.totalLines > 20) {
      recommendations.push({
        priority: 'medium',
        category: 'structure',
        title: 'Add Document Structure',
        description: 'Document lacks headings for navigation.',
        action: 'Add appropriate headings to organize content into sections.',
        impact: 'Medium - Improves document navigation and organization.'
      });
    }

    // Quality-based recommendations
    if (qualityScore < 7) {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        title: 'Overall Quality Improvement Needed',
        description: `Document quality score is ${qualityScore.toFixed(1)}/10.`,
        action: 'Address the issues identified above to improve overall quality.',
        impact: 'High - Significantly improves document quality and user experience.'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Categorize issues by type and severity
   * @param {Array} issues - All detected issues
   * @returns {Object} Categorized issues
   */
  categorizeIssues(issues) {
    const categories = {
      critical: issues.filter(issue => issue.severity === 'error'),
      warnings: issues.filter(issue => issue.severity === 'warning'),
      suggestions: issues.filter(issue => issue.severity === 'info'),
      byType: {}
    };

    // Group by issue type
    issues.forEach(issue => {
      if (!categories.byType[issue.type]) {
        categories.byType[issue.type] = [];
      }
      categories.byType[issue.type].push(issue);
    });

    return categories;
  }

  /**
   * Generate validation summary
   * @param {Array} issues - All detected issues
   * @param {number} qualityScore - Quality score
   * @param {Object} readabilityMetrics - Readability metrics
   * @returns {Object} Validation summary
   */
  generateSummary(issues, qualityScore, readabilityMetrics) {
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(issue => issue.severity === 'error').length;
    const warningIssues = issues.filter(issue => issue.severity === 'warning').length;

    return {
      overallStatus: qualityScore >= this.validationRules.quality.minQualityScore ? 'pass' : 'fail',
      qualityGrade: this.getQualityGrade(qualityScore),
      totalIssues,
      criticalIssues,
      warningIssues,
      readabilityGrade: this.getReadabilityGrade(readabilityMetrics.wordMetrics.readabilityScore),
      keyMetrics: {
        qualityScore: Math.round(qualityScore * 10) / 10,
        readabilityScore: Math.round(readabilityMetrics.wordMetrics.readabilityScore * 10) / 10,
        averageLineLength: readabilityMetrics.lineMetrics.averageLineLength,
        structureRatio: readabilityMetrics.structureMetrics.structureRatio
      },
      recommendations: totalIssues > 0 ? 'Review recommendations for improvement' : 'Document meets quality standards'
    };
  }

  /**
   * Helper methods
   */

  isValidFormat(issues, qualityScore) {
    const criticalIssues = issues.filter(issue => issue.severity === 'error').length;
    return criticalIssues === 0 && qualityScore >= this.validationRules.quality.minQualityScore;
  }

  countFormattableElements(content) {
    const headings = (content.match(/^#+\s/gm) || []).length;
    const lists = (content.match(/^\s*[-*+]\s/gm) || []).length + (content.match(/^\s*\d+[.)]\s/gm) || []).length;
    const emphasis = (content.match(/\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|\*[^*]+\*/g) || []).length;
    const quotes = (content.match(/^\s*>\s/gm) || []).length;
    return headings + lists + emphasis + quotes;
  }

  findConsecutiveBlankLines(lines) {
    let maxConsecutive = 0;
    let currentConsecutive = 0;

    for (const line of lines) {
      if (line.trim() === '') {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }

    return maxConsecutive;
  }

  countSyllables(words) {
    return words.reduce((total, word) => {
      // Simple syllable counting heuristic
      const syllables = word.toLowerCase().match(/[aeiouy]+/g) || [];
      return total + Math.max(1, syllables.length);
    }, 0);
  }

  calculateFleschReadingEase(words, sentences, syllables) {
    if (sentences === 0 || words === 0) return 0;
    
    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    return 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  }

  getQualityGrade(score) {
    if (score >= 9) return 'A';
    if (score >= 8) return 'B';
    if (score >= 7) return 'C';
    if (score >= 6) return 'D';
    return 'F';
  }

  getReadabilityGrade(score) {
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Difficult';
  }

  /**
   * Batch validate multiple files
   * @param {Array} files - Array of {path, content} objects
   * @returns {Object} Batch validation results
   */
  validateBatch(files) {
    const results = files.map(file => this.validate(file.content, file.path));
    
    const summary = {
      totalFiles: files.length,
      passedFiles: results.filter(r => r.isValid).length,
      failedFiles: results.filter(r => !r.isValid).length,
      averageQualityScore: results.length > 0 ? results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length : 0,
      totalIssues: results.reduce((sum, r) => sum + r.issues.critical.length + r.issues.warnings.length, 0),
      worstFile: results.length > 0 ? results.reduce((worst, current) => 
        current.qualityScore < worst.qualityScore ? current : worst
      ) : null,
      bestFile: results.length > 0 ? results.reduce((best, current) => 
        current.qualityScore > best.qualityScore ? current : best
      ) : null
    };

    return {
      summary,
      results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Fix method - not implemented for validator (read-only)
   * @param {string} content - Content to fix
   * @param {Array} issues - Issues to fix
   * @returns {Object} Fix result indicating this is a validator only
   */
  fix(content, issues) {
    return {
      content,
      changes: [],
      message: 'FormatValidator is read-only. Use FormatStandardizer to fix issues.'
    };
  }
}