/**
 * 自动化质量检查工具
 * 实现全面的质量问题检测、修复建议生成和质量报告自动生成
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseFixer } from './base-fixer.js';

/**
 * 质量问题类型枚举
 */
const IssueType = {
  CODE_BLOCK_UNCLOSED: 'code_block_unclosed',
  CODE_BLOCK_MISSING_LANGUAGE: 'code_block_missing_language',
  TABLE_COLUMN_MISMATCH: 'table_column_mismatch',
  TABLE_EMPTY_CELLS: 'table_empty_cells',
  MERMAID_NO_DIRECTION: 'mermaid_no_direction',
  MERMAID_TOO_MANY_NODES: 'mermaid_too_many_nodes',
  HEADING_HIERARCHY: 'heading_hierarchy',
  BROKEN_LINK: 'broken_link',
  DUPLICATE_ANCHOR: 'duplicate_anchor',
  TERMINOLOGY_INCONSISTENCY: 'terminology_inconsistency',
  FORMAT_INCONSISTENCY: 'format_inconsistency',
  SPACING_ISSUE: 'spacing_issue'
};

/**
 * 质量问题严重程度
 */
const Severity = {
  CRITICAL: 'critical',
  MAJOR: 'major',
  MINOR: 'minor',
  INFO: 'info'
};

/**
 * 质量问题分类
 */
const Category = {
  CODE_BLOCK: 'code_block',
  TABLE: 'table',
  MERMAID: 'mermaid',
  STRUCTURE: 'structure',
  REFERENCE: 'reference',
  TERMINOLOGY: 'terminology',
  FORMAT: 'format'
};

class QualityChecker extends BaseFixer {
  constructor(config = {}) {
    super(config);
    this.issues = [];
    this.fixers = new Map();
    this.reportTemplate = config.reportTemplate || 'default';
    this.thresholds = {
      critical: config.thresholds?.critical || 0,
      major: config.thresholds?.major || 5,
      minor: config.thresholds?.minor || 20,
      ...config.thresholds
    };
  }

  /**
   * 注册修复器
   */
  registerFixer(category, fixer) {
    this.fixers.set(category, fixer);
  }

  /**
   * 检查单个文件的质量问题
   */
  async checkFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileIssues = [];

      // 检查代码块问题
      const codeBlockIssues = this.checkCodeBlocks(content, filePath);
      fileIssues.push(...codeBlockIssues);

      // 检查表格问题
      const tableIssues = this.checkTables(content, filePath);
      fileIssues.push(...tableIssues);

      // 检查Mermaid图表问题
      const mermaidIssues = this.checkMermaidDiagrams(content, filePath);
      fileIssues.push(...mermaidIssues);

      // 检查文档结构问题
      const structureIssues = this.checkDocumentStructure(content, filePath);
      fileIssues.push(...structureIssues);

      // 检查链接和引用问题
      const referenceIssues = this.checkReferences(content, filePath);
      fileIssues.push(...referenceIssues);

      // 检查术语一致性问题
      const terminologyIssues = this.checkTerminology(content, filePath);
      fileIssues.push(...terminologyIssues);

      // 检查格式一致性问题
      const formatIssues = this.checkFormat(content, filePath);
      fileIssues.push(...formatIssues);

