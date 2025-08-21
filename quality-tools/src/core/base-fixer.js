/**
 * Base class for all quality fixing components
 * Provides common functionality for issue detection, fixing, and validation
 */
export class BaseFixer {
  constructor(options = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      backup: true,
      ...options
    };
    this.issues = [];
    this.fixes = [];
  }

  /**
   * Detect issues in content
   * @param {string} _content - Content to analyze
   * @param {string} _filePath - Path to the file being analyzed
   * @returns {Array} Array of detected issues
   */
  detectIssues(_content, _filePath) {
    throw new Error('detectIssues method must be implemented by subclass');
  }

  /**
   * Fix detected issues
   * @param {string} _content - Content to fix
   * @param {Array} _issues - Issues to fix
   * @returns {Object} Fix result with modified content and changes
   */
  fix(_content, _issues) {
    throw new Error('fix method must be implemented by subclass');
  }

  /**
   * Validate the fix result
   * @param {string} _originalContent - Original content
   * @param {string} _fixedContent - Fixed content
   * @returns {Object} Validation result
   */
  validate(_originalContent, _fixedContent) {
    return {
      isValid: true,
      warnings: [],
      errors: []
    };
  }

  /**
   * Create an issue object
   * @param {string} type - Issue type
   * @param {number} line - Line number
   * @param {string} description - Issue description
   * @param {string} severity - Issue severity
   * @returns {Object} Issue object
   */
  createIssue(type, line, description, severity = 'warning') {
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      line,
      description,
      severity,
      autoFixable: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create a fix result object
   * @param {string} issueId - ID of the issue being fixed
   * @param {string} status - Fix status
   * @param {Array} changes - Array of changes made
   * @returns {Object} Fix result object
   */
  createFixResult(issueId, status, changes = []) {
    return {
      issueId,
      status,
      changes,
      warnings: [],
      errors: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log message based on verbosity setting
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    if (this.options.verbose || level === 'error') {
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} ${message}`);
    }
  }
}