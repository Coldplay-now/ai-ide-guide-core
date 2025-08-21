/**
 * 修复验证和确认系统
 * 编写修复结果验证逻辑、实现问题解决确认机制、开发质量改进趋势跟踪
 */

import fs from 'fs/promises';
import path from 'path';
import { BaseFixer } from './base-fixer.js';
import { QualityChecker } from './quality-checker.js';

/**
 * 修复状态枚举
 */
const FixStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  FIXED: 'fixed',
  PARTIALLY_FIXED: 'partially_fixed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

/**
 * 验证结果类型
 */
const VerificationResult = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  PARTIAL: 'partial',
  REGRESSION: 'regression'
};

class FixVerifier extends BaseFixer {
  constructor(config = {}) {
    super(config);
    this.qualityChecker = new QualityChecker(config);
    this.verificationHistory = new Map();
    this.trendData = [];
    this.thresholds = {
      regressionTolerance: config.regressionTolerance || 0.1,
      minImprovementThreshold: config.minImprovementThreshold || 0.05,
      ...config.thresholds
    };
  }

  /**
   * 验证修复结果
   */
  async verifyFix(fixResult, originalContent, fixedContent, filePath) {
    try {
      const verification = {
        fixId: fixResult.issueId,
        timestamp: new Date().toISOString(),
        filePath,
        originalIssues: [],
        fixedIssues: [],
        newIssues: [],
        status: FixStatus.PENDING,
        result: null,
        metrics: {},
        details: {}
      };

      // 检查原始内容的问题
      verification.originalIssues = await this.qualityChecker.checkFile(
        await this.createTempFile(originalContent, filePath)
      );

      // 检查修复后内容的问题
      verification.fixedIssues = await this.qualityChecker.checkFile(
        await this.createTempFile(fixedContent, filePath)
      );

      // 分析修复效果
      const analysis = this.analyzeFixEffectiveness(
        verification.originalIssues,
        verification.fixedIssues,
        fixResult
      );

      verification.result = analysis.result;
      verification.metrics = analysis.metrics;
      verification.details = analysis.details;
      verification.newIssues = analysis.newIssues;

      // 确定最终状态
      verification.status = this.determineVerificationStatus(analysis);

      // 记录验证历史
      this.verificationHistory.set(fixResult.issueId, verification);

      // 更新趋势数据
      this.updateTrendData(verification);

      return verification;
    } catch (error) {
      return {
        fixId: fixResult.issueId,
        timestamp: new Date().toISOString(),
        filePath,
        status: FixStatus.FAILED,
        result: VerificationResult.FAILURE,
        error: error.message,
        metrics: {},
        details: { error: error.message }
      };
    }
  }

  /**
   * 创建临时文件用于检查
   */
  async createTempFile(content, originalPath) {
    const tempDir = path.join(process.cwd(), '.temp_verification');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFile = path.join(tempDir, `temp_${Date.now()}_${path.basename(originalPath)}`);
    await fs.writeFile(tempFile, content);
    
    // 设置清理定时器
    setTimeout(async () => {
      try {
        await fs.unlink(tempFile);
      } catch (error) {
        // 忽略清理错误
      }
    }, 60000); // 1分钟后清理

    return tempFile;
  }