      return fileIssues;
    } catch (error) {
      return [{
        id: this.generateIssueId(),
        file: filePath,
        line: 0,
        type: 'file_access_error',
        severity: Severity.CRITICAL,
        category: Category.FORMAT,
        description: `无法读取文件: ${error.message}`,
        suggestion: '检查文件权限和路径',
        autoFixable: false
      }];
    }
  }

  /**
   * 检查代码块问题
   */
  checkCodeBlocks(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockStart = -1;
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('```')) {
        if (!inCodeBlock) {
          // 开始代码块
          inCodeBlock = true;
          codeBlockStart = i;
          codeBlockLanguage = trimmedLine.substring(3).trim();

          // 检查是否缺少语言标识符
          if (!codeBlockLanguage) {
            issues.push({
              id: this.generateIssueId(),
              file: filePath,
              line: i + 1,
              type: IssueType.CODE_BLOCK_MISSING_LANGUAGE,
              severity: Severity.MINOR,
              category: Category.CODE_BLOCK,
              description: '代码块缺少语言标识符',
              suggestion: '添加适当的语言标识符，如 ```javascript 或 ```python',
              autoFixable: true
            });
          }

          // 检查代码块前的空行
          if (i > 0 && lines[i - 1].trim() !== '') {
            issues.push({
              id: this.generateIssueId(),
              file: filePath,
              line: i + 1,
              type: IssueType.SPACING_ISSUE,
              severity: Severity.MINOR,
              category: Category.CODE_BLOCK,
              description: '代码块前缺少空行',
              suggestion: '在代码块前添加空行以提高可读性',
              autoFixable: true
            });
          }
        } else {
          // 结束代码块
          inCodeBlock = false;
          
          // 检查代码块后的空行
          if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
            issues.push({
              id: this.generateIssueId(),
              file: filePath,
              line: i + 1,
              type: IssueType.SPACING_ISSUE,
              severity: Severity.MINOR,
              category: Category.CODE_BLOCK,
              description: '代码块后缺少空行',
              suggestion: '在代码块后添加空行以提高可读性',
              autoFixable: true
            });
          }
        }
      }
    }

    // 检查未闭合的代码块
    if (inCodeBlock) {
      issues.push({
        id: this.generateIssueId(),
        file: filePath,
        line: codeBlockStart + 1,
        type: IssueType.CODE_BLOCK_UNCLOSED,
        severity: Severity.MAJOR,
        category: Category.CODE_BLOCK,
        description: '代码块未正确闭合',
        suggestion: '在代码块末尾添加 ```',
        autoFixable: true
      });
    }

    return issues;
  }

  /**
   * 检查表格问题
   */
  checkTables(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    let currentTable = null;
    let tableStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.includes('|') && !trimmedLine.startsWith('```')) {
        if (!currentTable) {
          // 开始新表格
          currentTable = {
            headers: [],
            rows: [],
            startLine: i
          };
          tableStart = i;
        }

        const cells = trimmedLine.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        
        if (currentTable.headers.length === 0) {
          currentTable.headers = cells;
        } else if (trimmedLine.includes('---') || trimmedLine.includes('===')) {
          // 分隔行，跳过
          continue;
        } else {
          currentTable.rows.push({
            cells,
            lineNumber: i
          });
        }
      } else if (currentTable && trimmedLine === '') {
        // 表格结束
        const tableIssues = this.validateTable(currentTable, filePath);
        issues.push(...tableIssues);
        currentTable = null;
      }
    }

    // 处理文件末尾的表格
    if (currentTable) {
      const tableIssues = this.validateTable(currentTable, filePath);
      issues.push(...tableIssues);
    }

    return issues;
  }

  /**
   * 验证表格
   */
  validateTable(table, filePath) {
    const issues = [];
    const expectedColumns = table.headers.length;

    // 检查列数过多
    if (expectedColumns > 8) {
      issues.push({
        id: this.generateIssueId(),
        file: filePath,
        line: table.startLine + 1,
        type: 'table_too_many_columns',
        severity: Severity.MINOR,
        category: Category.TABLE,
        description: `表格列数过多 (${expectedColumns}列)，可能影响可读性`,
        suggestion: '考虑将表格分解为多个较小的表格或重新设计布局',
        autoFixable: false
      });
    }

    // 检查每行的列数和空单元格
    table.rows.forEach(row => {
      // 检查列数不匹配
      if (row.cells.length !== expectedColumns) {
        issues.push({
          id: this.generateIssueId(),
          file: filePath,
          line: row.lineNumber + 1,
          type: IssueType.TABLE_COLUMN_MISMATCH,
          severity: Severity.MAJOR,
          category: Category.TABLE,
          description: `表格行列数不匹配，期望 ${expectedColumns} 列，实际 ${row.cells.length} 列`,
          suggestion: '调整表格行的列数以匹配标题行',
          autoFixable: true
        });
      }

      // 检查空单元格 - 检查实际存在的单元格
      for (let i = 0; i < Math.max(row.cells.length, expectedColumns); i++) {
        const cell = row.cells[i] || '';
        if (cell === '' || cell.trim() === '' || cell === '-') {
          issues.push({
            id: this.generateIssueId(),
            file: filePath,
            line: row.lineNumber + 1,
            column: i + 1,
            type: IssueType.TABLE_EMPTY_CELLS,
            severity: Severity.MINOR,
            category: Category.TABLE,
            description: '表格包含空单元格',
            suggestion: '使用 "N/A"、"无" 或其他适当的占位符',
            autoFixable: true
          });
        }
      }
    });

    return issues;
  }

  /**
   * 检查Mermaid图表问题
   */
  checkMermaidDiagrams(content, filePath) {
    const issues = [];
    const mermaidBlocks = this.extractMermaidBlocks(content);

    mermaidBlocks.forEach(block => {
      const diagramIssues = this.validateMermaidDiagram(block, filePath);
      issues.push(...diagramIssues);
    });

    return issues;
  }

  /**
   * 提取Mermaid代码块
   */
  extractMermaidBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let inMermaidBlock = false;
    let currentBlock = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('```mermaid')) {
        inMermaidBlock = true;
        currentBlock = {
          content: '',
          startLine: i,
          endLine: -1
        };
      } else if (inMermaidBlock && trimmedLine === '```') {
        currentBlock.endLine = i;
        blocks.push(currentBlock);
        inMermaidBlock = false;
        currentBlock = null;
      } else if (inMermaidBlock) {
        currentBlock.content += line + '\n';
      }
    }

    return blocks;
  }

  /**
   * 验证Mermaid图表
   */
  validateMermaidDiagram(block, filePath) {
    const issues = [];
    const content = block.content.trim();
    const lines = content.split('\n');

    // 检查方向定义
    const hasDirection = lines.some(line => 
      /^(graph|flowchart)\s+(TB|TD|BT|RL|LR)/.test(line.trim())
    );

    if (!hasDirection && content.includes('graph')) {
      issues.push({
        id: this.generateIssueId(),
        file: filePath,
        line: block.startLine + 1,
        type: IssueType.MERMAID_NO_DIRECTION,
        severity: Severity.MINOR,
        category: Category.MERMAID,
        description: 'Mermaid图表缺少方向定义',
        suggestion: '添加方向定义，如 graph TB 或 flowchart LR',
        autoFixable: true
      });
    }

    // 检查节点数量
    const nodeCount = this.countMermaidNodes(content);
    if (nodeCount > 20) {
      issues.push({
        id: this.generateIssueId(),
        file: filePath,
        line: block.startLine + 1,
        type: IssueType.MERMAID_TOO_MANY_NODES,
        severity: Severity.MINOR,
        category: Category.MERMAID,
        description: `Mermaid图表节点过多 (${nodeCount}个)，可能影响可读性`,
        suggestion: '考虑将复杂图表分解为多个较小的图表',
        autoFixable: false
      });
    }

    // 检查非标准颜色
    const nonStandardColors = this.findNonStandardColors(content);
    if (nonStandardColors.length > 0) {
      issues.push({
        id: this.generateIssueId(),
        file: filePath,
        line: block.startLine + 1,
        type: 'mermaid_non_standard_colors',
        severity: Severity.MINOR,
        category: Category.MERMAID,
        description: `使用了非标准颜色: ${nonStandardColors.join(', ')}`,
        suggestion: '使用标准配色方案或预定义的颜色变量',
        autoFixable: true
      });
    }

    return issues;
  }

  /**
   * 计算Mermaid节点数量
   */
  countMermaidNodes(content) {
    // 匹配节点定义，包括 Node1, A, B 等
    const nodePattern = /\b[A-Za-z][A-Za-z0-9]*\b(?=\s*[\[\(]|\s*-->|\s*---)/g;
    const arrowPattern = /([A-Za-z][A-Za-z0-9]*)\s*--[->]/g;
    const reverseArrowPattern = /--[->]\s*([A-Za-z][A-Za-z0-9]*)/g;
    
    const nodes = new Set();
    
    // 从箭头连接中提取节点
    let match;
    while ((match = arrowPattern.exec(content)) !== null) {
      nodes.add(match[1]);
    }
    
    while ((match = reverseArrowPattern.exec(content)) !== null) {
      nodes.add(match[1]);
    }
    
    // 从节点定义中提取
    while ((match = nodePattern.exec(content)) !== null) {
      nodes.add(match[0]);
    }
    
    return nodes.size;
  }

  /**
   * 查找非标准颜色
   */
  findNonStandardColors(content) {
    const standardColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'black', 'white'];
    const colorPattern = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b\w+\b/g;
    const colors = content.match(colorPattern) || [];
    
    return colors.filter(color => 
      color.startsWith('#') || !standardColors.includes(color.toLowerCase())
    );
  }

  /**
   * 检查文档结构问题
   */
  checkDocumentStructure(content, filePath) {
    const issues = [];
    const lines = content.split('\n');
    const headings = [];
    let previousLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('#')) {
        const level = trimmedLine.match(/^#+/)[0].length;
        const text = trimmedLine.substring(level).trim();

        headings.push({
          level,
          text,
          line: i + 1
        });

        // 检查标题层次跳跃
        if (level > previousLevel + 1) {
          issues.push({
            id: this.generateIssueId(),
            file: filePath,
            line: i + 1,
            type: IssueType.HEADING_HIERARCHY,
            severity: Severity.MINOR,
            category: Category.STRUCTURE,
            description: `标题层次跳跃，从 H${previousLevel} 跳到 H${level}`,
            suggestion: '保持标题层次的连续性，避免跳级',
            autoFixable: false
          });
        }

        previousLevel = level;

        // 检查标题前后的空行
        if (i > 0 && lines[i - 1].trim() !== '') {
          issues.push({
            id: this.generateIssueId(),
            file: filePath,
            line: i + 1,
            type: IssueType.SPACING_ISSUE,
            severity: Severity.MINOR,
            category: Category.STRUCTURE,
            description: '标题前缺少空行',
            suggestion: '在标题前添加空行以提高可读性',
            autoFixable: true
          });
        }
      }
    }

    // 检查重复标题
    const titleCounts = {};
    headings.forEach(heading => {
      const key = heading.text.toLowerCase();
      if (titleCounts[key]) {
        titleCounts[key].push(heading);
      } else {
        titleCounts[key] = [heading];
      }
    });

    Object.entries(titleCounts).forEach(([title, occurrences]) => {
      if (occurrences.length > 1) {
        occurrences.forEach(occurrence => {
          issues.push({
            id: this.generateIssueId(),
            file: filePath,
            line: occurrence.line,
            type: IssueType.DUPLICATE_ANCHOR,
            severity: Severity.MINOR,
            category: Category.STRUCTURE,
            description: `重复的标题: "${occurrence.text}"`,
            suggestion: '为重复标题添加唯一标识符或重新组织内容结构',
            autoFixable: false
          });
        });
      }
    });

    return issues;
  }

  /**
   * 检查引用和链接问题
   */
  checkReferences(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查markdown链接
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkPattern.exec(line)) !== null) {
        const linkText = match[1];
        const linkUrl = match[2];
        
        // 检查内部链接
        if (linkUrl.startsWith('./') || linkUrl.startsWith('../') || !linkUrl.includes('://')) {
          // 这里可以添加文件存在性检查
          // 暂时标记为需要验证
          issues.push({
            id: this.generateIssueId(),
            file: filePath,
            line: i + 1,
            type: 'link_needs_verification',
            severity: Severity.INFO,
            category: Category.REFERENCE,
            description: `内部链接需要验证: ${linkUrl}`,
            suggestion: '验证链接目标文件是否存在',
            autoFixable: false
          });
        }
      }
    }

    return issues;
  }

  /**
   * 检查术语一致性问题
   */
  checkTerminology(content, filePath) {
    const issues = [];
    
    // 常见术语变体检查
    const terminologyRules = {
      'AI': ['ai', 'Ai', 'artificial intelligence'],
      'IDE': ['ide', 'Ide', 'integrated development environment'],
      'API': ['api', 'Api'],
      'UI': ['ui', 'Ui', 'user interface'],
      'UX': ['ux', 'Ux', 'user experience']
    };

    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      Object.entries(terminologyRules).forEach(([standard, variants]) => {
        variants.forEach(variant => {
          if (line.includes(variant) && !line.includes(standard)) {
            issues.push({
              id: this.generateIssueId(),
              file: filePath,
              line: i + 1,
              type: IssueType.TERMINOLOGY_INCONSISTENCY,
              severity: Severity.MINOR,
              category: Category.TERMINOLOGY,
              description: `术语不一致: 使用了 "${variant}" 而不是标准术语 "${standard}"`,
              suggestion: `统一使用标准术语 "${standard}"`,
              autoFixable: true
            });
          }
        });
      });
    }

    return issues;
  }

  /**
   * 检查格式一致性问题
   */
  checkFormat(content, filePath) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查行尾空白
      if (line.endsWith(' ') || line.endsWith('\t')) {
        issues.push({
          id: this.generateIssueId(),
          file: filePath,
          line: i + 1,
          type: 'trailing_whitespace',
          severity: Severity.MINOR,
          category: Category.FORMAT,
          description: '行尾包含多余的空白字符',
          suggestion: '删除行尾的空白字符',
          autoFixable: true
        });
      }

      // 检查过长的行
      if (line.length > 120) {
        issues.push({
          id: this.generateIssueId(),
          file: filePath,
          line: i + 1,
          type: 'line_too_long',
          severity: Severity.MINOR,
          category: Category.FORMAT,
          description: `行长度过长 (${line.length} 字符)`,
          suggestion: '考虑将长行分解为多行以提高可读性',
          autoFixable: false
        });
      }
    }

    return issues;
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions(issues) {
    const suggestions = [];
    const groupedIssues = this.groupIssuesByType(issues);

    Object.entries(groupedIssues).forEach(([type, typeIssues]) => {
      const suggestion = this.createFixSuggestion(type, typeIssues);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    });

    return suggestions;
  }

  /**
   * 按类型分组问题
   */
  groupIssuesByType(issues) {
    const grouped = {};
    
    issues.forEach(issue => {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    });

    return grouped;
  }

  /**
   * 创建修复建议
   */
  createFixSuggestion(type, issues) {
    const count = issues.length;
    const autoFixable = issues.every(issue => issue.autoFixable);
    
    const suggestions = {
      [IssueType.CODE_BLOCK_UNCLOSED]: {
        title: '修复未闭合的代码块',
        description: `发现 ${count} 个未闭合的代码块`,
        action: '自动添加缺失的代码块结束标记',
        priority: 'high',
        autoFixable: true
      },
      [IssueType.CODE_BLOCK_MISSING_LANGUAGE]: {
        title: '添加代码块语言标识符',
        description: `发现 ${count} 个缺少语言标识符的代码块`,
        action: '基于代码内容自动推断并添加语言标识符',
        priority: 'medium',
        autoFixable: true
      },
      [IssueType.TABLE_COLUMN_MISMATCH]: {
        title: '修复表格列数不匹配',
        description: `发现 ${count} 个表格行列数不匹配问题`,
        action: '自动调整表格行的列数以匹配标题行',
        priority: 'high',
        autoFixable: true
      },
      [IssueType.TABLE_EMPTY_CELLS]: {
        title: '填充表格空单元格',
        description: `发现 ${count} 个空单元格`,
        action: '使用适当的占位符填充空单元格',
        priority: 'medium',
        autoFixable: true
      },
      [IssueType.MERMAID_NO_DIRECTION]: {
        title: '添加Mermaid图表方向定义',
        description: `发现 ${count} 个缺少方向定义的图表`,
        action: '为流程图添加适当的方向定义',
        priority: 'medium',
        autoFixable: true
      }
    };

    const suggestion = suggestions[type];
    if (suggestion) {
      return {
        ...suggestion,
        type,
        count,
        autoFixable,
        issues: issues.map(issue => ({
          file: issue.file,
          line: issue.line,
          description: issue.description
        }))
      };
    }

    return null;
  }

  /**
   * 生成质量报告
   */
  async generateQualityReport(issues, outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(issues),
      statistics: this.generateStatistics(issues),
      issues: issues,
      suggestions: this.generateFixSuggestions(issues),
      recommendations: this.generateRecommendations(issues)
    };

    // 生成HTML报告
    const htmlReport = this.generateHtmlReport(report);
    await fs.writeFile(path.join(outputPath, 'quality-report.html'), htmlReport);

    // 生成JSON报告
    await fs.writeFile(
      path.join(outputPath, 'quality-report.json'), 
      JSON.stringify(report, null, 2)
    );

    // 生成Markdown报告
    const markdownReport = this.generateMarkdownReport(report);
    await fs.writeFile(path.join(outputPath, 'quality-report.md'), markdownReport);

    return report;
  }

  /**
   * 生成报告摘要
   */
  generateSummary(issues) {
    const totalIssues = issues.length;
    const criticalIssues = issues.filter(i => i.severity === Severity.CRITICAL).length;
    const majorIssues = issues.filter(i => i.severity === Severity.MAJOR).length;
    const minorIssues = issues.filter(i => i.severity === Severity.MINOR).length;
    const autoFixableIssues = issues.filter(i => i.autoFixable).length;

    return {
      totalIssues,
      criticalIssues,
      majorIssues,
      minorIssues,
      autoFixableIssues,
      autoFixablePercentage: totalIssues > 0 ? Math.round((autoFixableIssues / totalIssues) * 100) : 0
    };
  }

  /**
   * 生成统计信息
   */
  generateStatistics(issues) {
    const bySeverity = {};
    const byCategory = {};
    const byType = {};
    const byFile = {};

    issues.forEach(issue => {
      // 按严重程度统计
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
      
      // 按分类统计
      byCategory[issue.category] = (byCategory[issue.category] || 0) + 1;
      
      // 按类型统计
      byType[issue.type] = (byType[issue.type] || 0) + 1;
      
      // 按文件统计
      byFile[issue.file] = (byFile[issue.file] || 0) + 1;
    });

    return {
      bySeverity,
      byCategory,
      byType,
      byFile
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations(issues) {
    const recommendations = [];
    const summary = this.generateSummary(issues);

    if (summary.criticalIssues > this.thresholds.critical) {
      recommendations.push({
        priority: 'urgent',
        title: '立即处理关键问题',
        description: `发现 ${summary.criticalIssues} 个关键问题，需要立即处理`,
        action: '优先修复所有关键严重程度的问题'
      });
    }

    if (summary.majorIssues > this.thresholds.major) {
      recommendations.push({
        priority: 'high',
        title: '处理主要问题',
        description: `发现 ${summary.majorIssues} 个主要问题，建议尽快处理`,
        action: '制定计划逐步修复主要问题'
      });
    }

    if (summary.autoFixablePercentage > 70) {
      recommendations.push({
        priority: 'medium',
        title: '启用自动修复',
        description: `${summary.autoFixablePercentage}% 的问题可以自动修复`,
        action: '运行自动修复工具处理可自动修复的问题'
      });
    }

    return recommendations;
  }

  /**
   * 生成HTML报告
   */
  generateHtmlReport(report) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文档质量报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .critical { color: #dc3545; }
        .major { color: #fd7e14; }
        .minor { color: #ffc107; }
        .info { color: #17a2b8; }
        .issue-list { margin: 20px 0; }
        .issue-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .issue-item.critical { border-left-color: #dc3545; }
        .issue-item.major { border-left-color: #fd7e14; }
        .issue-item.minor { border-left-color: #ffc107; }
        .issue-meta { font-size: 0.9em; color: #666; margin-top: 5px; }
        .suggestions { background: #e7f3ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .auto-fixable { color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>文档质量报告</h1>
        <p>生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}</p>
        
        <h2>概览</h2>
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${report.summary.totalIssues}</div>
                <div>总问题数</div>
            </div>
            <div class="stat-card">
                <div class="stat-number critical">${report.summary.criticalIssues}</div>
                <div>关键问题</div>
            </div>
            <div class="stat-card">
                <div class="stat-number major">${report.summary.majorIssues}</div>
                <div>主要问题</div>
            </div>
            <div class="stat-card">
                <div class="stat-number minor">${report.summary.minorIssues}</div>
                <div>次要问题</div>
            </div>
            <div class="stat-card">
                <div class="stat-number auto-fixable">${report.summary.autoFixableIssues}</div>
                <div>可自动修复</div>
            </div>
        </div>

        <h2>修复建议</h2>
        <div class="suggestions">
            ${report.suggestions.map(suggestion => `
                <h3>${suggestion.title}</h3>
                <p>${suggestion.description}</p>
                <p><strong>建议操作:</strong> ${suggestion.action}</p>
                <p><strong>优先级:</strong> ${suggestion.priority}</p>
                ${suggestion.autoFixable ? '<p class="auto-fixable">✓ 可自动修复</p>' : ''}
            `).join('')}
        </div>

        <h2>详细问题列表</h2>
        <div class="issue-list">
            ${report.issues.slice(0, 50).map(issue => `
                <div class="issue-item ${issue.severity}">
                    <strong>${issue.description}</strong>
                    <div class="issue-meta">
                        文件: ${issue.file} | 行: ${issue.line} | 类型: ${issue.type} | 严重程度: ${issue.severity}
                        ${issue.autoFixable ? ' | <span class="auto-fixable">可自动修复</span>' : ''}
                    </div>
                    <div>建议: ${issue.suggestion}</div>
                </div>
            `).join('')}
            ${report.issues.length > 50 ? `<p>... 还有 ${report.issues.length - 50} 个问题，请查看完整的JSON报告</p>` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成Markdown报告
   */
  generateMarkdownReport(report) {
    return `# 文档质量报告

生成时间: ${new Date(report.timestamp).toLocaleString('zh-CN')}

## 概览

| 指标 | 数量 |
|------|------|
| 总问题数 | ${report.summary.totalIssues} |
| 关键问题 | ${report.summary.criticalIssues} |
| 主要问题 | ${report.summary.majorIssues} |
| 次要问题 | ${report.summary.minorIssues} |
| 可自动修复 | ${report.summary.autoFixableIssues} (${report.summary.autoFixablePercentage}%) |

## 修复建议

${report.suggestions.map(suggestion => `
### ${suggestion.title}

${suggestion.description}

**建议操作:** ${suggestion.action}
**优先级:** ${suggestion.priority}
${suggestion.autoFixable ? '**状态:** ✓ 可自动修复' : ''}

`).join('')}

## 问题统计

### 按严重程度分布

${Object.entries(report.statistics.bySeverity).map(([severity, count]) => `- ${severity}: ${count}`).join('\n')}

### 按分类分布

${Object.entries(report.statistics.byCategory).map(([category, count]) => `- ${category}: ${count}`).join('\n')}

## 建议

${report.recommendations.map(rec => `
### ${rec.title} (${rec.priority})

${rec.description}

**行动建议:** ${rec.action}

`).join('')}

---

*此报告由自动化质量检查工具生成*
`;
  }

  /**
   * 生成问题ID
   */
  generateIssueId() {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export {
  QualityChecker,
  IssueType,
  Severity,
  Category
};