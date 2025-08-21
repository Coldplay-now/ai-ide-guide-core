/**
 * 质量保证和验证系统集成测试
 * 测试质量检查器、修复验证器和质量监控器的集成工作
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { QualityChecker } from '../../src/core/quality-checker.js';
import { FixVerifier } from '../../src/core/fix-verifier.js';
import { QualityMonitor, MonitorStatus } from '../../src/core/quality-monitor.js';

describe('质量保证和验证系统集成测试', () => {
    let tempDir;
    let qualityChecker;
    let fixVerifier;
    let qualityMonitor;

    beforeEach(async () => {
        // 创建临时目录
        tempDir = path.join(__dirname, 'temp_integration_' + Date.now());
        await fs.mkdir(tempDir, { recursive: true });

        // 创建测试文件
        await fs.writeFile(
            path.join(tempDir, 'problematic.md'),
            `# 测试文档

这是一个有问题的文档：

\`\`\`javascript
function test() {
  console.log('未闭合的代码块');

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 |     | 值3 |
| 值1 | 值2 |

\`\`\`mermaid
graph
    A --> B
    B --> C
\`\`\`

## 重复标题

一些内容

## 重复标题

更多内容`
        );

        // 初始化组件
        qualityChecker = new QualityChecker();
        fixVerifier = new FixVerifier();
        qualityMonitor = new QualityMonitor({
            checkInterval: 500,
            watchPaths: [tempDir],
            enableFileWatcher: false,
            alertThresholds: {
                criticalIssueCount: 1,
                majorIssueCount: 3
            }
        });
    });

    afterEach(async () => {
        // 停止监控
        if (qualityMonitor.status === MonitorStatus.RUNNING) {
            await qualityMonitor.stop();
        }

        // 清理临时文件
        try {
            await fs.rm(tempDir, { recursive: true });
        } catch (error) {
            // 忽略清理错误
        }
    });

    describe('完整的质量检查和修复流程', () => {
        it('应该检测问题、验证修复并监控质量', async () => {
            const filePath = path.join(tempDir, 'problematic.md');

            // 1. 检测问题
            const originalIssues = await qualityChecker.checkFile(filePath);
            expect(originalIssues.length).toBeGreaterThan(0);

            console.log(`检测到 ${originalIssues.length} 个问题`);

            // 2. 模拟修复
            const fixedContent = `# 测试文档

这是一个修复后的文档：

\`\`\`javascript
function test() {
  console.log('已闭合的代码块');
}
\`\`\`

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值1 | 值2 | 值3 |
| 值1 | 值2 | 值3 |

\`\`\`mermaid
graph TB
    A --> B
    B --> C
\`\`\`

## 第一个标题

一些内容

## 第二个标题

更多内容`;

            // 3. 验证修复
            const fixResult = {
                issueId: 'integration-test-fix',
                type: 'code_block_unclosed',
                line: 7,
                status: 'fixed'
            };

            const originalContent = await fs.readFile(filePath, 'utf8');
            const verification = await fixVerifier.verifyFix(
                fixResult,
                originalContent,
                fixedContent,
                filePath
            );

            expect(['verified', 'partially_fixed']).toContain(verification.status);
            expect(verification.metrics.improvementRate).toBeGreaterThan(0);

            console.log(`修复验证结果: ${verification.status}, 改进率: ${(verification.metrics.improvementRate * 100).toFixed(1)}%`);

            // 4. 启动监控并检查
            await qualityMonitor.start();

            // 等待至少一次检查完成
            await new Promise(resolve => {
                qualityMonitor.on('check:completed', resolve);
            });

            const monitorStatus = qualityMonitor.getStatus();
            expect(monitorStatus.status).toBe(MonitorStatus.RUNNING);
            expect(monitorStatus.activeAlerts).toBeGreaterThan(0); // 应该有警报因为问题数量超过阈值

            console.log(`监控状态: ${monitorStatus.status}, 活跃警报: ${monitorStatus.activeAlerts}`);

            // 5. 应用修复并重新检查
            await fs.writeFile(filePath, fixedContent);

            // 手动触发检查
            await qualityMonitor.performQualityCheck();

            const updatedStatus = qualityMonitor.getStatus();
            console.log(`修复后监控状态: 活跃警报: ${updatedStatus.activeAlerts}`);

            await qualityMonitor.stop();
        });

        it('应该生成综合质量报告', async () => {
            // 启动监控
            await qualityMonitor.start();

            // 等待检查完成
            await new Promise(resolve => {
                qualityMonitor.on('check:completed', resolve);
            });

            // 生成报告
            const report = qualityMonitor.getQualityReport('1h');

            expect(report.timeRange).toBe('1h');
            expect(report.status).toBeDefined();
            expect(report.metrics).toBeDefined();
            expect(report.alerts).toBeDefined();
            expect(report.recommendations).toBeInstanceOf(Array);

            console.log(`质量报告生成完成:`);
            console.log(`- 总问题数: ${report.metrics.issue_count?.value || 0}`);
            console.log(`- 问题密度: ${report.metrics.issue_density?.value?.toFixed(2) || 0}`);
            console.log(`- 活跃警报: ${report.alerts.active.length}`);
            console.log(`- 建议数量: ${report.recommendations.length}`);

            await qualityMonitor.stop();
        });

        it('应该处理批量文件的质量检查和验证', async () => {
            // 创建多个测试文件
            const files = ['file1.md', 'file2.md', 'file3.md'];
            const originalContents = [];
            const fixedContents = [];
            const fixResults = [];

            for (let i = 0; i < files.length; i++) {
                const fileName = files[i];
                const filePath = path.join(tempDir, fileName);

                const originalContent = `# 文档 ${i + 1}

\`\`\`
未闭合的代码块 ${i + 1}

| A | B |
|---|---|
| 1 |`;

                const fixedContent = `# 文档 ${i + 1}

\`\`\`javascript
console.log('修复的代码块 ${i + 1}');
\`\`\`

| A | B |
|---|---|
| 1 | 2 |`;

                await fs.writeFile(filePath, originalContent);

                originalContents.push(originalContent);
                fixedContents.push(fixedContent);
                fixResults.push({
                    issueId: `batch-fix-${i}`,
                    type: 'code_block_unclosed',
                    line: 3,
                    status: 'fixed'
                });
            }

            // 批量验证修复
            const verifications = await fixVerifier.verifyBatchFixes(
                fixResults,
                originalContents,
                fixedContents,
                files.map(f => path.join(tempDir, f))
            );

            expect(verifications).toHaveLength(3);
            expect(verifications.every(v => v.status === 'verified')).toBe(true);

            console.log(`批量验证完成: ${verifications.length} 个文件全部验证通过`);

            // 启动监控检查所有文件
            await qualityMonitor.start();

            await new Promise(resolve => {
                qualityMonitor.on('check:completed', resolve);
            });

            const status = qualityMonitor.getStatus();
            expect(status.status).toBe(MonitorStatus.RUNNING);

            console.log(`批量监控完成: 检查了 ${files.length} 个文件`);

            await qualityMonitor.stop();
        });

        it('应该正确处理质量趋势跟踪', async () => {
            const filePath = path.join(tempDir, 'trending.md');

            // 创建初始问题文件
            await fs.writeFile(filePath, `# 趋势测试

\`\`\`
未闭合1

\`\`\`
未闭合2

| A |
|---|
| 1 |`);

            await qualityMonitor.start();

            // 第一次检查
            await new Promise(resolve => {
                qualityMonitor.on('check:completed', resolve);
            });

            // 部分修复
            await fs.writeFile(filePath, `# 趋势测试

\`\`\`javascript
console.log('修复了一个');
\`\`\`

\`\`\`
还有一个未闭合

| A | B |
|---|---|
| 1 | 2 |`);

            // 第二次检查
            await qualityMonitor.performQualityCheck();

            // 完全修复
            await fs.writeFile(filePath, `# 趋势测试

\`\`\`javascript
console.log('全部修复');
\`\`\`

\`\`\`python
print('另一个修复')
\`\`\`

| A | B |
|---|---|
| 1 | 2 |`);

            // 第三次检查
            await qualityMonitor.performQualityCheck();

            // 检查趋势
            const report = qualityMonitor.getQualityReport('1h');
            expect(report.trends).toBeDefined();

            if (!report.trends.insufficient_data) {
                expect(report.trends.issueCount).toBeDefined();
                console.log(`质量趋势: ${report.trends.issueCount.trend}`);
            }

            console.log(`趋势跟踪完成: 历史记录 ${report.history.length} 条`);

            await qualityMonitor.stop();
        });
    });

    describe('错误处理和恢复', () => {
        it('应该处理文件访问错误', async () => {
            const nonExistentFile = path.join(tempDir, 'nonexistent.md');

            // 质量检查器应该处理文件不存在的情况
            const issues = await qualityChecker.checkFile(nonExistentFile);
            expect(issues).toHaveLength(1);
            expect(issues[0].type).toBe('file_access_error');

            console.log('文件访问错误处理正常');
        });

        it('应该处理监控系统错误', async () => {
            // 模拟监控错误
            const errorEvents = [];
            qualityMonitor.on('check:error', (error) => {
                errorEvents.push(error);
            });

            // 创建一个会导致错误的情况
            qualityMonitor.config.watchPaths = ['/nonexistent/path'];

            await qualityMonitor.start();

            // 等待检查完成（可能有错误）
            await new Promise(resolve => setTimeout(resolve, 600));

            await qualityMonitor.stop();

            console.log('监控系统错误处理测试完成');
        });
    });

    describe('性能和扩展性', () => {
        it('应该能够处理大量文件', async () => {
            // 创建多个文件
            const fileCount = 10;
            const files = [];

            for (let i = 0; i < fileCount; i++) {
                const fileName = `perf-test-${i}.md`;
                const filePath = path.join(tempDir, fileName);

                await fs.writeFile(filePath, `# 性能测试文件 ${i}

这是第 ${i} 个测试文件。

\`\`\`javascript
console.log('文件 ${i}');
\`\`\`

| 序号 | 名称 |
|------|------|
| ${i} | 文件${i} |`);

                files.push(filePath);
            }

            const startTime = Date.now();

            // 批量检查
            const allIssues = [];
            for (const filePath of files) {
                const issues = await qualityChecker.checkFile(filePath);
                allIssues.push(...issues);
            }

            const checkTime = Date.now() - startTime;

            console.log(`性能测试完成:`);
            console.log(`- 文件数量: ${fileCount}`);
            console.log(`- 检查时间: ${checkTime}ms`);
            console.log(`- 平均每文件: ${(checkTime / fileCount).toFixed(1)}ms`);
            console.log(`- 总问题数: ${allIssues.length}`);

            expect(checkTime).toBeLessThan(5000); // 应该在5秒内完成
        });
    });
});