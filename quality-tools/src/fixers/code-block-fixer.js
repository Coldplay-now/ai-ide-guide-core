import { BaseFixer } from '../core/base-fixer.js';

/**
 * 代码块问题检测和修复器
 * 检测和修复未闭合代码块、缺失语言标识符、间距问题等
 */
export class CodeBlockFixer extends BaseFixer {
  constructor(options = {}) {
    super(options);
    
    // 常见编程语言标识符映射
    this.languagePatterns = {
      // TypeScript相关 (优先级高于JavaScript)
      'interface\\s+\\w+': 'typescript',
      'type\\s+\\w+\\s*=': 'typescript',
      ':\\s*(string|number|boolean|any)': 'typescript',
      '<[^>]+>\\s*\\(': 'typescript', // 泛型函数
      
      // JSX/React相关
      '<[A-Z]\\w*[^>]*>': 'jsx',
      'className=': 'jsx',
      'onClick=': 'jsx',
      'useState|useEffect': 'jsx',
      
      // JavaScript相关
      'function\\s+\\w+\\s*\\(': 'javascript',
      'const\\s+\\w+\\s*=': 'javascript',
      'let\\s+\\w+\\s*=': 'javascript',
      'var\\s+\\w+\\s*=': 'javascript',
      'import\\s+.*from': 'javascript',
      'export\\s+(default\\s+)?': 'javascript',
      'console\\.log\\s*\\(': 'javascript',
      'require\\s*\\(': 'javascript',
      
      // Python相关
      'def\\s+\\w+\\s*\\(': 'python',
      'class\\s+\\w+\\s*[\\(:]': 'python',
      'import\\s+\\w+': 'python',
      'from\\s+\\w+\\s+import': 'python',
      'print\\s*\\(': 'python',
      'if\\s+__name__\\s*==\\s*["\']__main__["\']': 'python',
      
      // Java相关
      'public\\s+class\\s+\\w+': 'java',
      'public\\s+static\\s+void\\s+main': 'java',
      'System\\.out\\.print': 'java',
      'package\\s+[\\w.]+': 'java',
      
      // C/C++相关
      '#include\\s*<': 'cpp',
      'int\\s+main\\s*\\(': 'cpp',
      'printf\\s*\\(': 'c',
      'std::': 'cpp',
      
      // HTML相关
      '<\\w+[^>]*>': 'html',
      '<!DOCTYPE\\s+html>': 'html',
      
      // CSS相关
      '[.#]?\\w+\\s*\\{[^}]*\\}': 'css',
      '@media\\s+': 'css',
      
      // SQL相关
      'SELECT\\s+.*FROM': 'sql',
      'INSERT\\s+INTO': 'sql',
      'UPDATE\\s+.*SET': 'sql',
      'CREATE\\s+TABLE': 'sql',
      
      // Shell相关
      '#!/bin/(bash|sh)': 'bash',
      'echo\\s+': 'bash',
      'cd\\s+': 'bash',
      'ls\\s+': 'bash',
      
      // JSON相关
      '^\\s*\\{[\\s\\S]*\\}\\s*$': 'json',
      '^\\s*\\[[\\s\\S]*\\]\\s*$': 'json',
      
      // YAML相关
      '^\\w+:\\s*': 'yaml',
      '^\\s*-\\s+\\w+:': 'yaml',
      
      // Markdown相关
      '^#+\\s+': 'markdown',
      '^\\s*\\*\\s+': 'markdown',
      '^\\s*-\\s+': 'markdown'
    };
    
    // 代码块间距规则
    this.spacingRules = {
      beforeCodeBlock: 1, // 代码块前应有的空行数
      afterCodeBlock: 1,  // 代码块后应有的空行数
      minContentLines: 1  // 代码块内容最少行数
    };
  }

  /**
   * 检测代码块相关问题
   * @param {string} content - 文档内容
   * @param {string} filePath - 文件路径
   * @returns {Array} 检测到的问题列表
   */
  detectIssues(content, filePath) {
    // Handle null/undefined content
    if (!content || typeof content !== 'string') {
      return [];
    }
    
    const issues = [];
    const lines = content.split('\n');
    
    // 检测未闭合代码块
    issues.push(...this.detectUnclosedCodeBlocks(content, lines));
    
    // 检测缺失语言标识符
    issues.push(...this.detectMissingLanguageIdentifiers(content, lines));
    
    // 检测代码块间距问题
    issues.push(...this.detectSpacingIssues(content, lines));
    
    // 检测空代码块
    issues.push(...this.detectEmptyCodeBlocks(content, lines));
    
    // 检测嵌套代码块问题
    issues.push(...this.detectNestedCodeBlocks(content, lines));
    
    return issues;
  }

