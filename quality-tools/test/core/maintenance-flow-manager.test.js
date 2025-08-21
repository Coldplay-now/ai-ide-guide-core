/**
 * 维护流程管理器测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { MaintenanceFlowManager, FlowStatus, ChangeType, ImpactLevel } from '../../src/core/maintenance-flow-manager.js';

describe('MaintenanceFlowManager', () => {
  let flowManager;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'test-temp', 'maintenance-flow');
    await fs.mkdir(testDir, { recursive: true });
    
    flowManager = new MaintenanceFlowManager({
      autoProcessNewContent: true,
      enableImpactAnalysis: true,
      enableDependencyTracking: true
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('新内容质量检查流程', () => {
    it('应该能够处理新添加的内容', async () => {
      // 创建测试文件
      const testFile = path.join(testDir, 'new-content.md');
      const testContent = `# 测试文档

这是一个测试文档。

\`\`\`javascript
console.log('Hello World');
\`\`\`

## 表格测试

| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |
`;
      await fs.writeFile(testFile, testContent);

      // 处理新内容
      const flow = await flowManager.processNewContent(testFile, ChangeType.ADDED);

      expect(flow.status).toBe(FlowStatus.COMPLETED);
      expect(flow.type).toBe('new_content_check');
      expect(flow.contentPath).toBe(testFile);
      expect(flow.changeType).toBe(ChangeType.ADDED);
      expect(flow.steps).toHaveLength(5);
      expect(flow.results).toHaveProperty('quality_check');
      expect(flow.results).toHaveProperty('impact_analysis');
      expect(flow.results).toHaveProperty('dependency_tracking');
      expect(flow.results).toHaveProperty('fix_suggestions');
      expect(flow.results).toHaveProperty('quality_assessment');
    });

    it('应该能够分析内容影响', async () => {
      const testFile = path.join(testDir, 'important-file.md');
      const testContent = `# 重要文档

这是一个重要的文档，被其他文件引用。

[链接到其他文档](./other-doc.md)
`;
      await fs.writeFile(testFile, testContent);

      // 创建引用文件
      const referencingFile = path.join(testDir, 'referencing-file.md');
      const referencingContent = `# 引用文档

参考 [重要文档](./important-file.md) 获取更多信息。
`;
      await fs.writeFile(referencingFile, referencingContent);

      const impact = await flowManager.analyzeContentImpact(testFile, ChangeType.MODIFIED);

      expect(impact).toHaveProperty('level');
      expect(impact).toHaveProperty('affectedFiles');
      expect(impact).toHaveProperty('recommendations');
      expect(impact.affectedFiles).toBeInstanceOf(Array);
      expect(impact.recommendations).toBeInstanceOf(Array);
    });

    it('应该能够跟踪内容依赖关系', async () => {
      const testFile = path.join(testDir, 'dependent-file.md');
      const testContent = `# 依赖文档

这个文档包含多种依赖：

- [内部链接](./internal-doc.md)
- [外部链接](https://example.com)
- ![图片](./image.png)
- #[[file:code-example.js]]
`;
      await fs.writeFile(testFile, testContent);

      const dependencies = await flowManager.trackContentDependencies(testFile);

      expect(dependencies).toHaveProperty('internalLinks');
      expect(dependencies).toHaveProperty('externalLinks');
      expect(dependencies).toHaveProperty('imageReferences');
      expect(dependencies).toHaveProperty('codeReferences');
      expect(dependencies.internalLinks).toHaveLength(1);
      expect(dependencies.externalLinks).toHaveLength(1);
      expect(dependencies.imageReferences).toHaveLength(1);
      expect(dependencies.codeReferences).toHaveLength(1);
    });
  });

  describe('修复指南系统', () => {
    it('应该提供标准化的修复指南', () => {
      const guide = flowManager.getFixGuide('code_block_unclosed');
      
      expect(guide).toBeDefined();
      expect(guide).toHaveProperty('title');
      expect(guide).toHaveProperty('description');
      expect(guide).toHaveProperty('steps');
      expect(guide).toHaveProperty('autoFixable');
      expect(guide).toHaveProperty('complexity');
      expect(guide).toHaveProperty('estimatedTime');
    });

    it('应该能够添加自定义修复指南', () => {
      const customGuide = {
        title: '自定义修复指南',
        description: '这是一个自定义的修复指南',
        steps: ['步骤1', '步骤2', '步骤3'],
        autoFixable: false,
        complexity: 'high',
        estimatedTime: '30分钟'
      };

      flowManager.addFixGuide('custom_issue', customGuide);
      const retrievedGuide = flowManager.getFixGuide('custom_issue');

      expect(retrievedGuide).toBeDefined();
      expect(retrievedGuide.title).toBe(customGuide.title);
      expect(retrievedGuide.customGuide).toBe(true);
    });

    it('应该能够生成修复建议', () => {
      const mockIssues = [
        {
          type: 'code_block_unclosed',
          severity: 'major',
          file: 'test.md',
          line: 10,
          description: '代码块未闭合'
        },
        {
          type: 'table_column_mismatch',
          severity: 'major',
          file: 'test.md',
          line: 20,
          description: '表格列数不匹配'
        }
      ];

      const suggestions = flowManager.generateFixSuggestions(mockIssues);

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toHaveProperty('issueType', 'code_block_unclosed');
      expect(suggestions[0]).toHaveProperty('count', 1);
      expect(suggestions[0]).toHaveProperty('guide');
      expect(suggestions[0].guide).toHaveProperty('autoFixable', true);
    });
  });

  describe('质量评估', () => {
    it('应该能够评估内容质量', () => {
      const mockResults = {
        quality_check: {
          issues: [
            { severity: 'critical' },
            { severity: 'major' },
            { severity: 'major' },
            { severity: 'minor' },
            { severity: 'minor' },
            { severity: 'minor' }
          ]
        }
      };

      const assessment = flowManager.assessContentQuality(mockResults);

      expect(assessment).toHaveProperty('overallScore');
      expect(assessment).toHaveProperty('qualityLevel');
      expect(assessment).toHaveProperty('passesThresholds');
      expect(assessment).toHaveProperty('recommendations');
      expect(assessment).toHaveProperty('metrics');
      
      expect(assessment.metrics.totalIssues).toBe(6);
      expect(assessment.metrics.criticalIssues).toBe(1);
      expect(assessment.metrics.majorIssues).toBe(2);
      expect(assessment.metrics.minorIssues).toBe(3);
      expect(assessment.overallScore).toBeLessThan(100);
    });

    it('应该根据质量分数确定质量级别', () => {
      const excellentResults = { quality_check: { issues: [] } };
      const poorResults = { 
        quality_check: { 
          issues: Array(10).fill({ severity: 'critical' })
        } 
      };

      const excellentAssessment = flowManager.assessContentQuality(excellentResults);
      const poorAssessment = flowManager.assessContentQuality(poorResults);

      expect(excellentAssessment.qualityLevel).toBe('excellent');
      expect(excellentAssessment.overallScore).toBe(100);
      
      expect(poorAssessment.qualityLevel).toBe('poor');
      expect(poorAssessment.overallScore).toBe(0);
    });
  });

  describe('依赖图管理', () => {
    it('应该能够构建和查询依赖图', async () => {
      const testFile = path.join(testDir, 'dependency-test.md');
      const testContent = `# 依赖测试

[链接1](./file1.md)
[链接2](./file2.md)
`;
      await fs.writeFile(testFile, testContent);

      await flowManager.trackContentDependencies(testFile);
      const dependencies = flowManager.getFileDependencies(testFile);

      expect(dependencies).toBeDefined();
      expect(dependencies).toHaveProperty('filePath', testFile);
      expect(dependencies).toHaveProperty('dependencies');
      expect(dependencies.dependencies.internal).toHaveLength(2);
    });

    it('应该能够获取完整的依赖图', async () => {
      const testFile1 = path.join(testDir, 'file1.md');
      const testFile2 = path.join(testDir, 'file2.md');
      
      await fs.writeFile(testFile1, '# File 1\n[Link to file2](./file2.md)');
      await fs.writeFile(testFile2, '# File 2\n[Link to file1](./file1.md)');

      await flowManager.trackContentDependencies(testFile1);
      await flowManager.trackContentDependencies(testFile2);

      const dependencyGraph = flowManager.getDependencyGraph();

      expect(Object.keys(dependencyGraph)).toHaveLength(2);
      expect(dependencyGraph[testFile1]).toBeDefined();
      expect(dependencyGraph[testFile2]).toBeDefined();
    });
  });

  describe('流程管理', () => {
    it('应该能够跟踪活动流程', async () => {
      const testFile = path.join(testDir, 'flow-test.md');
      await fs.writeFile(testFile, '# Test\nContent');

      const flowPromise = flowManager.processNewContent(testFile);
      
      // 检查活动流程
      const activeFlows = flowManager.getActiveFlows();
      expect(activeFlows).toHaveLength(1);
      expect(activeFlows[0].status).toBe(FlowStatus.RUNNING);

      await flowPromise;

      // 流程完成后检查
      const completedFlow = flowManager.getActiveFlows()[0];
      expect(completedFlow.status).toBe(FlowStatus.COMPLETED);
    });

    it('应该能够取消流程', async () => {
      const testFile = path.join(testDir, 'cancel-test.md');
      await fs.writeFile(testFile, '# Test\nContent');

      // 模拟长时间运行的流程
      const originalProcessNewContent = flowManager.processNewContent;
      flowManager.processNewContent = vi.fn().mockImplementation(async (path) => {
        const flow = {
          id: 'test-flow',
          status: FlowStatus.RUNNING,
          contentPath: path
        };
        flowManager.activeFlows.set('test-flow', flow);
        return new Promise(resolve => setTimeout(resolve, 1000));
      });

      const flowPromise = flowManager.processNewContent(testFile);
      
      // 取消流程
      setTimeout(() => {
        flowManager.cancelFlow('test-flow');
      }, 100);

      const cancelledFlow = flowManager.getFlow('test-flow');
      expect(cancelledFlow.status).toBe(FlowStatus.CANCELLED);
    });

    it('应该能够清理完成的流程', () => {
      // 添加一些旧的完成流程
      const oldFlow = {
        id: 'old-flow',
        status: FlowStatus.COMPLETED,
        startTime: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25小时前
      };
      
      const recentFlow = {
        id: 'recent-flow',
        status: FlowStatus.COMPLETED,
        startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1小时前
      };

      flowManager.activeFlows.set('old-flow', oldFlow);
      flowManager.activeFlows.set('recent-flow', recentFlow);

      expect(flowManager.activeFlows.size).toBe(2);

      // 清理24小时前的流程
      flowManager.cleanupCompletedFlows(24 * 60 * 60 * 1000);

      expect(flowManager.activeFlows.size).toBe(1);
      expect(flowManager.activeFlows.has('recent-flow')).toBe(true);
      expect(flowManager.activeFlows.has('old-flow')).toBe(false);
    });
  });

  describe('事件处理', () => {
    it('应该发出流程事件', async () => {
      const testFile = path.join(testDir, 'event-test.md');
      await fs.writeFile(testFile, '# Test\nContent');

      const events = [];
      flowManager.on('flow:started', (flow) => events.push({ type: 'started', flow }));
      flowManager.on('flow:completed', (flow) => events.push({ type: 'completed', flow }));
      flowManager.on('flow:step:started', (data) => events.push({ type: 'step:started', data }));
      flowManager.on('flow:step:completed', (data) => events.push({ type: 'step:completed', data }));

      await flowManager.processNewContent(testFile);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'started')).toBe(true);
      expect(events.some(e => e.type === 'completed')).toBe(true);
      expect(events.some(e => e.type === 'step:started')).toBe(true);
      expect(events.some(e => e.type === 'step:completed')).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理文件不存在的情况', async () => {
      const nonExistentFile = path.join(testDir, 'non-existent.md');

      await expect(flowManager.processNewContent(nonExistentFile))
        .rejects.toThrow();
    });

    it('应该处理流程执行错误', async () => {
      const testFile = path.join(testDir, 'error-test.md');
      await fs.writeFile(testFile, '# Test\nContent');

      // 模拟质量检查错误
      const originalCheckFile = flowManager.qualityChecker.checkFile;
      flowManager.qualityChecker.checkFile = vi.fn().mockRejectedValue(new Error('检查失败'));

      const errorEvents = [];
      flowManager.on('flow:failed', (data) => errorEvents.push(data));

      await expect(flowManager.processNewContent(testFile))
        .rejects.toThrow('检查失败');

      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].error.message).toBe('检查失败');

      // 恢复原始方法
      flowManager.qualityChecker.checkFile = originalCheckFile;
    });
  });
});