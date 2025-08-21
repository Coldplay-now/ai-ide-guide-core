import { describe, it, expect, beforeEach } from 'vitest';
import { TableFixer } from '../../src/fixers/table-fixer.js';

describe('TableFixer', () => {
  let fixer;

  beforeEach(() => {
    fixer = new TableFixer({ verbose: false });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(fixer.options.dryRun).toBe(false);
      expect(fixer.options.verbose).toBe(false);
      expect(fixer.options.backup).toBe(true);
      expect(fixer.maxColumns).toBe(8);
      expect(fixer.emptyPlaceholder).toBe('-');
    });

    it('should accept custom options', () => {
      const customFixer = new TableFixer({
        maxColumns: 6,
        emptyPlaceholder: 'N/A'
      });
      
      expect(customFixer.maxColumns).toBe(6);
      expect(customFixer.emptyPlaceholder).toBe('N/A');
    });
  });

  describe('extractTables', () => {
    it('should extract simple table', () => {
      const content = `# 标题

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |
| 值4 | 值5 | 值6 |

## 下一节`;

      const tables = fixer.extractTables(content);
      
      expect(tables).toHaveLength(1);
      expect(tables[0].startLine).toBe(3);
      expect(tables[0].endLine).toBe(6);
      expect(tables[0].rows).toHaveLength(4);
    });

    it('should extract multiple tables', () => {
      const content = `| 表1列1 | 表1列2 |
|--------|--------|
| 值1    | 值2    |

文本内容

| 表2列1 | 表2列2 | 表2列3 |
|--------|--------|--------|
| 值A    | 值B    | 值C    |`;

      const tables = fixer.extractTables(content);
      
      expect(tables).toHaveLength(2);
      expect(tables[0].rows).toHaveLength(3);
      expect(tables[1].rows).toHaveLength(3);
    });

    it('should handle table at end of file', () => {
      const content = `| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |`;

      const tables = fixer.extractTables(content);
      
      expect(tables).toHaveLength(1);
      expect(tables[0].rows).toHaveLength(3);
    });
  });

  describe('parseTableRow', () => {
    it('should parse regular table row', () => {
      const row = fixer.parseTableRow('| 列1 | 列2 | 列3 |');
      
      expect(row.cells).toEqual(['列1', '列2', '列3']);
      expect(row.cellCount).toBe(3);
      expect(row.isSeparator).toBe(false);
    });

    it('should parse separator row', () => {
      const row = fixer.parseTableRow('|-----|-----|-----|');
      
      expect(row.isSeparator).toBe(true);
      expect(row.cellCount).toBe(3);
    });

    it('should handle rows without leading/trailing pipes', () => {
      const row = fixer.parseTableRow('列1 | 列2 | 列3');
      
      expect(row.cells).toEqual(['列1', '列2', '列3']);
      expect(row.cellCount).toBe(3);
    });

    it('should handle empty cells', () => {
      const row = fixer.parseTableRow('| 列1 |  | 列3 |');
      
      expect(row.cells).toEqual(['列1', '', '列3']);
      expect(row.cellCount).toBe(3);
    });
  });

  describe('detectIssues', () => {
    it('should detect column count mismatch', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |
| 值4 | 值5 |
| 值6 | 值7 | 值8 | 值9 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const columnIssues = issues.filter(i => i.type === 'table_column_mismatch');
      
      expect(columnIssues).toHaveLength(2);
      expect(columnIssues[0].expected).toBe(3);
      expect(columnIssues[0].actual).toBe(2);
      expect(columnIssues[1].expected).toBe(3);
      expect(columnIssues[1].actual).toBe(4);
    });

    it('should detect empty cells', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 |     | 值3 |
|     | 值5 |     |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const emptyIssues = issues.filter(i => i.type === 'table_empty_cell');
      
      expect(emptyIssues).toHaveLength(3);
      expect(emptyIssues[0].columnIndex).toBe(1);
      expect(emptyIssues[1].columnIndex).toBe(0);
      expect(emptyIssues[2].columnIndex).toBe(2);
    });

    it('should detect wide tables', () => {
      const content = `| 列1 | 列2 | 列3 | 列4 | 列5 | 列6 | 列7 | 列8 | 列9 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 值1 | 值2 | 值3 | 值4 | 值5 | 值6 | 值7 | 值8 | 值9 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const wideIssues = issues.filter(i => i.type === 'table_too_wide');
      
      expect(wideIssues).toHaveLength(1);
      expect(wideIssues[0].columnCount).toBe(9);
      expect(wideIssues[0].maxColumns).toBe(8);
    });

    it('should handle tables with no issues', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |
| 值4 | 值5 | 值6 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      expect(issues).toHaveLength(0);
    });
  });

  describe('fix', () => {
    it('should fix column count mismatches by adding cells', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |
| 值4 | 值5 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.fixed).toBe(1);
      expect(result.content).toContain('| 值4 | 值5 | - |');
    });

    it('should fix column count mismatches by removing cells', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |
| 值4 | 值5 | 值6 | 值7 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.fixed).toBe(1);
      expect(result.content).toContain('| 值4 | 值5 | 值6 |');
      expect(result.content).not.toContain('值7');
    });

    it('should fix empty cells', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 |     | 值3 |
|     | 值5 |     |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.fixed).toBe(3);
      expect(result.content).toContain('| 值1 | - | 值3 |');
      expect(result.content).toContain('| - | 值5 | - |');
    });

    it('should handle multiple tables', () => {
      const content = `| 表1列1 | 表1列2 |
|--------|--------|
| 值1    |        |

| 表2列1 | 表2列2 | 表2列3 |
|--------|--------|--------|
| 值A    | 值B    |        |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.fixed).toBe(2);
      expect(result.content).toContain('| 值1 | - |');
      expect(result.content).toContain('| 值A | 值B | - |');
    });

    it('should return original content when no issues', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |`;

      const issues = [];
      const result = fixer.fix(content, issues);
      
      expect(result.fixed).toBe(0);
      expect(result.content).toBe(content);
    });
  });

  describe('getMostCommonValue', () => {
    it('should return most common value', () => {
      const values = [3, 3, 3, 2, 2, 4];
      const result = fixer.getMostCommonValue(values);
      
      expect(result).toBe(3);
    });

    it('should handle single value', () => {
      const values = [5];
      const result = fixer.getMostCommonValue(values);
      
      expect(result).toBe(5);
    });

    it('should handle tie by returning first occurrence', () => {
      const values = [2, 3, 2, 3];
      const result = fixer.getMostCommonValue(values);
      
      expect(result).toBe(2);
    });
  });

  describe('validate', () => {
    it('should validate successful fixes', () => {
      const original = `| 列1 | 列2 |
|-----|-----|
| 值1 |     |`;

      const fixed = `| 列1 | 列2 |
|-----|-----|
| 值1 | -   |`;

      const result = fixer.validate(original, fixed);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation warnings', () => {
      const original = `| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |

| 列3 | 列4 |
|-----|-----|
| 值3 | 值4 |`;

      const fixed = `| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |`;

      const result = fixer.validate(original, fixed);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Table count changed');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed tables gracefully', () => {
      const content = `| 列1
|-----|
| 值1 | 值2`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      // Should not crash and may detect some issues
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle empty content', () => {
      const content = '';
      
      const issues = fixer.detectIssues(content, 'test.md');
      
      expect(issues).toHaveLength(0);
    });

    it('should handle content with no tables', () => {
      const content = `# 标题

这是一些文本内容，没有表格。

## 子标题

更多文本内容。`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      expect(issues).toHaveLength(0);
    });

    it('should handle single row tables', () => {
      const content = `| 列1 | 列2 | 列3 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      // Single row tables are not processed (need at least header + separator)
      expect(issues).toHaveLength(0);
    });
  });
});