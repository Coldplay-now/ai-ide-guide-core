/**
 * 维护流程自动化工具
 * 实现新内容质量检查流程、创建影响分析和依赖跟踪、开发标准化修复指南系统
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { BaseFixer } from './base-fixer.js';
import { QualityChecker } from './quality-checker.js';

/**
 * 维护流程状态枚举
 */
const FlowStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * 内容变更类型
 */
const ChangeType = {
  ADDED: 'added',
  MODIFIED: 'modified',
  DELETED: 'deleted',
  RENAMED: 'renamed'
};

/**
 * 影响级别
 */
const ImpactLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class MaintenanceFlowManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      autoProcessNewContent: config.autoProcessNewContent !== false,
      enableImpactAnalysis: config.enableImpactAnalysis !== false,
      enableDependencyTracking: config.enableDependencyTracking !== false,
      qualityThresholds: {
        maxIssuesPerFile: 10,
        maxCriticalIssues: 0,
        maxMajorIssues: 5,
        ...config.qualityThresholds
      },
      ...config
    };

    this.qualityChecker = new QualityChecker(config);
    this.activeFlows = new Map();
    this.dependencyGraph = new Map();
    this.fixGuides = new Map();
    
    this.initializeFixGuides();
  }

  /**
   * 初始化标准化修复指南
   */
  initializeFixGuides() {
    // 代码块修复指南
    this.fixGuides.set('code_block_unclosed', {
      title: '修复未闭合代码块',
      description: '自动检测并修复未正确闭合的代码块',
      steps: [
        '扫描文档中的代码块标记',
        '识别未闭合的代码块',
        '在适当位置添加闭合标记',
        '验证修复结果'
      ],
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '1-2分钟'
    });

    this.fixGuides.set('table_column_mismatch', {
      title: '修复表格列数不匹配',
      description: '调整表格行列数以保持一致性',
      steps: [
        '分析表格结构',
        '识别列数不匹配的行',
        '根据标题行调整数据行',
        '填充缺失的单元格',
        '验证表格完整性'
      ],
      autoFixable: true,
      complexity: 'medium',
      estimatedTime: '2-5分钟'
    });

    this.fixGuides.set('mermaid_no_direction', {
      title: '添加Mermaid图表方向定义',
      description: '为流程图添加明确的方向定义',
      steps: [
        '识别Mermaid图表类型',
        '分析图表结构',
        '选择合适的方向定义',
        '添加方向声明',
        '验证图表渲染'
      ],
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '1分钟'
    });

    this.fixGuides.set('heading_hierarchy', {
      title: '修复标题层次结构',
      description: '调整标题级别以保持逻辑层次',
      steps: [
        '分析文档标题结构',
        '识别层次跳跃问题',
        '调整标题级别',
        '更新目录结构',
        '验证导航逻辑'
      ],
      autoFixable: false,
      complexity: 'high',
      estimatedTime: '10-30分钟',
      requiresManualReview: true
    });

    this.fixGuides.set('broken_link', {
      title: '修复断链问题',
      description: '检查并修复无效的内部链接',
      steps: [
        '扫描所有内部链接',
        '验证目标文件存在性',
        '检查锚点有效性',
        '更新或修复无效链接',
        '验证链接可访问性'
      ],
      autoFixable: false,
      complexity: 'medium',
      estimatedTime: '5-15分钟',
      requiresManualReview: true
    });
  }

  /**
   * 处理新内容质量检查流程
   */
  async processNewContent(contentPath, changeType = ChangeType.ADDED) {
    const flowId = this.generateFlowId();
    
    const flow = {
      id: flowId,
      type: 'new_content_check',
      status: FlowStatus.PENDING,
      contentPath,
      changeType,
      startTime: new Date().toISOString(),
      steps: [],
      results: {}
    };

    this.activeFlows.set(flowId, flow);
    this.emit('flow:started', flow);

    try {
      flow.status = FlowStatus.RUNNING;
      
      // 步骤1: 质量检查
      await this.executeFlowStep(flow, 'quality_check', async () => {
        const issues = await this.qualityChecker.checkFile(contentPath);
        return { issues, issueCount: issues.length };
      });

      // 步骤2: 影响分析
      if (this.config.enableImpactAnalysis) {
        await this.executeFlowStep(flow, 'impact_analysis', async () => {
          return await this.analyzeContentImpact(contentPath, changeType);
        });
      }

      // 步骤3: 依赖跟踪
      if (this.config.enableDependencyTracking) {
        await this.executeFlowStep(flow, 'dependency_tracking', async () => {
          return await this.trackContentDependencies(contentPath);
        });
      }

      // 步骤4: 生成修复建议
      await this.executeFlowStep(flow, 'fix_suggestions', async () => {
        return this.generateFixSuggestions(flow.results.quality_check.issues);
      });

      // 步骤5: 质量评估
      await this.executeFlowStep(flow, 'quality_assessment', async () => {
        return this.assessContentQuality(flow.results);
      });

      flow.status = FlowStatus.COMPLETED;
      flow.endTime = new Date().toISOString();
      flow.duration = new Date(flow.endTime) - new Date(flow.startTime);

      this.emit('flow:completed', flow);
      return flow;

    } catch (error) {
      flow.status = FlowStatus.FAILED;
      flow.error = error.message;
      flow.endTime = new Date().toISOString();
      
      this.emit('flow:failed', { flow, error });
      throw error;
    }
  }

  /**
   * 执行流程步骤
   */
  async executeFlowStep(flow, stepName, stepFunction) {
    const step = {
      name: stepName,
      startTime: new Date().toISOString(),
      status: 'running'
    };

    flow.steps.push(step);
    this.emit('flow:step:started', { flow, step });

    try {
      const result = await stepFunction();
      
      step.status = 'completed';
      step.endTime = new Date().toISOString();
      step.duration = new Date(step.endTime) - new Date(step.startTime);
      
      flow.results[stepName] = result;
      
      this.emit('flow:step:completed', { flow, step, result });
      return result;

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.endTime = new Date().toISOString();
      
      this.emit('flow:step:failed', { flow, step, error });
      throw error;
    }
  }

  /**
   * 分析内容影响
   */
  async analyzeContentImpact(contentPath, changeType) {
    const impact = {
      level: ImpactLevel.LOW,
      affectedFiles: [],
      affectedSections: [],
      recommendations: []
    };

    try {
      // 分析文件类型和位置
      const fileInfo = await this.analyzeFileInfo(contentPath);
      
      // 根据文件类型和位置评估影响级别
      if (fileInfo.isIndexFile || fileInfo.isMainChapter) {
        impact.level = ImpactLevel.HIGH;
        impact.recommendations.push('主要文件变更，需要全面测试');
      } else if (fileInfo.hasExternalReferences) {
        impact.level = ImpactLevel.MEDIUM;
        impact.recommendations.push('存在外部引用，需要检查相关文件');
      }

      // 查找引用此文件的其他文件
      const referencingFiles = await this.findReferencingFiles(contentPath);
      impact.affectedFiles = referencingFiles;

      if (referencingFiles.length > 5) {
        impact.level = Math.max(impact.level, ImpactLevel.MEDIUM);
        impact.recommendations.push(`${referencingFiles.length} 个文件引用此内容，需要验证链接有效性`);
      }

      // 分析内容变更对文档结构的影响
      if (changeType === ChangeType.DELETED) {
        impact.level = ImpactLevel.HIGH;
        impact.recommendations.push('文件删除可能导致断链，需要更新所有引用');
      } else if (changeType === ChangeType.RENAMED) {
        impact.level = ImpactLevel.MEDIUM;
        impact.recommendations.push('文件重命名需要更新所有内部链接');
      }

      return impact;

    } catch (error) {
      console.warn(`分析内容影响时出错: ${error.message}`);
      return {
        level: ImpactLevel.MEDIUM,
        error: error.message,
        recommendations: ['无法完成影响分析，建议手动检查']
      };
    }
  }

  /**
   * 分析文件信息
   */
  async analyzeFileInfo(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);
    
    const info = {
      fileName,
      dirName,
      isIndexFile: fileName.toLowerCase().includes('index') || fileName.toLowerCase().includes('readme'),
      isMainChapter: dirName.includes('chapters') && fileName.match(/^\d+/),
      hasExternalReferences: false,
      fileSize: 0
    };

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const stats = await fs.stat(filePath);
      
      info.fileSize = stats.size;
      info.hasExternalReferences = /\[.*\]\(https?:\/\//.test(content);
      info.lineCount = content.split('\n').length;
      info.wordCount = content.split(/\s+/).length;

    } catch (error) {
      console.warn(`读取文件信息时出错: ${error.message}`);
    }

    return info;
  }

  /**
   * 查找引用指定文件的其他文件
   */
  async findReferencingFiles(targetPath) {
    const referencingFiles = [];
    const targetFileName = path.basename(targetPath);
    const relativePath = path.relative(process.cwd(), targetPath);

    try {
      // 搜索所有markdown文件
      const allFiles = await this.findAllMarkdownFiles();
      
      for (const filePath of allFiles) {
        if (filePath === targetPath) continue;

        try {
          const content = await fs.readFile(filePath, 'utf8');
          
          // 检查是否包含对目标文件的引用
          const hasReference = 
            content.includes(targetFileName) ||
            content.includes(relativePath) ||
            content.includes(targetPath);

          if (hasReference) {
            referencingFiles.push({
              filePath,
              referenceType: this.detectReferenceType(content, targetPath)
            });
          }

        } catch (error) {
          console.warn(`检查文件引用时出错 ${filePath}: ${error.message}`);
        }
      }

    } catch (error) {
      console.warn(`查找引用文件时出错: ${error.message}`);
    }

    return referencingFiles;
  }

  /**
   * 检测引用类型
   */
  detectReferenceType(content, targetPath) {
    const targetFileName = path.basename(targetPath);
    
    if (content.includes(`](${targetPath})`)) return 'direct_link';
    if (content.includes(`](${targetFileName})`)) return 'relative_link';
    if (content.includes(targetFileName)) return 'text_reference';
    
    return 'unknown';
  }

  /**
   * 跟踪内容依赖关系
   */
  async trackContentDependencies(contentPath) {
    const dependencies = {
      internalLinks: [],
      externalLinks: [],
      imageReferences: [],
      codeReferences: [],
      crossReferences: []
    };

    try {
      const content = await fs.readFile(contentPath, 'utf8');
      
      // 提取内部链接
      const internalLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = internalLinkPattern.exec(content)) !== null) {
        const linkText = match[1];
        const linkUrl = match[2];
        
        if (linkUrl.startsWith('http')) {
          dependencies.externalLinks.push({ text: linkText, url: linkUrl });
        } else {
          dependencies.internalLinks.push({ text: linkText, url: linkUrl });
        }
      }

      // 提取图片引用
      const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
      while ((match = imagePattern.exec(content)) !== null) {
        dependencies.imageReferences.push({
          alt: match[1],
          src: match[2]
        });
      }

      // 提取代码引用
      const codeRefPattern = /#\[\[file:([^\]]+)\]\]/g;
      while ((match = codeRefPattern.exec(content)) !== null) {
        dependencies.codeReferences.push(match[1]);
      }

      // 更新依赖图
      this.updateDependencyGraph(contentPath, dependencies);

      return dependencies;

    } catch (error) {
      console.warn(`跟踪依赖关系时出错: ${error.message}`);
      return dependencies;
    }
  }

  /**
   * 更新依赖图
   */
  updateDependencyGraph(filePath, dependencies) {
    const node = {
      filePath,
      lastUpdated: new Date().toISOString(),
      dependencies: {
        internal: dependencies.internalLinks.map(link => link.url),
        external: dependencies.externalLinks.map(link => link.url),
        images: dependencies.imageReferences.map(img => img.src),
        code: dependencies.codeReferences
      },
      dependents: [] // 将在其他文件分析时填充
    };

    this.dependencyGraph.set(filePath, node);

    // 更新被依赖文件的dependents列表
    dependencies.internalLinks.forEach(link => {
      const targetPath = this.resolveLinkPath(filePath, link.url);
      if (targetPath && this.dependencyGraph.has(targetPath)) {
        const targetNode = this.dependencyGraph.get(targetPath);
        if (!targetNode.dependents.includes(filePath)) {
          targetNode.dependents.push(filePath);
        }
      }
    });
  }

  /**
   * 解析链接路径
   */
  resolveLinkPath(basePath, linkUrl) {
    try {
      if (linkUrl.startsWith('http') || linkUrl.startsWith('#')) {
        return null;
      }

      const baseDir = path.dirname(basePath);
      return path.resolve(baseDir, linkUrl);
    } catch (error) {
      return null;
    }
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions(issues) {
    const suggestions = [];
    const groupedIssues = this.groupIssuesByType(issues);

    for (const [issueType, typeIssues] of groupedIssues.entries()) {
      const guide = this.fixGuides.get(issueType);
      
      if (guide) {
        suggestions.push({
          issueType,
          count: typeIssues.length,
          guide: {
            title: guide.title,
            description: guide.description,
            steps: guide.steps,
            autoFixable: guide.autoFixable,
            complexity: guide.complexity,
            estimatedTime: guide.estimatedTime,
            requiresManualReview: guide.requiresManualReview || false
          },
          issues: typeIssues.map(issue => ({
            file: issue.file,
            line: issue.line,
            description: issue.description
          }))
        });
      } else {
        // 为未知问题类型生成通用建议
        suggestions.push({
          issueType,
          count: typeIssues.length,
          guide: {
            title: `处理 ${issueType} 问题`,
            description: '需要手动检查和修复',
            steps: [
              '检查问题详情',
              '分析问题原因',
              '制定修复方案',
              '执行修复',
              '验证修复结果'
            ],
            autoFixable: false,
            complexity: 'unknown',
            estimatedTime: '需要评估',
            requiresManualReview: true
          },
          issues: typeIssues.map(issue => ({
            file: issue.file,
            line: issue.line,
            description: issue.description
          }))
        });
      }
    }

    return suggestions;
  }

  /**
   * 按类型分组问题
   */
  groupIssuesByType(issues) {
    const grouped = new Map();
    
    issues.forEach(issue => {
      if (!grouped.has(issue.type)) {
        grouped.set(issue.type, []);
      }
      grouped.get(issue.type).push(issue);
    });

    return grouped;
  }

  /**
   * 评估内容质量
   */
  assessContentQuality(results) {
    const assessment = {
      overallScore: 0,
      qualityLevel: 'unknown',
      passesThresholds: false,
      recommendations: [],
      metrics: {}
    };

    if (results.quality_check) {
      const issues = results.quality_check.issues;
      const criticalIssues = issues.filter(i => i.severity === 'critical').length;
      const majorIssues = issues.filter(i => i.severity === 'major').length;
      const minorIssues = issues.filter(i => i.severity === 'minor').length;
      const totalIssues = issues.length;

      assessment.metrics = {
        totalIssues,
        criticalIssues,
        majorIssues,
        minorIssues
      };

      // 计算质量分数 (0-100)
      let score = 100;
      score -= criticalIssues * 20; // 严重问题扣20分
      score -= majorIssues * 10;    // 主要问题扣10分
      score -= minorIssues * 2;     // 次要问题扣2分
      
      assessment.overallScore = Math.max(0, score);

      // 确定质量级别
      if (assessment.overallScore >= 90) {
        assessment.qualityLevel = 'excellent';
      } else if (assessment.overallScore >= 75) {
        assessment.qualityLevel = 'good';
      } else if (assessment.overallScore >= 60) {
        assessment.qualityLevel = 'fair';
      } else {
        assessment.qualityLevel = 'poor';
      }

      // 检查是否通过阈值
      const thresholds = this.config.qualityThresholds;
      assessment.passesThresholds = 
        totalIssues <= thresholds.maxIssuesPerFile &&
        criticalIssues <= thresholds.maxCriticalIssues &&
        majorIssues <= thresholds.maxMajorIssues;

      // 生成建议
      if (!assessment.passesThresholds) {
        assessment.recommendations.push('内容质量未达到标准，需要修复问题后再发布');
      }

      if (criticalIssues > 0) {
        assessment.recommendations.push('存在严重问题，必须立即修复');
      }

      if (assessment.overallScore < 75) {
        assessment.recommendations.push('建议进行全面的质量改进');
      }
    }

    return assessment;
  }

  /**
   * 获取修复指南
   */
  getFixGuide(issueType) {
    return this.fixGuides.get(issueType);
  }

  /**
   * 添加自定义修复指南
   */
  addFixGuide(issueType, guide) {
    this.fixGuides.set(issueType, {
      title: guide.title,
      description: guide.description,
      steps: guide.steps || [],
      autoFixable: guide.autoFixable || false,
      complexity: guide.complexity || 'medium',
      estimatedTime: guide.estimatedTime || '需要评估',
      requiresManualReview: guide.requiresManualReview || false,
      customGuide: true
    });
  }

  /**
   * 获取依赖图信息
   */
  getDependencyGraph() {
    return Object.fromEntries(this.dependencyGraph);
  }

  /**
   * 获取文件依赖信息
   */
  getFileDependencies(filePath) {
    return this.dependencyGraph.get(filePath);
  }

  /**
   * 获取活动流程
   */
  getActiveFlows() {
    return Array.from(this.activeFlows.values());
  }

  /**
   * 获取流程详情
   */
  getFlow(flowId) {
    return this.activeFlows.get(flowId);
  }

  /**
   * 取消流程
   */
  cancelFlow(flowId) {
    const flow = this.activeFlows.get(flowId);
    if (flow && flow.status === FlowStatus.RUNNING) {
      flow.status = FlowStatus.CANCELLED;
      flow.endTime = new Date().toISOString();
      this.emit('flow:cancelled', flow);
    }
    return flow;
  }

  /**
   * 查找所有Markdown文件
   */
  async findAllMarkdownFiles(dir = process.cwd()) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.findAllMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`读取目录 ${dir} 时出错: ${error.message}`);
    }
    
    return files;
  }

  /**
   * 生成流程ID
   */
  generateFlowId() {
    return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理完成的流程
   */
  cleanupCompletedFlows(maxAge = 24 * 60 * 60 * 1000) { // 24小时
    const cutoffTime = Date.now() - maxAge;
    
    for (const [flowId, flow] of this.activeFlows.entries()) {
      if (flow.status === FlowStatus.COMPLETED || flow.status === FlowStatus.FAILED) {
        const flowTime = new Date(flow.startTime).getTime();
        if (flowTime < cutoffTime) {
          this.activeFlows.delete(flowId);
        }
      }
    }
  }
}

export {
  MaintenanceFlowManager,
  FlowStatus,
  ChangeType,
  ImpactLevel
};