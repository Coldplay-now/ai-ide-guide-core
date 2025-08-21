/**
 * 质量检查工具测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { QualityChecker, IssueType, Severity, Category } from '../../src/core/quality-checker.js';

describe('QualityChecker', () => {
  let checker;
  let tempDir;

  beforeEach(async () => {
    checker = new QualityChecker({
      thresholds: {
        critical: 0,
        major: 5,
        minor: 20
      }
    });
    
    // 创建临时目录
    tempDir = path.join(__dirname, 'temp_' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理临时文件
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('代码块检查', () => {
    it('应该检测未闭合的代码块', async () => {
      const content = `# 测试文档

这是一个代码示例：

\`\`\`javascript
function test() {
  console.log('hello');
}

没有闭合标记的代码块会导致问题。`;

      const issues = checker.checkCodeBlocks(content, 'test.md');
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe(IssueType.CODE_BLOCK_UNCLOSED);
      expect(issues[0].severity).toBe(Severity.MAJOR);
      expect(issues[0].autoFixable).toBe(true);
    });

    it('应该检测缺少语言标识符的代码块', async () => {
      const content = `# 测试文档

\`\`\`
function test() {
  console.log('hello');
}
\`\`\``;

      const issues = checker.checkCodeBlocks(content, 'test.md');
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe(IssueType.CODE_BLOCK_MISSING_LANGUAGE);
      expect(issues[0].severity).toBe(Severity.MINOR);
      expect(issues[0].autoFixable).toBe(true);
    });

    it('应该检测代码块间距问题', async () => {
      const content = `# 测试文档
\`\`\`javascript
console.log('test');
\`\`\`
下一段内容紧跟着代码块。`;

      const issues = checker.checkCodeBlocks(content, 'test.md');
      
      const spacingIssues = issues.filter(i => i.type === IssueType.SPACING_ISSUE);
      expect(spacingIssues.length).toBeGreaterThan(0);
    });
  });

  describe('表格检查', () => {
    it('应该检测表格列数不匹配', async () => {
      const content = `# 测试文档

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 |
| 值1 | 值2 | 值3 | 值4 |`;

      const issues = checker.checkTables(content, 'test.md');
      
      const columnIssues = issues.filter(i => i.type === IssueType.TABLE_COLUMN_MISMATCH);
      expect(columnIssues).toHaveLength(2);
      expect(columnIssues[0].severity).toBe(Severity.MAJOR);
    });

    it('应该检测空单元格', async () => {
      const content = `# 测试文档

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 |     | 值3 |
| 值1 | -   | 值3 |`;

      const issues = checker.checkTables(content, 'test.md');
      
      const emptyCellIssues = issues.filter(i => i.type === IssueType.TABLE_EMPTY_CELLS);
      expect(emptyCellIssues).toHaveLength(2);
    });

    it('应该检测列数过多的表格', async () => {
      const content = `# 测试文档

| 列1 | 列2 | 列3 | 列4 | 列5 | 列6 | 列7 | 列8 | 列9 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| 值1 | 值2 | 值3 | 值4 | 值5 | 值6 | 值7 | 值8 | 值9 |`;

      const issues = checker.checkTables(content, 'test.md');
      
      const tooManyColumnsIssues = issues.filter(i => i.type === 'table_too_many_columns');
      expect(tooManyColumnsIssues).toHaveLength(1);
      expect(tooManyColumnsIssues[0].severity).toBe(Severity.MINOR);
    });
  });

  describe('Mermaid图表检查', () => {
    it('应该检测缺少方向定义的图表', async () => {
      const content = `# 测试文档

\`\`\`mermaid
graph
    A --> B
    B --> C
\`\`\``;

      const issues = checker.checkMermaidDiagrams(content, 'test.md');
      
      const directionIssues = issues.filter(i => i.type === IssueType.MERMAID_NO_DIRECTION);
      expect(directionIssues).toHaveLength(1);
      expect(directionIssues[0].autoFixable).toBe(true);
    });

    it('应该检测节点过多的图表', async () => {
      // 创建一个有很多节点的图表
      const nodes = Array.from({ length: 25 }, (_, i) => `Node${i}`);
      const connections = nodes.slice(0, -1).map((node, i) => `${node} --> ${nodes[i + 1]}`);
      
      const content = `# 测试文档

\`\`\`mermaid
graph TB
    ${connections.join('\n    ')}
\`\`\``;

      const issues = checker.checkMermaidDiagrams(content, 'test.md');
      
      const tooManyNodesIssues = issues.filter(i => i.type === IssueType.MERMAID_TOO_MANY_NODES);
      expect(tooManyNodesIssues).toHaveLength(1);
      expect(tooManyNodesIssues[0].severity).toBe(Severity.MINOR);
    });

    it('应该检测非标准颜色', async () => {
      const content = `# 测试文档

\`\`\`mermaid
graph TB
    A[Node A] --> B[Node B]
    style A fill:#ff0000
    style B fill:customcolor
\`\`\``;

      const issues = checker.checkMermaidDiagrams(content, 'test.md');
      
      const colorIssues = issues.filter(i => i.type === 'mermaid_non_standard_colors');
      expect(colorIssues).toHaveLength(1);
    });
  });

  describe('文档结构检查', () => {
    it('应该检测标题层次跳跃', async () => {
      const content = `# 一级标题

### 三级标题（跳过了二级）

#### 四级标题`;

      const issues = checker.checkDocumentStructure(content, 'test.md');
      
      const hierarchyIssues = issues.filter(i => i.type === IssueType.HEADING_HIERARCHY);
      expect(hierarchyIssues).toHaveLength(1);
      expect(hierarchyIssues[0].severity).toBe(Severity.MINOR);
    });

    it('应该检测重复标题', async () => {
      const content = `# 测试文档

## 介绍

一些内容

## 介绍

重复的标题`;

      const issues = checker.checkDocumentStructure(content, 'test.md');
      
      const duplicateIssues = issues.filter(i => i.type === IssueType.DUPLICATE_ANCHOR);
      expect(duplicateIssues).toHaveLength(2); // 两个重复的标题都会被标记
    });

    it('应该检测标题间距问题', async () => {
      const content = `# 测试文档
## 没有空行的标题

内容`;

      const issues = checker.checkDocumentStructure(content, 'test.md');
      
      const spacingIssues = issues.filter(i => i.type === IssueType.SPACING_ISSUE);
      expect(spacingIssues.length).toBeGreaterThan(0);
    });
  });

  describe('术语一致性检查', () => {
    it('应该检测术语不一致', async () => {
      const content = `# 测试文档

这个文档讨论了 ai 和 IDE 的集成。
我们还会涉及 api 接口和 ui 设计。`;

      const issues = checker.checkTerminology(content, 'test.md');
      
      const terminologyIssues = issues.filter(i => i.type === IssueType.TERMINOLOGY_INCONSISTENCY);
      expect(terminologyIssues.length).toBeGreaterThan(0);
      expect(terminologyIssues.every(i => i.autoFixable)).toBe(true);
    });
  });

  describe('格式检查', () => {
    it('应该检测行尾空白', async () => {
      const content = `# 测试文档   

这行有尾随空格。   
这行没有。`;

      const issues = checker.checkFormat(content, 'test.md');
      
      const whitespaceIssues = issues.filter(i => i.type === 'trailing_whitespace');
      expect(whitespaceIssues).toHaveLength(2);
      expect(whitespaceIssues[0].autoFixable).toBe(true);
    });

    it('应该检测过长的行', async () => {
      const longLine = 'a'.repeat(150);
      const content = `# 测试文档

${longLine}

正常长度的行。`;

      const issues = checker.checkFormat(content, 'test.md');
      
      const longLineIssues = issues.filter(i => i.type === 'line_too_long');
      expect(longLineIssues).toHaveLength(1);
      expect(longLineIssues[0].autoFixable).toBe(false);
    });
  });

  describe('修复建议生成', () => {
    it('应该生成修复建议', async () => {
      const issues = [
        {
          id: '1',
          type: IssueType.CODE_BLOCK_UNCLOSED,
          severity: Severity.MAJOR,
          autoFixable: true,
          file: 'test.md',
          line: 5,
          description: '未闭合代码块'
        },
        {
          id: '2',
          type: IssueType.CODE_BLOCK_UNCLOSED,
          severity: Severity.MAJOR,
          autoFixable: true,
          file: 'test2.md',
          line: 10,
          description: '另一个未闭合代码块'
        }
      ];

      const suggestions = checker.generateFixSuggestions(issues);
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].type).toBe(IssueType.CODE_BLOCK_UNCLOSED);
      expect(suggestions[0].count).toBe(2);
      expect(suggestions[0].autoFixable).toBe(true);
    });
  });

  describe('质量报告生成', () => {
    it('应该生成完整的质量报告', async () => {
      const issues = [
        {
          id: '1',
          file: 'test.md',
          line: 5,
          type: IssueType.CODE_BLOCK_UNCLOSED,
          severity: Severity.CRITICAL,
          category: Category.CODE_BLOCK,
          description: '关键问题',
          suggestion: '修复建议',
          autoFixable: true
        },
        {
          id: '2',
          file: 'test.md',
          line: 10,
          type: IssueType.TABLE_COLUMN_MISMATCH,
          severity: Severity.MAJOR,
          category: Category.TABLE,
          description: '主要问题',
          suggestion: '修复建议',
          autoFixable: true
        }
      ];

      const report = await checker.generateQualityReport(issues, tempDir);
      
      expect(report.summary.totalIssues).toBe(2);
      expect(report.summary.criticalIssues).toBe(1);
      expect(report.summary.majorIssues).toBe(1);
      expect(report.summary.autoFixableIssues).toBe(2);
      expect(report.summary.autoFixablePercentage).toBe(100);
      
      expect(report.statistics.bySeverity[Severity.CRITICAL]).toBe(1);
      expect(report.statistics.bySeverity[Severity.MAJOR]).toBe(1);
      
      expect(report.suggestions.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);

      // 验证文件是否生成
      const htmlExists = await fs.access(path.join(tempDir, 'quality-report.html')).then(() => true).catch(() => false);
      const jsonExists = await fs.access(path.join(tempDir, 'quality-report.json')).then(() => true).catch(() => false);
      const mdExists = await fs.access(path.join(tempDir, 'quality-report.md')).then(() => true).catch(() => false);
      
      expect(htmlExists).toBe(true);
      expect(jsonExists).toBe(true);
      expect(mdExists).toBe(true);
    });
  });

  describe('文件检查', () => {
    it('应该检查单个文件并返回问题列表', async () => {
      const testContent = `# 测试文档

\`\`\`
console.log('test');

| 列1 | 列2 |
|-----|-----|
| 值1 |

\`\`\`mermaid
graph
    A --> B
\`\`\``;

      const testFile = path.join(tempDir, 'test.md');
      await fs.writeFile(testFile, testContent);

      const issues = await checker.checkFile(testFile);
      
      expect(issues.length).toBeGreaterThan(0);
      
      // 应该包含各种类型的问题
      const types = new Set(issues.map(i => i.type));
      expect(types.has(IssueType.CODE_BLOCK_UNCLOSED)).toBe(true);
      expect(types.has(IssueType.CODE_BLOCK_MISSING_LANGUAGE)).toBe(true);
      expect(types.has(IssueType.MERMAID_NO_DIRECTION)).toBe(true);
    });

    it('应该处理文件访问错误', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.md');
      
      const issues = await checker.checkFile(nonExistentFile);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('file_access_error');
      expect(issues[0].severity).toBe(Severity.CRITICAL);
    });
  });

  describe('统计和分析', () => {
    it('应该正确生成统计信息', async () => {
      const issues = [
        { severity: Severity.CRITICAL, category: Category.CODE_BLOCK, type: 'type1', file: 'file1.md' },
        { severity: Severity.CRITICAL, category: Category.TABLE, type: 'type1', file: 'file1.md' },
        { severity: Severity.MAJOR, category: Category.CODE_BLOCK, type: 'type2', file: 'file2.md' }
      ];

      const stats = checker.generateStatistics(issues);
      
      expect(stats.bySeverity[Severity.CRITICAL]).toBe(2);
      expect(stats.bySeverity[Severity.MAJOR]).toBe(1);
      expect(stats.byCategory[Category.CODE_BLOCK]).toBe(2);
      expect(stats.byCategory[Category.TABLE]).toBe(1);
      expect(stats.byType['type1']).toBe(2);
      expect(stats.byType['type2']).toBe(1);
      expect(stats.byFile['file1.md']).toBe(2);
      expect(stats.byFile['file2.md']).toBe(1);
    });

    it('应该生成适当的建议', async () => {
      const manyMajorIssues = Array.from({ length: 10 }, (_, i) => ({
        severity: Severity.MAJOR,
        category: Category.CODE_BLOCK,
        type: 'type1',
        file: `file${i}.md`,
        autoFixable: true
      }));

      const recommendations = checker.generateRecommendations(manyMajorIssues);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.priority === 'high')).toBe(true);
      expect(recommendations.some(r => r.title.includes('自动修复'))).toBe(true);
    });
  });
});