  /**
   * 分析修复效果
   */
  analyzeFixEffectiveness(originalIssues, fixedIssues, fixResult) {
    const analysis = {
      result: VerificationResult.SUCCESS,
      metrics: {
        originalIssueCount: originalIssues.length,
        fixedIssueCount: fixedIssues.length,
        resolvedIssues: 0,
        newIssues: 0,
        regressionIssues: 0,
        improvementRate: 0,
        regressionRate: 0
      },
      details: {
        resolvedIssueIds: [],
        newIssueIds: [],
        regressionIssueIds: [],
        targetIssueResolved: false
      },
      newIssues: []
    };

    // 创建问题映射以便比较
    const originalIssueMap = new Map();
    originalIssues.forEach(issue => {
      const key = this.createIssueKey(issue);
      originalIssueMap.set(key, issue);
    });

    const fixedIssueMap = new Map();
    fixedIssues.forEach(issue => {
      const key = this.createIssueKey(issue);
      fixedIssueMap.set(key, issue);
    });

    // 检查目标问题是否已解决
    // 基于修复类型检查特定问题是否解决
    const targetIssueResolved = this.checkTargetIssueResolved(
      fixResult, 
      originalIssues, 
      fixedIssues
    );
    analysis.details.targetIssueResolved = targetIssueResolved;

    // 计算已解决的问题
    originalIssueMap.forEach((issue, key) => {
      if (!fixedIssueMap.has(key)) {
        analysis.metrics.resolvedIssues++;
        analysis.details.resolvedIssueIds.push(issue.id);
      }
    });

    // 计算新增问题
    fixedIssueMap.forEach((issue, key) => {
      if (!originalIssueMap.has(key)) {
        analysis.metrics.newIssues++;
        analysis.details.newIssueIds.push(issue.id);
        analysis.newIssues.push(issue);
      }
    });

    // 计算回归问题（新增的严重问题）
    analysis.newIssues.forEach(issue => {
      if (issue.severity === 'critical' || issue.severity === 'major') {
        analysis.metrics.regressionIssues++;
        analysis.details.regressionIssueIds.push(issue.id);
      }
    });

    // 计算改进率和回归率
    if (analysis.metrics.originalIssueCount > 0) {
      analysis.metrics.improvementRate = 
        analysis.metrics.resolvedIssues / analysis.metrics.originalIssueCount;
      analysis.metrics.regressionRate = 
        analysis.metrics.regressionIssues / analysis.metrics.originalIssueCount;
    }

    // 确定验证结果
    analysis.result = this.determineVerificationResult(analysis);

    return analysis;
  }

  /**
   * 创建问题唯一键
   */
  createIssueKey(issue) {
    return `${issue.type}_${issue.line}_${issue.column || 0}_${issue.description}`;
  }

  /**
   * 从修复结果创建问题键
   */
  createIssueKeyFromFixResult(fixResult) {
    // 这里需要根据修复结果的结构来创建键
    // 假设修复结果包含原始问题信息
    return `${fixResult.type || 'unknown'}_${fixResult.line || 0}_${fixResult.column || 0}_`;
  }

  /**
   * 检查目标问题是否已解决
   */
  checkTargetIssueResolved(fixResult, originalIssues, fixedIssues) {
    // 基于修复类型检查特定问题
    const targetType = fixResult.type;
    const targetLine = fixResult.line;

    // 检查原始问题中是否有目标类型的问题
    const originalTargetIssues = originalIssues.filter(issue => 
      issue.type === targetType && 
      (targetLine ? Math.abs(issue.line - targetLine) <= 2 : true)
    );

    // 检查修复后是否还有相同类型的问题
    const fixedTargetIssues = fixedIssues.filter(issue => 
      issue.type === targetType && 
      (targetLine ? Math.abs(issue.line - targetLine) <= 2 : true)
    );

    // 如果原始问题中有目标问题，修复后减少了，则认为已解决
    if (originalTargetIssues.length > 0) {
      return fixedTargetIssues.length < originalTargetIssues.length;
    }

    // 如果原始问题中没有目标问题，但总体问题减少了，也认为有效
    return originalIssues.length > fixedIssues.length;
  }

  /**
   * 确定验证结果
   */
  determineVerificationResult(analysis) {
    // 如果目标问题未解决
    if (!analysis.details.targetIssueResolved) {
      return VerificationResult.FAILURE;
    }

    // 如果有严重回归
    if (analysis.metrics.regressionRate > this.thresholds.regressionTolerance) {
      return VerificationResult.REGRESSION;
    }

    // 如果没有任何改进（问题数量没有减少）
    if (analysis.metrics.resolvedIssues === 0 && analysis.metrics.newIssues > 0) {
      return VerificationResult.FAILURE;
    }

    // 如果改进不明显
    if (analysis.metrics.improvementRate < this.thresholds.minImprovementThreshold) {
      return VerificationResult.PARTIAL;
    }

    // 如果有新问题但改进明显
    if (analysis.metrics.newIssues > 0 && analysis.metrics.improvementRate > 0.5) {
      return VerificationResult.PARTIAL;
    }

    return VerificationResult.SUCCESS;
  }

