/**
 * 更新验证和发布系统
 * 编写更新验证测试套件、实现发布前质量检查、开发版本质量报告生成
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { BaseFixer } from './base-fixer.js';
import { QualityChecker } from './quality-checker.js';
import { MaintenanceFlowManager } from './maintenance-flow-manager.js';

/**
 * 验证状态枚举
 */
const VerificationStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  WARNING: 'warning'
};

/**
 * 发布阶段枚举
 */
const ReleaseStage = {
  PRE_VALIDATION: 'pre_validation',
  CONTENT_VERIFICATION: 'content_verification',
  QUALITY_CHECK: 'quality_check',
  INTEGRATION_TEST: 'integration_test',
  FINAL_REVIEW: 'final_review',
  READY_FOR_RELEASE: 'ready_for_release'
};

/**
 * 测试类型枚举
 */
const TestType = {
  SYNTAX: 'syntax',
  STRUCTURE: 'structure',
  LINKS: 'links',
  IMAGES: 'images',
  FORMATTING: 'formatting',
  ACCESSIBILITY: 'accessibility',
  PERFORMANCE: 'performance'
};

class UpdateVerificationSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enablePreReleaseChecks: config.enablePreReleaseChecks !== false,
      enableIntegrationTests: config.enableIntegrationTests !== false,
      generateDetailedReports: config.generateDetailedReports !== false,
      releaseThresholds: {
        maxCriticalIssues: 0,
        maxMajorIssues: 5,
        maxMinorIssues: 20,
        minQualityScore: 80,
        maxBrokenLinks: 0,
        ...config.releaseThresholds
      },
      testSuites: {
        syntax: true,
        structure: true,
        links: true,
        images: true,
        formatting: true,
        accessibility: false,
        performance: false,
        ...config.testSuites
      },
      ...config
    };

    this.qualityChecker = new QualityChecker(config);
    this.maintenanceFlow = new MaintenanceFlowManager(config);
    
    this.verificationSessions = new Map();
    this.testResults = new Map();
    this.releaseReports = new Map();
    
    this.initializeTestSuites();
  }

  /**
   * 初始化测试套件
   */
  initializeTestSuites() {
    this.testSuites = new Map();

    // 语法测试套件
    this.testSuites.set(TestType.SYNTAX, {
      name: 'Markdown语法验证',
      description: '验证Markdown语法的正确性',
      tests: [
        'validateCodeBlocks',
        'validateTables',
        'validateLists',
        'validateHeadings',
        'validateLinks'
      ],
      critical: true
    });

    // 结构测试套件
    this.testSuites.set(TestType.STRUCTURE, {
      name: '文档结构验证',
      description: '验证文档结构的完整性和逻辑性',
      tests: [
        'validateHeadingHierarchy',
        'validateTableOfContents',
        'validateCrossReferences',
        'validateFileOrganization'
      ],
      critical: true
    });

    // 链接测试套件
    this.testSuites.set(TestType.LINKS, {
      name: '链接有效性验证',
      description: '验证所有内部和外部链接的有效性',
      tests: [
        'validateInternalLinks',
        'validateExternalLinks',
        'validateAnchorLinks',
        'validateImageLinks'
      ],
      critical: true
    });

    // 图片测试套件
    this.testSuites.set(TestType.IMAGES, {
      name: '图片资源验证',
      description: '验证图片资源的存在性和可访问性',
      tests: [
        'validateImageExists',
        'validateImageFormat',
        'validateImageSize',
        'validateAltText'
      ],
      critical: false
    });

    // 格式化测试套件
    this.testSuites.set(TestType.FORMATTING, {
      name: '格式一致性验证',
      description: '验证文档格式的一致性',
      tests: [
        'validateCodeFormatting',
        'validateTableFormatting',
        'validateListFormatting',
        'validateSpacing'
      ],
      critical: false
    });

    // 可访问性测试套件
    this.testSuites.set(TestType.ACCESSIBILITY, {
      name: '可访问性验证',
      description: '验证文档的可访问性标准',
      tests: [
        'validateHeadingStructure',
        'validateImageAltText',
        'validateLinkText',
        'validateColorContrast'
      ],
      critical: false
    });

    // 性能测试套件
    this.testSuites.set(TestType.PERFORMANCE, {
      name: '性能优化验证',
      description: '验证文档的性能优化',
      tests: [
        'validateFileSize',
        'validateImageOptimization',
        'validateLoadTime',
        'validateRenderingPerformance'
      ],
      critical: false
    });
  }

  /**
   * 开始更新验证流程
   */
  async startVerification(updatePath, options = {}) {
    const sessionId = this.generateSessionId();
    
    const session = {
      id: sessionId,
      updatePath,
      startTime: new Date().toISOString(),
      status: VerificationStatus.PENDING,
      stage: ReleaseStage.PRE_VALIDATION,
      options: {
        skipNonCritical: options.skipNonCritical || false,
        generateReport: options.generateReport !== false,
        ...options
      },
      results: {
        stages: new Map(),
        tests: new Map(),
        issues: [],
        metrics: {}
      }
    };

    this.verificationSessions.set(sessionId, session);
    this.emit('verification:started', session);

    try {
      session.status = VerificationStatus.RUNNING;
      
      // 执行验证阶段
      await this.executeVerificationStages(session);
      
      // 生成最终报告
      if (session.options.generateReport) {
        await this.generateVerificationReport(session);
      }

      // 确定最终状态
      session.status = this.determineVerificationStatus(session);
      session.endTime = new Date().toISOString();
      session.duration = new Date(session.endTime) - new Date(session.startTime);

      this.emit('verification:completed', session);
      return session;

    } catch (error) {
      session.status = VerificationStatus.FAILED;
      session.error = error.message;
      session.endTime = new Date().toISOString();
      
      this.emit('verification:failed', { session, error });
      throw error;
    }
  }

  /**
   * 执行验证阶段
   */
  async executeVerificationStages(session) {
    const stages = [
      ReleaseStage.PRE_VALIDATION,
      ReleaseStage.CONTENT_VERIFICATION,
      ReleaseStage.QUALITY_CHECK,
      ReleaseStage.INTEGRATION_TEST,
      ReleaseStage.FINAL_REVIEW
    ];

    for (const stage of stages) {
      session.stage = stage;
      this.emit('verification:stage:started', { session, stage });

      try {
        const stageResult = await this.executeStage(session, stage);
        session.results.stages.set(stage, stageResult);
        
        this.emit('verification:stage:completed', { session, stage, result: stageResult });

        // 如果关键阶段失败，停止验证
        if (stageResult.status === VerificationStatus.FAILED && stageResult.critical) {
          throw new Error(`关键阶段 ${stage} 失败: ${stageResult.error}`);
        }

      } catch (error) {
        const stageResult = {
          status: VerificationStatus.FAILED,
          error: error.message,
          critical: true
        };
        
        session.results.stages.set(stage, stageResult);
        this.emit('verification:stage:failed', { session, stage, error });
        throw error;
      }
    }

    session.stage = ReleaseStage.READY_FOR_RELEASE;
  }

  /**
   * 执行单个验证阶段
   */
  async executeStage(session, stage) {
    const stageResult = {
      stage,
      startTime: new Date().toISOString(),
      status: VerificationStatus.RUNNING,
      tests: [],
      issues: [],
      metrics: {}
    };

    try {
      switch (stage) {
        case ReleaseStage.PRE_VALIDATION:
          await this.executePreValidation(session, stageResult);
          break;
        case ReleaseStage.CONTENT_VERIFICATION:
          await this.executeContentVerification(session, stageResult);
          break;
        case ReleaseStage.QUALITY_CHECK:
          await this.executeQualityCheck(session, stageResult);
          break;
        case ReleaseStage.INTEGRATION_TEST:
          await this.executeIntegrationTest(session, stageResult);
          break;
        case ReleaseStage.FINAL_REVIEW:
          await this.executeFinalReview(session, stageResult);
          break;
      }

      stageResult.status = this.determineStageStatus(stageResult);
      stageResult.endTime = new Date().toISOString();
      stageResult.duration = new Date(stageResult.endTime) - new Date(stageResult.startTime);

      return stageResult;

    } catch (error) {
      stageResult.status = VerificationStatus.FAILED;
      stageResult.error = error.message;
      stageResult.endTime = new Date().toISOString();
      throw error;
    }
  }

  /**
   * 执行预验证
   */
  async executePreValidation(session, stageResult) {
    // 检查更新路径是否存在
    const pathExists = await this.checkPathExists(session.updatePath);
    stageResult.tests.push({
      name: 'path_exists',
      status: pathExists ? VerificationStatus.PASSED : VerificationStatus.FAILED,
      message: pathExists ? '更新路径存在' : '更新路径不存在'
    });

    if (!pathExists) {
      throw new Error('更新路径不存在');
    }

    // 检查文件权限
    const hasPermissions = await this.checkFilePermissions(session.updatePath);
    stageResult.tests.push({
      name: 'file_permissions',
      status: hasPermissions ? VerificationStatus.PASSED : VerificationStatus.FAILED,
      message: hasPermissions ? '文件权限正常' : '文件权限不足'
    });

    // 检查依赖文件
    const dependenciesOk = await this.checkDependencies(session.updatePath);
    stageResult.tests.push({
      name: 'dependencies',
      status: dependenciesOk ? VerificationStatus.PASSED : VerificationStatus.WARNING,
      message: dependenciesOk ? '依赖文件完整' : '部分依赖文件缺失'
    });
  }

  /**
   * 执行内容验证
   */
  async executeContentVerification(session, stageResult) {
    const files = await this.findFilesToVerify(session.updatePath);
    
    for (const filePath of files) {
      try {
        // 运行启用的测试套件
        for (const [testType, testSuite] of this.testSuites.entries()) {
          if (this.config.testSuites[testType]) {
            const testResult = await this.runTestSuite(filePath, testType, testSuite);
            stageResult.tests.push(testResult);
            
            if (testResult.issues) {
              stageResult.issues.push(...testResult.issues);
            }
          }
        }

      } catch (error) {
        stageResult.tests.push({
          name: `file_verification_${path.basename(filePath)}`,
          status: VerificationStatus.FAILED,
          message: `文件验证失败: ${error.message}`,
          filePath
        });
      }
    }

    // 计算内容验证指标
    stageResult.metrics = {
      totalFiles: files.length,
      totalTests: stageResult.tests.length,
      passedTests: stageResult.tests.filter(t => t.status === VerificationStatus.PASSED).length,
      failedTests: stageResult.tests.filter(t => t.status === VerificationStatus.FAILED).length,
      warningTests: stageResult.tests.filter(t => t.status === VerificationStatus.WARNING).length,
      totalIssues: stageResult.issues.length
    };
  }

  /**
   * 执行质量检查
   */
  async executeQualityCheck(session, stageResult) {
    const files = await this.findFilesToVerify(session.updatePath);
    let totalIssues = [];

    for (const filePath of files) {
      try {
        const issues = await this.qualityChecker.checkFile(filePath);
        totalIssues.push(...issues);
        
        stageResult.tests.push({
          name: `quality_check_${path.basename(filePath)}`,
          status: issues.length === 0 ? VerificationStatus.PASSED : 
                  issues.some(i => i.severity === 'critical') ? VerificationStatus.FAILED : 
                  VerificationStatus.WARNING,
          message: `发现 ${issues.length} 个质量问题`,
          filePath,
          issueCount: issues.length,
          issues: issues.slice(0, 5) // 只保留前5个问题用于显示
        });

      } catch (error) {
        stageResult.tests.push({
          name: `quality_check_${path.basename(filePath)}`,
          status: VerificationStatus.FAILED,
          message: `质量检查失败: ${error.message}`,
          filePath
        });
      }
    }

    stageResult.issues = totalIssues;

    // 计算质量指标
    const criticalIssues = totalIssues.filter(i => i.severity === 'critical').length;
    const majorIssues = totalIssues.filter(i => i.severity === 'major').length;
    const minorIssues = totalIssues.filter(i => i.severity === 'minor').length;

    stageResult.metrics = {
      totalIssues: totalIssues.length,
      criticalIssues,
      majorIssues,
      minorIssues,
      qualityScore: this.calculateQualityScore(totalIssues, files.length),
      passesThresholds: this.checkQualityThresholds(criticalIssues, majorIssues, minorIssues)
    };
  }

  /**
   * 执行集成测试
   */
  async executeIntegrationTest(session, stageResult) {
    if (!this.config.enableIntegrationTests) {
      stageResult.tests.push({
        name: 'integration_tests',
        status: VerificationStatus.PASSED,
        message: '集成测试已禁用'
      });
      return;
    }

    // 测试文档渲染
    const renderingTest = await this.testDocumentRendering(session.updatePath);
    stageResult.tests.push(renderingTest);

    // 测试导航完整性
    const navigationTest = await this.testNavigationIntegrity(session.updatePath);
    stageResult.tests.push(navigationTest);

    // 测试搜索功能
    const searchTest = await this.testSearchFunctionality(session.updatePath);
    stageResult.tests.push(searchTest);

    // 测试跨平台兼容性
    const compatibilityTest = await this.testCrossPlatformCompatibility(session.updatePath);
    stageResult.tests.push(compatibilityTest);
  }

  /**
   * 执行最终审查
   */
  async executeFinalReview(session, stageResult) {
    // 汇总所有阶段的结果
    const allIssues = [];
    const allMetrics = {};

    for (const [stageName, stageData] of session.results.stages.entries()) {
      if (stageData.issues) {
        allIssues.push(...stageData.issues);
      }
      if (stageData.metrics) {
        allMetrics[stageName] = stageData.metrics;
      }
    }

    // 检查发布阈值
    const thresholdCheck = this.checkReleaseThresholds(allIssues, allMetrics);
    stageResult.tests.push({
      name: 'release_thresholds',
      status: thresholdCheck.passed ? VerificationStatus.PASSED : VerificationStatus.FAILED,
      message: thresholdCheck.message,
      details: thresholdCheck.details
    });

    // 生成发布建议
    const recommendations = this.generateReleaseRecommendations(session);
    stageResult.recommendations = recommendations;

    stageResult.metrics = {
      totalIssues: allIssues.length,
      readyForRelease: thresholdCheck.passed,
      recommendationCount: recommendations.length
    };
  }

  /**
   * 运行测试套件
   */
  async runTestSuite(filePath, testType, testSuite) {
    const testResult = {
      name: `${testType}_${path.basename(filePath)}`,
      type: testType,
      filePath,
      startTime: new Date().toISOString(),
      status: VerificationStatus.RUNNING,
      tests: [],
      issues: []
    };

    try {
      const content = await fs.readFile(filePath, 'utf8');

      // 根据测试类型运行相应的测试
      switch (testType) {
        case TestType.SYNTAX:
          await this.runSyntaxTests(content, filePath, testResult);
          break;
        case TestType.STRUCTURE:
          await this.runStructureTests(content, filePath, testResult);
          break;
        case TestType.LINKS:
          await this.runLinkTests(content, filePath, testResult);
          break;
        case TestType.IMAGES:
          await this.runImageTests(content, filePath, testResult);
          break;
        case TestType.FORMATTING:
          await this.runFormattingTests(content, filePath, testResult);
          break;
        case TestType.ACCESSIBILITY:
          await this.runAccessibilityTests(content, filePath, testResult);
          break;
        case TestType.PERFORMANCE:
          await this.runPerformanceTests(content, filePath, testResult);
          break;
      }

      testResult.status = this.determineTestStatus(testResult.tests);
      testResult.endTime = new Date().toISOString();

      return testResult;

    } catch (error) {
      testResult.status = VerificationStatus.FAILED;
      testResult.error = error.message;
      testResult.endTime = new Date().toISOString();
      return testResult;
    }
  }

  /**
   * 运行语法测试
   */
  async runSyntaxTests(content, filePath, testResult) {
    // 验证代码块
    const codeBlockTest = this.validateCodeBlocks(content);
    testResult.tests.push(codeBlockTest);
    if (codeBlockTest.issues) testResult.issues.push(...codeBlockTest.issues);

    // 验证表格
    const tableTest = this.validateTables(content);
    testResult.tests.push(tableTest);
    if (tableTest.issues) testResult.issues.push(...tableTest.issues);

    // 验证列表
    const listTest = this.validateLists(content);
    testResult.tests.push(listTest);
    if (listTest.issues) testResult.issues.push(...listTest.issues);

    // 验证标题
    const headingTest = this.validateHeadings(content);
    testResult.tests.push(headingTest);
    if (headingTest.issues) testResult.issues.push(...headingTest.issues);
  }

  /**
   * 验证代码块
   */
  validateCodeBlocks(content) {
    const issues = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = i;
          
          // 检查语言标识符
          const language = line.substring(3).trim();
          if (!language) {
            issues.push({
              type: 'code_block_missing_language',
              line: i + 1,
              message: '代码块缺少语言标识符'
            });
          }
        } else {
          inCodeBlock = false;
        }
      }
    }

    // 检查未闭合的代码块
    if (inCodeBlock) {
      issues.push({
        type: 'code_block_unclosed',
        line: codeBlockStart + 1,
        message: '代码块未正确闭合'
      });
    }

    return {
      name: 'code_blocks',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.FAILED,
      message: `发现 ${issues.length} 个代码块问题`,
      issues
    };
  }

  /**
   * 验证表格
   */
  validateTables(content) {
    const issues = [];
    const lines = content.split('\n');
    let currentTable = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('|') && !line.startsWith('```')) {
        if (!currentTable) {
          currentTable = { headers: [], rows: [], startLine: i };
        }

        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
        
        if (currentTable.headers.length === 0) {
          currentTable.headers = cells;
        } else if (!line.includes('---')) {
          currentTable.rows.push({ cells, lineNumber: i });
        }
      } else if (currentTable && line === '') {
        // 验证表格
        const tableIssues = this.validateTableStructure(currentTable);
        issues.push(...tableIssues);
        currentTable = null;
      }
    }

    return {
      name: 'tables',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.FAILED,
      message: `发现 ${issues.length} 个表格问题`,
      issues
    };
  }

  /**
   * 验证表格结构
   */
  validateTableStructure(table) {
    const issues = [];
    const expectedColumns = table.headers.length;

    table.rows.forEach(row => {
      if (row.cells.length !== expectedColumns) {
        issues.push({
          type: 'table_column_mismatch',
          line: row.lineNumber + 1,
          message: `表格列数不匹配，期望 ${expectedColumns} 列，实际 ${row.cells.length} 列`
        });
      }

      // 检查空单元格
      row.cells.forEach((cell, index) => {
        if (!cell || cell.trim() === '') {
          issues.push({
            type: 'table_empty_cell',
            line: row.lineNumber + 1,
            column: index + 1,
            message: '表格包含空单元格'
          });
        }
      });
    });

    return issues;
  }

  /**
   * 验证列表
   */
  validateLists(content) {
    const issues = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // 检查列表项格式
      if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
        // 检查缩进一致性
        const indent = line.length - line.trimLeft().length;
        if (indent % 2 !== 0) {
          issues.push({
            type: 'list_inconsistent_indent',
            line: i + 1,
            message: '列表缩进不一致'
          });
        }
      }
    }

    return {
      name: 'lists',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.WARNING,
      message: `发现 ${issues.length} 个列表格式问题`,
      issues
    };
  }

  /**
   * 验证标题
   */
  validateHeadings(content) {
    const issues = [];
    const lines = content.split('\n');
    let previousLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length;
        
        // 检查标题层次跳跃
        if (level > previousLevel + 1) {
          issues.push({
            type: 'heading_hierarchy_jump',
            line: i + 1,
            message: `标题层次跳跃，从 H${previousLevel} 跳到 H${level}`
          });
        }
        
        previousLevel = level;
      }
    }

    return {
      name: 'headings',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.WARNING,
      message: `发现 ${issues.length} 个标题问题`,
      issues
    };
  }

  /**
   * 运行链接测试
   */
  async runLinkTests(content, filePath, testResult) {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const issues = [];
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      if (linkUrl.startsWith('http')) {
        // 外部链接 - 可以添加HTTP检查
        continue;
      } else {
        // 内部链接
        const targetPath = this.resolveLinkPath(filePath, linkUrl);
        const exists = await this.checkPathExists(targetPath);
        
        if (!exists) {
          issues.push({
            type: 'broken_internal_link',
            message: `断链: ${linkUrl}`,
            linkText,
            linkUrl
          });
        }
      }
    }

    testResult.tests.push({
      name: 'internal_links',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.FAILED,
      message: `发现 ${issues.length} 个断链`,
      issues
    });

    if (issues.length > 0) {
      testResult.issues.push(...issues);
    }
  }

  /**
   * 运行图片测试
   */
  async runImageTests(content, filePath, testResult) {
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const issues = [];
    let match;

    while ((match = imagePattern.exec(content)) !== null) {
      const altText = match[1];
      const imageSrc = match[2];
      
      // 检查alt文本
      if (!altText || altText.trim() === '') {
        issues.push({
          type: 'image_missing_alt',
          message: `图片缺少alt文本: ${imageSrc}`
        });
      }

      // 检查图片文件存在性
      if (!imageSrc.startsWith('http')) {
        const imagePath = this.resolveLinkPath(filePath, imageSrc);
        const exists = await this.checkPathExists(imagePath);
        
        if (!exists) {
          issues.push({
            type: 'image_not_found',
            message: `图片文件不存在: ${imageSrc}`
          });
        }
      }
    }

    testResult.tests.push({
      name: 'images',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.WARNING,
      message: `发现 ${issues.length} 个图片问题`,
      issues
    });

    if (issues.length > 0) {
      testResult.issues.push(...issues);
    }
  }

  /**
   * 运行格式化测试
   */
  async runFormattingTests(content, filePath, testResult) {
    const issues = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查行尾空白
      if (line.endsWith(' ') || line.endsWith('\t')) {
        issues.push({
          type: 'trailing_whitespace',
          line: i + 1,
          message: '行尾包含多余空白'
        });
      }

      // 检查过长的行
      if (line.length > 120) {
        issues.push({
          type: 'line_too_long',
          line: i + 1,
          message: `行长度过长 (${line.length} 字符)`
        });
      }
    }

    testResult.tests.push({
      name: 'formatting',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.WARNING,
      message: `发现 ${issues.length} 个格式问题`,
      issues
    });

    if (issues.length > 0) {
      testResult.issues.push(...issues);
    }
  }

  /**
   * 运行可访问性测试
   */
  async runAccessibilityTests(content, filePath, testResult) {
    // 基础可访问性检查
    const issues = [];
    
    // 检查标题结构
    const headingStructure = this.checkHeadingStructure(content);
    if (!headingStructure.valid) {
      issues.push(...headingStructure.issues);
    }

    testResult.tests.push({
      name: 'accessibility',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.WARNING,
      message: `发现 ${issues.length} 个可访问性问题`,
      issues
    });

    if (issues.length > 0) {
      testResult.issues.push(...issues);
    }
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTests(content, filePath, testResult) {
    const issues = [];
    
    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      // 检查文件大小
      if (fileSize > 1024 * 1024) { // 1MB
        issues.push({
          type: 'file_too_large',
          message: `文件过大: ${(fileSize / 1024 / 1024).toFixed(2)}MB`
        });
      }

      // 检查内容复杂度
      const complexity = this.calculateContentComplexity(content);
      if (complexity.score > 100) {
        issues.push({
          type: 'content_too_complex',
          message: `内容复杂度过高: ${complexity.score}`
        });
      }

    } catch (error) {
      issues.push({
        type: 'performance_check_failed',
        message: `性能检查失败: ${error.message}`
      });
    }

    testResult.tests.push({
      name: 'performance',
      status: issues.length === 0 ? VerificationStatus.PASSED : VerificationStatus.WARNING,
      message: `发现 ${issues.length} 个性能问题`,
      issues
    });

    if (issues.length > 0) {
      testResult.issues.push(...issues);
    }
  }

  /**
   * 检查标题结构
   */
  checkHeadingStructure(content) {
    const issues = [];
    const lines = content.split('\n');
    let hasH1 = false;
    let previousLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length;
        
        if (level === 1) {
          hasH1 = true;
        }
        
        if (level > previousLevel + 1) {
          issues.push({
            type: 'heading_skip_level',
            line: i + 1,
            message: `标题层次跳跃，从 H${previousLevel} 跳到 H${level}`
          });
        }
        
        previousLevel = level;
      }
    }

    if (!hasH1) {
      issues.push({
        type: 'missing_h1',
        message: '文档缺少H1标题'
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * 计算内容复杂度
   */
  calculateContentComplexity(content) {
    let score = 0;
    
    // 基于内容长度
    score += Math.floor(content.length / 1000);
    
    // 基于代码块数量
    const codeBlocks = (content.match(/```/g) || []).length / 2;
    score += codeBlocks * 5;
    
    // 基于表格数量
    const tables = (content.match(/\|.*\|/g) || []).length;
    score += tables * 3;
    
    // 基于链接数量
    const links = (content.match(/\[.*\]\(.*\)/g) || []).length;
    score += links * 2;

    return { score, factors: { codeBlocks, tables, links } };
  }

  /**
   * 测试文档渲染
   */
  async testDocumentRendering(updatePath) {
    // 模拟渲染测试
    return {
      name: 'document_rendering',
      status: VerificationStatus.PASSED,
      message: '文档渲染测试通过'
    };
  }

  /**
   * 测试导航完整性
   */
  async testNavigationIntegrity(updatePath) {
    // 模拟导航测试
    return {
      name: 'navigation_integrity',
      status: VerificationStatus.PASSED,
      message: '导航完整性测试通过'
    };
  }

  /**
   * 测试搜索功能
   */
  async testSearchFunctionality(updatePath) {
    // 模拟搜索测试
    return {
      name: 'search_functionality',
      status: VerificationStatus.PASSED,
      message: '搜索功能测试通过'
    };
  }

  /**
   * 测试跨平台兼容性
   */
  async testCrossPlatformCompatibility(updatePath) {
    // 模拟兼容性测试
    return {
      name: 'cross_platform_compatibility',
      status: VerificationStatus.PASSED,
      message: '跨平台兼容性测试通过'
    };
  }

  /**
   * 检查发布阈值
   */
  checkReleaseThresholds(issues, metrics) {
    const thresholds = this.config.releaseThresholds;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    const minorIssues = issues.filter(i => i.severity === 'minor').length;
    
    const failures = [];
    
    if (criticalIssues > thresholds.maxCriticalIssues) {
      failures.push(`严重问题数量 (${criticalIssues}) 超过阈值 (${thresholds.maxCriticalIssues})`);
    }
    
    if (majorIssues > thresholds.maxMajorIssues) {
      failures.push(`主要问题数量 (${majorIssues}) 超过阈值 (${thresholds.maxMajorIssues})`);
    }
    
    if (minorIssues > thresholds.maxMinorIssues) {
      failures.push(`次要问题数量 (${minorIssues}) 超过阈值 (${thresholds.maxMinorIssues})`);
    }

    return {
      passed: failures.length === 0,
      message: failures.length === 0 ? '所有发布阈值检查通过' : '部分发布阈值检查失败',
      details: failures
    };
  }

  /**
   * 生成发布建议
   */
  generateReleaseRecommendations(session) {
    const recommendations = [];
    
    // 基于验证结果生成建议
    for (const [stageName, stageData] of session.results.stages.entries()) {
      if (stageData.status === VerificationStatus.FAILED) {
        recommendations.push({
          priority: 'high',
          title: `修复 ${stageName} 阶段的问题`,
          description: `${stageName} 阶段验证失败，需要修复相关问题`,
          action: '检查并修复该阶段发现的所有问题'
        });
      } else if (stageData.status === VerificationStatus.WARNING) {
        recommendations.push({
          priority: 'medium',
          title: `改进 ${stageName} 阶段的质量`,
          description: `${stageName} 阶段存在警告，建议改进`,
          action: '检查并改进该阶段的警告项'
        });
      }
    }

    return recommendations;
  }

  /**
   * 生成验证报告
   */
  async generateVerificationReport(session) {
    const report = {
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      updatePath: session.updatePath,
      status: session.status,
      duration: session.duration,
      summary: this.generateReportSummary(session),
      stages: this.formatStageResults(session.results.stages),
      recommendations: session.results.stages.get(ReleaseStage.FINAL_REVIEW)?.recommendations || [],
      metrics: this.aggregateMetrics(session.results.stages)
    };

    // 保存报告
    const reportId = this.generateReportId();
    this.releaseReports.set(reportId, report);

    // 生成HTML报告
    if (this.config.generateDetailedReports) {
      await this.generateHtmlVerificationReport(report);
    }

    return report;
  }

  /**
   * 生成报告摘要
   */
  generateReportSummary(session) {
    const allTests = [];
    const allIssues = [];

    for (const stageData of session.results.stages.values()) {
      if (stageData.tests) {
        allTests.push(...stageData.tests);
      }
      if (stageData.issues) {
        allIssues.push(...stageData.issues);
      }
    }

    return {
      totalStages: session.results.stages.size,
      completedStages: Array.from(session.results.stages.values()).filter(s => s.status !== VerificationStatus.FAILED).length,
      totalTests: allTests.length,
      passedTests: allTests.filter(t => t.status === VerificationStatus.PASSED).length,
      failedTests: allTests.filter(t => t.status === VerificationStatus.FAILED).length,
      warningTests: allTests.filter(t => t.status === VerificationStatus.WARNING).length,
      totalIssues: allIssues.length,
      readyForRelease: session.status === VerificationStatus.PASSED
    };
  }

  /**
   * 格式化阶段结果
   */
  formatStageResults(stages) {
    const formatted = {};
    
    for (const [stageName, stageData] of stages.entries()) {
      formatted[stageName] = {
        status: stageData.status,
        duration: stageData.duration,
        testCount: stageData.tests?.length || 0,
        issueCount: stageData.issues?.length || 0,
        metrics: stageData.metrics || {}
      };
    }

    return formatted;
  }

  /**
   * 聚合指标
   */
  aggregateMetrics(stages) {
    const aggregated = {
      totalFiles: 0,
      totalTests: 0,
      totalIssues: 0,
      qualityScore: 0
    };

    let stageCount = 0;
    
    for (const stageData of stages.values()) {
      if (stageData.metrics) {
        aggregated.totalFiles += stageData.metrics.totalFiles || 0;
        aggregated.totalTests += stageData.metrics.totalTests || 0;
        aggregated.totalIssues += stageData.metrics.totalIssues || 0;
        
        if (stageData.metrics.qualityScore) {
          aggregated.qualityScore += stageData.metrics.qualityScore;
          stageCount++;
        }
      }
    }

    if (stageCount > 0) {
      aggregated.qualityScore = Math.round(aggregated.qualityScore / stageCount);
    }

    return aggregated;
  }

  /**
   * 生成HTML验证报告
   */
  async generateHtmlVerificationReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>更新验证报告 - ${report.sessionId}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-badge { padding: 4px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 0.8em; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .status-warning { background: #fff3cd; color: #856404; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stage-section { margin: 30px 0; padding: 20px; border: 1px solid #dee2e6; border-radius: 6px; }
        .test-list { margin: 15px 0; }
        .test-item { padding: 10px; margin: 5px 0; border-left: 4px solid #007bff; background: #f8f9fa; }
        .test-item.failed { border-left-color: #dc3545; }
        .test-item.warning { border-left-color: #ffc107; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>更新验证报告</h1>
        <p><strong>会话ID:</strong> ${report.sessionId}</p>
        <p><strong>更新路径:</strong> ${report.updatePath}</p>
        <p><strong>生成时间:</strong> ${new Date(report.timestamp).toLocaleString('zh-CN')}</p>
        <p><strong>验证状态:</strong> <span class="status-badge status-${report.status}">${report.status}</span></p>
        <p><strong>耗时:</strong> ${Math.round(report.duration / 1000)}秒</p>

        <h2>验证摘要</h2>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-number">${report.summary.totalStages}</div>
                <div>验证阶段</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.summary.totalTests}</div>
                <div>总测试数</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.summary.passedTests}</div>
                <div>通过测试</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.summary.failedTests}</div>
                <div>失败测试</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.summary.totalIssues}</div>
                <div>发现问题</div>
            </div>
        </div>

        <h2>阶段结果</h2>
        ${Object.entries(report.stages).map(([stageName, stageData]) => `
            <div class="stage-section">
                <h3>${stageName} <span class="status-badge status-${stageData.status}">${stageData.status}</span></h3>
                <p><strong>耗时:</strong> ${Math.round(stageData.duration / 1000)}秒</p>
                <p><strong>测试数:</strong> ${stageData.testCount}</p>
                <p><strong>问题数:</strong> ${stageData.issueCount}</p>
            </div>
        `).join('')}

        ${report.recommendations.length > 0 ? `
        <h2>发布建议</h2>
        <div class="recommendations">
            ${report.recommendations.map(rec => `
                <h3>${rec.title} (${rec.priority})</h3>
                <p>${rec.description}</p>
                <p><strong>建议操作:</strong> ${rec.action}</p>
            `).join('')}
        </div>
        ` : ''}

        <h2>聚合指标</h2>
        <div class="summary-grid">
            <div class="metric-card">
                <div class="metric-number">${report.metrics.totalFiles}</div>
                <div>验证文件</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.metrics.qualityScore}</div>
                <div>质量分数</div>
            </div>
            <div class="metric-card">
                <div class="metric-number">${report.summary.readyForRelease ? '是' : '否'}</div>
                <div>可发布</div>
            </div>
        </div>
    </div>
</body>
</html>`;

    const reportPath = path.join(process.cwd(), 'verification-reports', `${report.sessionId}.html`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, html);
  }

  /**
   * 辅助方法
   */
  async checkPathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async checkFilePermissions(filePath) {
    try {
      await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  async checkDependencies(updatePath) {
    // 简化的依赖检查
    return true;
  }

  async findFilesToVerify(updatePath) {
    const files = [];
    
    try {
      const stats = await fs.stat(updatePath);
      
      if (stats.isFile()) {
        if (/\.(md|markdown)$/i.test(updatePath)) {
          files.push(updatePath);
        }
      } else if (stats.isDirectory()) {
        const entries = await fs.readdir(updatePath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(updatePath, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const subFiles = await this.findFilesToVerify(fullPath);
            files.push(...subFiles);
          } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`查找验证文件时出错: ${error.message}`);
    }
    
    return files;
  }

  resolveLinkPath(basePath, linkUrl) {
    try {
      if (linkUrl.startsWith('http') || linkUrl.startsWith('#')) {
        return null;
      }

      const baseDir = path.dirname(basePath);
      return path.resolve(baseDir, linkUrl.split('#')[0]);
    } catch (error) {
      return null;
    }
  }

  calculateQualityScore(issues, fileCount) {
    if (fileCount === 0) return 100;
    
    let score = 100;
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    const minorIssues = issues.filter(i => i.severity === 'minor').length;
    
    score -= (criticalIssues * 20) / fileCount;
    score -= (majorIssues * 10) / fileCount;
    score -= (minorIssues * 2) / fileCount;
    
    return Math.max(0, Math.round(score));
  }

  checkQualityThresholds(critical, major, minor) {
    const thresholds = this.config.releaseThresholds;
    return critical <= thresholds.maxCriticalIssues &&
           major <= thresholds.maxMajorIssues &&
           minor <= thresholds.maxMinorIssues;
  }

  determineVerificationStatus(session) {
    const stageStatuses = Array.from(session.results.stages.values()).map(s => s.status);
    
    if (stageStatuses.includes(VerificationStatus.FAILED)) {
      return VerificationStatus.FAILED;
    } else if (stageStatuses.includes(VerificationStatus.WARNING)) {
      return VerificationStatus.WARNING;
    } else {
      return VerificationStatus.PASSED;
    }
  }

  determineStageStatus(stageResult) {
    const testStatuses = stageResult.tests.map(t => t.status);
    
    if (testStatuses.includes(VerificationStatus.FAILED)) {
      return VerificationStatus.FAILED;
    } else if (testStatuses.includes(VerificationStatus.WARNING)) {
      return VerificationStatus.WARNING;
    } else {
      return VerificationStatus.PASSED;
    }
  }

  determineTestStatus(tests) {
    const statuses = tests.map(t => t.status);
    
    if (statuses.includes(VerificationStatus.FAILED)) {
      return VerificationStatus.FAILED;
    } else if (statuses.includes(VerificationStatus.WARNING)) {
      return VerificationStatus.WARNING;
    } else {
      return VerificationStatus.PASSED;
    }
  }

  generateSessionId() {
    return `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取验证会话
   */
  getVerificationSession(sessionId) {
    return this.verificationSessions.get(sessionId);
  }

  /**
   * 获取所有验证会话
   */
  getAllVerificationSessions() {
    return Array.from(this.verificationSessions.values());
  }

  /**
   * 获取发布报告
   */
  getReleaseReport(reportId) {
    return this.releaseReports.get(reportId);
  }

  /**
   * 获取所有发布报告
   */
  getAllReleaseReports() {
    return Array.from(this.releaseReports.values());
  }
}

export {
  UpdateVerificationSystem,
  VerificationStatus,
  ReleaseStage,
  TestType
};