  /**
   * 检测未闭合的代码块
   * @param {string} content - 文档内容
   * @param {Array} lines - 文档行数组
   * @returns {Array} 未闭合代码块问题列表
   */
  detectUnclosedCodeBlocks(content, lines) {
    const issues = [];
    const codeBlockStarts = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('```')) {
        if (codeBlockStarts.length === 0) {
          // 开始一个新的代码块
          codeBlockStarts.push({
            line: index + 1,
            content: trimmedLine,
            language: trimmedLine.substring(3).trim()
          });
        } else {
          // 结束当前代码块
          codeBlockStarts.pop();
        }
      }
    });
    
    // 检查是否有未闭合的代码块
    codeBlockStarts.forEach(block => {
      issues.push(this.createIssue(
        'unclosed_code_block',
        block.line,
        `代码块在第 ${block.line} 行开始但未正确闭合`,
        'error'
      ));
    });
    
    return issues;
  }

  /**
   * 检测缺失语言标识符的代码块
   * @param {string} content - 文档内容
   * @param {Array} lines - 文档行数组
   * @returns {Array} 缺失语言标识符问题列表
   */
  detectMissingLanguageIdentifiers(content, lines) {
    const issues = [];
    const codeBlocks = this.extractCodeBlocks(content);
    
    codeBlocks.forEach(block => {
      if (!block.language || block.language.trim() === '') {
        // 尝试推断语言类型
        const inferredLanguage = this.inferLanguageFromContent(block.content);
        
        issues.push(this.createIssue(
          'missing_language_identifier',
          block.startLine,
          `代码块缺失语言标识符${inferredLanguage ? `，建议使用: ${inferredLanguage}` : ''}`,
          'warning'
        ));
      }
    });
    
    return issues;
  }

  /**
   * 检测代码块间距问题
   * @param {string} content - 文档内容
   * @param {Array} lines - 文档行数组
   * @returns {Array} 间距问题列表
   */
  detectSpacingIssues(content, lines) {
    const issues = [];
    const codeBlocks = this.extractCodeBlocks(content);
    
    codeBlocks.forEach(block => {
      // 检查代码块前的间距
      const beforeLine = block.startLine - 2; // 代码块开始前一行
      if (beforeLine >= 0 && lines[beforeLine].trim() !== '') {
        issues.push(this.createIssue(
          'code_block_spacing_before',
          block.startLine,
          '代码块前应有空行分隔',
          'info'
        ));
      }
      
      // 检查代码块后的间距
      const afterLine = block.endLine; // 代码块结束后一行
      if (afterLine < lines.length && lines[afterLine].trim() !== '') {
        issues.push(this.createIssue(
          'code_block_spacing_after',
          block.endLine,
          '代码块后应有空行分隔',
          'info'
        ));
      }
    });
    
    return issues;
  }

  /**
   * 检测空代码块
   * @param {string} content - 文档内容
   * @param {Array} lines - 文档行数组
   * @returns {Array} 空代码块问题列表
   */
  detectEmptyCodeBlocks(content, lines) {
    const issues = [];
    const codeBlocks = this.extractCodeBlocks(content);
    
    codeBlocks.forEach(block => {
      if (!block.content || block.content.trim() === '') {
        issues.push(this.createIssue(
          'empty_code_block',
          block.startLine,
          '代码块为空，应添加内容或删除',
          'warning'
        ));
      }
    });
    
    return issues;
  }

  /**
   * 检测嵌套代码块问题
   * @param {string} content - 文档内容
   * @param {Array} lines - 文档行数组
   * @returns {Array} 嵌套代码块问题列表
   */
  detectNestedCodeBlocks(content, lines) {
    const issues = [];
    let inCodeBlock = false;
    let codeBlockStartLine = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockStartLine = index + 1;
        }
      } else if (inCodeBlock && trimmedLine.includes('```')) {
        // 在代码块内发现反引号，可能是嵌套问题
        issues.push(this.createIssue(
          'nested_code_block',
          index + 1,
          '代码块内包含反引号，可能导致渲染问题',
          'warning'
        ));
      }
    });
    
    return issues;
  }

  /**
   * 提取文档中的所有代码块
   * @param {string} content - 文档内容
   * @returns {Array} 代码块信息数组
   */
  extractCodeBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let currentBlock = null;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('```')) {
        if (currentBlock === null) {
          // 开始新的代码块
          currentBlock = {
            startLine: index + 1,
            language: trimmedLine.substring(3).trim(),
            content: '',
            lines: []
          };
        } else {
          // 结束当前代码块
          currentBlock.endLine = index + 1;
          currentBlock.content = currentBlock.lines.join('\n');
          blocks.push(currentBlock);
          currentBlock = null;
        }
      } else if (currentBlock !== null) {
        // 在代码块内
        currentBlock.lines.push(line);
      }
    });
    
    // 处理未闭合的代码块
    if (currentBlock !== null) {
      currentBlock.endLine = lines.length;
      currentBlock.content = currentBlock.lines.join('\n');
      blocks.push(currentBlock);
    }
    
    return blocks;
  }

  /**
   * 根据代码内容推断编程语言 - 增强版
   * @param {string} codeContent - 代码内容
   * @returns {string|null} 推断的语言标识符
   */
  inferLanguageFromContent(codeContent) {
    if (!codeContent || codeContent.trim() === '') {
      return null;
    }
    
    // 预处理代码内容，移除注释和字符串
    const cleanContent = this.preprocessCodeContent(codeContent);
    
    // 多层次语言检测策略
    const detectionStrategies = [
      this.detectByKeywords.bind(this),
      this.detectByStructure.bind(this),
      this.detectByPatterns.bind(this),
      this.detectByContext.bind(this)
    ];
    
    // 语言置信度评分
    const languageScores = {};
    
    for (const strategy of detectionStrategies) {
      const results = strategy(cleanContent, codeContent);
      for (const [language, score] of Object.entries(results)) {
        languageScores[language] = (languageScores[language] || 0) + score;
      }
    }
    
    // 返回得分最高的语言
    const sortedLanguages = Object.entries(languageScores)
      .sort(([,a], [,b]) => b - a)
      .filter(([,score]) => score > 0);
    
    return sortedLanguages.length > 0 ? sortedLanguages[0][0] : null;
  }

  /**
   * 预处理代码内容，移除注释和字符串字面量
   * @param {string} content - 原始代码内容
   * @returns {string} 清理后的代码内容
   */
  preprocessCodeContent(content) {
    let cleaned = content;
    
    // 移除单行注释
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/#.*$/gm, '');
    
    // 移除多行注释
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/'''[\s\S]*?'''/g, '');
    cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');
    
    // 移除字符串字面量
    cleaned = cleaned.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""');
    cleaned = cleaned.replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''");
    cleaned = cleaned.replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
    
    return cleaned;
  }

  /**
   * 基于关键词检测语言
   * @param {string} cleanContent - 清理后的代码
   * @param {string} originalContent - 原始代码
   * @returns {Object} 语言得分映射
   */
  detectByKeywords(cleanContent, originalContent) {
    const scores = {};
    
    for (const [pattern, language] of Object.entries(this.languagePatterns)) {
      const regex = new RegExp(pattern, 'im');
      const matches = (cleanContent.match(regex) || []).length;
      if (matches > 0) {
        scores[language] = (scores[language] || 0) + matches * 2;
      }
    }
    
    return scores;
  }

  /**
   * 基于代码结构检测语言
   * @param {string} cleanContent - 清理后的代码
   * @param {string} originalContent - 原始代码
   * @returns {Object} 语言得分映射
   */
  detectByStructure(cleanContent, originalContent) {
    const scores = {};
    
    // 缩进风格检测
    const lines = cleanContent.split('\n').filter(line => line.trim());
    const tabIndented = lines.filter(line => line.startsWith('\t')).length;
    const spaceIndented = lines.filter(line => line.match(/^[ ]{2,}/)).length;
    
    if (spaceIndented > tabIndented) {
      scores.python = (scores.python || 0) + 1;
      scores.yaml = (scores.yaml || 0) + 0.5;
    }
    
    // 大括号风格检测
    const braceCount = (cleanContent.match(/\{|\}/g) || []).length;
    if (braceCount > 2) {
      scores.javascript = (scores.javascript || 0) + 1;
      scores.java = (scores.java || 0) + 1;
      scores.cpp = (scores.cpp || 0) + 1;
      scores.css = (scores.css || 0) + 0.5;
    }
    
    // 分号检测
    const semicolonCount = (cleanContent.match(/;/g) || []).length;
    if (semicolonCount > 1) {
      scores.javascript = (scores.javascript || 0) + 0.5;
      scores.java = (scores.java || 0) + 0.5;
      scores.cpp = (scores.cpp || 0) + 0.5;
    }
    
    return scores;
  }

  /**
   * 基于特定模式检测语言
   * @param {string} cleanContent - 清理后的代码
   * @param {string} originalContent - 原始代码
   * @returns {Object} 语言得分映射
   */
  detectByPatterns(cleanContent, originalContent) {
    const scores = {};
    
    // 特殊语言模式
    const specialPatterns = {
      // TypeScript特征
      typescript: [
        /interface\s+\w+/i,
        /type\s+\w+\s*=/i,
        /:\s*(string|number|boolean|any)/i,
        /<[^>]+>/  // 泛型
      ],
      
      // React/JSX特征
      jsx: [
        /<[A-Z]\w*[^>]*>/,  // React组件
        /className=/,
        /onClick=/,
        /useState|useEffect/
      ],
      
      // PHP特征
      php: [
        /<\?php/,
        /\$\w+/,  // 变量
        /->|\$this/,
        /echo\s+/
      ],
      
      // Go特征
      go: [
        /package\s+\w+/,
        /func\s+\w+\s*\(/,
        /import\s*\(/,
        /:=/
      ],
      
      // Rust特征
      rust: [
        /fn\s+\w+\s*\(/,
        /let\s+mut\s+/,
        /impl\s+/,
        /match\s+/
      ],
      
      // Docker特征
      dockerfile: [
        /FROM\s+\w+/i,
        /RUN\s+/i,
        /COPY\s+/i,
        /WORKDIR\s+/i
      ]
    };
    
    for (const [language, patterns] of Object.entries(specialPatterns)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(cleanContent)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        scores[language] = matchCount * 1.5;
      }
    }
    
    return scores;
  }

  /**
   * 基于上下文检测语言
   * @param {string} cleanContent - 清理后的代码
   * @param {string} originalContent - 原始代码
   * @returns {Object} 语言得分映射
   */
  detectByContext(cleanContent, originalContent) {
    const scores = {};
    
    // 检查是否为配置文件
    if (this.isConfigurationFile(cleanContent)) {
      if (cleanContent.includes(':') && !cleanContent.includes('{')) {
        scores.yaml = 2;
      } else if (cleanContent.includes('{') && cleanContent.includes('"')) {
        scores.json = 2;
      }
    }
    
    // 检查是否为标记语言
    if (this.isMarkupLanguage(cleanContent)) {
      if (cleanContent.includes('<') && cleanContent.includes('>')) {
        scores.html = 1.5;
        if (cleanContent.includes('<?xml')) {
          scores.xml = 2;
        }
      }
    }
    
    // 检查是否为样式表
    if (this.isStylesheet(cleanContent)) {
      scores.css = 2;
    }
    
    return scores;
  }

  /**
   * 检查是否为配置文件
   * @param {string} content - 代码内容
   * @returns {boolean} 是否为配置文件
   */
  isConfigurationFile(content) {
    const configPatterns = [
      /^\s*[\w-]+:\s*[\w\s-]+$/m,  // YAML键值对
      /^\s*"[\w-]+"\s*:\s*"[^"]*"$/m,  // JSON键值对
      /^\s*[\w-]+\s*=\s*[\w\s-]+$/m   // INI风格
    ];
    
    return configPatterns.some(pattern => pattern.test(content));
  }

  /**
   * 检查是否为标记语言
   * @param {string} content - 代码内容
   * @returns {boolean} 是否为标记语言
   */
  isMarkupLanguage(content) {
    return /<[^>]+>/.test(content) && content.includes('</');
  }

  /**
   * 检查是否为样式表
   * @param {string} content - 代码内容
   * @returns {boolean} 是否为样式表
   */
  isStylesheet(content) {
    return /[\w\s\-#.,:()]+\s*\{[^}]*\}/.test(content);
  }

  /**
   * 修复代码块问题 - 增强版
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
    
    // 创建修复上下文
    const fixingContext = {
      originalContent: content,
      documentStructure: this.analyzeCodeBlockStructure(content),
      spacingAnalysis: this.analyzeDocumentSpacing(content.split('\n')),
      languageHints: this.extractLanguageHints(content)
    };
    
    // 按问题类型和优先级分组处理
    const issuesByType = this.groupIssuesByType(issues);
    const fixingOrder = [
      'unclosed_code_block',
      'missing_language_identifier', 
      'code_block_spacing_before',
      'code_block_spacing_after',
      'empty_code_block',
      'nested_code_block'
    ];
    
    for (const issueType of fixingOrder) {
      if (issuesByType[issueType]) {
        try {
          const result = this.fixIssuesByType(
            fixedContent, 
            issuesByType[issueType], 
            issueType,
            fixingContext
          );
          
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
    
    // 执行最终的质量检查和优化
    const finalOptimization = this.performFinalOptimization(fixedContent);
    if (finalOptimization.changes.length > 0) {
      fixedContent = finalOptimization.content;
      changes.push(...finalOptimization.changes);
    }
    
    return {
      content: fixedContent,
      changes,
      status: fixingStats.totalIssues === 0 || fixingStats.fixedIssues > 0 ? 'success' : 'partial_success',
      stats: fixingStats,
      context: fixingContext
    };
  }

  /**
   * 按类型修复问题
   * @param {string} content - 当前内容
   * @param {Array} issues - 特定类型的问题列表
   * @param {string} issueType - 问题类型
   * @param {Object} context - 修复上下文
   * @returns {Object} 修复结果
   */
  fixIssuesByType(content, issues, issueType, context) {
    switch (issueType) {
      case 'unclosed_code_block':
        return this.fixUnclosedCodeBlocks(content, issues);
      
      case 'missing_language_identifier':
        return this.fixMissingLanguageIdentifiersEnhanced(content, issues, context);
      
      case 'code_block_spacing_before':
      case 'code_block_spacing_after':
        return this.fixSpacingIssues(content, issues);
      
      case 'empty_code_block':
        return this.fixEmptyCodeBlocks(content, issues);
      
      case 'nested_code_block':
        return this.fixNestedCodeBlocks(content, issues);
      
      default:
        return { success: false, content, changes: [], fixedCount: 0 };
    }
  }

  /**
   * 增强版缺失语言标识符修复
   * @param {string} content - 内容
   * @param {Array} issues - 缺失语言标识符问题
   * @param {Object} context - 修复上下文
   * @returns {Object} 修复结果
   */
  fixMissingLanguageIdentifiersEnhanced(content, issues, context) {
    const lines = content.split('\n');
    const changes = [];
    const codeBlocks = this.extractCodeBlocks(content);
    let fixedCount = 0;
    
    issues.forEach(issue => {
      const block = codeBlocks.find(b => b.startLine === issue.line);
      if (block) {
        // 使用增强的语言推断
        const inferredLanguage = this.inferLanguageFromContent(block.content);
        
        // 如果无法推断，尝试从上下文获取提示
        const contextLanguage = inferredLanguage || 
          this.inferLanguageFromContext(block, context.languageHints);
        
        if (contextLanguage) {
          const lineIndex = issue.line - 1;
          const oldLine = lines[lineIndex];
          const newLine = oldLine.replace('```', `\`\`\`${contextLanguage}`);
          lines[lineIndex] = newLine;
          
          changes.push({
            type: 'modification',
            line: issue.line,
            oldContent: oldLine,
            newContent: newLine,
            reason: `添加推断的语言标识符: ${contextLanguage}`,
            confidence: inferredLanguage ? 'high' : 'medium'
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
   * 从上下文推断语言
   * @param {Object} block - 代码块信息
   * @param {Object} languageHints - 语言提示
   * @returns {string|null} 推断的语言
   */
  inferLanguageFromContext(block, languageHints) {
    // 检查文档中其他代码块的语言使用频率
    const languageFrequency = languageHints.frequency || {};
    const sortedLanguages = Object.entries(languageFrequency)
      .sort(([,a], [,b]) => b - a);
    
    if (sortedLanguages.length > 0) {
      return sortedLanguages[0][0];
    }
    
    return null;
  }

  /**
   * 提取语言提示信息
   * @param {string} content - 文档内容
   * @returns {Object} 语言提示信息
   */
  extractLanguageHints(content) {
    const codeBlocks = this.extractCodeBlocks(content);
    const languageFrequency = {};
    
    codeBlocks.forEach(block => {
      if (block.language && block.language.trim()) {
        const lang = block.language.toLowerCase();
        languageFrequency[lang] = (languageFrequency[lang] || 0) + 1;
      }
    });
    
    return {
      frequency: languageFrequency,
      totalBlocks: codeBlocks.length,
      blocksWithLanguage: codeBlocks.filter(b => b.language && b.language.trim()).length
    };
  }

  /**
   * 增强版空代码块修复
   * @param {string} content - 内容
   * @param {Array} issues - 空代码块问题
   * @param {Object} context - 修复上下文
   * @returns {Object} 修复结果
   */
  fixEmptyCodeBlocksEnhanced(content, issues, context) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 从后往前处理空代码块
    issues.sort((a, b) => b.line - a.line).forEach(issue => {
      const codeBlocks = this.extractCodeBlocks(lines.join('\n'));
      const block = codeBlocks.find(b => b.startLine === issue.line);
      
      if (block && (!block.content || block.content.trim() === '')) {
        // 根据语言类型生成更合适的占位符
        const placeholder = this.generateLanguageSpecificPlaceholder(
          block.language, 
          context
        );
        
        lines.splice(issue.line, 0, placeholder);
        changes.push({
          type: 'addition',
          line: issue.line + 1,
          newContent: placeholder,
          reason: `为空代码块添加${block.language || '通用'}占位符`
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
   * 生成特定语言的占位符
   * @param {string} language - 编程语言
   * @param {Object} context - 修复上下文
   * @returns {string} 占位符内容
   */
  generateLanguageSpecificPlaceholder(language, context) {
    const placeholders = {
      javascript: '// 代码示例',
      typescript: '// 代码示例',
      python: '# 代码示例',
      java: '// 代码示例',
      cpp: '// 代码示例',
      c: '// 代码示例',
      html: '<!-- 代码示例 -->',
      css: '/* 代码示例 */',
      sql: '-- 代码示例',
      bash: '# 代码示例',
      json: '// 代码示例',
      yaml: '# 代码示例',
      markdown: '<!-- 代码示例 -->'
    };
    
    return placeholders[language] || '// 代码示例';
  }

  /**
   * 修复嵌套代码块问题
   * @param {string} content - 内容
   * @param {Array} issues - 嵌套代码块问题
   * @returns {Object} 修复结果
   */
  fixNestedCodeBlocks(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    issues.forEach(issue => {
      const lineIndex = issue.line - 1;
      const line = lines[lineIndex];
      
      // 转义代码块内的反引号
      const fixedLine = line.replace(/```/g, '\\`\\`\\`');
      if (fixedLine !== line) {
        lines[lineIndex] = fixedLine;
        changes.push({
          type: 'modification',
          line: issue.line,
          oldContent: line,
          newContent: fixedLine,
          reason: '转义代码块内的反引号'
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
   * 执行最终优化
   * @param {string} content - 内容
   * @returns {Object} 优化结果
   */
  performFinalOptimization(content) {
    const lines = content.split('\n');
    const changes = [];
    
    // 移除代码块内的多余空行
    const codeBlocks = this.extractCodeBlocks(content);
    codeBlocks.forEach(block => {
      if (block.content) {
        const contentLines = block.content.split('\n');
        
        // 移除开头和结尾的空行
        while (contentLines.length > 0 && contentLines[0].trim() === '') {
          contentLines.shift();
        }
        while (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '') {
          contentLines.pop();
        }
        
        // 如果内容发生变化，更新文档
        const newContent = contentLines.join('\n');
        if (newContent !== block.content) {
          const startIndex = block.startLine;
          const endIndex = block.endLine - 2; // 排除闭合标记
          
          // 替换代码块内容
          lines.splice(startIndex, endIndex - startIndex, ...contentLines);
          
          changes.push({
            type: 'modification',
            line: block.startLine,
            oldContent: block.content,
            newContent: newContent,
            reason: '优化代码块内容格式'
          });
        }
      }
    });
    
    return {
      content: lines.join('\n'),
      changes
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
   * 修复未闭合的代码块 - 增强版
   * @param {string} content - 内容
   * @param {Array} issues - 未闭合代码块问题
   * @returns {Object} 修复结果
   */
  fixUnclosedCodeBlocks(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    
    // 分析代码块结构，智能确定闭合位置
    const codeBlockAnalysis = this.analyzeCodeBlockStructure(content);
    
    // 从后往前处理，避免行号变化影响
    issues.sort((a, b) => b.line - a.line).forEach(issue => {
      const optimalClosePosition = this.findOptimalClosePosition(
        lines, 
        issue.line - 1, 
        codeBlockAnalysis
      );
      
      if (optimalClosePosition.position === 'end') {
        // 在文档末尾添加闭合标记
        lines.push('```');
        changes.push({
          type: 'addition',
          line: lines.length,
          newContent: '```',
          reason: `为第 ${issue.line} 行的代码块添加闭合标记（文档末尾）`
        });
      } else if (optimalClosePosition.position === 'before_next_heading') {
        // 在下一个标题前添加闭合标记
        const insertIndex = optimalClosePosition.line;
        lines.splice(insertIndex, 0, '', '```', '');
        changes.push({
          type: 'addition',
          line: insertIndex + 2,
          newContent: '```',
          reason: `为第 ${issue.line} 行的代码块添加闭合标记（下一标题前）`
        });
      } else if (optimalClosePosition.position === 'before_next_codeblock') {
        // 在下一个代码块前添加闭合标记
        const insertIndex = optimalClosePosition.line;
        lines.splice(insertIndex, 0, '```', '');
        changes.push({
          type: 'addition',
          line: insertIndex + 1,
          newContent: '```',
          reason: `为第 ${issue.line} 行的代码块添加闭合标记（下一代码块前）`
        });
      }
    });
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount: issues.length
    };
  }

  /**
   * 分析代码块结构
   * @param {string} content - 文档内容
   * @returns {Object} 代码块结构分析结果
   */
  analyzeCodeBlockStructure(content) {
    const lines = content.split('\n');
    const structure = {
      headings: [],
      codeBlocks: [],
      paragraphs: [],
      lists: []
    };
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('#')) {
        structure.headings.push({
          line: index + 1,
          level: (trimmed.match(/^#+/) || [''])[0].length,
          content: trimmed
        });
      } else if (trimmed.startsWith('```')) {
        structure.codeBlocks.push({
          line: index + 1,
          content: trimmed
        });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
        structure.lists.push({
          line: index + 1,
          content: trimmed
        });
      } else if (trimmed.length > 0 && !trimmed.startsWith('```')) {
        structure.paragraphs.push({
          line: index + 1,
          content: trimmed
        });
      }
    });
    
    return structure;
  }

  /**
   * 找到最佳的代码块闭合位置
   * @param {Array} lines - 文档行数组
   * @param {number} startLine - 代码块开始行（0-based）
   * @param {Object} structure - 文档结构分析
   * @returns {Object} 最佳闭合位置信息
   */
  findOptimalClosePosition(lines, startLine, structure) {
    // 查找下一个标题
    const nextHeading = structure.headings.find(h => h.line > startLine + 1);
    
    // 查找下一个代码块
    const nextCodeBlock = structure.codeBlocks.find(cb => cb.line > startLine + 1);
    
    // 查找代码内容的实际结束位置
    const codeEndLine = this.findCodeContentEnd(lines, startLine);
    
    // 决策逻辑
    if (nextHeading && (!nextCodeBlock || nextHeading.line < nextCodeBlock.line)) {
      // 如果下一个标题比下一个代码块更近，在标题前闭合
      return {
        position: 'before_next_heading',
        line: nextHeading.line - 1,
        reason: '在下一个标题前闭合代码块'
      };
    } else if (nextCodeBlock) {
      // 在下一个代码块前闭合
      return {
        position: 'before_next_codeblock',
        line: nextCodeBlock.line - 1,
        reason: '在下一个代码块前闭合'
      };
    } else if (codeEndLine < lines.length - 1) {
      // 在代码内容结束后闭合
      return {
        position: 'after_content',
        line: codeEndLine + 1,
        reason: '在代码内容结束后闭合'
      };
    } else {
      // 在文档末尾闭合
      return {
        position: 'end',
        line: lines.length,
        reason: '在文档末尾闭合'
      };
    }
  }

  /**
   * 找到代码内容的实际结束位置
   * @param {Array} lines - 文档行数组
   * @param {number} startLine - 代码块开始行（0-based）
   * @returns {number} 代码内容结束行号（0-based）
   */
  findCodeContentEnd(lines, startLine) {
    let lastContentLine = startLine;
    
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // 如果遇到新的标题或代码块，停止
      if (line.trim().startsWith('#') || line.trim().startsWith('```')) {
        break;
      }
      
      // 如果是有内容的行，更新最后内容行
      if (line.trim().length > 0) {
        lastContentLine = i;
      }
      
      // 如果连续多行为空，可能是内容结束
      if (line.trim().length === 0) {
        let emptyCount = 1;
        for (let j = i + 1; j < lines.length && j < i + 3; j++) {
          if (lines[j].trim().length === 0) {
            emptyCount++;
          } else {
            break;
          }
        }
        if (emptyCount >= 2) {
          break;
        }
      }
    }
    
    return lastContentLine;
  }

  /**
   * 修复缺失的语言标识符
   * @param {string} content - 内容
   * @param {Array} issues - 缺失语言标识符问题
   * @returns {Object} 修复结果
   */
  fixMissingLanguageIdentifiers(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    const codeBlocks = this.extractCodeBlocks(content);
    let fixedCount = 0;
    
    issues.forEach(issue => {
      const block = codeBlocks.find(b => b.startLine === issue.line);
      if (block) {
        const inferredLanguage = this.inferLanguageFromContent(block.content);
        if (inferredLanguage) {
          const lineIndex = issue.line - 1;
          const oldLine = lines[lineIndex];
          const newLine = oldLine.replace('```', `\`\`\`${inferredLanguage}`);
          lines[lineIndex] = newLine;
          
          changes.push({
            type: 'modification',
            line: issue.line,
            oldContent: oldLine,
            newContent: newLine,
            reason: `添加推断的语言标识符: ${inferredLanguage}`
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
   * 修复间距问题 - 增强版
   * @param {string} content - 内容
   * @param {Array} issues - 间距问题
   * @returns {Object} 修复结果
   */
  fixSpacingIssues(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 全面分析文档间距模式
    const spacingAnalysis = this.analyzeDocumentSpacing(lines);
    
    // 按行号排序，从后往前处理
    issues.sort((a, b) => b.line - a.line).forEach(issue => {
      const fixResult = this.applySpacingFix(lines, issue, spacingAnalysis);
      if (fixResult.applied) {
        changes.push(...fixResult.changes);
        fixedCount++;
      }
    });
    
    // 应用全局间距标准化
    const globalSpacingResult = this.applyGlobalSpacingStandardization(lines);
    changes.push(...globalSpacingResult.changes);
    
    return {
      success: true,
      content: lines.join('\n'),
      changes,
      fixedCount
    };
  }

  /**
   * 分析文档间距模式
   * @param {Array} lines - 文档行数组
   * @returns {Object} 间距分析结果
   */
  analyzeDocumentSpacing(lines) {
    const analysis = {
      codeBlockSpacing: {
        before: [],
        after: []
      },
      headingSpacing: {
        before: [],
        after: []
      },
      paragraphSpacing: [],
      listSpacing: [],
      averageSpacing: 1
    };
    
    let codeBlockPositions = [];
    let headingPositions = [];
    
    // 识别所有代码块和标题位置
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        codeBlockPositions.push(index);
      } else if (trimmed.startsWith('#')) {
        headingPositions.push(index);
      }
    });
    
    // 分析代码块间距模式
    codeBlockPositions.forEach(pos => {
      // 分析前面的间距
      let beforeSpacing = 0;
      for (let i = pos - 1; i >= 0 && lines[i].trim() === ''; i--) {
        beforeSpacing++;
      }
      analysis.codeBlockSpacing.before.push(beforeSpacing);
      
      // 分析后面的间距
      let afterSpacing = 0;
      for (let i = pos + 1; i < lines.length && lines[i].trim() === ''; i++) {
        afterSpacing++;
      }
      analysis.codeBlockSpacing.after.push(afterSpacing);
    });
    
    // 计算推荐的间距值
    analysis.recommendedSpacing = this.calculateRecommendedSpacing(analysis);
    
    return analysis;
  }

  /**
   * 计算推荐的间距值
   * @param {Object} analysis - 间距分析结果
   * @returns {Object} 推荐间距配置
   */
  calculateRecommendedSpacing(analysis) {
    const beforeSpacings = analysis.codeBlockSpacing.before.filter(s => s > 0);
    const afterSpacings = analysis.codeBlockSpacing.after.filter(s => s > 0);
    
    const avgBefore = beforeSpacings.length > 0 
      ? Math.round(beforeSpacings.reduce((a, b) => a + b, 0) / beforeSpacings.length)
      : 1;
    
    const avgAfter = afterSpacings.length > 0
      ? Math.round(afterSpacings.reduce((a, b) => a + b, 0) / afterSpacings.length)
      : 1;
    
    return {
      beforeCodeBlock: Math.max(1, Math.min(2, avgBefore)),
      afterCodeBlock: Math.max(1, Math.min(2, avgAfter)),
      beforeHeading: 2,
      afterHeading: 1
    };
  }

  /**
   * 应用间距修复
   * @param {Array} lines - 文档行数组
   * @param {Object} issue - 间距问题
   * @param {Object} analysis - 间距分析结果
   * @returns {Object} 修复结果
   */
  applySpacingFix(lines, issue, analysis) {
    const changes = [];
    let applied = false;
    
    if (issue.type === 'code_block_spacing_before') {
      const insertIndex = issue.line - 1;
      const requiredSpacing = analysis.recommendedSpacing.beforeCodeBlock;
      
      // 检查当前间距
      let currentSpacing = 0;
      for (let i = insertIndex - 1; i >= 0 && lines[i].trim() === ''; i--) {
        currentSpacing++;
      }
      
      // 添加缺失的空行
      const spacingToAdd = Math.max(0, requiredSpacing - currentSpacing);
      for (let i = 0; i < spacingToAdd; i++) {
        lines.splice(insertIndex, 0, '');
        changes.push({
          type: 'addition',
          line: insertIndex + 1,
          newContent: '',
          reason: `在代码块前添加空行 (${i + 1}/${spacingToAdd})`
        });
      }
      applied = spacingToAdd > 0;
      
    } else if (issue.type === 'code_block_spacing_after') {
      const insertIndex = issue.line;
      const requiredSpacing = analysis.recommendedSpacing.afterCodeBlock;
      
      // 检查当前间距
      let currentSpacing = 0;
      for (let i = insertIndex; i < lines.length && lines[i].trim() === ''; i++) {
        currentSpacing++;
      }
      
      // 添加缺失的空行
      const spacingToAdd = Math.max(0, requiredSpacing - currentSpacing);
      for (let i = 0; i < spacingToAdd; i++) {
        lines.splice(insertIndex + i, 0, '');
        changes.push({
          type: 'addition',
          line: insertIndex + i + 1,
          newContent: '',
          reason: `在代码块后添加空行 (${i + 1}/${spacingToAdd})`
        });
      }
      applied = spacingToAdd > 0;
    }
    
    return { applied, changes };
  }

  /**
   * 应用全局间距标准化
   * @param {Array} lines - 文档行数组
   * @returns {Object} 标准化结果
   */
  applyGlobalSpacingStandardization(lines) {
    const changes = [];
    
    // 移除多余的连续空行（超过2行的空行序列）
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === '') {
        let emptyCount = 1;
        let j = i - 1;
        
        // 计算连续空行数量
        while (j >= 0 && lines[j].trim() === '') {
          emptyCount++;
          j--;
        }
        
        // 如果连续空行超过2行，移除多余的
        if (emptyCount > 2) {
          const linesToRemove = emptyCount - 2;
          for (let k = 0; k < linesToRemove; k++) {
            lines.splice(i, 1);
            changes.push({
              type: 'deletion',
              line: i + 1,
              oldContent: '',
              reason: `移除多余的空行 (${k + 1}/${linesToRemove})`
            });
          }
        }
        
        // 跳过已处理的空行
        i = j + 1;
      }
    }
    
    // 确保文档末尾只有一个空行
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
      changes.push({
        type: 'deletion',
        line: lines.length + 1,
        oldContent: '',
        reason: '移除文档末尾多余的空行'
      });
    }
    
    // 添加一个空行到文档末尾
    if (lines.length > 0) {
      lines.push('');
      changes.push({
        type: 'addition',
        line: lines.length,
        newContent: '',
        reason: '在文档末尾添加空行'
      });
    }
    
    return { changes };
  }

  /**
   * 修复空代码块
   * @param {string} content - 内容
   * @param {Array} issues - 空代码块问题
   * @returns {Object} 修复结果
   */
  fixEmptyCodeBlocks(content, issues) {
    const lines = content.split('\n');
    const changes = [];
    let fixedCount = 0;
    
    // 从后往前处理空代码块
    issues.sort((a, b) => b.line - a.line).forEach(issue => {
      const codeBlocks = this.extractCodeBlocks(lines.join('\n'));
      const block = codeBlocks.find(b => b.startLine === issue.line);
      
      if (block && (!block.content || block.content.trim() === '')) {
        // 使用增强的占位符生成
        const commentLine = this.generateLanguageSpecificPlaceholder(block.language, {});
        
        lines.splice(issue.line, 0, commentLine);
        changes.push({
          type: 'addition',
          line: issue.line + 1,
          newContent: commentLine,
          reason: '为空代码块添加占位符注释'
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
   * 验证修复结果 - 增强版
   * @param {string} originalContent - 原始内容
   * @param {string} fixedContent - 修复后的内容
   * @returns {Object} 验证结果
   */
  validate(originalContent, fixedContent) {
    // 处理空值和类型检查
    if (!originalContent || !fixedContent) {
      return {
        isValid: false,
        warnings: [],
        errors: ['原始内容或修复后内容为空'],
        improvementStats: {
          originalIssues: 0,
          remainingIssues: 0,
          fixedIssues: 0
        }
      };
    }

    if (typeof originalContent !== 'string' || typeof fixedContent !== 'string') {
      return {
        isValid: false,
        warnings: [],
        errors: ['内容必须是字符串类型'],
        improvementStats: {
          originalIssues: 0,
          remainingIssues: 0,
          fixedIssues: 0
        }
      };
    }

    const originalIssues = this.detectIssues(originalContent, 'temp');
    const fixedIssues = this.detectIssues(fixedContent, 'temp');
    
    const result = {
      isValid: true,
      warnings: [],
      errors: [],
      improvementStats: {
        originalIssues: originalIssues.length,
        remainingIssues: fixedIssues.length,
        fixedIssues: Math.max(0, originalIssues.length - fixedIssues.length)
      }
    };

    // 详细的问题类型分析
    const issueTypeAnalysis = this.analyzeIssueTypes(originalIssues, fixedIssues);
    result.improvementStats.byType = issueTypeAnalysis;

    // 检查是否引入了新的严重问题
    const newCriticalIssues = fixedIssues.filter(issue => 
      issue.severity === 'error' &&
      !originalIssues.some(orig => 
        orig.type === issue.type && Math.abs(orig.line - issue.line) <= 5
      )
    );

    // 也检查是否有更多的严重问题
    const originalCriticalCount = originalIssues.filter(issue => issue.severity === 'error').length;
    const fixedCriticalCount = fixedIssues.filter(issue => issue.severity === 'error').length;
    
    if (fixedCriticalCount > originalCriticalCount) {
      const additionalCritical = fixedCriticalCount - originalCriticalCount;
      result.isValid = false;
      result.errors.push(`修复后增加了 ${additionalCritical} 个严重问题`);
    }

    if (newCriticalIssues.length > 0) {
      result.isValid = false;
      result.errors.push(`修复过程中引入了 ${newCriticalIssues.length} 个新的严重问题`);
      newCriticalIssues.forEach(issue => {
        result.errors.push(`第 ${issue.line} 行: ${issue.description}`);
      });
    }

    // 检查内容完整性
    const integrityCheck = this.validateContentIntegrity(originalContent, fixedContent);
    if (!integrityCheck.isValid) {
      result.warnings.push(...integrityCheck.warnings);
      if (integrityCheck.errors.length > 0) {
        result.isValid = false;
        result.errors.push(...integrityCheck.errors);
      }
    }

    // 检查代码块结构完整性
    const structureCheck = this.validateCodeBlockStructure(fixedContent);
    if (!structureCheck.isValid) {
      result.warnings.push(...structureCheck.warnings);
      if (structureCheck.errors.length > 0) {
        result.isValid = false;
        result.errors.push(...structureCheck.errors);
      }
    }

    // 检查修复质量
    const qualityCheck = this.validateFixQuality(originalIssues, fixedIssues);
    result.improvementStats.qualityScore = qualityCheck.score;
    result.warnings.push(...qualityCheck.warnings);

    // 检查修复效果
    if (result.improvementStats.fixedIssues === 0 && originalIssues.length > 0) {
      result.warnings.push('未修复任何问题');
    } else if (result.improvementStats.fixedIssues > 0) {
      const improvementRate = (result.improvementStats.fixedIssues / originalIssues.length * 100).toFixed(1);
      result.improvementStats.improvementRate = `${improvementRate}%`;
    }

    return result;
  }

  /**
   * 分析问题类型的修复情况
   * @param {Array} originalIssues - 原始问题
   * @param {Array} fixedIssues - 修复后问题
   * @returns {Object} 问题类型分析
   */
  analyzeIssueTypes(originalIssues, fixedIssues) {
    const analysis = {};
    const issueTypes = [...new Set([
      ...originalIssues.map(i => i.type),
      ...fixedIssues.map(i => i.type)
    ])];

    issueTypes.forEach(type => {
      const originalCount = originalIssues.filter(i => i.type === type).length;
      const remainingCount = fixedIssues.filter(i => i.type === type).length;
      const fixedCount = Math.max(0, originalCount - remainingCount);

      analysis[type] = {
        original: originalCount,
        remaining: remainingCount,
        fixed: fixedCount,
        fixRate: originalCount > 0 ? (fixedCount / originalCount * 100).toFixed(1) + '%' : '0%'
      };
    });

    return analysis;
  }

  /**
   * 验证内容完整性
   * @param {string} originalContent - 原始内容
   * @param {string} fixedContent - 修复后内容
   * @returns {Object} 完整性验证结果
   */
  validateContentIntegrity(originalContent, fixedContent) {
    const result = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // 检查内容长度变化
    const lengthChange = fixedContent.length - originalContent.length;
    const lengthChangePercent = (Math.abs(lengthChange) / originalContent.length * 100).toFixed(1);

    if (lengthChangePercent > 50) {
      result.warnings.push(`内容长度变化超过50% (${lengthChangePercent}%)`);
    }

    // 检查重要内容是否保留
    const importantPatterns = [
      /^#+\s+.+$/gm,  // 标题
      /\*\*[^*]+\*\*/g,  // 粗体
      /\*[^*]+\*/g,  // 斜体
      /\[[^\]]+\]\([^)]+\)/g,  // 链接
      /^>\s+.+$/gm,  // 引用
      /^[-*+]\s+.+$/gm,  // 列表项
      /^\d+\.\s+.+$/gm  // 编号列表
    ];

    importantPatterns.forEach((pattern, index) => {
      const originalMatches = (originalContent.match(pattern) || []).length;
      const fixedMatches = (fixedContent.match(pattern) || []).length;
      
      if (fixedMatches < originalMatches) {
        const patternNames = ['标题', '粗体', '斜体', '链接', '引用', '列表项', '编号列表'];
        result.warnings.push(`${patternNames[index]}数量减少: ${originalMatches} -> ${fixedMatches}`);
      }
    });

    // 检查是否有重复内容
    const lines = fixedContent.split('\n');
    const duplicateLines = lines.filter((line, index) => 
      line.trim().length > 10 && 
      lines.indexOf(line) !== index &&
      lines.indexOf(line) !== -1
    );

    if (duplicateLines.length > 0) {
      result.warnings.push(`发现 ${duplicateLines.length} 行可能重复的内容`);
    }

    return result;
  }

  /**
   * 验证代码块结构
   * @param {string} content - 内容
   * @returns {Object} 结构验证结果
   */
  validateCodeBlockStructure(content) {
    const result = {
      isValid: true,
      warnings: [],
      errors: []
    };

    // 检查代码块是否正确闭合
    const codeBlockMarkers = content.match(/```/g) || [];
    if (codeBlockMarkers.length % 2 !== 0) {
      result.isValid = false;
      result.errors.push('代码块标记数量不匹配，存在未闭合的代码块');
    }

    // 检查代码块内容
    const codeBlocks = this.extractCodeBlocks(content);
    codeBlocks.forEach((block, index) => {
      // 检查空代码块
      if (!block.content || block.content.trim() === '') {
        result.warnings.push(`第 ${index + 1} 个代码块为空`);
      }

      // 检查语言标识符
      if (!block.language || block.language.trim() === '') {
        result.warnings.push(`第 ${index + 1} 个代码块缺少语言标识符`);
      }

      // 检查代码块长度
      if (block.content && block.content.split('\n').length > 100) {
        result.warnings.push(`第 ${index + 1} 个代码块过长 (${block.content.split('\n').length} 行)`);
      }
    });

    return result;
  }

  /**
   * 验证修复质量
   * @param {Array} originalIssues - 原始问题
   * @param {Array} fixedIssues - 修复后问题
   * @returns {Object} 质量验证结果
   */
  validateFixQuality(originalIssues, fixedIssues) {
    const result = {
      score: 0,
      warnings: []
    };

    if (originalIssues.length === 0) {
      result.score = 100;
      return result;
    }

    // 计算基础质量分数
    const fixedCount = Math.max(0, originalIssues.length - fixedIssues.length);
    const baseScore = (fixedCount / originalIssues.length) * 100;

    // 根据问题严重程度调整分数
    const severityWeights = { error: 3, warning: 2, info: 1 };
    
    let originalSeverityScore = 0;
    let fixedSeverityScore = 0;

    originalIssues.forEach(issue => {
      originalSeverityScore += severityWeights[issue.severity] || 1;
    });

    fixedIssues.forEach(issue => {
      fixedSeverityScore += severityWeights[issue.severity] || 1;
    });

    const severityImprovement = originalSeverityScore > 0 ? 
      ((originalSeverityScore - fixedSeverityScore) / originalSeverityScore) * 100 : 0;

    result.score = Math.round((baseScore + severityImprovement) / 2);

    // 添加质量警告
    if (result.score < 50) {
      result.warnings.push('修复质量较低，建议手动检查');
    } else if (result.score < 80) {
      result.warnings.push('修复质量中等，可能需要进一步优化');
    }

    // 检查是否有未修复的严重问题
    const remainingErrors = fixedIssues.filter(issue => issue.severity === 'error');
    if (remainingErrors.length > 0) {
      result.warnings.push(`仍有 ${remainingErrors.length} 个严重问题未修复`);
    }

    return result;
  }
}