  /**
   * 确定验证状态
   */
  determineVerificationStatus(analysis) {
    switch (analysis.result) {
      case VerificationResult.SUCCESS:
        return FixStatus.VERIFIED;
      case VerificationResult.PARTIAL:
        return FixStatus.PARTIALLY_FIXED;
      case VerificationResult.REGRESSION:
        return FixStatus.REJECTED;
      case VerificationResult.FAILURE:
        return FixStatus.FAILED;
      default:
        return FixStatus.PENDING;
    }
  }

  /**
   * 批量验证修复结果
   */
  async verifyBatchFixes(fixResults, originalContents, fixedContents, filePaths) {
    const verifications = [];
    
    for (let i = 0; i < fixResults.length; i++) {
      const verification = await this.verifyFix(
        fixResults[i],
        originalContents[i],
        fixedContents[i],
        filePaths[i]
      );
      verifications.push(verification);
    }

    return verifications;
  }

  /**
   * 确认问题解决
   */
  async confirmIssueResolution(issueId, userConfirmation = null) {
    const verification = this.verificationHistory.get(issueId);
    
    if (!verification) {
      throw new Error(`未找到问题 ${issueId} 的验证记录`);
    }

    const confirmation = {
      issueId,
      timestamp: new Date().toISOString(),
      automaticVerification: verification.result,
      userConfirmation,
      finalStatus: null,
      confidence: 0
    };

    // 计算确认置信度
    confirmation.confidence = this.calculateConfidence(verification, userConfirmation);

    // 确定最终状态
    confirmation.finalStatus = this.determineFinalStatus(verification, userConfirmation);

    // 更新验证历史
    verification.confirmation = confirmation;
    verification.status = confirmation.finalStatus;

    return confirmation;
  }

