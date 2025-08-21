/**
 * 持续质量监控系统
 * 编写质量指标监控功能、实现自动化质量检查流程、开发质量退化预警机制
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { BaseFixer } from './base-fixer.js';
import { QualityChecker } from './quality-checker.js';
import { FixVerifier } from './fix-verifier.js';

/**
 * 监控状态枚举
 */
const MonitorStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error'
};

/**
 * 警报级别枚举
 */
const AlertLevel = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency'
};

/**
 * 质量指标类型
 */
const MetricType = {
  ISSUE_COUNT: 'issue_count',
  ISSUE_DENSITY: 'issue_density',
  FIX_SUCCESS_RATE: 'fix_success_rate',
  REGRESSION_RATE: 'regression_rate',
  IMPROVEMENT_RATE: 'improvement_rate',
  COVERAGE: 'coverage'
};

class QualityMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      checkInterval: config.checkInterval || 60000, // 1分钟
      alertThresholds: {
        criticalIssueCount: 10,
        majorIssueCount: 50,
        regressionRate: 0.1,
        fixSuccessRate: 0.7,
        ...config.alertThresholds
      },
      watchPaths: config.watchPaths || [],
      enableFileWatcher: config.enableFileWatcher !== false,
      maxHistorySize: config.maxHistorySize || 1000,
      ...config
    };

    this.status = MonitorStatus.IDLE;
    this.qualityChecker = new QualityChecker(config);
    this.fixVerifier = new FixVerifier(config);
    
    this.metrics = new Map();
    this.alerts = [];
    this.history = [];
    this.watchers = new Map();
    this.checkTimer = null;
    
    this.lastCheckTime = null;
    this.consecutiveFailures = 0;
    this.isShuttingDown = false;
  }

  /**
   * 启动监控系统
   */
  async start() {
    if (this.status === MonitorStatus.RUNNING) {
      return;
    }

    try {
      this.status = MonitorStatus.RUNNING;
      this.emit('monitor:started');

      // 启动定期检查
      this.startPeriodicCheck();

      // 启动文件监控
      if (this.config.enableFileWatcher) {
        await this.startFileWatching();
      }

      // 执行初始检查
      await this.performQualityCheck();

      console.log('质量监控系统已启动');
    } catch (error) {
      this.status = MonitorStatus.ERROR;
      this.emit('monitor:error', error);
      throw error;
    }
  }

  /**
   * 停止监控系统
   */
  async stop() {
    if (this.status === MonitorStatus.IDLE) {
      return;
    }

    this.isShuttingDown = true;
    this.status = MonitorStatus.IDLE;

    // 停止定期检查
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    // 停止文件监控
    await this.stopFileWatching();

    this.emit('monitor:stopped');
    console.log('质量监控系统已停止');
  }

  /**
   * 暂停监控
   */
  pause() {
    if (this.status === MonitorStatus.RUNNING) {
      this.status = MonitorStatus.PAUSED;
      this.emit('monitor:paused');
    }
  }

  /**
   * 恢复监控
   */
  resume() {
    if (this.status === MonitorStatus.PAUSED) {
      this.status = MonitorStatus.RUNNING;
      this.emit('monitor:resumed');
    }
  }

  /**
   * 启动定期检查
   */
  startPeriodicCheck() {
    this.checkTimer = setInterval(async () => {
      if (this.status === MonitorStatus.RUNNING && !this.isShuttingDown) {
        try {
          await this.performQualityCheck();
        } catch (error) {
          this.handleCheckError(error);
        }
      }
    }, this.config.checkInterval);
  }

  /**
   * 启动文件监控
   */
  async startFileWatching() {
    if (!this.config.watchPaths.length) {
      return;
    }

    const { watch } = await import('chokidar');
    
    for (const watchPath of this.config.watchPaths) {
      try {
        const watcher = watch(watchPath, {
          ignored: /(^|[\/\\])\../, // 忽略隐藏文件
          persistent: true,
          ignoreInitial: true
        });

        watcher
          .on('change', (filePath) => this.handleFileChange(filePath))
          .on('add', (filePath) => this.handleFileAdd(filePath))
          .on('unlink', (filePath) => this.handleFileDelete(filePath))
          .on('error', (error) => this.handleWatchError(error));

        this.watchers.set(watchPath, watcher);
        this.emit('watcher:started', watchPath);
      } catch (error) {
        console.warn(`无法监控路径 ${watchPath}:`, error.message);
      }
    }
  }

  /**
   * 停止文件监控
   */
  async stopFileWatching() {
    for (const [watchPath, watcher] of this.watchers.entries()) {
      try {
        await watcher.close();
        this.emit('watcher:stopped', watchPath);
      } catch (error) {
        console.warn(`停止监控 ${watchPath} 时出错:`, error.message);
      }
    }
    this.watchers.clear();
  }

  /**
   * 处理文件变更
   */
  async handleFileChange(filePath) {
    if (this.isMarkdownFile(filePath)) {
      this.emit('file:changed', filePath);
      
      // 延迟检查以避免频繁触发
      setTimeout(async () => {
        try {
          await this.checkSingleFile(filePath);
        } catch (error) {
          this.emit('check:error', { filePath, error });
        }
      }, 1000);
    }
  }

  /**
   * 处理文件添加
   */
  async handleFileAdd(filePath) {
    if (this.isMarkdownFile(filePath)) {
      this.emit('file:added', filePath);
      await this.checkSingleFile(filePath);
    }
  }

  /**
   * 处理文件删除
   */
  handleFileDelete(filePath) {
    if (this.isMarkdownFile(filePath)) {
      this.emit('file:deleted', filePath);
      // 从历史记录中移除相关数据
      this.removeFileFromHistory(filePath);
    }
  }

  /**
   * 处理监控错误
   */
  handleWatchError(error) {
    console.error('文件监控错误:', error);
    this.emit('watcher:error', error);
  }

  /**
   * 判断是否为Markdown文件
   */
  isMarkdownFile(filePath) {
    return /\.(md|markdown)$/i.test(filePath);
  }

  /**
   * 执行质量检查
   */
  async performQualityCheck() {
    const startTime = Date.now();
    
    try {
      this.emit('check:started');
      
      const results = await this.runQualityChecks();
      const metrics = this.calculateMetrics(results);
      
      // 更新指标
      this.updateMetrics(metrics);
      
      // 检查警报条件
      const alerts = this.checkAlertConditions(metrics);
      this.processAlerts(alerts);
      
      // 记录历史
      this.recordHistory({
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        metrics,
        alerts: alerts.length,
        status: 'success'
      });

      this.lastCheckTime = new Date();
      this.consecutiveFailures = 0;
      
      this.emit('check:completed', { metrics, alerts });
      
    } catch (error) {
      this.handleCheckError(error);
    }
  }

  /**
   * 运行质量检查
   */
  async runQualityChecks() {
    const results = {
      files: [],
      totalIssues: 0,
      issuesByType: new Map(),
      issuesBySeverity: new Map(),
      issuesByCategory: new Map()
    };

    // 检查所有监控路径中的文件
    for (const watchPath of this.config.watchPaths) {
      const files = await this.findMarkdownFiles(watchPath);
      
      for (const filePath of files) {
        try {
          const fileIssues = await this.qualityChecker.checkFile(filePath);
          
          const fileResult = {
            filePath,
            issues: fileIssues,
            issueCount: fileIssues.length,
            timestamp: new Date().toISOString()
          };
          
          results.files.push(fileResult);
          results.totalIssues += fileIssues.length;
          
          // 统计问题类型
          fileIssues.forEach(issue => {
            this.incrementMapCount(results.issuesByType, issue.type);
            this.incrementMapCount(results.issuesBySeverity, issue.severity);
            this.incrementMapCount(results.issuesByCategory, issue.category);
          });
          
        } catch (error) {
          console.warn(`检查文件 ${filePath} 时出错:`, error.message);
        }
      }
    }

    return results;
  }

  /**
   * 检查单个文件
   */
  async checkSingleFile(filePath) {
    try {
      const issues = await this.qualityChecker.checkFile(filePath);
      
      const fileMetrics = {
        filePath,
        issueCount: issues.length,
        issues,
        timestamp: new Date().toISOString()
      };

      // 检查是否有新的严重问题
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        this.createAlert({
          level: AlertLevel.CRITICAL,
          title: '发现严重质量问题',
          message: `文件 ${filePath} 中发现 ${criticalIssues.length} 个严重问题`,
          filePath,
          issues: criticalIssues
        });
      }

      this.emit('file:checked', fileMetrics);
      return fileMetrics;
      
    } catch (error) {
      this.emit('file:check:error', { filePath, error });
      throw error;
    }
  }

  /**
   * 查找Markdown文件
   */
  async findMarkdownFiles(dirPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const subFiles = await this.findMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`读取目录 ${dirPath} 时出错:`, error.message);
    }
    
    return files;
  }

  /**
   * 计算质量指标
   */
  calculateMetrics(results) {
    const totalFiles = results.files.length;
    const totalIssues = results.totalIssues;
    
    const metrics = {
      [MetricType.ISSUE_COUNT]: totalIssues,
      [MetricType.ISSUE_DENSITY]: totalFiles > 0 ? totalIssues / totalFiles : 0,
      [MetricType.COVERAGE]: totalFiles,
      
      // 按严重程度统计
      criticalIssues: results.issuesBySeverity.get('critical') || 0,
      majorIssues: results.issuesBySeverity.get('major') || 0,
      minorIssues: results.issuesBySeverity.get('minor') || 0,
      infoIssues: results.issuesBySeverity.get('info') || 0,
      
      // 按类型统计
      issuesByType: Object.fromEntries(results.issuesByType),
      issuesByCategory: Object.fromEntries(results.issuesByCategory),
      
      // 时间戳
      timestamp: new Date().toISOString(),
      
      // 文件统计
      totalFiles,
      filesWithIssues: results.files.filter(f => f.issueCount > 0).length,
      averageIssuesPerFile: totalFiles > 0 ? totalIssues / totalFiles : 0
    };

    // 计算趋势指标
    if (this.history.length > 0) {
      const lastMetrics = this.history[this.history.length - 1].metrics;
      metrics.issueCountChange = totalIssues - (lastMetrics[MetricType.ISSUE_COUNT] || 0);
      metrics.issueCountChangePercent = lastMetrics[MetricType.ISSUE_COUNT] > 0 
        ? (metrics.issueCountChange / lastMetrics[MetricType.ISSUE_COUNT]) * 100 
        : 0;
    }

    return metrics;
  }

  /**
   * 更新指标
   */
  updateMetrics(metrics) {
    for (const [key, value] of Object.entries(metrics)) {
      this.metrics.set(key, {
        value,
        timestamp: new Date().toISOString(),
        trend: this.calculateTrend(key, value)
      });
    }
  }

  /**
   * 计算趋势
   */
  calculateTrend(metricKey, currentValue) {
    const recentHistory = this.history.slice(-5); // 最近5次检查
    if (recentHistory.length < 2) {
      return 'stable';
    }

    const values = recentHistory.map(h => h.metrics[metricKey] || 0);
    values.push(currentValue);

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const changePercent = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    if (Math.abs(changePercent) < 5) return 'stable';
    return changePercent > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * 检查警报条件
   */
  checkAlertConditions(metrics) {
    const alerts = [];
    const thresholds = this.config.alertThresholds;

    // 检查严重问题数量
    if (metrics.criticalIssues >= thresholds.criticalIssueCount) {
      alerts.push({
        level: AlertLevel.CRITICAL,
        title: '严重问题数量超标',
        message: `发现 ${metrics.criticalIssues} 个严重问题，超过阈值 ${thresholds.criticalIssueCount}`,
        metric: MetricType.ISSUE_COUNT,
        value: metrics.criticalIssues,
        threshold: thresholds.criticalIssueCount
      });
    }

    // 检查主要问题数量
    if (metrics.majorIssues >= thresholds.majorIssueCount) {
      alerts.push({
        level: AlertLevel.WARNING,
        title: '主要问题数量较多',
        message: `发现 ${metrics.majorIssues} 个主要问题，超过阈值 ${thresholds.majorIssueCount}`,
        metric: MetricType.ISSUE_COUNT,
        value: metrics.majorIssues,
        threshold: thresholds.majorIssueCount
      });
    }

    // 检查问题密度
    const densityThreshold = 5; // 每个文件平均5个问题
    if (metrics[MetricType.ISSUE_DENSITY] > densityThreshold) {
      alerts.push({
        level: AlertLevel.WARNING,
        title: '问题密度过高',
        message: `平均每个文件有 ${metrics[MetricType.ISSUE_DENSITY].toFixed(1)} 个问题`,
        metric: MetricType.ISSUE_DENSITY,
        value: metrics[MetricType.ISSUE_DENSITY],
        threshold: densityThreshold
      });
    }

    // 检查质量退化
    if (metrics.issueCountChange > 0 && metrics.issueCountChangePercent > 20) {
      alerts.push({
        level: AlertLevel.WARNING,
        title: '质量退化警告',
        message: `问题数量增加了 ${metrics.issueCountChange} 个 (${metrics.issueCountChangePercent.toFixed(1)}%)`,
        metric: 'quality_regression',
        value: metrics.issueCountChangePercent,
        threshold: 20
      });
    }

    return alerts;
  }

  /**
   * 处理警报
   */
  processAlerts(alerts) {
    alerts.forEach(alert => {
      this.createAlert(alert);
    });
  }

  /**
   * 创建警报
   */
  createAlert(alertData) {
    const alert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolved: false,
      ...alertData
    };

    this.alerts.unshift(alert);
    
    // 限制警报历史大小
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    this.emit('alert:created', alert);
    
    // 根据级别发送不同的通知
    switch (alert.level) {
      case AlertLevel.CRITICAL:
      case AlertLevel.EMERGENCY:
        this.emit('alert:critical', alert);
        break;
      case AlertLevel.WARNING:
        this.emit('alert:warning', alert);
        break;
      default:
        this.emit('alert:info', alert);
    }

    return alert;
  }

  /**
   * 确认警报
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this.emit('alert:acknowledged', alert);
    }
    return alert;
  }

  /**
   * 解决警报
   */
  resolveAlert(alertId, resolution = '') {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      alert.resolution = resolution;
      this.emit('alert:resolved', alert);
    }
    return alert;
  }

  /**
   * 记录历史
   */
  recordHistory(record) {
    this.history.push(record);
    
    // 限制历史记录大小
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * 从历史记录中移除文件
   */
  removeFileFromHistory(filePath) {
    // 这里可以实现更复杂的历史清理逻辑
    // 暂时只记录事件
    this.emit('file:removed:from:history', filePath);
  }

  /**
   * 处理检查错误
   */
  handleCheckError(error) {
    this.consecutiveFailures++;
    
    console.error('质量检查失败:', error);
    
    this.recordHistory({
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message,
      consecutiveFailures: this.consecutiveFailures
    });

    // 如果连续失败次数过多，创建警报
    if (this.consecutiveFailures >= 3) {
      this.createAlert({
        level: AlertLevel.CRITICAL,
        title: '质量检查系统故障',
        message: `连续 ${this.consecutiveFailures} 次检查失败`,
        error: error.message
      });
    }

    this.emit('check:error', error);
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      status: this.status,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures: this.consecutiveFailures,
      watchedPaths: Array.from(this.watchers.keys()),
      activeAlerts: this.alerts.filter(a => !a.resolved).length,
      totalAlerts: this.alerts.length,
      historySize: this.history.length,
      currentMetrics: Object.fromEntries(this.metrics)
    };
  }

  /**
   * 获取质量报告
   */
  getQualityReport(timeRange = '24h') {
    const cutoffTime = this.calculateCutoffTime(timeRange);
    const relevantHistory = this.history.filter(
      record => new Date(record.timestamp) >= cutoffTime
    );

    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const recentAlerts = this.alerts.filter(
      a => new Date(a.timestamp) >= cutoffTime
    );

    return {
      timeRange,
      generatedAt: new Date().toISOString(),
      status: this.getStatus(),
      metrics: Object.fromEntries(this.metrics),
      alerts: {
        active: activeAlerts,
        recent: recentAlerts,
        total: this.alerts.length
      },
      history: relevantHistory,
      trends: this.calculateTrends(relevantHistory),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * 计算截止时间
   */
  calculateCutoffTime(timeRange) {
    const now = new Date();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const milliseconds = ranges[timeRange] || ranges['24h'];
    return new Date(now.getTime() - milliseconds);
  }

  /**
   * 计算趋势
   */
  calculateTrends(history) {
    if (history.length < 2) {
      return { insufficient_data: true };
    }

    const metrics = history.map(h => h.metrics).filter(Boolean);
    if (metrics.length < 2) {
      return { insufficient_data: true };
    }

    return {
      issueCount: this.calculateMetricTrend(metrics, MetricType.ISSUE_COUNT),
      issueDensity: this.calculateMetricTrend(metrics, MetricType.ISSUE_DENSITY),
      coverage: this.calculateMetricTrend(metrics, MetricType.COVERAGE)
    };
  }

  /**
   * 计算指标趋势
   */
  calculateMetricTrend(metrics, metricKey) {
    const values = metrics.map(m => m[metricKey] || 0);
    if (values.length < 2) return { trend: 'stable', change: 0 };

    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

    let trend = 'stable';
    if (Math.abs(changePercent) > 10) {
      trend = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    return {
      trend,
      change,
      changePercent,
      firstValue,
      lastValue
    };
  }

  /**
   * 生成建议
   */
  generateRecommendations() {
    const recommendations = [];
    const currentMetrics = Object.fromEntries(this.metrics);

    // 基于当前指标生成建议
    if (currentMetrics.criticalIssues?.value > 0) {
      recommendations.push({
        priority: 'high',
        title: '立即处理严重问题',
        description: `当前有 ${currentMetrics.criticalIssues.value} 个严重问题需要处理`,
        action: '运行自动修复工具或手动修复严重问题'
      });
    }

    if (currentMetrics[MetricType.ISSUE_DENSITY]?.value > 3) {
      recommendations.push({
        priority: 'medium',
        title: '优化文档质量',
        description: '问题密度较高，建议进行全面的质量改进',
        action: '执行批量修复或重构问题较多的文件'
      });
    }

    // 基于趋势生成建议
    const recentTrends = this.calculateTrends(this.history.slice(-10));
    if (recentTrends.issueCount?.trend === 'increasing') {
      recommendations.push({
        priority: 'medium',
        title: '关注质量趋势',
        description: '问题数量呈上升趋势',
        action: '加强代码审查和质量控制流程'
      });
    }

    return recommendations;
  }

  /**
   * 辅助方法：增加Map计数
   */
  incrementMapCount(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  /**
   * 生成警报ID
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 导出监控数据
   */
  async exportMonitoringData(outputPath) {
    const data = {
      timestamp: new Date().toISOString(),
      status: this.getStatus(),
      metrics: Object.fromEntries(this.metrics),
      alerts: this.alerts,
      history: this.history,
      config: this.config
    };

    await fs.writeFile(
      path.join(outputPath, 'monitoring-data.json'),
      JSON.stringify(data, null, 2)
    );

    return data;
  }
}

export {
  QualityMonitor,
  MonitorStatus,
  AlertLevel,
  MetricType
};