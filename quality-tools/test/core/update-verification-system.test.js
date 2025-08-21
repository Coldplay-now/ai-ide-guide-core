/**
 * 更新验证系统测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { UpdateVerificationSystem, VerificationStatus, ReleaseStage, TestType } from '../../src/core/update-verification-system.js';

describe('UpdateVerificationSystem', () => {
  let verificationSystem;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'test-temp', 'verification');
    await fs.mkdir(testDir, { recursive: true });
    
    verificationSystem = new UpdateVerificationSystem({
      enablePreReleaseChecks: true,
      enableIntegrationTests: true,
      generateDetailedReports: true,
      releaseThresholds: {
        maxCriticalIssues: 0,
        maxMajorIssues: 3,
        maxMinorIssues: 10
      }
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('验证流程管理', () => {
    it('应该能够启动完整的验证流程', async () => {
      // 创建测试文件
      const testFile = path.join(testDir, 'test-document.md');
      const testContent = `# 测试文档

这是一个测试文档。

\`\`\`javascript
console.log('Hello World');
\`\`\`

## 表格

| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |

[内部链接](./other-doc.md)
`;
      await fs.writeFile(testFile, testContent);

      const session = await verificationSystem.startVerification(testFile);

      expect(session.status).toBe(VerificationStatus.PASSED);
      expect(session.stage).toBe(ReleaseStage.READY_FOR_RELEASE);
      expect(session.results.stages.size).toBe(5);
      expect(session.duration).toBeGreaterThan(0);
    });

    it('应该能够处理验证失败的情况', async () => {
      // 创建有问题的测试文件
      const testFile = path.join(testDir, 'problematic-document.md');
      const testContent = `# 测试文档

未闭合的代码块：
\`\`\`javascript
console.log('Hello World');

| 列1 | 列2 | 列3 |
|-----|-----|
| 值1 | 值2 |

[断链](./non-existent.md)
`;
      await fs.writeFile(testFile, testContent);

      const session = await verificationSystem.startVerification(testFile);

      expect(session.status).toBe(VerificationStatus.FAILED);
      expect(session.results.stages.get(ReleaseStage.CONTENT_VERIFICATION).status)
        .toBe(VerificationStatus.FAILED);
    });

    it('应该能够跳过非关键测试', async () => {
      const testFile = path.join(testDir, 'skip-test.md');
      await fs.writeFile(testFile, '# Test\nContent');

      const session = await verificationSystem.startVerification(testFile, {
        skipNonCritical: true
      });

      expect(session.options.skipNonCritical).toBe(true);
      expect(session.status).toBe(VerificationStatus.PASSED);
    });
  });

  describe('测试套件执行', () => {
    it('应该能够运行语法测试', async () => {
      const testFile = path.join(testDir, 'syntax-test.md');
      const testContent = `# 语法测试

\`\`\`javascript
console.log('test');
\`\`\`

\`\`\`
// 缺少语言标识符
code without language
\`\`\`

| 表格 | 测试 |
|------|------|
| 值1  | 值2  |
| 值3  |      |
`;
      await fs.writeFile(testFile, testContent);

      const testSuite = verificationSystem.testSuites.get(TestType.SYNTAX);
      const result = await verificationSystem.runTestSuite(testFile, TestType.SYNTAX, testSuite);

      expect(result.type).toBe(TestType.SYNTAX);
      expect(result.tests).toHaveLength(4); // code_blocks, tables, lists, headings
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('应该能够验证代码块', () => {
      const content = `# 测试

\`\`\`javascript
console.log('good');
\`\`\`

\`\`\`
// 缺少语言标识符
bad code
\`\`\`

\`\`\`python
print('unclosed')
`;

      const result = verificationSystem.validateCodeBlocks(content);

      expect(result.name).toBe('code_blocks');
      expect(result.status).toBe(VerificationStatus.FAILED);
      expect(result.issues).toHaveLength(2); // 缺少语言标识符 + 未闭合
    });

    it('应该能够验证表格', () => {
      const content = `# 表格测试

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |
| 值4 | 值5 |     |
| 值6 |     | 值7 |
`;

      const result = verificationSystem.validateTables(content);

      expect(result.name).toBe('tables');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.type === 'table_column_mismatch')).toBe(true);
      expect(result.issues.some(issue => issue.type === 'table_empty_cell')).toBe(true);
    });

    it('应该能够验证标题层次', () => {
      const content = `# 主标题

### 跳级标题

## 正常二级标题

##### 又跳级了
`;

      const result = verificationSystem.validateHeadings(content);

      expect(result.name).toBe('headings');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.type === 'heading_hierarchy_jump')).toBe(true);
    });
  });

  describe('链接和图片验证', () => {
    it('应该能够检测断链', async () => {
      const testFile = path.join(testDir, 'link-test.md');
      const testContent = `# 链接测试

[存在的文件](./existing-file.md)
[不存在的文件](./non-existent.md)
[外部链接](https://example.com)
`;
      await fs.writeFile(testFile, testContent);

      // 创建存在的文件
      const existingFile = path.join(testDir, 'existing-file.md');
      await fs.writeFile(existingFile, '# 存在的文件');

      const testResult = {
        tests: [],
        issues: []
      };

      await verificationSystem.runLinkTests(testContent, testFile, testResult);

      expect(testResult.tests).toHaveLength(1);
      expect(testResult.issues.some(issue => issue.type === 'broken_internal_link')).toBe(true);
    });

    it('应该能够检测图片问题', async () => {
      const testFile = path.join(testDir, 'image-test.md');
      const testContent = `# 图片测试

![有alt文本的图片](./existing-image.png)
![](./missing-alt.png)
![不存在的图片](./non-existent.png)
`;
      await fs.writeFile(testFile, testContent);

      // 创建存在的图片文件
      const existingImage = path.join(testDir, 'existing-image.png');
      await fs.writeFile(existingImage, 'fake image content');

      const testResult = {
        tests: [],
        issues: []
      };

      await verificationSystem.runImageTests(testContent, testFile, testResult);

      expect(testResult.tests).toHaveLength(1);
      expect(testResult.issues.some(issue => issue.type === 'image_missing_alt')).toBe(true);
      expect(testResult.issues.some(issue => issue.type === 'image_not_found')).toBe(true);
    });
  });

  describe('质量阈值检查', () => {
    it('应该能够检查发布阈值', () => {
      const issues = [
        { severity: 'critical' },
        { severity: 'major' },
        { severity: 'major' },
        { severity: 'minor' },
        { severity: 'minor' }
      ];

      const result = verificationSystem.checkReleaseThresholds(issues, {});

      expect(result.passed).toBe(false); // 1个严重问题超过阈值0
      expect(result.details).toContain('严重问题数量');
    });

    it('应该通过符合阈值的检查', () => {
      const issues = [
        { severity: 'major' },
        { severity: 'minor' },
        { severity: 'minor' }
      ];

      const result = verificationSystem.checkReleaseThresholds(issues, {});

      expect(result.passed).toBe(true);
      expect(result.message).toContain('通过');
    });
  });

  describe('报告生成', () => {
    it('应该能够生成验证报告', async () => {
      const testFile = path.join(testDir, 'report-test.md');
      await fs.writeFile(testFile, '# Test\nContent');

      const session = await verificationSystem.startVerification(testFile, {
        generateReport: true
      });

      expect(session.results.stages.size).toBeGreaterThan(0);
      
      // 检查是否生成了报告
      const reports = verificationSystem.getAllReleaseReports();
      expect(reports.length).toBeGreaterThan(0);
      
      const report = reports[0];
      expect(report).toHaveProperty('sessionId');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('stages');
      expect(report).toHaveProperty('metrics');
    });

    it('应该能够生成报告摘要', async () => {
      const mockSession = {
        results: {
          stages: new Map([
            ['stage1', {
              status: VerificationStatus.PASSED,
              tests: [
                { status: VerificationStatus.PASSED },
                { status: VerificationStatus.FAILED }
              ],
              issues: [{ type: 'test_issue' }]
            }],
            ['stage2', {
              status: VerificationStatus.FAILED,
              tests: [
                { status: VerificationStatus.FAILED }
              ],
              issues: [{ type: 'test_issue2' }]
            }]
          ])
        }
      };

      const summary = verificationSystem.generateReportSummary(mockSession);

      expect(summary.totalStages).toBe(2);
      expect(summary.completedStages).toBe(1);
      expect(summary.totalTests).toBe(3);
      expect(summary.passedTests).toBe(1);
      expect(summary.failedTests).toBe(2);
      expect(summary.totalIssues).toBe(2);
    });
  });

  describe('集成测试', () => {
    it('应该能够执行集成测试阶段', async () => {
      const testFile = path.join(testDir, 'integration-test.md');
      await fs.writeFile(testFile, '# Integration Test\nContent');

      const session = {
        updatePath: testFile,
        results: { stages: new Map() }
      };

      const stageResult = {
        stage: ReleaseStage.INTEGRATION_TEST,
        startTime: new Date().toISOString(),
        status: VerificationStatus.RUNNING,
        tests: [],
        issues: [],
        metrics: {}
      };

      await verificationSystem.executeIntegrationTest(session, stageResult);

      expect(stageResult.tests.length).toBeGreaterThan(0);
      expect(stageResult.tests.some(test => test.name === 'integration_tests')).toBe(true);
    });

    it('应该能够跳过禁用的集成测试', async () => {
      const disabledSystem = new UpdateVerificationSystem({
        enableIntegrationTests: false
      });

      const testFile = path.join(testDir, 'no-integration-test.md');
      await fs.writeFile(testFile, '# No Integration Test\nContent');

      const session = {
        updatePath: testFile,
        results: { stages: new Map() }
      };

      const stageResult = {
        stage: ReleaseStage.INTEGRATION_TEST,
        startTime: new Date().toISOString(),
        status: VerificationStatus.RUNNING,
        tests: [],
        issues: [],
        metrics: {}
      };

      await disabledSystem.executeIntegrationTest(session, stageResult);

      expect(stageResult.tests).toHaveLength(1);
      expect(stageResult.tests[0].message).toContain('已禁用');
    });
  });

  describe('性能和可访问性测试', () => {
    it('应该能够运行性能测试', async () => {
      const testFile = path.join(testDir, 'performance-test.md');
      const largeContent = '# 性能测试\n' + 'x'.repeat(2000000); // 2MB内容
      await fs.writeFile(testFile, largeContent);

      const testResult = {
        tests: [],
        issues: []
      };

      await verificationSystem.runPerformanceTests(largeContent, testFile, testResult);

      expect(testResult.tests).toHaveLength(1);
      expect(testResult.issues.some(issue => issue.type === 'file_too_large')).toBe(true);
    });

    it('应该能够计算内容复杂度', () => {
      const complexContent = `# 复杂内容

\`\`\`javascript
// 代码块1
\`\`\`

\`\`\`python
// 代码块2
\`\`\`

| 表格1 | 列2 |
|-------|-----|
| 值1   | 值2 |

| 表格2 | 列2 |
|-------|-----|
| 值3   | 值4 |

[链接1](./link1.md)
[链接2](./link2.md)
[链接3](./link3.md)
`;

      const complexity = verificationSystem.calculateContentComplexity(complexContent);

      expect(complexity.score).toBeGreaterThan(0);
      expect(complexity.factors.codeBlocks).toBe(2);
      expect(complexity.factors.tables).toBeGreaterThan(0);
      expect(complexity.factors.links).toBe(3);
    });

    it('应该能够检查标题结构的可访问性', () => {
      const content = `# 主标题

## 二级标题

### 三级标题

##### 跳级标题
`;

      const result = verificationSystem.checkHeadingStructure(content);

      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.type === 'heading_skip_level')).toBe(true);
    });
  });

  describe('会话管理', () => {
    it('应该能够跟踪验证会话', async () => {
      const testFile = path.join(testDir, 'session-test.md');
      await fs.writeFile(testFile, '# Session Test\nContent');

      const session = await verificationSystem.startVerification(testFile);
      const sessionId = session.id;

      const retrievedSession = verificationSystem.getVerificationSession(sessionId);
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession.id).toBe(sessionId);

      const allSessions = verificationSystem.getAllVerificationSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      expect(allSessions.some(s => s.id === sessionId)).toBe(true);
    });

    it('应该能够管理发布报告', async () => {
      const testFile = path.join(testDir, 'report-management-test.md');
      await fs.writeFile(testFile, '# Report Management Test\nContent');

      await verificationSystem.startVerification(testFile, {
        generateReport: true
      });

      const allReports = verificationSystem.getAllReleaseReports();
      expect(allReports.length).toBeGreaterThan(0);

      const reportId = allReports[0].sessionId;
      const retrievedReport = verificationSystem.getReleaseReport(reportId);
      expect(retrievedReport).toBeDefined();
    });
  });

  describe('事件处理', () => {
    it('应该发出验证事件', async () => {
      const testFile = path.join(testDir, 'event-test.md');
      await fs.writeFile(testFile, '# Event Test\nContent');

      const events = [];
      verificationSystem.on('verification:started', (session) => 
        events.push({ type: 'started', session }));
      verificationSystem.on('verification:completed', (session) => 
        events.push({ type: 'completed', session }));
      verificationSystem.on('verification:stage:started', (data) => 
        events.push({ type: 'stage:started', data }));
      verificationSystem.on('verification:stage:completed', (data) => 
        events.push({ type: 'stage:completed', data }));

      await verificationSystem.startVerification(testFile);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
      expect(events.some(e => e.type === 'stage:started')).toBe(true);
      expect(events.some(e => e.type === 'stage:completed')).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理验证错误', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.md');

      await expect(verificationSystem.startVerification(nonExistentFile))
        .rejects.toThrow();
    });

    it('应该处理阶段执行错误', async () => {
      const testFile = path.join(testDir, 'stage-error-test.md');
      await fs.writeFile(testFile, '# Stage Error Test\nContent');

      // 模拟阶段执行错误
      const originalExecuteStage = verificationSystem.executeStage;
      verificationSystem.executeStage = vi.fn().mockRejectedValue(new Error('阶段执行失败'));

      const errorEvents = [];
      verificationSystem.on('verification:failed', (data) => errorEvents.push(data));

      await expect(verificationSystem.startVerification(testFile))
        .rejects.toThrow('阶段执行失败');

      expect(errorEvents).toHaveLength(1);

      // 恢复原始方法
      verificationSystem.executeStage = originalExecuteStage;
    });
  });
});