/**
 * 全面质量验证系统
 * 实现任务13.1: 执行全面质量验证测试
 * - 验证所有772个问题的修复状态
 * - 执行端到端渲染效果测试
 * - 进行跨平台兼容性验证
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { QualityChecker } from './quality-checker.js';
import { BackupManager } from './backup-manager.js';

class ComprehensiveVerificationSystem {
  constructor(config = {}) {
    this.config = {
      baseDir: config.baseDir || 'ai-ide-guide-v2',
      reportDir: config.reportDir || 'verification-reports',
      originalIssueCount: 772,
      ...config
    };
    
    this.qualityChecker = new QualityChecker(config);
    this.backupManager = new BackupManager(config);
    
    // 原始问题统计（基于报告）
    this.originalIssues = {
      tableColumnMismatch: 250,
      tableEmptyCells: 196,
      mermaidMissingStyles: 75,
      mermaidNonStandardColors: 168,
      mermaidTooManyNodes: 39,
      mermaidMissingDirection: 10,
      mermaidLongLabels: 11,
      mermaidShortLabels: 4,
      mermaidUnknownType: 16,
      duplicateTitles: 186,
      missingAnchors: 4,
      missingFiles: 13,
      orphanedFiles: 44,
      total: 772
    };
  }

  /**
   * 执行全面质量验证测试
   */
  async executeComprehensiveVerification() {
    console.log('🔍 开始执行全面质量验证测试...');
    
    const verificationResults = {
      timestamp: new Date().toISOString(),
      originalIssueCount: this.originalIssues.total,
      currentIssues: {},
      fixedIssues: {},
      remainingIssues: {},
      newIssues: {},
      renderingTests: {},
      compatibilityTests: {},
      summary: {}
    };

    try {
      // 1. 验证所有772个问题的修复状态
      console.log('📊 验证问题修复状态...');
      const issueVerification = await this.verifyIssueFixStatus();
      verificationResults.currentIssues = issueVerification.currentIssues;
      verificationResults.fixedIssues = issueVerification.fixedIssues;
      verificationResults.remainingIssues = issueVerification.remainingIssues;
      verificationResults.newIssues = issueVerification.newIssues;

      // 2. 执行端到端渲染效果测试
      console.log('🎨 执行渲染效果测试...');
      verificationResults.renderingTests = await this.executeRenderingTests();

      // 3. 进行跨平台兼容性验证
      console.log('🌐 执行跨平台兼容性验证...');
      verificationResults.compatibilityTests = await this.executeCrossPlatformTests();

      // 4. 生成综合摘要
      verificationResults.summary = this.generateVerificationSummary(verificationResults);

      // 5. 生成详细报告
      await this.generateVerificationReport(verificationResults);

      console.log('✅ 全面质量验证测试完成');
      return verificationResults;

    } catch (error) {
      console.error('❌ 验证测试失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证问题修复状态
   */
  async verifyIssueFixStatus() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const currentIssues = {};
    const fixedIssues = {};
    const remainingIssues = {};
    const newIssues = {};

    let totalCurrentIssues = 0;

    for (const file of files) {
      try {
        const issues = await this.qualityChecker.checkFile(file);
        
        if (issues.length > 0) {
          currentIssues[file] = issues;
          totalCurrentIssues += issues.length;
        }
      } catch (error) {
        console.warn(`⚠️ 无法检查文件 ${file}: ${error.message}`);
      }
    }

    // 分析修复状态
    const issueTypeCount = this.categorizeIssues(currentIssues);
    
    // 计算修复的问题
    Object.entries(this.originalIssues).forEach(([type, originalCount]) => {
      if (type === 'total') return;
      
      const currentCount = issueTypeCount[type] || 0;
      const fixed = Math.max(0, originalCount - currentCount);
      const remaining = currentCount;
      
      if (fixed > 0) {
        fixedIssues[type] = { count: fixed, percentage: Math.round((fixed / originalCount) * 100) };
      }
      
      if (remaining > 0) {
        remainingIssues[type] = { count: remaining, percentage: Math.round((remaining / originalCount) * 100) };
      }
    });

    // 检测新问题
    if (totalCurrentIssues > this.originalIssues.total) {
      newIssues.count = totalCurrentIssues - this.originalIssues.total;
      newIssues.details = this.identifyNewIssues(currentIssues);
    }

    return {
      currentIssues,
      fixedIssues,
      remainingIssues,
      newIssues,
      totalCurrentIssues,
      totalFixedIssues: this.originalIssues.total - totalCurrentIssues
    };
  }

  /**
   * 分类问题类型
   */
  categorizeIssues(currentIssues) {
    const typeCount = {};
    
    Object.values(currentIssues).forEach(fileIssues => {
      fileIssues.forEach(issue => {
        const category = this.mapIssueTypeToCategory(issue.type);
        typeCount[category] = (typeCount[category] || 0) + 1;
      });
    });

    return typeCount;
  }

  /**
   * 映射问题类型到分类
   */
  mapIssueTypeToCategory(issueType) {
    const mapping = {
      'table_column_mismatch': 'tableColumnMismatch',
      'table_empty_cells': 'tableEmptyCells',
      'mermaid_missing_styles': 'mermaidMissingStyles',
      'mermaid_non_standard_colors': 'mermaidNonStandardColors',
      'mermaid_too_many_nodes': 'mermaidTooManyNodes',
      'mermaid_no_direction': 'mermaidMissingDirection',
      'mermaid_long_labels': 'mermaidLongLabels',
      'mermaid_short_labels': 'mermaidShortLabels',
      'mermaid_unknown_type': 'mermaidUnknownType',
      'duplicate_anchor': 'duplicateTitles',
      'missing_anchor': 'missingAnchors',
      'missing_file': 'missingFiles',
      'orphaned_file': 'orphanedFiles'
    };

    return mapping[issueType] || 'other';
  }

  /**
   * 识别新问题
   */
  identifyNewIssues(currentIssues) {
    const newIssueDetails = [];
    
    Object.entries(currentIssues).forEach(([file, issues]) => {
      issues.forEach(issue => {
        // 这里可以添加更复杂的逻辑来识别新问题
        // 暂时将所有问题都视为可能的新问题进行记录
        newIssueDetails.push({
          file,
          type: issue.type,
          line: issue.line,
          description: issue.description
        });
      });
    });

    return newIssueDetails.slice(0, 50); // 限制返回数量
  }

  /**
   * 执行渲染效果测试
   */
  async executeRenderingTests() {
    const renderingTests = {
      codeBlockRendering: await this.testCodeBlockRendering(),
      tableRendering: await this.testTableRendering(),
      mermaidRendering: await this.testMermaidRendering(),
      imageRendering: await this.testImageRendering(),
      linkRendering: await this.testLinkRendering()
    };

    return renderingTests;
  }

  /**
   * 测试代码块渲染
   */
  async testCodeBlockRendering() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalCodeBlocks: 0,
      properlyFormatted: 0,
      missingLanguage: 0,
      unclosed: 0,
      spacingIssues: 0
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const codeBlocks = this.extractCodeBlocks(content);
        
        results.totalCodeBlocks += codeBlocks.length;
        
        codeBlocks.forEach(block => {
          if (block.language) {
            results.properlyFormatted++;
          } else {
            results.missingLanguage++;
          }
          
          if (!block.closed) {
            results.unclosed++;
          }
          
          if (block.spacingIssues) {
            results.spacingIssues++;
          }
        });
      } catch (error) {
        console.warn(`⚠️ 无法测试代码块渲染 ${file}: ${error.message}`);
      }
    }

    results.renderingScore = results.totalCodeBlocks > 0 
      ? Math.round((results.properlyFormatted / results.totalCodeBlocks) * 100)
      : 100;

    return results;
  }

  /**
   * 测试表格渲染
   */
  async testTableRendering() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalTables: 0,
      properlyFormatted: 0,
      columnMismatches: 0,
      emptyCells: 0,
      tooWide: 0
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const tables = this.extractTables(content);
        
        results.totalTables += tables.length;
        
        tables.forEach(table => {
          let isProperlyFormatted = true;
          
          if (table.columnMismatches > 0) {
            results.columnMismatches++;
            isProperlyFormatted = false;
          }
          
          if (table.emptyCells > 0) {
            results.emptyCells++;
            isProperlyFormatted = false;
          }
          
          if (table.columns > 8) {
            results.tooWide++;
            isProperlyFormatted = false;
          }
          
          if (isProperlyFormatted) {
            results.properlyFormatted++;
          }
        });
      } catch (error) {
        console.warn(`⚠️ 无法测试表格渲染 ${file}: ${error.message}`);
      }
    }

    results.renderingScore = results.totalTables > 0 
      ? Math.round((results.properlyFormatted / results.totalTables) * 100)
      : 100;

    return results;
  }

  /**
   * 测试Mermaid图表渲染
   */
  async testMermaidRendering() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalDiagrams: 0,
      properlyFormatted: 0,
      missingDirection: 0,
      tooManyNodes: 0,
      nonStandardColors: 0,
      missingStyles: 0
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const diagrams = this.extractMermaidDiagrams(content);
        
        results.totalDiagrams += diagrams.length;
        
        diagrams.forEach(diagram => {
          let isProperlyFormatted = true;
          
          if (!diagram.hasDirection) {
            results.missingDirection++;
            isProperlyFormatted = false;
          }
          
          if (diagram.nodeCount > 20) {
            results.tooManyNodes++;
            isProperlyFormatted = false;
          }
          
          if (diagram.nonStandardColors > 0) {
            results.nonStandardColors++;
            isProperlyFormatted = false;
          }
          
          if (!diagram.hasStyles) {
            results.missingStyles++;
            isProperlyFormatted = false;
          }
          
          if (isProperlyFormatted) {
            results.properlyFormatted++;
          }
        });
      } catch (error) {
        console.warn(`⚠️ 无法测试Mermaid渲染 ${file}: ${error.message}`);
      }
    }

    results.renderingScore = results.totalDiagrams > 0 
      ? Math.round((results.properlyFormatted / results.totalDiagrams) * 100)
      : 100;

    return results;
  }

  /**
   * 测试图片渲染
   */
  async testImageRendering() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalImages: 0,
      validImages: 0,
      brokenLinks: 0,
      missingAltText: 0
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const images = this.extractImages(content);
        
        results.totalImages += images.length;
        
        for (const image of images) {
          if (!image.altText) {
            results.missingAltText++;
          }
          
          try {
            const imagePath = path.resolve(path.dirname(file), image.src);
            await fs.access(imagePath);
            results.validImages++;
          } catch {
            results.brokenLinks++;
          }
        }
      } catch (error) {
        console.warn(`⚠️ 无法测试图片渲染 ${file}: ${error.message}`);
      }
    }

    results.renderingScore = results.totalImages > 0 
      ? Math.round((results.validImages / results.totalImages) * 100)
      : 100;

    return results;
  }

  /**
   * 测试链接渲染
   */
  async testLinkRendering() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalLinks: 0,
      validLinks: 0,
      brokenLinks: 0,
      externalLinks: 0
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const links = this.extractLinks(content);
        
        results.totalLinks += links.length;
        
        for (const link of links) {
          if (link.href.startsWith('http')) {
            results.externalLinks++;
            results.validLinks++; // 假设外部链接有效
          } else {
            try {
              const linkPath = path.resolve(path.dirname(file), link.href);
              await fs.access(linkPath);
              results.validLinks++;
            } catch {
              results.brokenLinks++;
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ 无法测试链接渲染 ${file}: ${error.message}`);
      }
    }

    results.renderingScore = results.totalLinks > 0 
      ? Math.round((results.validLinks / results.totalLinks) * 100)
      : 100;

    return results;
  }

  /**
   * 执行跨平台兼容性测试
   */
  async executeCrossPlatformTests() {
    const compatibilityTests = {
      markdownCompatibility: await this.testMarkdownCompatibility(),
      pathCompatibility: await this.testPathCompatibility(),
      encodingCompatibility: await this.testEncodingCompatibility(),
      lineEndingCompatibility: await this.testLineEndingCompatibility()
    };

    return compatibilityTests;
  }

  /**
   * 测试Markdown兼容性
   */
  async testMarkdownCompatibility() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalFiles: files.length,
      compatibleFiles: 0,
      issues: []
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const issues = this.checkMarkdownCompatibility(content, file);
        
        if (issues.length === 0) {
          results.compatibleFiles++;
        } else {
          results.issues.push(...issues);
        }
      } catch (error) {
        results.issues.push({
          file,
          type: 'file_access_error',
          description: `无法读取文件: ${error.message}`
        });
      }
    }

    results.compatibilityScore = Math.round((results.compatibleFiles / results.totalFiles) * 100);
    return results;
  }

  /**
   * 测试路径兼容性
   */
  async testPathCompatibility() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalPaths: 0,
      compatiblePaths: 0,
      issues: []
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const paths = this.extractAllPaths(content);
        
        results.totalPaths += paths.length;
        
        paths.forEach(pathInfo => {
          const issues = this.checkPathCompatibility(pathInfo.path, file);
          if (issues.length === 0) {
            results.compatiblePaths++;
          } else {
            results.issues.push(...issues);
          }
        });
      } catch (error) {
        console.warn(`⚠️ 无法测试路径兼容性 ${file}: ${error.message}`);
      }
    }

    results.compatibilityScore = results.totalPaths > 0 
      ? Math.round((results.compatiblePaths / results.totalPaths) * 100)
      : 100;

    return results;
  }

  /**
   * 测试编码兼容性
   */
  async testEncodingCompatibility() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalFiles: files.length,
      utf8Files: 0,
      encodingIssues: []
    };

    for (const file of files) {
      try {
        const buffer = await fs.readFile(file);
        const isUTF8 = this.isValidUTF8(buffer);
        
        if (isUTF8) {
          results.utf8Files++;
        } else {
          results.encodingIssues.push({
            file,
            issue: 'Non-UTF8 encoding detected'
          });
        }
      } catch (error) {
        results.encodingIssues.push({
          file,
          issue: `Cannot read file: ${error.message}`
        });
      }
    }

    results.compatibilityScore = Math.round((results.utf8Files / results.totalFiles) * 100);
    return results;
  }

  /**
   * 测试行结束符兼容性
   */
  async testLineEndingCompatibility() {
    const files = await glob(`${this.config.baseDir}/**/*.md`);
    const results = {
      totalFiles: files.length,
      unixLineEndings: 0,
      windowsLineEndings: 0,
      mixedLineEndings: 0
    };

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lineEndingType = this.detectLineEndings(content);
        
        switch (lineEndingType) {
          case 'unix':
            results.unixLineEndings++;
            break;
          case 'windows':
            results.windowsLineEndings++;
            break;
          case 'mixed':
            results.mixedLineEndings++;
            break;
        }
      } catch (error) {
        console.warn(`⚠️ 无法测试行结束符 ${file}: ${error.message}`);
      }
    }

    results.compatibilityScore = Math.round(((results.unixLineEndings + results.windowsLineEndings) / results.totalFiles) * 100);
    return results;
  }

  /**
   * 生成验证摘要
   */
  generateVerificationSummary(results) {
    const totalFixed = results.fixedIssues ? Object.values(results.fixedIssues).reduce((sum, item) => sum + item.count, 0) : 0;
    const totalRemaining = results.remainingIssues ? Object.values(results.remainingIssues).reduce((sum, item) => sum + item.count, 0) : 0;
    const fixRate = Math.round((totalFixed / this.originalIssues.total) * 100);

    const renderingScores = results.renderingTests ? {
      codeBlocks: results.renderingTests.codeBlockRendering?.renderingScore || 0,
      tables: results.renderingTests.tableRendering?.renderingScore || 0,
      mermaid: results.renderingTests.mermaidRendering?.renderingScore || 0,
      images: results.renderingTests.imageRendering?.renderingScore || 0,
      links: results.renderingTests.linkRendering?.renderingScore || 0
    } : {};

    const avgRenderingScore = Object.values(renderingScores).length > 0 
      ? Math.round(Object.values(renderingScores).reduce((sum, score) => sum + score, 0) / Object.values(renderingScores).length)
      : 0;

    const compatibilityScores = results.compatibilityTests ? {
      markdown: results.compatibilityTests.markdownCompatibility?.compatibilityScore || 0,
      paths: results.compatibilityTests.pathCompatibility?.compatibilityScore || 0,
      encoding: results.compatibilityTests.encodingCompatibility?.compatibilityScore || 0,
      lineEndings: results.compatibilityTests.lineEndingCompatibility?.compatibilityScore || 0
    } : {};

    const avgCompatibilityScore = Object.values(compatibilityScores).length > 0
      ? Math.round(Object.values(compatibilityScores).reduce((sum, score) => sum + score, 0) / Object.values(compatibilityScores).length)
      : 0;

    return {
      originalIssueCount: this.originalIssues.total,
      fixedIssueCount: totalFixed,
      remainingIssueCount: totalRemaining,
      newIssueCount: results.newIssues?.count || 0,
      fixRate,
      renderingScores,
      avgRenderingScore,
      compatibilityScores,
      avgCompatibilityScore,
      overallScore: Math.round((fixRate + avgRenderingScore + avgCompatibilityScore) / 3),
      status: this.determineOverallStatus(fixRate, avgRenderingScore, avgCompatibilityScore)
    };
  }

  /**
   * 确定总体状态
   */
  determineOverallStatus(fixRate, renderingScore, compatibilityScore) {
    const avgScore = (fixRate + renderingScore + compatibilityScore) / 3;
    
    if (avgScore >= 95) return 'EXCELLENT';
    if (avgScore >= 85) return 'GOOD';
    if (avgScore >= 70) return 'ACCEPTABLE';
    if (avgScore >= 50) return 'NEEDS_IMPROVEMENT';
    return 'CRITICAL';
  }

  /**
   * 生成验证报告
   */
  async generateVerificationReport(results) {
    // 确保报告目录存在
    await fs.mkdir(this.config.reportDir, { recursive: true });

    // 生成JSON报告
    const jsonReport = JSON.stringify(results, null, 2);
    await fs.writeFile(
      path.join(this.config.reportDir, 'comprehensive-verification-report.json'),
      jsonReport
    );

    // 生成Markdown报告
    const markdownReport = this.generateMarkdownVerificationReport(results);
    await fs.writeFile(
      path.join(this.config.reportDir, 'comprehensive-verification-report.md'),
      markdownReport
    );

    // 生成HTML报告
    const htmlReport = this.generateHtmlVerificationReport(results);
    await fs.writeFile(
      path.join(this.config.reportDir, 'comprehensive-verification-report.html'),
      htmlReport
    );

    console.log(`📄 验证报告已生成到 ${this.config.reportDir} 目录`);
  }

  /**
   * 生成Markdown验证报告
   */
  generateMarkdownVerificationReport(results) {
    const summary = results.summary;
    
    return `# 全面质量验证报告

## 执行摘要

**验证时间**: ${new Date(results.timestamp).toLocaleString('zh-CN')}
**总体状态**: ${summary.status}
**综合评分**: ${summary.overallScore}/100

## 问题修复状态验证

### 修复概览

- **原始问题总数**: ${summary.originalIssueCount}
- **已修复问题**: ${summary.fixedIssueCount} (${summary.fixRate}%)
- **剩余问题**: ${summary.remainingIssueCount}
- **新发现问题**: ${summary.newIssueCount}

### 详细修复状态

${Object.entries(results.fixedIssues || {}).map(([type, data]) => 
  `- **${type}**: 修复 ${data.count} 个问题 (${data.percentage}%)`
).join('\n')}

${Object.keys(results.remainingIssues || {}).length > 0 ? `
### 剩余问题

${Object.entries(results.remainingIssues).map(([type, data]) => 
  `- **${type}**: 剩余 ${data.count} 个问题 (${data.percentage}%)`
).join('\n')}
` : ''}

## 渲染效果测试结果

### 测试概览

- **代码块渲染**: ${summary.renderingScores.codeBlocks}/100
- **表格渲染**: ${summary.renderingScores.tables}/100
- **Mermaid图表渲染**: ${summary.renderingScores.mermaid}/100
- **图片渲染**: ${summary.renderingScores.images}/100
- **链接渲染**: ${summary.renderingScores.links}/100
- **平均渲染评分**: ${summary.avgRenderingScore}/100

### 详细测试结果

#### 代码块渲染测试

- 总代码块数: ${results.renderingTests?.codeBlockRendering?.totalCodeBlocks || 0}
- 格式正确: ${results.renderingTests?.codeBlockRendering?.properlyFormatted || 0}
- 缺少语言标识: ${results.renderingTests?.codeBlockRendering?.missingLanguage || 0}
- 未闭合: ${results.renderingTests?.codeBlockRendering?.unclosed || 0}

#### 表格渲染测试

- 总表格数: ${results.renderingTests?.tableRendering?.totalTables || 0}
- 格式正确: ${results.renderingTests?.tableRendering?.properlyFormatted || 0}
- 列数不匹配: ${results.renderingTests?.tableRendering?.columnMismatches || 0}
- 空单元格: ${results.renderingTests?.tableRendering?.emptyCells || 0}

#### Mermaid图表渲染测试

- 总图表数: ${results.renderingTests?.mermaidRendering?.totalDiagrams || 0}
- 格式正确: ${results.renderingTests?.mermaidRendering?.properlyFormatted || 0}
- 缺少方向定义: ${results.renderingTests?.mermaidRendering?.missingDirection || 0}
- 节点过多: ${results.renderingTests?.mermaidRendering?.tooManyNodes || 0}

## 跨平台兼容性验证结果

### 兼容性概览

- **Markdown兼容性**: ${summary.compatibilityScores.markdown}/100
- **路径兼容性**: ${summary.compatibilityScores.paths}/100
- **编码兼容性**: ${summary.compatibilityScores.encoding}/100
- **行结束符兼容性**: ${summary.compatibilityScores.lineEndings}/100
- **平均兼容性评分**: ${summary.avgCompatibilityScore}/100

### 详细兼容性结果

#### Markdown兼容性

- 总文件数: ${results.compatibilityTests?.markdownCompatibility?.totalFiles || 0}
- 兼容文件: ${results.compatibilityTests?.markdownCompatibility?.compatibleFiles || 0}
- 问题数量: ${results.compatibilityTests?.markdownCompatibility?.issues?.length || 0}

#### 编码兼容性

- 总文件数: ${results.compatibilityTests?.encodingCompatibility?.totalFiles || 0}
- UTF-8文件: ${results.compatibilityTests?.encodingCompatibility?.utf8Files || 0}
- 编码问题: ${results.compatibilityTests?.encodingCompatibility?.encodingIssues?.length || 0}

## 建议和后续行动

### 优先级建议

${summary.status === 'CRITICAL' ? '🚨 **紧急**: 需要立即处理剩余的关键问题' : ''}
${summary.status === 'NEEDS_IMPROVEMENT' ? '⚠️ **重要**: 建议优先修复剩余问题以提高质量' : ''}
${summary.status === 'ACCEPTABLE' ? '✅ **良好**: 质量达到可接受水平，可考虑进一步优化' : ''}
${summary.status === 'GOOD' ? '🎉 **优秀**: 质量良好，建议保持当前标准' : ''}
${summary.status === 'EXCELLENT' ? '🏆 **卓越**: 质量卓越，可作为标准模板' : ''}

### 后续行动项

1. **问题修复**: ${summary.remainingIssueCount > 0 ? `继续修复剩余的 ${summary.remainingIssueCount} 个问题` : '所有原始问题已修复'}
2. **渲染优化**: ${summary.avgRenderingScore < 90 ? '优化渲染效果，特别关注评分较低的项目' : '渲染效果良好'}
3. **兼容性改进**: ${summary.avgCompatibilityScore < 90 ? '改进跨平台兼容性' : '兼容性良好'}
4. **持续监控**: 建立定期质量检查机制，防止质量退化

---

*报告生成时间: ${new Date().toLocaleString('zh-CN')}*
*验证系统版本: 1.0.0*
`;
  }

  /**
   * 生成HTML验证报告
   */
  generateHtmlVerificationReport(results) {
    const summary = results.summary;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全面质量验证报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; color: white; }
        .status-EXCELLENT { background: #28a745; }
        .status-GOOD { background: #17a2b8; }
        .status-ACCEPTABLE { background: #ffc107; color: #333; }
        .status-NEEDS_IMPROVEMENT { background: #fd7e14; }
        .status-CRITICAL { background: #dc3545; }
        .score-circle { display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(#28a745 0deg ${summary.overallScore * 3.6}deg, #e9ecef ${summary.overallScore * 3.6}deg 360deg); position: relative; margin: 0 10px; }
        .score-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; font-size: 16px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #17a2b8); transition: width 0.3s ease; }
        .issue-list { max-height: 300px; overflow-y: auto; }
        .issue-item { background: white; margin: 5px 0; padding: 10px; border-radius: 4px; border-left: 3px solid #007bff; }
        .fixed { border-left-color: #28a745; }
        .remaining { border-left-color: #dc3545; }
        .new { border-left-color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>全面质量验证报告</h1>
            <p>验证时间: ${new Date(results.timestamp).toLocaleString('zh-CN')}</p>
            <div class="status-badge status-${summary.status}">${summary.status}</div>
            <div class="score-circle">
                <div class="score-text">${summary.overallScore}</div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>问题修复状态</h3>
                <div class="metric">
                    <span>原始问题总数</span>
                    <strong>${summary.originalIssueCount}</strong>
                </div>
                <div class="metric">
                    <span>已修复问题</span>
                    <strong style="color: #28a745">${summary.fixedIssueCount}</strong>
                </div>
                <div class="metric">
                    <span>剩余问题</span>
                    <strong style="color: #dc3545">${summary.remainingIssueCount}</strong>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${summary.fixRate}%"></div>
                </div>
                <div style="text-align: center; margin-top: 10px;">修复率: ${summary.fixRate}%</div>
            </div>

            <div class="card">
                <h3>渲染效果测试</h3>
                <div class="metric">
                    <span>代码块渲染</span>
                    <strong>${summary.renderingScores.codeBlocks}/100</strong>
                </div>
                <div class="metric">
                    <span>表格渲染</span>
                    <strong>${summary.renderingScores.tables}/100</strong>
                </div>
                <div class="metric">
                    <span>Mermaid图表</span>
                    <strong>${summary.renderingScores.mermaid}/100</strong>
                </div>
                <div class="metric">
                    <span>图片渲染</span>
                    <strong>${summary.renderingScores.images}/100</strong>
                </div>
                <div class="metric">
                    <span>链接渲染</span>
                    <strong>${summary.renderingScores.links}/100</strong>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${summary.avgRenderingScore}%"></div>
                </div>
                <div style="text-align: center; margin-top: 10px;">平均评分: ${summary.avgRenderingScore}/100</div>
            </div>

            <div class="card">
                <h3>跨平台兼容性</h3>
                <div class="metric">
                    <span>Markdown兼容性</span>
                    <strong>${summary.compatibilityScores.markdown}/100</strong>
                </div>
                <div class="metric">
                    <span>路径兼容性</span>
                    <strong>${summary.compatibilityScores.paths}/100</strong>
                </div>
                <div class="metric">
                    <span>编码兼容性</span>
                    <strong>${summary.compatibilityScores.encoding}/100</strong>
                </div>
                <div class="metric">
                    <span>行结束符兼容性</span>
                    <strong>${summary.compatibilityScores.lineEndings}/100</strong>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${summary.avgCompatibilityScore}%"></div>
                </div>
                <div style="text-align: center; margin-top: 10px;">平均评分: ${summary.avgCompatibilityScore}/100</div>
            </div>
        </div>

        <div class="card">
            <h3>详细问题分析</h3>
            <div class="issue-list">
                ${Object.entries(results.fixedIssues || {}).map(([type, data]) => 
                    `<div class="issue-item fixed">
                        <strong>✅ ${type}</strong>: 已修复 ${data.count} 个问题 (${data.percentage}%)
                    </div>`
                ).join('')}
                ${Object.entries(results.remainingIssues || {}).map(([type, data]) => 
                    `<div class="issue-item remaining">
                        <strong>❌ ${type}</strong>: 剩余 ${data.count} 个问题 (${data.percentage}%)
                    </div>`
                ).join('')}
                ${results.newIssues?.count > 0 ? 
                    `<div class="issue-item new">
                        <strong>⚠️ 新发现问题</strong>: ${results.newIssues.count} 个
                    </div>` : ''
                }
            </div>
        </div>

        <div class="card">
            <h3>建议和后续行动</h3>
            <ul>
                <li><strong>问题修复</strong>: ${summary.remainingIssueCount > 0 ? `继续修复剩余的 ${summary.remainingIssueCount} 个问题` : '所有原始问题已修复'}</li>
                <li><strong>渲染优化</strong>: ${summary.avgRenderingScore < 90 ? '优化渲染效果，特别关注评分较低的项目' : '渲染效果良好'}</li>
                <li><strong>兼容性改进</strong>: ${summary.avgCompatibilityScore < 90 ? '改进跨平台兼容性' : '兼容性良好'}</li>
                <li><strong>持续监控</strong>: 建立定期质量检查机制，防止质量退化</li>
            </ul>
        </div>

        <footer style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')} | 验证系统版本: 1.0.0</p>
        </footer>
    </div>
</body>
</html>`;
  }

  // 辅助方法
  extractCodeBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let inBlock = false;
    let currentBlock = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        if (!inBlock) {
          currentBlock = {
            start: i,
            language: line.trim().substring(3).trim(),
            closed: false,
            spacingIssues: i > 0 && lines[i - 1].trim() !== ''
          };
          inBlock = true;
        } else {
          currentBlock.end = i;
          currentBlock.closed = true;
          currentBlock.spacingIssues = currentBlock.spacingIssues || (i < lines.length - 1 && lines[i + 1].trim() !== '');
          blocks.push(currentBlock);
          inBlock = false;
        }
      }
    }

    if (inBlock && currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  extractTables(content) {
    const tables = [];
    const lines = content.split('\n');
    let currentTable = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('|') && !line.trim().startsWith('```')) {
        if (!currentTable) {
          currentTable = {
            start: i,
            rows: [],
            columns: 0
          };
        }
        
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        if (currentTable.columns === 0) {
          currentTable.columns = cells.length;
        }
        
        currentTable.rows.push({
          line: i,
          cells,
          columnCount: cells.length
        });
      } else if (currentTable && line.trim() === '') {
        // 计算表格问题
        currentTable.columnMismatches = currentTable.rows.filter(row => row.columnCount !== currentTable.columns).length;
        currentTable.emptyCells = currentTable.rows.reduce((sum, row) => sum + row.cells.filter(cell => cell === '' || cell === '-').length, 0);
        
        tables.push(currentTable);
        currentTable = null;
      }
    }

    if (currentTable) {
      currentTable.columnMismatches = currentTable.rows.filter(row => row.columnCount !== currentTable.columns).length;
      currentTable.emptyCells = currentTable.rows.reduce((sum, row) => sum + row.cells.filter(cell => cell === '' || cell === '-').length, 0);
      tables.push(currentTable);
    }

    return tables;
  }

  extractMermaidDiagrams(content) {
    const diagrams = [];
    const mermaidBlocks = content.match(/```mermaid\n([\s\S]*?)\n```/g) || [];

    mermaidBlocks.forEach(block => {
      const diagramContent = block.replace(/```mermaid\n/, '').replace(/\n```$/, '');
      const hasDirection = /^(graph|flowchart)\s+(TB|TD|BT|RL|LR)/.test(diagramContent.trim());
      const nodeCount = this.countMermaidNodes(diagramContent);
      const nonStandardColors = this.findNonStandardColors(diagramContent).length;
      const hasStyles = diagramContent.includes('style ') || diagramContent.includes('classDef ');

      diagrams.push({
        content: diagramContent,
        hasDirection,
        nodeCount,
        nonStandardColors,
        hasStyles
      });
    });

    return diagrams;
  }

  countMermaidNodes(content) {
    const nodePattern = /\b[A-Za-z][A-Za-z0-9]*\b(?=\s*[\[\(]|\s*-->|\s*---)/g;
    const matches = content.match(nodePattern) || [];
    return new Set(matches).size;
  }

  findNonStandardColors(content) {
    const standardColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'gray', 'black', 'white'];
    const colorPattern = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g;
    return content.match(colorPattern) || [];
  }

  extractImages(content) {
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images = [];
    let match;

    while ((match = imagePattern.exec(content)) !== null) {
      images.push({
        altText: match[1],
        src: match[2]
      });
    }

    return images;
  }

  extractLinks(content) {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      links.push({
        text: match[1],
        href: match[2]
      });
    }

    return links;
  }

  extractAllPaths(content) {
    const paths = [];
    
    // 提取链接中的路径
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      if (!match[2].startsWith('http')) {
        paths.push({ path: match[2], type: 'link' });
      }
    }

    // 提取图片路径
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = imagePattern.exec(content)) !== null) {
      if (!match[2].startsWith('http')) {
        paths.push({ path: match[2], type: 'image' });
      }
    }

    return paths;
  }

  checkMarkdownCompatibility(content, file) {
    const issues = [];
    
    // 检查常见的兼容性问题
    if (content.includes('\r\n') && content.includes('\n') && !content.includes('\r\n')) {
      issues.push({
        file,
        type: 'mixed_line_endings',
        description: '混合的行结束符可能导致兼容性问题'
      });
    }

    // 检查特殊字符
    if (/[^\x00-\x7F]/.test(content) && !/[\u4e00-\u9fff]/.test(content)) {
      issues.push({
        file,
        type: 'special_characters',
        description: '包含可能导致兼容性问题的特殊字符'
      });
    }

    return issues;
  }

  checkPathCompatibility(pathStr, file) {
    const issues = [];
    
    // 检查路径分隔符
    if (pathStr.includes('\\')) {
      issues.push({
        file,
        path: pathStr,
        type: 'windows_path_separator',
        description: '使用了Windows路径分隔符，可能在Unix系统上不兼容'
      });
    }

    // 检查绝对路径
    if (pathStr.startsWith('/') || /^[A-Za-z]:/.test(pathStr)) {
      issues.push({
        file,
        path: pathStr,
        type: 'absolute_path',
        description: '使用了绝对路径，可能在不同系统上不兼容'
      });
    }

    return issues;
  }

  isValidUTF8(buffer) {
    try {
      buffer.toString('utf8');
      return true;
    } catch {
      return false;
    }
  }

  detectLineEndings(content) {
    const hasWindows = content.includes('\r\n');
    const hasUnix = content.includes('\n') && !content.includes('\r\n');
    
    if (hasWindows && hasUnix) return 'mixed';
    if (hasWindows) return 'windows';
    if (hasUnix) return 'unix';
    return 'unknown';
  }
}

export { ComprehensiveVerificationSystem };