import { describe, it, expect, beforeEach } from 'vitest';
import { BaseFixer } from '../../src/core/base-fixer.js';

// Test implementation of BaseFixer
class TestFixer extends BaseFixer {
  detectIssues(content, filePath) {
    const issues = [];
    
    // Simple test: detect lines with "TODO"
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('TODO')) {
        issues.push(this.createIssue('todo_found', index + 1, 'TODO comment found', 'info'));
      }
    });
    
    return issues;
  }

  fix(content, issues) {
    let fixedContent = content;
    const changes = [];
    
    issues.forEach(issue => {
      if (issue.type === 'todo_found') {
        const lines = fixedContent.split('\n');
        const originalLine = lines[issue.line - 1];
        const fixedLine = originalLine.replace('TODO', 'DONE');
        lines[issue.line - 1] = fixedLine;
        fixedContent = lines.join('\n');
        
        changes.push({
          type: 'modification',
          line: issue.line,
          oldContent: originalLine,
          newContent: fixedLine,
          reason: 'Replaced TODO with DONE'
        });
      }
    });
    
    return {
      content: fixedContent,
      changes,
      status: 'success'
    };
  }
}

describe('BaseFixer', () => {
  let fixer;

  beforeEach(() => {
    fixer = new TestFixer({ verbose: false });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultFixer = new TestFixer();
      expect(defaultFixer.options.dryRun).toBe(false);
      expect(defaultFixer.options.verbose).toBe(false);
      expect(defaultFixer.options.backup).toBe(true);
    });

    it('should accept custom options', () => {
      const customFixer = new TestFixer({ 
        dryRun: true, 
        verbose: true, 
        backup: false 
      });
      expect(customFixer.options.dryRun).toBe(true);
      expect(customFixer.options.verbose).toBe(true);
      expect(customFixer.options.backup).toBe(false);
    });
  });

  describe('createIssue', () => {
    it('should create a properly formatted issue object', () => {
      const issue = fixer.createIssue('test_type', 10, 'Test description', 'error');
      
      expect(issue).toHaveProperty('id');
      expect(issue.type).toBe('test_type');
      expect(issue.line).toBe(10);
      expect(issue.description).toBe('Test description');
      expect(issue.severity).toBe('error');
      expect(issue.autoFixable).toBe(true);
      expect(issue).toHaveProperty('timestamp');
    });

    it('should use default severity if not provided', () => {
      const issue = fixer.createIssue('test_type', 5, 'Test description');
      expect(issue.severity).toBe('warning');
    });
  });

  describe('createFixResult', () => {
    it('should create a properly formatted fix result object', () => {
      const changes = [{ type: 'modification', line: 1, newContent: 'fixed' }];
      const result = fixer.createFixResult('issue_123', 'fixed', changes);
      
      expect(result.issueId).toBe('issue_123');
      expect(result.status).toBe('fixed');
      expect(result.changes).toEqual(changes);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('detectIssues', () => {
    it('should detect TODO comments in content', () => {
      const content = `Line 1
TODO: Fix this
Line 3
TODO: And this too`;
      
      const issues = fixer.detectIssues(content, 'test.md');
      
      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe('todo_found');
      expect(issues[0].line).toBe(2);
      expect(issues[1].line).toBe(4);
    });

    it('should return empty array when no issues found', () => {
      const content = `Line 1
Line 2
Line 3`;
      
      const issues = fixer.detectIssues(content, 'test.md');
      expect(issues).toHaveLength(0);
    });
  });

  describe('fix', () => {
    it('should fix TODO comments by replacing with DONE', () => {
      const content = `Line 1
TODO: Fix this
Line 3`;
      
      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('DONE: Fix this');
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('modification');
      expect(result.changes[0].line).toBe(2);
      expect(result.status).toBe('success');
    });

    it('should handle content with no issues', () => {
      const content = `Line 1
Line 2
Line 3`;
      
      const issues = [];
      const result = fixer.fix(content, issues);
      
      expect(result.content).toBe(content);
      expect(result.changes).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('should return valid result by default', () => {
      const result = fixer.validate('original', 'fixed');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });
});