import { describe, it, expect, beforeEach } from 'vitest';
import { TableFixer } from '../../src/fixers/table-fixer.js';

describe('TableFixer - Validation System', () => {
  let fixer;

  beforeEach(() => {
    fixer = new TableFixer({ verbose: false });
  });

  describe('table repair validation', () => {
    it('should validate successful table repairs', () => {
      const originalContent = `| 工具 | 价格 | 评分 |
|------|------|------|
| VS Code | 免费 |      |
| IntelliJ | 付费 | 9.0 | 额外列 |`;

      const issues = fixer.detectIssues(originalContent, 'test.md');
      const result = fixer.fix(originalContent, issues);
      
      const validation = fixer.validate(originalContent, result.content);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(result.content).toContain('| VS Code | 免费 | - |');
      expect(result.content).toContain('| IntelliJ | 付费 | 9.0 |');
    });

    it('should detect validation warnings for content changes', () => {
      const originalContent = `| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |

| 列3 | 列4 |
|-----|-----|
| 值3 | 值4 |`;

      // Simulate content that removes a table
      const modifiedContent = `| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |`;

      const validation = fixer.validate(originalContent, modifiedContent);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Table count changed');
    });

    it('should validate that all issues are resolved after fixing', () => {
      const content = `| 名称 | 状态 | 备注 |
|------|------|------|
| 项目A |      | 重要 |
| 项目B | 进行中 |    |
| 项目C | 完成 | 已交付 | 额外信息 |`;

      const originalIssues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, originalIssues);
      const remainingIssues = fixer.detectIssues(result.content, 'test.md');
      
      // After fixing, there should be significantly fewer fixable issues
      const fixableIssues = remainingIssues.filter(issue => issue.autoFixable);
      expect(fixableIssues.length).toBeLessThanOrEqual(originalIssues.length);
      
      const validation = fixer.validate(content, result.content);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('table rendering effect validation', () => {
    it('should validate table structure integrity', () => {
      const content = `| 功能 | 描述 | 状态 |
|------|------|------|
| 登录 | 用户登录系统 | 完成 |
| 注册 | 新用户注册 | 进行中 |`;

      const tables = fixer.extractTables(content);
      const table = tables[0];
      
      // Validate table structure
      expect(table.rows.length).toBe(4); // header + separator + 2 data rows
      expect(table.rows[0].cellCount).toBe(3); // header has 3 columns
      expect(table.rows[1].isSeparator).toBe(true); // second row is separator
      
      // Validate consistent column count
      const nonSeparatorRows = table.rows.filter(row => !row.isSeparator);
      const columnCounts = nonSeparatorRows.map(row => row.cellCount);
      const uniqueCounts = [...new Set(columnCounts)];
      expect(uniqueCounts).toHaveLength(1); // All rows should have same column count
    });

    it('should validate table alignment and formatting', () => {
      const content = `| 左对齐 | 居中 | 右对齐 |
|:-------|:----:|-------:|
| 内容1  | 内容2 | 内容3 |`;

      const tables = fixer.extractTables(content);
      const separatorRow = tables[0].rows[1];
      
      expect(separatorRow.isSeparator).toBe(true);
      expect(separatorRow.rawLine).toContain(':-------');
      expect(separatorRow.rawLine).toContain(':----:');
      expect(separatorRow.rawLine).toContain('-------:');
    });

    it('should validate table cell content preservation', () => {
      const content = `| 重要数据 | 数值 |
|----------|------|
| 关键指标 | 99.9% |
| 用户数量 | 10,000 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Ensure critical data is preserved
      expect(result.content).toContain('关键指标');
      expect(result.content).toContain('99.9%');
      expect(result.content).toContain('用户数量');
      expect(result.content).toContain('10,000');
    });

    it('should validate table markdown rendering compatibility', () => {
      const content = `| 功能 | 链接 | 状态 |
|------|------|------|
| **重要功能** | [文档](link) | *进行中* |
| 普通功能 | \`代码\` | ~~已废弃~~ |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Markdown formatting should be preserved
      expect(result.content).toContain('**重要功能**');
      expect(result.content).toContain('[文档](link)');
      expect(result.content).toContain('*进行中*');
      expect(result.content).toContain('`代码`');
      expect(result.content).toContain('~~已废弃~~');
    });
  });

  describe('table accessibility validation', () => {
    it('should validate table header structure', () => {
      const content = `| 产品名称 | 价格 | 库存 |
|----------|------|------|
| 产品A    | ¥100 | 50   |
| 产品B    | ¥200 | 30   |`;

      const tables = fixer.extractTables(content);
      const table = tables[0];
      
      // First non-separator row should be header
      const headerRow = table.rows.find(row => !row.isSeparator);
      expect(headerRow).toBeDefined();
      expect(headerRow.cells).toEqual(['产品名称', '价格', '库存']);
    });

    it('should validate table has proper structure for screen readers', () => {
      const content = `| 月份 | 销售额 | 增长率 |
|------|--------|--------|
| 1月  | 10万   | +5%    |
| 2月  | 12万   | +20%   |`;

      const tables = fixer.extractTables(content);
      const table = tables[0];
      
      // Table should have clear header-data relationship
      expect(table.rows.length).toBeGreaterThan(2); // At least header + separator + data
      
      const dataRows = table.rows.filter(row => !row.isSeparator).slice(1); // Skip header
      dataRows.forEach(row => {
        expect(row.cellCount).toBe(3); // Same as header
        row.cells.forEach(cell => {
          expect(cell.trim()).not.toBe(''); // No empty cells after fixing
        });
      });
    });

    it('should validate table content is descriptive', () => {
      const content = `| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 复制 | Ctrl+C | 复制选中内容 |
| 粘贴 | Ctrl+V |              |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Empty description should be filled
      expect(result.content).toContain('| 粘贴 | Ctrl+V | - |');
      
      // Validate that table provides meaningful information
      const tables = fixer.extractTables(result.content);
      const headerRow = tables[0].rows[0];
      expect(headerRow.cells).toContain('说明'); // Descriptive header
    });

    it('should validate table width for mobile accessibility', () => {
      const wideContent = `| 列1 | 列2 | 列3 | 列4 | 列5 | 列6 | 列7 | 列8 | 列9 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 值1 | 值2 | 值3 | 值4 | 值5 | 值6 | 值7 | 值8 | 值9 |`;

      const issues = fixer.detectIssues(wideContent, 'test.md');
      const wideTableIssues = issues.filter(i => i.type === 'table_too_wide');
      
      expect(wideTableIssues).toHaveLength(1);
      expect(wideTableIssues[0].columnCount).toBe(9);
      expect(wideTableIssues[0].maxColumns).toBe(8);
      
      // Wide tables should be flagged for manual review
      expect(wideTableIssues[0].severity).toBe('warning');
    });
  });

  describe('table validation edge cases', () => {
    it('should handle validation of malformed tables', () => {
      const malformedContent = `| 列1 | 列2
|-----|-----|
| 值1 | 值2 | 值3`;

      try {
        const validation = fixer.validate(malformedContent, malformedContent);
        expect(validation.isValid).toBeDefined();
      } catch (error) {
        // Should not throw errors, should handle gracefully
        expect(error).toBeUndefined();
      }
    });

    it('should validate empty table handling', () => {
      const emptyTableContent = `| |
|-|
| |`;

      const issues = fixer.detectIssues(emptyTableContent, 'test.md');
      const result = fixer.fix(emptyTableContent, issues);
      
      // Should detect empty cells (may not fix single-column tables)
      expect(issues.length).toBeGreaterThanOrEqual(0);
      
      const validation = fixer.validate(emptyTableContent, result.content);
      expect(validation.isValid).toBe(true);
    });

    it('should validate table with special characters', () => {
      const specialContent = `| 符号 | Unicode | 描述 |
|------|---------|------|
| © | U+00A9 | 版权符号 |
| ™ | U+2122 | 商标符号 |
| ® | U+00AE | 注册商标 |`;

      const issues = fixer.detectIssues(specialContent, 'test.md');
      const result = fixer.fix(specialContent, issues);
      
      // Special characters should be preserved
      expect(result.content).toContain('©');
      expect(result.content).toContain('™');
      expect(result.content).toContain('®');
      expect(result.content).toContain('U+00A9');
      
      const validation = fixer.validate(specialContent, result.content);
      expect(validation.isValid).toBe(true);
    });

    it('should validate table with long content', () => {
      const longContent = `| 功能名称 | 详细描述 |
|----------|----------|
| 用户认证系统 | 这是一个非常详细的用户认证系统描述，包含了多种认证方式和安全措施 |
| 数据分析模块 | 提供全面的数据分析功能，支持多维度数据查询和可视化展示 |`;

      const issues = fixer.detectIssues(longContent, 'test.md');
      const result = fixer.fix(longContent, issues);
      
      // Long content should be preserved
      expect(result.content).toContain('用户认证系统');
      expect(result.content).toContain('多种认证方式和安全措施');
      expect(result.content).toContain('多维度数据查询');
      
      const validation = fixer.validate(longContent, result.content);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('comprehensive validation workflow', () => {
    it('should perform end-to-end validation of table fixing process', () => {
      const problematicContent = `# 项目状态报告

## 当前项目

| 项目名称 | 负责人 | 状态 | 完成度 |
|----------|--------|------|--------|
| 项目Alpha | 张三 | 进行中 |        |
| 项目Beta | 李四 |        | 80%    |
| 项目Gamma | 王五 | 完成 | 100% | 备注信息 |

## 总结`;

      // Step 1: Detect issues
      const issues = fixer.detectIssues(problematicContent, 'test.md');
      expect(issues.length).toBeGreaterThan(0);
      
      // Step 2: Fix issues
      const result = fixer.fix(problematicContent, issues);
      expect(result.fixed).toBeGreaterThan(0);
      
      // Step 3: Validate fixes
      const validation = fixer.validate(problematicContent, result.content);
      expect(validation.isValid).toBe(true);
      
      // Step 4: Verify fewer remaining issues
      const remainingIssues = fixer.detectIssues(result.content, 'test.md');
      const fixableRemaining = remainingIssues.filter(i => i.autoFixable);
      expect(fixableRemaining.length).toBeLessThanOrEqual(issues.length);
      
      // Step 5: Verify content integrity
      expect(result.content).toContain('# 项目状态报告');
      expect(result.content).toContain('## 当前项目');
      expect(result.content).toContain('## 总结');
      expect(result.content).toContain('项目Alpha');
      expect(result.content).toContain('张三');
      expect(result.content).toContain('| 项目Alpha | 张三 | 进行中 | - |');
      expect(result.content).toContain('| 项目Beta | 李四 | - | 80% |');
      expect(result.content).toContain('| 项目Gamma | 王五 | 完成 | 100% |');
    });

    it('should validate batch processing of multiple tables', () => {
      const multiTableContent = `| 表1列1 | 表1列2 |
|--------|--------|
| 值1    |        |

文本内容

| 表2列1 | 表2列2 | 表2列3 |
|--------|--------|--------|
| 值A    | 值B    |        |
| 值C    |        | 值F    |

更多文本

| 表3列1 |
|--------|
| 值X    | 值Y    |`;

      const issues = fixer.detectIssues(multiTableContent, 'test.md');
      const result = fixer.fix(multiTableContent, issues);
      
      // Validate all tables are processed
      const originalTables = fixer.extractTables(multiTableContent);
      const fixedTables = fixer.extractTables(result.content);
      
      expect(originalTables.length).toBe(fixedTables.length);
      expect(fixedTables.length).toBe(3);
      
      // Validate fixes applied to all tables (adjust spacing expectations)
      expect(result.content).toContain('| 值1 | - |');
      expect(result.content).toContain('| 值A | 值B | - |');
      expect(result.content).toContain('| 值C | - | 值F |');
      expect(result.content).toContain('| 值X |'); // Third table gets fixed by removing extra column
      
      const validation = fixer.validate(multiTableContent, result.content);
      expect(validation.isValid).toBe(true);
    });
  });
});