  /**
   * 计算确认置信度
   */
  calculateConfidence(verification, userConfirmation) {
    let confidence = 0.5; // 基础置信度

    // 基于自动验证结果调整
    switch (verification.result) {
      case VerificationResult.SUCCESS:
        confidence += 0.3;
        break;
      case VerificationResult.PARTIAL:
        confidence += 0.1;
        break;
      case VerificationResult.FAILURE:
        confidence -= 0.2;
        break;
      case VerificationResult.REGRESSION:
        confidence -= 0.3;
        break;
    }

    // 基于用户确认调整
    if (userConfirmation !== null) {
      if (userConfirmation === true) {
        confidence += 0.4;
      } else {
        confidence -= 0.4;
      }
    }

    // 基于指标调整
    if (verification.metrics.improvementRate > 0.8) {
      confidence += 0.1;
    }
    if (verification.metrics.regressionRate > 0.1) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 确定最终状态
   */
  determineFinalStatus(verification, userConfirmation) {
    // 用户确认优先
    if (userConfirmation === true) {
      return FixStatus.VERIFIED;
    }
    if (userConfirmation === false) {
      return FixStatus.REJECTED;
    }

    // 基于自动验证结果
    return verification.status;
  }

  /**
   * 更新趋势数据
   */
  updateTrendData(verification) {
    const trendPoint = {
      timestamp: verification.timestamp,
      filePath: verification.filePath,
      originalIssueCount: verification.metrics.originalIssueCount,
      fixedIssueCount: verification.metrics.fixedIssueCount,
      improvementRate: verification.metrics.improvementRate,
      regressionRate: verification.metrics.regressionRate,
      verificationResult: verification.result,
      status: verification.status
    };

    this.trendData.push(trendPoint);

    // 保持趋势数据在合理范围内
    if (this.trendData.length > 1000) {
      this.trendData = this.trendData.slice(-1000);
    }
  }

  /**
   * 生成质量改进趋势报告
   */
  generateTrendReport(timeRange = '7d') {
    const cutoffTime = this.calculateCutoffTime(timeRange);
    const relevantData = this.trendData.filter(
      point => new Date(point.timestamp) >= cutoffTime
    );

    if (relevantData.length === 0) {
      return {
        timeRange,
        dataPoints: 0,
        summary: '没有足够的数据生成趋势报告',
        trends: {},
        recommendations: []
      };
    }

    const trends = this.analyzeTrends(relevantData);
    const recommendations = this.generateTrendRecommendations(trends);

    return {
      timeRange,
      dataPoints: relevantData.length,
      summary: this.generateTrendSummary(trends),
      trends,
      recommendations,
      data: relevantData
    };
  }

  /**
   * 计算截止时间
   */
  calculateCutoffTime(timeRange) {
    const now = new Date();
    const ranges = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const milliseconds = ranges[timeRange] || ranges['7d'];
    return new Date(now.getTime() - milliseconds);
  }

  /**
   * 分析趋势
   */
  analyzeTrends(data) {
    const trends = {
      issueCount: this.calculateTrend(data, 'originalIssueCount'),
      improvementRate: this.calculateTrend(data, 'improvementRate'),
      regressionRate: this.calculateTrend(data, 'regressionRate'),
      verificationSuccess: this.calculateSuccessRate(data),
      fileImpactDistribution: this.calculateFileImpactDistribution(data),
      timeToFix: this.calculateTimeToFix(data)
    };

    return trends;
  }

  /**
   * 计算趋势
   */
  calculateTrend(data, metric) {
    if (data.length < 2) {
      return { trend: 'insufficient_data', change: 0, direction: 'stable' };
    }

    const values = data.map(point => point[metric] || 0);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const changePercent = firstAvg > 0 ? (change / firstAvg) * 100 : 0;

    let direction = 'stable';
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    return {
      trend: direction,
      change: changePercent,
      direction,
      firstPeriodAvg: firstAvg,
      secondPeriodAvg: secondAvg
    };
  }

  /**
   * 计算成功率
   */
  calculateSuccessRate(data) {
    const successCount = data.filter(
      point => point.verificationResult === VerificationResult.SUCCESS
    ).length;

    return {
      successRate: data.length > 0 ? successCount / data.length : 0,
      totalVerifications: data.length,
      successfulVerifications: successCount
    };
  }

  /**
   * 计算文件影响分布
   */
  calculateFileImpactDistribution(data) {
    const fileStats = new Map();

    data.forEach(point => {
      if (!fileStats.has(point.filePath)) {
        fileStats.set(point.filePath, {
          fixes: 0,
          totalIssues: 0,
          totalImprovement: 0
        });
      }

      const stats = fileStats.get(point.filePath);
      stats.fixes++;
      stats.totalIssues += point.originalIssueCount;
      stats.totalImprovement += point.improvementRate;
    });

    const distribution = Array.from(fileStats.entries()).map(([filePath, stats]) => ({
      filePath,
      fixes: stats.fixes,
      averageIssues: stats.totalIssues / stats.fixes,
      averageImprovement: stats.totalImprovement / stats.fixes
    }));

    return distribution.sort((a, b) => b.fixes - a.fixes);
  }

  /**
   * 计算修复时间
   */
  calculateTimeToFix(data) {
    // 这里需要额外的时间戳数据来计算实际的修复时间
    // 暂时返回基础统计
    return {
      averageVerificationTime: 'N/A',
      note: '需要额外的时间戳数据来计算修复时间'
    };
  }

  /**
   * 生成趋势摘要
   */
  generateTrendSummary(trends) {
    const summaryParts = [];

    if (trends.improvementRate.direction === 'increasing') {
      summaryParts.push('质量改进率呈上升趋势');
    } else if (trends.improvementRate.direction === 'decreasing') {
      summaryParts.push('质量改进率呈下降趋势');
    }

    if (trends.regressionRate.direction === 'increasing') {
      summaryParts.push('回归率有所上升，需要关注');
    }

    if (trends.verificationSuccess.successRate > 0.8) {
      summaryParts.push('验证成功率较高');
    } else if (trends.verificationSuccess.successRate < 0.6) {
      summaryParts.push('验证成功率偏低，需要改进');
    }

    return summaryParts.length > 0 ? summaryParts.join('；') : '质量趋势保持稳定';
  }

  /**
   * 生成趋势建议
   */
  generateTrendRecommendations(trends) {
    const recommendations = [];

    if (trends.regressionRate.direction === 'increasing') {
      recommendations.push({
        priority: 'high',
        title: '关注回归问题',
        description: '回归率呈上升趋势，建议加强修复前的影响分析',
        action: '实施更严格的修复验证流程'
      });
    }

    if (trends.verificationSuccess.successRate < 0.7) {
      recommendations.push({
        priority: 'medium',
        title: '提高验证成功率',
        description: `当前验证成功率为 ${(trends.verificationSuccess.successRate * 100).toFixed(1)}%`,
        action: '优化修复算法和验证标准'
      });
    }

    if (trends.improvementRate.direction === 'decreasing') {
      recommendations.push({
        priority: 'medium',
        title: '提升改进效果',
        description: '质量改进率呈下降趋势',
        action: '分析修复策略的有效性，考虑调整修复方法'
      });
    }

    // 基于文件分布的建议
    const topFiles = trends.fileImpactDistribution.slice(0, 3);
    if (topFiles.length > 0) {
      recommendations.push({
        priority: 'low',
        title: '重点关注高频修复文件',
        description: `文件 ${topFiles[0].filePath} 需要频繁修复`,
        action: '考虑对这些文件进行重构或加强质量控制'
      });
    }

    return recommendations;
  }

  /**
   * 导出验证历史
   */
  async exportVerificationHistory(outputPath) {
    const history = Array.from(this.verificationHistory.values());
    const exportData = {
      timestamp: new Date().toISOString(),
      totalVerifications: history.length,
      verifications: history,
      trendData: this.trendData,
      summary: this.generateHistorySummary(history)
    };

    await fs.writeFile(
      path.join(outputPath, 'verification-history.json'),
      JSON.stringify(exportData, null, 2)
    );

    return exportData;
  }

  /**
   * 生成历史摘要
   */
  generateHistorySummary(history) {
    const statusCounts = {};
    const resultCounts = {};

    history.forEach(verification => {
      statusCounts[verification.status] = (statusCounts[verification.status] || 0) + 1;
      resultCounts[verification.result] = (resultCounts[verification.result] || 0) + 1;
    });

    return {
      totalVerifications: history.length,
      statusDistribution: statusCounts,
      resultDistribution: resultCounts,
      averageImprovementRate: history.length > 0 
        ? history.reduce((sum, v) => sum + (v.metrics.improvementRate || 0), 0) / history.length
        : 0,
      averageRegressionRate: history.length > 0
        ? history.reduce((sum, v) => sum + (v.metrics.regressionRate || 0), 0) / history.length
        : 0
    };
  }

  /**
   * 清理验证历史
   */
  cleanupVerificationHistory(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30天
    const cutoffTime = new Date(Date.now() - maxAge);
    
    for (const [issueId, verification] of this.verificationHistory.entries()) {
      if (new Date(verification.timestamp) < cutoffTime) {
        this.verificationHistory.delete(issueId);
      }
    }

    // 清理趋势数据
    this.trendData = this.trendData.filter(
      point => new Date(point.timestamp) >= cutoffTime
    );
  }
}

export {
  FixVerifier,
  FixStatus,
  VerificationResult
};