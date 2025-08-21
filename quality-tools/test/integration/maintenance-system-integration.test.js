/**
 * 维护系统集成测试
 * 测试维护流程管理器、更新验证系统和培训系统的集成
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { MaintenanceFlowManager } from '../../src/core/maintenance-flow-manager.js';
import { UpdateVerificationSystem } from '../../src/core/update-verification-system.js';
import { MaintenanceTrainingSystem } from '../../src/core/maintenance-training-system.js';

describe('维护系统集成测试', () => {
  let testDir;
  let flowManager;
  let verificationSystem;
  let trainingSystem;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'test-temp', 'maintenance-integration');
    await fs.mkdir(testDir, { recursive: true });
    
    const config = {
      autoProcessNewContent: true,
      enableImpactAnalysis: true,
      enableDependencyTracking: true,
      enablePreReleaseChecks: true,
      enableIntegrationTests: false, // 禁用以加快测试
      generateDetailedReports: true,
      enableProgressTracking: true,
      enableCertification: true
    };

    flowManager = new MaintenanceFlowManager(config);
    verificationSystem = new UpdateVerificationSystem(config);
    trainingSystem = new MaintenanceTrainingSystem({
      ...config,
      trainingPath: path.join(testDir, 'training'),
      knowledgeBasePath: path.join(testDir, 'knowledge-base')
    });

    // 等待培训系统初始化
    await new Promise(resolve => {
      trainingSystem.on('training:system:initialized', resolve);
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('完整的维护工作流程', () => {
    it('应该能够执行完整的新内容处理和验证流程', async () => {
      // 1. 创建测试文档
      const testFile = path.join(testDir, 'new-feature.md');
      const testContent = `# 新功能文档

这是一个新功能的文档。

## 功能概述

新功能提供了以下能力：

\`\`\`javascript
function newFeature() {
  console.log('Hello, new feature!');
}
\`\`\`

## 配置表格

| 参数 | 类型 | 描述 |
|------|------|------|
| name | string | 功能名称 |
| enabled | boolean | 是否启用 |

## 流程图

\`\`\`mermaid
graph TD
    A[开始] --> B[检查配置]
    B --> C[执行功能]
    C --> D[结束]
\`\`\`

[相关文档](./related-doc.md)
`;
      await fs.writeFile(testFile, testContent);

      // 2. 执行维护流程
      console.log('执行维护流程...');
      const flow = await flowManager.processNewContent(testFile, 'added');
      
      expect(flow.status).toBe('completed');
      expect(flow.results).toHaveProperty('quality_check');
      expect(flow.results).toHaveProperty('impact_analysis');
      expect(flow.results).toHaveProperty('dependency_tracking');
      expect(flow.results).toHaveProperty('fix_suggestions');
      expect(flow.results).toHaveProperty('quality_assessment');

      // 3. 执行验证流程
      console.log('执行验证流程...');
      const session = await verificationSystem.startVerification(testFile);
      
      expect(session.status).toMatch(/passed|warning/);
      expect(session.results.stages.size).toBeGreaterThan(0);

      // 4. 检查培训系统是否可以搜索相关内容
      console.log('搜索培训内容...');
      const knowledgeResults = trainingSystem.searchKnowledgeBase('质量检查');
      const faqResults = trainingSystem.searchFAQ('如何使用');
      
      expect(knowledgeResults.length).toBeGreaterThan(0);
      expect(faqResults.length).toBeGreaterThan(0);

      console.log('完整工作流程测试通过');
    });

    it('应该能够处理有问题的文档并提供修复指导', async () => {
      // 创建有问题的文档
      const problematicFile = path.join(testDir, 'problematic-doc.md');
      const problematicContent = `# 有问题的文档

未闭合的代码块：
\`\`\`javascript
console.log('unclosed');

表格列数不匹配：
| 列1 | 列2 | 列3 |
|-----|-----|
| 值1 | 值2 |

标题层次跳跃：
##### 直接跳到H5

[断链](./non-existent.md)
`;
      await fs.writeFile(problematicFile, problematicContent);

      // 执行维护流程
      const flow = await flowManager.processNewContent(problematicFile, 'added');
      
      expect(flow.status).toBe('completed');
      expect(flow.results.quality_check.issues.length).toBeGreaterThan(0);
      expect(flow.results.fix_suggestions.length).toBeGreaterThan(0);
      
      // 检查修复建议
      const suggestions = flow.results.fix_suggestions;
      const hasCodeBlockSuggestion = suggestions.some(s => s.issueType === 'code_block_unclosed');
      const hasTableSuggestion = suggestions.some(s => s.issueType === 'table_column_mismatch');
      
      expect(hasCodeBlockSuggestion || hasTableSuggestion).toBe(true);

      // 执行验证流程（应该失败）
      const session = await verificationSystem.startVerification(problematicFile);
      
      expect(session.status).toBe('failed');
      
      // 检查是否有相关的培训材料
      const troubleshootingResults = trainingSystem.searchKnowledgeBase('问题', {
        type: 'troubleshooting'
      });
      
      expect(troubleshootingResults.length).toBeGreaterThan(0);
    });
  });

  describe('系统间数据流转', () => {
    it('应该能够在系统间共享问题类型和修复指南', async () => {
      // 从维护流程管理器获取修复指南
      const codeBlockGuide = flowManager.getFixGuide('code_block_unclosed');
      expect(codeBlockGuide).toBeDefined();
      expect(codeBlockGuide.title).toBe('修复未闭合代码块');

      // 检查培训系统是否有相关的培训材料
      const trainingResults = trainingSystem.searchKnowledgeBase('代码块');
      expect(trainingResults.length).toBeGreaterThan(0);

      // 检查FAQ是否有相关问题
      const faqResults = trainingSystem.searchFAQ('代码块');
      expect(faqResults.length).toBeGreaterThan(0);
    });

    it('应该能够基于验证结果生成培训建议', async () => {
      const testFile = path.join(testDir, 'training-test.md');
      await fs.writeFile(testFile, '# Test\nContent with issues');

      // 执行验证
      const session = await verificationSystem.startVerification(testFile);
      
      // 基于验证结果搜索相关培训材料
      const issueTypes = [];
      for (const stageData of session.results.stages.values()) {
        if (stageData.issues) {
          stageData.issues.forEach(issue => {
            if (!issueTypes.includes(issue.type)) {
              issueTypes.push(issue.type);
            }
          });
        }
      }

      // 为每种问题类型搜索培训材料
      for (const issueType of issueTypes) {
        const guide = flowManager.getFixGuide(issueType);
        if (guide) {
          expect(guide).toHaveProperty('title');
          expect(guide).toHaveProperty('steps');
        }
      }
    });
  });

  describe('配置和定制化', () => {
    it('应该能够使用统一的配置', () => {
      const config = {
        qualityThresholds: {
          maxCriticalIssues: 0,
          maxMajorIssues: 3,
          maxMinorIssues: 10
        },
        releaseThresholds: {
          maxCriticalIssues: 0,
          maxMajorIssues: 2,
          maxMinorIssues: 8
        }
      };

      const customFlowManager = new MaintenanceFlowManager(config);
      const customVerificationSystem = new UpdateVerificationSystem(config);

      expect(customFlowManager.config.qualityThresholds.maxCriticalIssues).toBe(0);
      expect(customVerificationSystem.config.releaseThresholds.maxMajorIssues).toBe(2);
    });

    it('应该能够添加自定义修复指南并在培训系统中使用', () => {
      const customGuide = {
        title: '自定义问题修复',
        description: '这是一个自定义问题的修复指南',
        steps: ['步骤1', '步骤2', '步骤3'],
        autoFixable: false,
        complexity: 'medium',
        estimatedTime: '15分钟'
      };

      flowManager.addFixGuide('custom_issue', customGuide);
      const retrievedGuide = flowManager.getFixGuide('custom_issue');

      expect(retrievedGuide).toBeDefined();
      expect(retrievedGuide.title).toBe(customGuide.title);
      expect(retrievedGuide.customGuide).toBe(true);

      // 可以基于自定义指南创建培训内容
      expect(retrievedGuide.steps).toEqual(customGuide.steps);
    });
  });

  describe('性能和扩展性', () => {
    it('应该能够处理多个文件的批量操作', async () => {
      const files = [];
      
      // 创建多个测试文件
      for (let i = 0; i < 5; i++) {
        const fileName = `batch-test-${i}.md`;
        const filePath = path.join(testDir, fileName);
        const content = `# 批量测试文档 ${i}

这是第 ${i} 个测试文档。

\`\`\`javascript
console.log('File ${i}');
\`\`\`
`;
        await fs.writeFile(filePath, content);
        files.push(filePath);
      }

      // 并行处理多个文件
      const flowPromises = files.map(file => 
        flowManager.processNewContent(file, 'added')
      );

      const flows = await Promise.all(flowPromises);
      
      expect(flows).toHaveLength(5);
      flows.forEach(flow => {
        expect(flow.status).toBe('completed');
      });

      // 验证依赖图已更新
      const dependencyGraph = flowManager.getDependencyGraph();
      expect(Object.keys(dependencyGraph)).toHaveLength(5);
    });

    it('应该能够处理大型文档', async () => {
      const largeFile = path.join(testDir, 'large-document.md');
      
      // 创建大型文档内容
      let largeContent = '# 大型文档\n\n';
      for (let i = 0; i < 100; i++) {
        largeContent += `## 章节 ${i}\n\n这是第 ${i} 个章节的内容。\n\n`;
        largeContent += `\`\`\`javascript\n// 代码示例 ${i}\nconsole.log('Section ${i}');\n\`\`\`\n\n`;
      }
      
      await fs.writeFile(largeFile, largeContent);

      const startTime = Date.now();
      const flow = await flowManager.processNewContent(largeFile, 'added');
      const processingTime = Date.now() - startTime;

      expect(flow.status).toBe('completed');
      expect(processingTime).toBeLessThan(10000); // 应该在10秒内完成
      
      console.log(`大型文档处理时间: ${processingTime}ms`);
    });
  });

  describe('错误恢复和容错', () => {
    it('应该能够从部分失败中恢复', async () => {
      const testFile = path.join(testDir, 'recovery-test.md');
      await fs.writeFile(testFile, '# Recovery Test\nContent');

      // 模拟部分组件失败
      const originalCheckFile = flowManager.qualityChecker.checkFile;
      let callCount = 0;
      
      flowManager.qualityChecker.checkFile = async (filePath) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('模拟检查失败');
        }
        return originalCheckFile.call(flowManager.qualityChecker, filePath);
      };

      // 第一次调用应该失败
      await expect(flowManager.processNewContent(testFile, 'added'))
        .rejects.toThrow('模拟检查失败');

      // 第二次调用应该成功
      const flow = await flowManager.processNewContent(testFile, 'added');
      expect(flow.status).toBe('completed');

      // 恢复原始方法
      flowManager.qualityChecker.checkFile = originalCheckFile;
    });

    it('应该能够处理无效的配置', () => {
      expect(() => {
        new MaintenanceFlowManager({
          qualityThresholds: {
            maxCriticalIssues: -1 // 无效值
          }
        });
      }).not.toThrow(); // 应该使用默认值而不是抛出错误
    });
  });

  describe('监控和报告', () => {
    it('应该能够生成综合的系统状态报告', async () => {
      const testFile = path.join(testDir, 'status-test.md');
      await fs.writeFile(testFile, '# Status Test\nContent');

      // 执行一些操作
      await flowManager.processNewContent(testFile, 'added');
      await verificationSystem.startVerification(testFile);

      // 获取系统状态
      const flowStatus = flowManager.getActiveFlows();
      const verificationSessions = verificationSystem.getAllVerificationSessions();
      const trainingStats = trainingSystem.getTrainingStatistics();

      expect(flowStatus).toBeInstanceOf(Array);
      expect(verificationSessions).toBeInstanceOf(Array);
      expect(trainingStats).toHaveProperty('totalModules');
      expect(trainingStats).toHaveProperty('totalKnowledgeEntries');
      expect(trainingStats).toHaveProperty('totalFAQs');

      // 验证数据一致性
      expect(verificationSessions.length).toBeGreaterThan(0);
      expect(trainingStats.totalModules).toBeGreaterThan(0);
    });
  });
});