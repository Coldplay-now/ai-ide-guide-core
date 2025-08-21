/**
 * 修复验证和确认系统测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { FixVerifier, FixStatus, VerificationResult } from '../../src/core/fix-verifier.js';

describe('FixVerifier', () => {
  let verifier;
  let tempDir;

  beforeEach(async () => {
    verifier = new FixVerifier({
      regressionTolerance: 0.1,
      minImprovementThreshold: 0.05
    });
    
    // 创建临时目录
    tempDir = path.join(__dirname, 'temp_verifier_' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理临时文件
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('修复验证', () => {
    it('应该验证成功的修复', async () => {
      const fixResult = {
        issueId: 'test-issue-1',
        type: 'code_block_unclosed',
        line: 5,
        status: 'fixed'
      };

      const originalContent = `# 测试文档

\`\`\`javascript
console.log('test');

没有闭合的代码块`;

      const fixedContent = `# 测试文档

\`\`\`javascript
console.log('test');
\`\`\`

修复后的内容`;

      const verification = await verifier.verifyFix(
        fixResult,
        originalContent,
        fixedContent,
        'test.md'
      );

      expect(verification.status).toBe(FixStatus.VERIFIED);
      expect(verification.result).toBe(VerificationResult.SUCCESS);
      expect(verification.metrics.improvementRate).toBeGreaterThan(0);
    });

    it('应该检测修复失败', async () => {
      const fixResult = {
        issueId: 'test-issue-2',
        type: 'code_block_unclosed',
        line: 5,
        status: 'fixed'
      };

      const originalContent = `# 测试文档

\`\`\`javascript
console.log('test');

没有闭合的代码块`;

      const fixedContent = originalContent; // 没有实际修复

      const verification = await verifier.verifyFix(
        fixResult,
        originalContent,
        fixedContent,
        'test.md'
      );



      expect(verification.status).toBe(FixStatus.FAILED);
      expect(verification.result).toBe(VerificationResult.FAILURE);
    });

    it('应该检测回归问题', async () => {
      const fixResult = {
        issueId: 'test-issue-3',
        type: 'table_column_mismatch',
        line: 5,
        status: 'fixed'
      };

      const originalContent = `# 测试文档

| 列1 | 列2 |
|-----|-----|
| 值1 |`;

      const fixedContent = `# 测试文档

| 列1 | 列2 |
|-----|-----|
| 值1 | 值2 |

\`\`\`
新增的未闭合代码块`; // 引入了新问题

      const verification = await verifier.verifyFix(
        fixResult,
        originalContent,
        fixedContent,
        'test.md'
      );

      expect(verification.newIssues.length).toBeGreaterThan(0);
      expect(verification.metrics.regressionIssues).toBeGreaterThan(0);
    });
  });

  describe('批量验证', () => {
    it('应该批量验证多个修复', async () => {
      const fixResults = [
        { issueId: 'issue-1', type: 'code_block_unclosed', line: 5 },
        { issueId: 'issue-2', type: 'table_column_mismatch', line: 10 }
      ];

      const originalContents = [
        '# 文档1\n```js\nconsole.log("test");',
        '# 文档2\n| A | B |\n|---|---|\n| 1 |'
      ];

      const fixedContents = [
        '# 文档1\n```js\nconsole.log("test");\n```',
        '# 文档2\n| A | B |\n|---|---|\n| 1 | 2 |'
      ];

      const filePaths = ['doc1.md', 'doc2.md'];

      const verifications = await verifier.verifyBatchFixes(
        fixResults,
        originalContents,
        fixedContents,
        filePaths
      );

      expect(verifications).toHaveLength(2);
      expect(verifications.every(v => v.status === FixStatus.VERIFIED)).toBe(true);
    });
  });

  describe('问题解决确认', () => {
    it('应该确认问题解决', async () => {
      // 先创建一个验证记录
      const fixResult = { issueId: 'confirm-test-1', type: 'test', line: 1 };
      const verification = await verifier.verifyFix(
        fixResult,
        '# 原始内容\n```\ntest',
        '# 修复内容\n```\ntest\n```',
        'test.md'
      );

      // 确认解决
      const confirmation = await verifier.confirmIssueResolution(
        'confirm-test-1',
        true
      );

      expect(confirmation.userConfirmation).toBe(true);
      expect(confirmation.finalStatus).toBe(FixStatus.VERIFIED);
      expect(confirmation.confidence).toBeGreaterThan(0.5);
    });

    it('应该拒绝问题解决', async () => {
      // 先创建一个验证记录
      const fixResult = { issueId: 'reject-test-1', type: 'test', line: 1 };
      await verifier.verifyFix(
        fixResult,
        '# 原始内容',
        '# 修复内容',
        'test.md'
      );

      // 拒绝解决
      const confirmation = await verifier.confirmIssueResolution(
        'reject-test-1',
        false
      );

      expect(confirmation.userConfirmation).toBe(false);
      expect(confirmation.finalStatus).toBe(FixStatus.REJECTED);
    });

    it('应该处理不存在的问题ID', async () => {
      await expect(
        verifier.confirmIssueResolution('nonexistent-issue')
      ).rejects.toThrow('未找到问题');
    });
  });

  describe('置信度计算', () => {
    it('应该正确计算置信度', async () => {
      const verification = {
        result: VerificationResult.SUCCESS,
        metrics: {
          improvementRate: 0.9,
          regressionRate: 0.0
        }
      };

      const confidence1 = verifier.calculateConfidence(verification, true);
      const confidence2 = verifier.calculateConfidence(verification, false);
      const confidence3 = verifier.calculateConfidence(verification, null);

      expect(confidence1).toBeGreaterThan(confidence3);
      expect(confidence3).toBeGreaterThan(confidence2);
      expect(confidence1).toBeLessThanOrEqual(1);
      expect(confidence2).toBeGreaterThanOrEqual(0);
    });
  });

  describe('趋势分析', () => {
    beforeEach(() => {
      // 添加一些测试趋势数据
      const testData = [
        {
          timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          filePath: 'test1.md',
          originalIssueCount: 10,
          fixedIssueCount: 5,
          improvementRate: 0.5,
          regressionRate: 0.1,
          verificationResult: VerificationResult.SUCCESS
        },
        {
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          filePath: 'test2.md',
          originalIssueCount: 8,
          fixedIssueCount: 2,
          improvementRate: 0.75,
          regressionRate: 0.05,
          verificationResult: VerificationResult.SUCCESS
        },
        {
          timestamp: new Date().toISOString(),
          filePath: 'test3.md',
          originalIssueCount: 12,
          fixedIssueCount: 3,
          improvementRate: 0.75,
          regressionRate: 0.0,
          verificationResult: VerificationResult.PARTIAL
        }
      ];

      verifier.trendData = testData;
    });

    it('应该生成趋势报告', async () => {
      const report = verifier.generateTrendReport('7d');

      expect(report.dataPoints).toBe(3);
      expect(report.trends).toHaveProperty('issueCount');
      expect(report.trends).toHaveProperty('improvementRate');
      expect(report.trends).toHaveProperty('regressionRate');
      expect(report.trends).toHaveProperty('verificationSuccess');
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('应该计算成功率', async () => {
      const data = verifier.trendData;
      const successRate = verifier.calculateSuccessRate(data);

      expect(successRate.totalVerifications).toBe(3);
      expect(successRate.successfulVerifications).toBe(2);
      expect(successRate.successRate).toBeCloseTo(2/3);
    });

    it('应该分析文件影响分布', async () => {
      const data = verifier.trendData;
      const distribution = verifier.calculateFileImpactDistribution(data);

      expect(distribution).toHaveLength(3);
      expect(distribution[0]).toHaveProperty('filePath');
      expect(distribution[0]).toHaveProperty('fixes');
      expect(distribution[0]).toHaveProperty('averageIssues');
    });

    it('应该处理空数据', async () => {
      verifier.trendData = [];
      const report = verifier.generateTrendReport('7d');

      expect(report.dataPoints).toBe(0);
      expect(report.summary).toContain('没有足够的数据');
    });
  });

  describe('趋势计算', () => {
    it('应该计算上升趋势', async () => {
      const data = [
        { improvementRate: 0.3 },
        { improvementRate: 0.4 },
        { improvementRate: 0.6 },
        { improvementRate: 0.7 }
      ];

      const trend = verifier.calculateTrend(data, 'improvementRate');

      expect(trend.direction).toBe('increasing');
      expect(trend.change).toBeGreaterThan(0);
    });

    it('应该计算下降趋势', async () => {
      const data = [
        { regressionRate: 0.3 },
        { regressionRate: 0.25 },
        { regressionRate: 0.1 },
        { regressionRate: 0.05 }
      ];

      const trend = verifier.calculateTrend(data, 'regressionRate');

      expect(trend.direction).toBe('decreasing');
      expect(trend.change).toBeLessThan(0);
    });

    it('应该识别稳定趋势', async () => {
      const data = [
        { improvementRate: 0.5 },
        { improvementRate: 0.51 },
        { improvementRate: 0.49 },
        { improvementRate: 0.5 }
      ];

      const trend = verifier.calculateTrend(data, 'improvementRate');

      expect(trend.direction).toBe('stable');
    });
  });

  describe('数据导出和清理', () => {
    it('应该导出验证历史', async () => {
      // 添加一些验证记录
      const fixResult = { issueId: 'export-test-1', type: 'test', line: 1 };
      await verifier.verifyFix(fixResult, '# 原始', '# 修复', 'test.md');

      const exportData = await verifier.exportVerificationHistory(tempDir);

      expect(exportData.totalVerifications).toBe(1);
      expect(exportData.verifications).toHaveLength(1);
      expect(exportData.summary).toHaveProperty('totalVerifications');

      // 验证文件是否创建
      const filePath = path.join(tempDir, 'verification-history.json');
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('应该清理过期的验证历史', async () => {
      // 添加一些验证记录
      const fixResult1 = { issueId: 'cleanup-test-1', type: 'test', line: 1 };
      const fixResult2 = { issueId: 'cleanup-test-2', type: 'test', line: 2 };
      
      await verifier.verifyFix(fixResult1, '# 原始1', '# 修复1', 'test1.md');
      await verifier.verifyFix(fixResult2, '# 原始2', '# 修复2', 'test2.md');

      expect(verifier.verificationHistory.size).toBe(2);

      // 等待一小段时间确保时间戳差异
      await new Promise(resolve => setTimeout(resolve, 10));

      // 清理（使用很短的最大年龄）
      verifier.cleanupVerificationHistory(5); // 5毫秒

      expect(verifier.verificationHistory.size).toBe(0);
    });
  });

  describe('问题键生成', () => {
    it('应该生成唯一的问题键', async () => {
      const issue1 = {
        type: 'code_block_unclosed',
        line: 5,
        column: 10,
        description: '代码块未闭合'
      };

      const issue2 = {
        type: 'code_block_unclosed',
        line: 5,
        column: 10,
        description: '代码块未闭合'
      };

      const issue3 = {
        type: 'code_block_unclosed',
        line: 6,
        column: 10,
        description: '代码块未闭合'
      };

      const key1 = verifier.createIssueKey(issue1);
      const key2 = verifier.createIssueKey(issue2);
      const key3 = verifier.createIssueKey(issue3);

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe('验证结果确定', () => {
    it('应该正确确定验证结果', async () => {
      const analysis1 = {
        details: { targetIssueResolved: true },
        metrics: { regressionRate: 0.05, improvementRate: 0.8, newIssues: 0 }
      };

      const analysis2 = {
        details: { targetIssueResolved: false },
        metrics: { regressionRate: 0.0, improvementRate: 0.9, newIssues: 0 }
      };

      const analysis3 = {
        details: { targetIssueResolved: true },
        metrics: { regressionRate: 0.2, improvementRate: 0.8, newIssues: 0 }
      };

      const result1 = verifier.determineVerificationResult(analysis1);
      const result2 = verifier.determineVerificationResult(analysis2);
      const result3 = verifier.determineVerificationResult(analysis3);

      expect(result1).toBe(VerificationResult.SUCCESS);
      expect(result2).toBe(VerificationResult.FAILURE);
      expect(result3).toBe(VerificationResult.REGRESSION);
    });
  });
});