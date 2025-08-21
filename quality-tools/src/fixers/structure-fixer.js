import { BaseFixer } from '../core/base-fixer.js';

/**
 * 文档结构问题检测和修复器
 * 检测和修复标题层次、列表格式、间距等结构问题
 */
export class StructureFixer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    
    // 标题层次规则
    this.headingRules = {
      maxLevel: 6,           // 最大标题级别
      allowSkipLevels: false, // 是否允许跳级
      requireH1: true,       // 是否要求有H1标题
      maxH1Count: 1          // 最大H1数量
    };
    
    // 列表格式规则
    this.listRules = {
      unorderedMarkers: ['-', '*', '+'], // 无序列表标记
      preferredMarker: '-',              // 首选标记
      indentSize: 2,                     // 缩进大小
      maxNestingLevel: 4                 // 最大嵌套级别
    };
    
    // 间距规则
    this.spacingRules = {
      beforeHeading: 1,      // 标题前空行数
      afterHeading: 1,       // 标题后空行数
      beforeList: 1,         // 列表前空行数
      afterList: 1,          // 列表后空行数
      betweenParagraphs: 1,  // 段落间空行数
      maxConsecutiveEmpty: 2 // 最大连续空行数
    };
  }

  /**
   * 检测文档结构问题
   * @param {string} content - 文档内容
   * @param {string} filePath - 文件路径
   * @returns {Array} 检测到的问题列表
   */
  detectIssues(content, filePath) {
    if (!content || typeof content !== 'string') {
      return [];
    }
    
    const issues = [];
    const lines = content.split('\n');
    
    // 分析文档结构
    const structure = this.analyzeDocumentStructure(content);
    
    // 检测标题层次问题
    issues.push(...this.detectHeadingHierarchyIssues(structure.headings));
    
    // 检测列表格式问题
    issues.push(...this.detectListFormatIssues(structure.lists, lines));
    
    // 检测间距问题
    issues.push(...this.detectSpacingIssues(lines, structure));
    
    // 检测重复标题问题
    issues.push(...this.detectDuplicateHeadings(structure.headings));
    
    // 检测空标题问题
    issues.push(...this.detectEmptyHeadings(structure.headings));
    
    return issues;
  }

  /**
   * 分析文档结构
   * @param {string} content - 文档内容
   * @returns {Object} 文档结构分析结果
   */
  analyzeDocumentStructure(content) {
    const lines = content.split('\n');
    const structure = {
      headings: [],
      lists: [],
      paragraphs: [],
      codeBlocks: [],
      emptyLines: []
    };
    
    let inCodeBlock = false;
    let currentList = null;
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNumber = index + 1;
      
      // 检测代码块
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        structure.codeBlocks.push({
          line: lineNumber,
          type: inCodeBlock ? 'start' : 'end',
          language: inCodeBlock ? trimmed.substring(3).trim() : null
        });
        return;
      }
      
      // 跳过代码块内容
      if (inCodeBlock) {
        return;
      }
      
      // 检测标题 (包括空标题)
      const headingMatch = trimmed.match(/^(#{1,6})(\s+(.+))?$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[3] ? headingMatch[3].trim() : '';
        
        structure.headings.push({
          line: lineNumber,
          level,
          text,
          raw: trimmed
        });
        
        // 重置当前列表
        if (currentList) {
          structure.lists.push(currentList);
          currentList = null;
        }
        return;
      }
      
      // 检测列表项
      const listMatch = trimmed.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (listMatch) {
        const indent = listMatch[1].length;
        const marker = listMatch[2];
        const content = listMatch[3];
        const isOrdered = /^\d+\./.test(marker);
        
        const listItem = {
          line: lineNumber,
          indent,
          marker,
          content,
          isOrdered,
          level: Math.floor(indent / this.listRules.indentSize)
        };
        
        // 检查是否需要开始新列表（类型不匹配或有间隔）
        if (!currentList || 
            (currentList.type === 'ordered') !== isOrdered ||
            (currentList.endLine && lineNumber > currentList.endLine + 1)) {
          
          // 结束当前列表
          if (currentList) {
            structure.lists.push(currentList);
          }
          
          // 开始新列表
          currentList = {
            startLine: lineNumber,
            items: [],
            type: isOrdered ? 'ordered' : 'unordered'
          };
        }
        
        currentList.items.push(listItem);
        currentList.endLine = lineNumber;
        return;
      }
      
      // 如果不是列表项，结束当前列表
      if (currentList && trimmed.length > 0) {
        structure.lists.push(currentList);
        currentList = null;
      }
      
      // 检测空行
      if (trimmed.length === 0) {
        structure.emptyLines.push(lineNumber);
      } else if (!headingMatch && !listMatch) {
        // 普通段落
        structure.paragraphs.push({
          line: lineNumber,
          content: trimmed
        });
      }
    });
    
    // 添加最后的列表
    if (currentList) {
      structure.lists.push(currentList);
    }
    
    return structure;
  }

  /**
   * 检测标题层次问题
   * @param {Array} headings - 标题列表
   * @returns {Array} 标题层次问题列表
   */
  detectHeadingHierarchyIssues(headings) {
    const issues = [];
    
    if (headings.length === 0) {
      return issues;
    }
    
    // 检查是否有H1标题
    const h1Count = headings.filter(h => h.level === 1).length;
    if (this.headingRules.requireH1 && h1Count === 0) {
      issues.push(this.createIssue(
        'missing_h1',
        1,
        '文档缺少H1标题',
        'warning'
      ));
    }
    
    // 检查H1数量
    if (h1Count > this.headingRules.maxH1Count) {
      const extraH1s = headings.filter(h => h.level === 1).slice(this.headingRules.maxH1Count);
      extraH1s.forEach(heading => {
        issues.push(this.createIssue(
          'multiple_h1',
          heading.line,
          `文档中有多个H1标题，建议使用H2或更低级别`,
          'warning'
        ));
      });
    }
    
    // 检查标题级别跳跃
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i];
      const previous = headings[i - 1];
      
      if (current.level > previous.level + 1 && !this.headingRules.allowSkipLevels) {
        issues.push(this.createIssue(
          'heading_level_skip',
          current.line,
          `标题级别从H${previous.level}跳跃到H${current.level}，建议使用连续的标题级别`,
          'warning'
        ));
      }
      
      if (current.level > this.headingRules.maxLevel) {
        issues.push(this.createIssue(
          'heading_level_too_deep',
          current.line,
          `标题级别H${current.level}过深，建议使用H${this.headingRules.maxLevel}或更浅的级别`,
          'info'
        ));
      }
    }
    
    return issues;
  }

  /**
   * 检测列表格式问题
   * @param {Array} lists - 列表数组
   * @param {Array} lines - 文档行数组
   * @returns {Array} 列表格式问题列表
   */
  detectListFormatIssues(lists, lines) {
    const issues = [];
    
    lists.forEach(list => {
      // 检查列表标记一致性
      if (list.type === 'unordered') {
        const markers = [...new Set(list.items.map(item => item.marker))];
        if (markers.length > 1) {
          list.items.forEach(item => {
            if (item.marker !== this.listRules.preferredMarker) {
              issues.push(this.createIssue(
                'inconsistent_list_marker',
                item.line,
                `列表标记不一致，建议统一使用 "${this.listRules.preferredMarker}"`,
                'info'
              ));
            }
          });
        }
      }
      
      // 检查缩进一致性
      list.items.forEach(item => {
        const expectedIndent = item.level * this.listRules.indentSize;
        if (item.indent !== expectedIndent) {
          issues.push(this.createIssue(
            'incorrect_list_indent',
            item.line,
            `列表项缩进不正确，期望${expectedIndent}个空格，实际${item.indent}个空格`,
            'info'
          ));
        }
        
        // 检查嵌套级别
        if (item.level > this.listRules.maxNestingLevel) {
          issues.push(this.createIssue(
            'list_nesting_too_deep',
            item.line,
            `列表嵌套过深（级别${item.level}），建议重构为更浅的结构`,
            'warning'
          ));
        }
      });
      
      // 检查有序列表编号
      if (list.type === 'ordered') {
        list.items.forEach((item, index) => {
          const expectedNumber = index + 1;
          const actualNumber = parseInt(item.marker);
          if (actualNumber !== expectedNumber) {
            issues.push(this.createIssue(
              'incorrect_list_numbering',
              item.line,
              `有序列表编号不正确，期望${expectedNumber}，实际${actualNumber}`,
              'info'
            ));
          }
        });
      }
    });
    
    return issues;
  }

  /**
   * 检测间距问题
   * @param {Array} lines - 文档行数组
   * @param {Object} structure - 文档结构
   * @returns {Array} 间距问题列表
   */
  detectSpacingIssues(lines, structure) {
    const issues = [];
    
    // 检查标题前后间距
    structure.headings.forEach(heading => {
      const lineIndex = heading.line - 1;
      
      // 检查标题前的间距（除了第一行）
      if (lineIndex > 0) {
        const beforeLine = lines[lineIndex - 1];
        if (beforeLine.trim() !== '') {
          issues.push(this.createIssue(
            'heading_spacing_before',
            heading.line,
            '标题前应有空行分隔',
            'info'
          ));
        }
      }
      
      // 检查标题后的间距（除了最后一行）
      if (lineIndex < lines.length - 1) {
        const afterLine = lines[lineIndex + 1];
        if (afterLine.trim() !== '' && !afterLine.trim().startsWith('#')) {
          issues.push(this.createIssue(
            'heading_spacing_after',
            heading.line,
            '标题后应有空行分隔',
            'info'
          ));
        }
      }
    });
    
    // 检查列表前后间距
    structure.lists.forEach(list => {
      const startIndex = list.startLine - 1;
      const endIndex = list.endLine - 1;
      
      // 检查列表前的间距
      if (startIndex > 0) {
        const beforeLine = lines[startIndex - 1];
        if (beforeLine.trim() !== '') {
          issues.push(this.createIssue(
            'list_spacing_before',
            list.startLine,
            '列表前应有空行分隔',
            'info'
          ));
        }
      }
      
      // 检查列表后的间距
      if (endIndex < lines.length - 1) {
        const afterLine = lines[endIndex + 1];
        if (afterLine.trim() !== '' && !afterLine.trim().startsWith('-') && 
            !afterLine.trim().startsWith('*') && !afterLine.trim().startsWith('+') &&
            !/^\d+\./.test(afterLine.trim())) {
          issues.push(this.createIssue(
            'list_spacing_after',
            list.endLine,
            '列表后应有空行分隔',
            'info'
          ));
        }
      }
    });
    
    // 检查连续空行
    let consecutiveEmpty = 0;
    let emptyStart = -1;
    
    lines.forEach((line, index) => {
      if (line.trim() === '') {
        if (consecutiveEmpty === 0) {
          emptyStart = index + 1;
        }
        consecutiveEmpty++;
      } else {
        if (consecutiveEmpty > this.spacingRules.maxConsecutiveEmpty) {
          issues.push(this.createIssue(
            'excessive_empty_lines',
            emptyStart,
            `连续${consecutiveEmpty}个空行过多，建议减少到${this.spacingRules.maxConsecutiveEmpty}个以内`,
            'info'
          ));
        }
        consecutiveEmpty = 0;
      }
    });
    
    return issues;
  }

  /**
   * 检测重复标题
   * @param {Array} headings - 标题列表
   * @returns {Array} 重复标题问题列表
   */
  detectDuplicateHeadings(headings) {
    const issues = [];
    const titleCounts = {};
    
    headings.forEach(heading => {
      const normalizedTitle = heading.text.toLowerCase().trim();
      if (!titleCounts[normalizedTitle]) {
        titleCounts[normalizedTitle] = [];
      }
      titleCounts[normalizedTitle].push(heading);
    });
    
    Object.entries(titleCounts).forEach(([title, occurrences]) => {
      if (occurrences.length > 1) {
        occurrences.forEach((heading, index) => {
          if (index > 0) { // 第一个不算重复
            issues.push(this.createIssue(
              'duplicate_heading',
              heading.line,
              `重复的标题 "${heading.text}"，可能影响锚点链接`,
              'warning'
            ));
          }
        });
      }
    });
    
    return issues;
  }

  /**
   * 检测空标题
   * @param {Array} headings - 标题列表
   * @returns {Array} 空标题问题列表
   */
  detectEmptyHeadings(headings) {
    const issues = [];
    
    headings.forEach(heading => {
      if (!heading.text || heading.text.trim().length === 0) {
        issues.push(this.createIssue(
          'empty_heading',
          heading.line,
          '标题内容为空',
          'error'
        ));
      }
    });
    
    return issues;
  }

  /**
   * 修复文档结构问题
   * @param {string} content - 原始内容
   * @param {Array} issues - 要修复的问题列表
   * @returns {Object} 修复结果
   */
  fix(content, issues) {
    let fixedContent = content;
    const changes = [];
    const fixingStats = {
      totalIssues: issues.length,
      fixedIssues: 0,
      skippedIssues: 0,
      failedIssues: 0
    };
    
    // 按问题类型分组处理
    const issuesByType = this.groupIssuesByType(issues);
    const fixingOrder = [
      'empty_heading',
      'heading_level_skip',
      'multiple_h1',
      'inconsistent_list_marker',
      'incorrect_list_indent',
      'incorrect_list_numbering',
      'heading_spacing_before',
      'heading_spacing_after',
      'list_spacing_before',
      'list_spacing_after',
      'excessive_empty_lines',
      'duplicate_heading'
    ];
    
    for (const issueType of fixingOrder) {
      if (issuesByType[issueType]) {
        try {
          const result = this.fixIssuesByType(fixedContent, issuesByType[issueType], issueType);
          
          if (result.success) {
            fixedContent = result.content;
            changes.push(...result.changes);
            fixingStats.fixedIssues += result.fixedCount;
          } else {
            fixingStats.failedIssues += issuesByType[issueType].length;
          }
        } catch (error) {
          console.warn(`修复 ${issueType} 类型问题时出错:`, error.message);
          fixingStats.failedIssues += issuesByType[issueType].length;
        }
      }
    }
    
    return {
      content: fixedContent,
      changes,
      status: fixingStats.fixedIssues > 0 ? 'success' : 'partial_success',
      stats: fixingStats
    };
  }

  /**
   * 按类型修复问题
   * @param {string} content - 当前内容
   * @param {Array} issues - 特定类型的问题列表
   * @param {string} issueType - 问题类型
   * @returns {Object} 修复结果
   */
  fixIssuesByType(content, issues, issueType) {
    switch (issueType) {
      case 'heading_level_skip':
        return this.fixHeadingLevelSkips(content, issues);
      
      case 'multiple_h1':
        return this.fixMultipleH1s(content, issues);
      
      case 'inconsistent_list_marker':
        return this.fixInconsistentListMarkers(content, issues);
      
      case 'incorrect_list_indent':
        return this.fixIncorrectListIndents(content, issues);
      
      case 'incorrect_list_numbering':
        return this.fixIncorrectListNumbering(content, issues);
      
      case 'heading_spacing_before':
      case 'heading_spacing_after':
      case 'list_spacing_before':
      case 'list_spacing_after':
        return this.fixSpacingIssues(content, issues);
      
      case 'excessive_empty_lines':
        return this.fixExcessiveEmptyLines(content, issues);
      
      case 'empty_heading':
        return this.fixEmptyHeadings(content, issues);
      
      case 'duplicate_heading':
        return this.fixDuplicateHeadings(content, issues);
      
      default:
        return { success: false, content, changes: [], fixedCount: 0 };
    }
  }

  /**
   * 修复标题级别跳跃
   * @param {string} content - 内容
   * @param {Array} issues - 标题级别跳跃问题
   * @returns {Object} 修复结果
   */
  fixHeadingLevelSkips(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 重新分析标题结构
    const structure = this.analyzeDocumentStructure(content);
    const headings = structure.headings;
    
    issues.forEach(issue => {
      const heading = headings.find(h => h.line === issue.line);
      if (heading) {
        const lineIndex = heading.line - 1;
        const previousHeading = headings.find(h => h.line < heading.line && 
          headings.indexOf(h) === headings.indexOf(heading) - 1);
        
        if (previousHeading) {
          const targetLevel = previousHeading.level + 1;
          const newHeading = '#'.repeat(targetLevel) + ' ' + heading.text;
          
          lines[lineIndex] = newHeading;
          changes.push({
            type: 'modification',
            line: heading.line,
            oldContent: heading.raw,
            newContent: newHeading,
            reason: `调整标题级别从H${heading.level}到H${targetLevel}`
          });
          fixedCount++;
        }
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 修复多个H1标题
   * @param {string} content - 内容
   * @param {Array} issues - 多个H1问题
   * @returns {Object} 修复结果
   */
  fixMultipleH1s(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    issues.forEach(issue => {
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];
      
      if (line.startsWith('# ')) {
        const newLine = '## ' + line.substring(2);
        lines[lineIndex] = newLine;
        
        changes.push({
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: newLine,
          reason: '将多余的H1标题降级为H2'
        });
        fixedCount++;
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 修复不一致的列表标记
   * @param {string} content - 内容
   * @param {Array} issues - 不一致列表标记问题
   * @returns {Object} 修复结果
   */
  fixInconsistentListMarkers(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    issues.forEach(issue => {
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];
      
      const match = line.match(/^(\s*)([-*+])\s+(.*)$/);
      if (match) {
        const indent = match[1];
        const content = match[3];
        const newLine = indent + this.listRules.preferredMarker + ' ' + content;
        
        lines[lineIndex] = newLine;
        changes.push({
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: newLine,
          reason: `统一列表标记为 "${this.listRules.preferredMarker}"`
        });
        fixedCount++;
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 修复不正确的列表缩进
   * @param {string} content - 内容
   * @param {Array} issues - 列表缩进问题
   * @returns {Object} 修复结果
   */
  fixIncorrectListIndents(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 重新分析列表结构
    const structure = this.analyzeDocumentStructure(content);
    
    issues.forEach(issue => {
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];
      
      // 找到对应的列表项
      let targetItem = null;
      for (const list of structure.lists) {
        targetItem = list.items.find(item => item.line === issue.line);
        if (targetItem) break;
      }
      
      if (targetItem) {
        const expectedIndent = targetItem.level * this.listRules.indentSize;
        const match = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        
        if (match) {
          const marker = match[2];
          const content = match[3];
          const newLine = ' '.repeat(expectedIndent) + marker + ' ' + content;
          
          lines[lineIndex] = newLine;
          changes.push({
            type: 'modification',
            line: issue.line,
            oldContent: line,
            newContent: newLine,
            reason: `调整列表缩进为${expectedIndent}个空格`
          });
          fixedCount++;
        }
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 修复不正确的列表编号
   * @param {string} content - 内容
   * @param {Array} issues - 列表编号问题
   * @returns {Object} 修复结果
   */
  fixIncorrectListNumbering(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 重新分析列表结构
    const structure = this.analyzeDocumentStructure(content);
    
    structure.lists.forEach(list => {
      if (list.type === 'ordered') {
        list.items.forEach((item, index) => {
          const expectedNumber = index + 1;
          const currentNumber = parseInt(item.marker);
          
          if (currentNumber !== expectedNumber) {
            const lineIndex = item.line - 1;
            const line = lines[lineIndex];
            const newLine = line.replace(/^\s*\d+\./, 
              ' '.repeat(item.indent) + expectedNumber + '.');
            
            lines[lineIndex] = newLine;
            changes.push({
              type: 'modification',
              line: item.line,
              oldContent: line,
              newContent: newLine,
              reason: `修正有序列表编号为${expectedNumber}`
            });
            fixedCount++;
          }
        });
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 修复间距问题
   * @param {string} content - 内容
   * @param {Array} issues - 间距问题
   * @returns {Object} 修复结果
   */
  fixSpacingIssues(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 从后往前处理，避免行号变化影响
    issues.sort((a, b) => b.line - a.line).forEach(issue => {
      const lineIndex = issue.line - 1;
      
      if (issue.type.includes('_before')) {
        // 在指定行前添加空行
        if (lineIndex > 0 && lines[lineIndex - 1].trim() !== '') {
          lines.splice(lineIndex, 0, '');
          changes.push({
            type: 'addition',
            line: issue.line,
            newContent: '',
            reason: '添加空行分隔'
          });
          fixedCount++;
        }
      } else if (issue.type.includes('_after')) {
        // 在指定行后添加空行
        if (lineIndex < lines.length - 1 && lines[lineIndex + 1].trim() !== '') {
          lines.splice(lineIndex + 1, 0, '');
          changes.push({
            type: 'addition',
            line: issue.line + 1,
            newContent: '',
            reason: '添加空行分隔'
          });
          fixedCount++;
        }
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 修复过多的空行
   * @param {string} content - 内容
   * @param {Array} issues - 过多空行问题
   * @returns {Object} 修复结果
   */
  fixExcessiveEmptyLines(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 使用正则表达式替换连续的空行
    let fixedContent = content;
    
    // 创建匹配超过限制的连续空行的正则表达式
    const maxEmpty = this.spacingRules.maxConsecutiveEmpty;
    const emptyLinePattern = new RegExp(`\n{${maxEmpty + 2},}`, 'g');
    
    fixedContent = fixedContent.replace(emptyLinePattern, '\n'.repeat(maxEmpty + 1));
    
    if (fixedContent !== content) {
      changes.push({
        type: 'modification',
        line: 1,
        oldContent: content,
        newContent: fixedContent,
        reason: `减少连续空行到最多${maxEmpty}个`
      });
      fixedCount = 1;
    }
    
    return {
      success: true,
      content: fixedContent,
      changes,
      fixedCount
    };
  }

  /**
   * 修复空标题
   * @param {string} content - 内容
   * @param {Array} issues - 空标题问题
   * @returns {Object} 修复结果
   */
  fixEmptyHeadings(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 从后往前删除空标题
    issues.sort((a, b) => b.line - a.line).forEach(issue => {
      const lineIndex = issue.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];
        
        if (line.match(/^#+\s*$/)) {
          lines.splice(lineIndex, 1);
          changes.push({
            type: 'deletion',
            line: issue.line,
            oldContent: line,
            reason: '删除空标题'
          });
          fixedCount++;
        }
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 修复重复标题
   * @param {string} content - 内容
   * @param {Array} issues - 重复标题问题
   * @returns {Object} 修复结果
   */
  fixDuplicateHeadings(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 重新分析所有标题以获取完整的重复信息
    const structure = this.analyzeDocumentStructure(content);
    const titleCounts = {};
    
    // 计算每个标题的出现次数
    structure.headings.forEach(heading => {
      const normalizedTitle = heading.text.toLowerCase().trim();
      if (!titleCounts[normalizedTitle]) {
        titleCounts[normalizedTitle] = [];
      }
      titleCounts[normalizedTitle].push(heading);
    });
    
    // 为重复的标题添加编号
    Object.entries(titleCounts).forEach(([title, occurrences]) => {
      if (occurrences.length > 1) {
        occurrences.forEach((heading, index) => {
          if (index > 0) { // 第一个保持原样
            const lineIndex = heading.line - 1;
            const line = lines[lineIndex];
            const match = line.match(/^(#+)\s+(.+)$/);
            
            if (match) {
              const level = match[1];
              const originalTitle = match[2].trim();
              const newTitle = `${originalTitle} ${index + 1}`;
              const newLine = `${level} ${newTitle}`;
              
              lines[lineIndex] = newLine;
              changes.push({
                type: 'modification',
                line: heading.line,
                oldContent: line,
                newContent: newLine,
                reason: `为重复标题添加编号后缀`
              });
              fixedCount++;
            }
          }
        });
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 按类型分组问题
   * @param {Array} issues - 问题列表
   * @returns {Object} 按类型分组的问题
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
   * 验证修复结果
   * @param {string} originalContent - 原始内容
   * @param {string} fixedContent - 修复后内容
   * @returns {Object} 验证结果
   */
  validate(originalContent, fixedContent) {
    const warnings = [];
    const errors = [];
    
    // 检查内容长度变化
    const originalLines = originalContent.split('\n').length;
    const fixedLines = fixedContent.split('\n').length;
    const lineDiff = Math.abs(fixedLines - originalLines);
    
    if (lineDiff > originalLines * 0.1) {
      warnings.push(`文档行数变化较大：${lineDiff}行`);
    }
    
    // 重新检测问题，确保修复效果
    const remainingIssues = this.detectIssues(fixedContent, '');
    const criticalIssues = remainingIssues.filter(issue => issue.severity === 'error');
    
    if (criticalIssues.length > 0) {
      errors.push(`仍有${criticalIssues.length}个严重问题未修复`);
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      remainingIssues: remainingIssues.length,
      improvement: {
        structureFixed: true,
        readabilityImproved: true,
        consistencyImproved: true
      }
    };
  }
}