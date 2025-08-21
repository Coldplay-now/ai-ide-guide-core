import { describe, it, expect, beforeEach } from 'vitest';
import { TableFixer } from '../../src/fixers/table-fixer.js';

describe('TableFixer - Advanced Repair Functionality', () => {
  let fixer;

  beforeEach(() => {
    fixer = new TableFixer({ 
      verbose: false,
      maxColumns: 6,
      emptyPlaceholder: 'N/A'
    });
  });

  describe('complex column mismatch scenarios', () => {
    it('should handle mixed column count issues', () => {
      const content = `| 工具 | 类型 | 价格 | 评分 |
|------|------|------|------|
| VS Code | 编辑器 | 免费 | 9.5 |
| IntelliJ | IDE | 付费 |
| Sublime | 编辑器 | 付费 | 8.0 | 额外列 |
| Atom | 编辑器 |
| WebStorm | IDE | 付费 | 9.0 | 额外 | 更多 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.fixed).toBeGreaterThan(0);
      
      // Verify all rows have 4 columns
      const lines = result.content.split('\n');
      const dataRows = lines.filter(line => line.includes('|') && !line.includes('---'));
      
      dataRows.forEach(row => {
        const cells = row.split('|').filter(cell => cell.trim() !== '');
        expect(cells.length).toBe(4);
      });
    });

    it('should preserve table structure when fixing', () => {
      const content = `# 工具比较

| 名称 | 功能 |
|------|------|
| 工具A | 功能1 | 额外信息 |
| 工具B |
| 工具C | 功能3 |

## 总结`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('# 工具比较');
      expect(result.content).toContain('## 总结');
      expect(result.content).toContain('| 工具A | 功能1 |');
      expect(result.content).toContain('| 工具B | N/A |');
    });
  });

  describe('empty cell filling strategies', () => {
    it('should fill empty cells with custom placeholder', () => {
      const content = `| 项目 | 状态 | 备注 |
|------|------|------|
| 项目A |      | 重要 |
| 项目B | 进行中 |    |
|       | 完成 | 已交付 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('| 项目A | N/A | 重要 |');
      expect(result.content).toContain('| 项目B | 进行中 | N/A |');
      expect(result.content).toContain('| N/A | 完成 | 已交付 |');
    });

    it('should handle cells with only whitespace', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 |     | 值3 |
| 值4 |  \t  | 值6 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('| 值1 | N/A | 值3 |');
      expect(result.content).toContain('| 值4 | N/A | 值6 |');
    });
  });

  describe('table restructuring for wide tables', () => {
    it('should detect but not auto-fix wide tables', () => {
      const content = `| 列1 | 列2 | 列3 | 列4 | 列5 | 列6 | 列7 |
|-----|-----|-----|-----|-----|-----|-----|
| 值1 | 值2 | 值3 | 值4 | 值5 | 值6 | 值7 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const wideIssues = issues.filter(i => i.type === 'table_too_wide');
      
      expect(wideIssues).toHaveLength(1);
      expect(wideIssues[0].columnCount).toBe(7);
      expect(wideIssues[0].maxColumns).toBe(6);
      
      // Wide tables should be flagged but not auto-fixed (requires manual intervention)
      const result = fixer.fix(content, wideIssues);
      expect(result.fixed).toBe(0); // No automatic fixes for wide tables
    });
  });

  describe('multiple table processing', () => {
    it('should fix issues across multiple tables independently', () => {
      const content = `## 表格1
| 工具 | 价格 |
|------|------|
| VS Code | 免费 |
| IntelliJ |      |

## 表格2  
| 功能 | 支持度 | 备注 |
|------|--------|------|
| 语法高亮 | 完全 |
| 调试 | 部分 | 需要插件 | 额外信息 |

## 表格3
| 名称 |
|------|
| 项目A | 描述A |
| 项目B |       |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Should fix empty cells and column mismatches
      expect(result.fixed).toBeGreaterThan(0);
      
      // Verify fixes
      expect(result.content).toContain('| IntelliJ | N/A |');
      expect(result.content).toContain('| 调试 | 部分 | 需要插件 |');
      expect(result.content).toContain('| 项目A | 描述A |');
      expect(result.content).toContain('| 项目B | N/A |');
    });
  });

  describe('edge case handling', () => {
    it('should handle tables with inconsistent separator rows', () => {
      const content = `| 列1 | 列2 | 列3 |
|-----|-----|
| 值1 | 值2 | 值3 |
| 值4 | 值5 | 值6 |`;

      const tables = fixer.extractTables(content);
      
      // Should extract the table even with inconsistent separator
      expect(tables.length).toBe(1);
      expect(tables[0].rows.length).toBe(4);
      
      // The separator row should be identified as a separator
      expect(tables[0].rows[1].isSeparator).toBe(true);
      expect(tables[0].rows[1].cellCount).toBe(2);
    });

    it('should handle tables with special characters', () => {
      const content = `| 名称 | 符号 | 描述 |
|------|------|------|
| 版权 | © | 版权符号 |
| 商标 | ™ |          |
| 注册 | ® | 注册商标 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('| 商标 | ™ | N/A |');
      expect(result.content).toContain('© | 版权符号');
      expect(result.content).toContain('® | 注册商标');
    });

    it('should handle tables with markdown formatting in cells', () => {
      const content = `| 功能 | 状态 | 链接 |
|------|------|------|
| **重要功能** | *进行中* | [链接](url) |
| 普通功能 |           | [文档](doc) |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.content).toContain('| **重要功能** | *进行中* | [链接](url) |');
      expect(result.content).toContain('| 普通功能 | N/A | [文档](doc) |');
    });
  });

  describe('repair validation', () => {
    it('should validate that repairs maintain content integrity', () => {
      const content = `| 重要数据 | 值 |
|----------|-----|
| 关键信息 | 123 |
| 次要信息 |     |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      // Ensure important data is preserved
      expect(result.content).toContain('关键信息');
      expect(result.content).toContain('123');
      expect(result.content).toContain('次要信息');
      
      // Ensure structure is maintained
      const validation = fixer.validate(content, result.content);
      expect(validation.isValid).toBe(true);
    });

    it('should provide detailed change information', () => {
      const content = `| A | B |
|---|---|
| 1 |   |
| 2 | 3 | 4 |`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.changes.length).toBeGreaterThan(0);
      
      // Check change details
      const changes = result.changes;
      expect(changes.some(c => c.reason.includes('empty cell'))).toBe(true);
      expect(changes.some(c => c.reason.includes('column count'))).toBe(true);
    });
  });

  describe('performance with large tables', () => {
    it('should handle tables with many rows efficiently', () => {
      // Generate a large table
      let content = '| ID | 名称 | 状态 | 备注 |\n|----|----|----|----|\\n';
      
      for (let i = 1; i <= 100; i++) {
        if (i % 10 === 0) {
          // Add some issues every 10 rows
          content += `| ${i} | 项目${i} |  | 空状态 |\\n`;
        } else if (i % 15 === 0) {
          // Add column mismatch every 15 rows
          content += `| ${i} | 项目${i} | 完成 |\\n`;
        } else {
          content += `| ${i} | 项目${i} | 进行中 | 正常 |\\n`;
        }
      }

      const startTime = Date.now();
      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      const endTime = Date.now();
      
      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.fixed).toBeGreaterThan(0);
    });
  });
});