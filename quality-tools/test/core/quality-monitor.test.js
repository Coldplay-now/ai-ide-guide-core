/**
 * 持续质量监控系统测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { QualityMonitor, MonitorStatus, AlertLevel, MetricType } from '../../src/core/quality-monitor.js';

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('QualityMonitor', () => {
  let monitor;
  let tempDir;

  beforeEach(async () => {
    // 创建临时目录
    tempDir = path.join(__dirname, 'temp_monitor_' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    // 创建测试文件
    await fs.writeFile(
      path.join(tempDir, 'test1.md'),
      '# 测试文档\n```js\nconsole.log("test");\n\n没有闭合的代码块'
    );
    
    await fs.writeFile(
      path.join(tempDir, 'test2.md'),
      '# 另一个测试\n| A | B |\n|---|---|\n| 1 |'
    );

    monitor = new QualityMonitor({
      checkInterval: 100, // 快速测试
      watchPaths: [tempDir],
      enableFileWatcher: false, // 在测试中禁用文件监控
      alertThresholds: {
        criticalIssueCount: 2,
        majorIssueCount: 5
      }
    });
  });

  afterEach(async () => {
    // 停止监控
    if (monitor.status === MonitorStatus.RUNNING) {
      await monitor.stop();
    }

    // 清理临时文件
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('监控系统生命周期', () => {
    it('应该能够启动和停止监控', async () => {
      expect(monitor.status).toBe(MonitorStatus.IDLE);

      await monitor.start();
      expect(monitor.status).toBe(MonitorStatus.RUNNING);

      await monitor.stop();
      expect(monitor.status).toBe(MonitorStatus.IDLE);
    });

    it('应该能够暂停和恢复监控', async () => {
      await monitor.start();
      
      monitor.pause();
      expect(monitor.status).toBe(MonitorStatus.PAUSED);

      monitor.resume();
      expect(monitor.status).toBe(MonitorStatus.RUNNING);

      await monitor.stop();
    });

    it('应该发出正确的事件', async () => {
      const events = [];
      
      monitor.on('monitor:started', () => events.push('started'));
      monitor.on('monitor:stopped', () => events.push('stopped'));
      monitor.on('check:completed', () => events.push('check:completed'));

      await monitor.start();
      
      // 等待至少一次检查完成
      await new Promise(resolve => {
        monitor.on('check:completed', resolve);
      });

      await monitor.stop();

      expect(events).toContain('started');
      expect(events).toContain('check:completed');
      expect(events).toContain('stopped');
    });
  });

  describe('质量检查', () => {
    it('应该执行质量检查并返回结果', async () => {
      const results = await monitor.runQualityChecks();

      expect(results.files).toHaveLength(2);
      expect(results.totalIssues).toBeGreaterThan(0);
      expect(results.issuesByType.size).toBeGreaterThan(0);
      expect(results.issuesBySeverity.size).toBeGreaterThan(0);
    });

    it('应该检查单个文件', async () => {
      const filePath = path.join(tempDir, 'test1.md');
      const result = await monitor.checkSingleFile(filePath);

      expect(result.filePath).toBe(filePath);
      expect(result.issueCount).toBeGreaterThan(0);
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
    });

    it('应该查找Markdown文件', async () => {
      const files = await monitor.findMarkdownFiles(tempDir);

      expect(files).toHaveLength(2);
      expect(files.every(f => f.endsWith('.md'))).toBe(true);
    });
  });

  describe('指标计算', () => {
    it('应该计算质量指标', async () => {
      const results = await monitor.runQualityChecks();
      const metrics = monitor.calculateMetrics(results);

      expect(metrics[MetricType.ISSUE_COUNT]).toBeGreaterThan(0);
      expect(metrics[MetricType.ISSUE_DENSITY]).toBeGreaterThan(0);
      expect(metrics[MetricType.COVERAGE]).toBe(2);
      expect(metrics.totalFiles).toBe(2);
      expect(metrics.timestamp).toBeDefined();
    });

    it('应该更新指标', async () => {
      const metrics = {
        [MetricType.ISSUE_COUNT]: 10,
        [MetricType.ISSUE_DENSITY]: 5.0
      };

      monitor.updateMetrics(metrics);

      expect(monitor.metrics.has(MetricType.ISSUE_COUNT)).toBe(true);
      expect(monitor.metrics.get(MetricType.ISSUE_COUNT).value).toBe(10);
    });

    it('应该计算趋势', async () => {
      // 添加历史数据
      monitor.history = [
        { metrics: { [MetricType.ISSUE_COUNT]: 5 } },
        { metrics: { [MetricType.ISSUE_COUNT]: 7 } },
        { metrics: { [MetricType.ISSUE_COUNT]: 10 } }
      ];

      const trend = monitor.calculateTrend(MetricType.ISSUE_COUNT, 12);
      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });
  });

  describe('警报系统', () => {
    it('应该检查警报条件', async () => {
      const metrics = {
        criticalIssues: 5,
        majorIssues: 10,
        [MetricType.ISSUE_DENSITY]: 8,
        issueCountChange: 5,
        issueCountChangePercent: 25
      };

      const alerts = monitor.checkAlertConditions(metrics);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.level === AlertLevel.CRITICAL)).toBe(true);
    });

    it('应该创建和管理警报', async () => {
      const alertData = {
        level: AlertLevel.WARNING,
        title: '测试警报',
        message: '这是一个测试警报'
      };

      const alert = monitor.createAlert(alertData);

      expect(alert.id).toBeDefined();
      expect(alert.timestamp).toBeDefined();
      expect(alert.acknowledged).toBe(false);
      expect(alert.resolved).toBe(false);
      expect(monitor.alerts).toContain(alert);
    });

    it('应该确认和解决警报', async () => {
      const alert = monitor.createAlert({
        level: AlertLevel.INFO,
        title: '测试警报',
        message: '测试消息'
      });

      // 确认警报
      const acknowledgedAlert = monitor.acknowledgeAlert(alert.id);
      expect(acknowledgedAlert.acknowledged).toBe(true);
      expect(acknowledgedAlert.acknowledgedAt).toBeDefined();

      // 解决警报
      const resolvedAlert = monitor.resolveAlert(alert.id, '已修复');
      expect(resolvedAlert.resolved).toBe(true);
      expect(resolvedAlert.resolvedAt).toBeDefined();
      expect(resolvedAlert.resolution).toBe('已修复');
    });

    it('应该发出警报事件', async () => {
      const events = [];
      
      monitor.on('alert:created', (alert) => events.push({ type: 'created', level: alert.level }));
      monitor.on('alert:critical', (alert) => events.push({ type: 'critical', id: alert.id }));

      monitor.createAlert({
        level: AlertLevel.CRITICAL,
        title: '严重警报',
        message: '严重问题'
      });

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('created');
      expect(events[1].type).toBe('critical');
    });
  });

  describe('文件监控', () => {
    it('应该识别Markdown文件', () => {
      expect(monitor.isMarkdownFile('test.md')).toBe(true);
      expect(monitor.isMarkdownFile('test.markdown')).toBe(true);
      expect(monitor.isMarkdownFile('test.txt')).toBe(false);
      expect(monitor.isMarkdownFile('test.js')).toBe(false);
    });

    it('应该处理文件变更事件', async () => {
      const events = [];
      
      monitor.on('file:changed', (filePath) => events.push({ type: 'changed', filePath }));
      monitor.on('file:added', (filePath) => events.push({ type: 'added', filePath }));
      monitor.on('file:deleted', (filePath) => events.push({ type: 'deleted', filePath }));

      const testFile = path.join(tempDir, 'new.md');
      
      await monitor.handleFileChange(testFile);
      await monitor.handleFileAdd(testFile);
      monitor.handleFileDelete(testFile);

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('changed');
      expect(events[1].type).toBe('added');
      expect(events[2].type).toBe('deleted');
    });
  });

  describe('历史记录', () => {
    it('应该记录历史', () => {
      const record = {
        timestamp: new Date().toISOString(),
        metrics: { [MetricType.ISSUE_COUNT]: 5 },
        status: 'success'
      };

      monitor.recordHistory(record);

      expect(monitor.history).toContain(record);
    });

    it('应该限制历史记录大小', () => {
      monitor.config.maxHistorySize = 3;

      // 添加超过限制的记录
      for (let i = 0; i < 5; i++) {
        monitor.recordHistory({
          timestamp: new Date().toISOString(),
          metrics: { [MetricType.ISSUE_COUNT]: i },
          status: 'success'
        });
      }

      expect(monitor.history).toHaveLength(3);
    });
  });

  describe('状态和报告', () => {
    it('应该返回当前状态', () => {
      const status = monitor.getStatus();

      expect(status.status).toBe(MonitorStatus.IDLE);
      expect(status.consecutiveFailures).toBe(0);
      expect(status.activeAlerts).toBe(0);
      expect(status.totalAlerts).toBe(0);
      expect(status.historySize).toBe(0);
    });

    it('应该生成质量报告', () => {
      // 添加一些测试数据
      monitor.createAlert({
        level: AlertLevel.WARNING,
        title: '测试警报',
        message: '测试'
      });

      monitor.recordHistory({
        timestamp: new Date().toISOString(),
        metrics: { [MetricType.ISSUE_COUNT]: 10 },
        status: 'success'
      });

      const report = monitor.getQualityReport('24h');

      expect(report.timeRange).toBe('24h');
      expect(report.generatedAt).toBeDefined();
      expect(report.status).toBeDefined();
      expect(report.alerts.total).toBe(1);
      expect(report.history).toHaveLength(1);
    });

    it('应该生成建议', () => {
      // 设置一些指标
      monitor.metrics.set('criticalIssues', { value: 3 });
      monitor.metrics.set(MetricType.ISSUE_DENSITY, { value: 5 });

      const recommendations = monitor.generateRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('priority');
      expect(recommendations[0]).toHaveProperty('title');
      expect(recommendations[0]).toHaveProperty('action');
    });
  });

  describe('错误处理', () => {
    it('应该处理检查错误', () => {
      const error = new Error('测试错误');
      
      monitor.handleCheckError(error);

      expect(monitor.consecutiveFailures).toBe(1);
      expect(monitor.history).toHaveLength(1);
      expect(monitor.history[0].status).toBe('error');
    });

    it('应该在连续失败时创建警报', () => {
      const error = new Error('测试错误');
      
      // 模拟连续失败
      monitor.consecutiveFailures = 2;
      monitor.handleCheckError(error);

      expect(monitor.alerts.length).toBeGreaterThan(0);
      expect(monitor.alerts[0].level).toBe(AlertLevel.CRITICAL);
    });
  });

  describe('趋势分析', () => {
    it('应该计算趋势', () => {
      const history = [
        { metrics: { [MetricType.ISSUE_COUNT]: 5, [MetricType.ISSUE_DENSITY]: 2.5 } },
        { metrics: { [MetricType.ISSUE_COUNT]: 7, [MetricType.ISSUE_DENSITY]: 3.5 } },
        { metrics: { [MetricType.ISSUE_COUNT]: 10, [MetricType.ISSUE_DENSITY]: 5.0 } }
      ];

      const trends = monitor.calculateTrends(history);

      expect(trends.issueCount).toBeDefined();
      expect(trends.issueDensity).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(trends.issueCount.trend);
    });

    it('应该处理数据不足的情况', () => {
      const trends = monitor.calculateTrends([]);
      expect(trends.insufficient_data).toBe(true);
    });

    it('应该计算指标趋势', () => {
      const metrics = [
        { [MetricType.ISSUE_COUNT]: 5 },
        { [MetricType.ISSUE_COUNT]: 7 },
        { [MetricType.ISSUE_COUNT]: 10 }
      ];

      const trend = monitor.calculateMetricTrend(metrics, MetricType.ISSUE_COUNT);

      expect(trend.trend).toBe('increasing');
      expect(trend.change).toBe(5);
      expect(trend.firstValue).toBe(5);
      expect(trend.lastValue).toBe(10);
    });
  });

  describe('数据导出', () => {
    it('应该导出监控数据', async () => {
      // 添加一些测试数据
      monitor.createAlert({
        level: AlertLevel.INFO,
        title: '测试警报',
        message: '测试'
      });

      monitor.recordHistory({
        timestamp: new Date().toISOString(),
        metrics: { [MetricType.ISSUE_COUNT]: 5 },
        status: 'success'
      });

      const exportData = await monitor.exportMonitoringData(tempDir);

      expect(exportData.timestamp).toBeDefined();
      expect(exportData.status).toBeDefined();
      expect(exportData.alerts).toHaveLength(1);
      expect(exportData.history).toHaveLength(1);

      // 验证文件是否创建
      const filePath = path.join(tempDir, 'monitoring-data.json');
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('辅助方法', () => {
    it('应该正确计算截止时间', () => {
      const cutoff1h = monitor.calculateCutoffTime('1h');
      const cutoff24h = monitor.calculateCutoffTime('24h');
      const cutoff7d = monitor.calculateCutoffTime('7d');

      const now = new Date();
      
      expect(cutoff1h.getTime()).toBeLessThan(now.getTime());
      expect(cutoff24h.getTime()).toBeLessThan(cutoff1h.getTime());
      expect(cutoff7d.getTime()).toBeLessThan(cutoff24h.getTime());
    });

    it('应该增加Map计数', () => {
      const map = new Map();
      
      monitor.incrementMapCount(map, 'test');
      monitor.incrementMapCount(map, 'test');
      monitor.incrementMapCount(map, 'other');

      expect(map.get('test')).toBe(2);
      expect(map.get('other')).toBe(1);
    });

    it('应该生成唯一的警报ID', () => {
      const id1 = monitor.generateAlertId();
      const id2 = monitor.generateAlertId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^alert_\d+_[a-z0-9]+$/);
    });
  });
});