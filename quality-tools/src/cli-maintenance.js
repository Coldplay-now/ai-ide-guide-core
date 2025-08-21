#!/usr/bin/env node

/**
 * 维护和更新流程系统CLI
 * 提供命令行接口来使用维护流程自动化工具、更新验证系统和培训系统
 */

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { MaintenanceFlowManager } from './core/maintenance-flow-manager.js';
import { UpdateVerificationSystem } from './core/update-verification-system.js';
import { MaintenanceTrainingSystem } from './core/maintenance-training-system.js';

const program = new Command();

program
  .name('maintenance-cli')
  .description('文档维护和更新流程管理工具')
  .version('1.0.0');

// 维护流程命令
const flowCommand = program
  .command('flow')
  .description('维护流程管理');

flowCommand
  .command('process')
  .description('处理新内容质量检查流程')
  .argument('<path>', '内容文件或目录路径')
  .option('-t, --type <type>', '变更类型 (added|modified|deleted|renamed)', 'added')
  .option('-c, --config <config>', '配置文件路径')
  .option('--no-impact', '禁用影响分析')
  .option('--no-dependency', '禁用依赖跟踪')
  .action(async (contentPath, options) => {
    try {
      console.log(`开始处理内容: ${contentPath}`);
      
      let config = {};
      if (options.config) {
        const configContent = await fs.readFile(options.config, 'utf8');
        config = JSON.parse(configContent);
      }

      config.enableImpactAnalysis = options.impact;
      config.enableDependencyTracking = options.dependency;

      const flowManager = new MaintenanceFlowManager(config);
      
      // 监听流程事件
      flowManager.on('flow:started', (flow) => {
        console.log(`✓ 流程已启动: ${flow.id}`);
      });

      flowManager.on('flow:step:started', ({ step }) => {
        console.log(`  → 执行步骤: ${step.name}`);
      });

      flowManager.on('flow:step:completed', ({ step }) => {
        console.log(`  ✓ 步骤完成: ${step.name} (${step.duration}ms)`);
      });

      flowManager.on('flow:completed', (flow) => {
        console.log(`✓ 流程完成: ${flow.id} (${flow.duration}ms)`);
      });

      const flow = await flowManager.processNewContent(contentPath, options.type);
      
      // 显示结果摘要
      console.log('\n=== 处理结果摘要 ===');
      console.log(`状态: ${flow.status}`);
      console.log(`耗时: ${flow.duration}ms`);
      console.log(`步骤数: ${flow.steps.length}`);
      
      if (flow.results.quality_check) {
        const issues = flow.results.quality_check.issues;
        console.log(`发现问题: ${issues.length}个`);
        
        if (issues.length > 0) {
          console.log('\n=== 问题详情 ===');
          issues.slice(0, 5).forEach((issue, index) => {
            console.log(`${index + 1}. [${issue.severity}] ${issue.description}`);
            console.log(`   文件: ${issue.file}:${issue.line}`);
            console.log(`   建议: ${issue.suggestion}`);
          });
          
          if (issues.length > 5) {
            console.log(`... 还有 ${issues.length - 5} 个问题`);
          }
        }
      }

      if (flow.results.quality_assessment) {
        const assessment = flow.results.quality_assessment;
        console.log(`\n=== 质量评估 ===`);
        console.log(`质量分数: ${assessment.overallScore}/100`);
        console.log(`质量级别: ${assessment.qualityLevel}`);
        console.log(`通过阈值: ${assessment.passesThresholds ? '是' : '否'}`);
        
        if (assessment.recommendations.length > 0) {
          console.log('\n建议:');
          assessment.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
          });
        }
      }

    } catch (error) {
      console.error('处理失败:', error.message);
      process.exit(1);
    }
  });

flowCommand
  .command('status')
  .description('查看活动流程状态')
  .action(async () => {
    try {
      const flowManager = new MaintenanceFlowManager();
      const activeFlows = flowManager.getActiveFlows();
      
      if (activeFlows.length === 0) {
        console.log('没有活动的流程');
        return;
      }

      console.log(`活动流程: ${activeFlows.length}个\n`);
      
      activeFlows.forEach((flow, index) => {
        console.log(`${index + 1}. ${flow.id}`);
        console.log(`   类型: ${flow.type}`);
        console.log(`   状态: ${flow.status}`);
        console.log(`   路径: ${flow.contentPath}`);
        console.log(`   开始时间: ${new Date(flow.startTime).toLocaleString()}`);
        if (flow.endTime) {
          console.log(`   结束时间: ${new Date(flow.endTime).toLocaleString()}`);
          console.log(`   耗时: ${flow.duration}ms`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('获取状态失败:', error.message);
      process.exit(1);
    }
  });

flowCommand
  .command('guides')
  .description('查看修复指南')
  .option('-t, --type <type>', '问题类型')
  .action(async (options) => {
    try {
      const flowManager = new MaintenanceFlowManager();
      
      if (options.type) {
        const guide = flowManager.getFixGuide(options.type);
        if (!guide) {
          console.log(`未找到问题类型 "${options.type}" 的修复指南`);
          return;
        }
        
        console.log(`=== ${guide.title} ===`);
        console.log(`描述: ${guide.description}`);
        console.log(`复杂度: ${guide.complexity}`);
        console.log(`预计时间: ${guide.estimatedTime}`);
        console.log(`自动修复: ${guide.autoFixable ? '是' : '否'}`);
        
        if (guide.requiresManualReview) {
          console.log('⚠️  需要人工审查');
        }
        
        console.log('\n修复步骤:');
        guide.steps.forEach((step, index) => {
          console.log(`${index + 1}. ${step}`);
        });
      } else {
        console.log('可用的修复指南:');
        const guides = [
          'code_block_unclosed',
          'table_column_mismatch', 
          'mermaid_no_direction',
          'heading_hierarchy',
          'broken_link'
        ];
        
        guides.forEach((type, index) => {
          const guide = flowManager.getFixGuide(type);
          if (guide) {
            console.log(`${index + 1}. ${type}: ${guide.title}`);
            console.log(`   复杂度: ${guide.complexity}, 自动修复: ${guide.autoFixable ? '是' : '否'}`);
          }
        });
        
        console.log('\n使用 --type <类型> 查看详细指南');
      }
    } catch (error) {
      console.error('获取修复指南失败:', error.message);
      process.exit(1);
    }
  });

// 更新验证命令
const verifyCommand = program
  .command('verify')
  .description('更新验证和发布系统');

verifyCommand
  .command('start')
  .description('开始验证流程')
  .argument('<path>', '更新路径')
  .option('-c, --config <config>', '配置文件路径')
  .option('--skip-non-critical', '跳过非关键测试')
  .option('--no-report', '不生成详细报告')
  .option('--no-integration', '禁用集成测试')
  .action(async (updatePath, options) => {
    try {
      console.log(`开始验证更新: ${updatePath}`);
      
      let config = {};
      if (options.config) {
        const configContent = await fs.readFile(options.config, 'utf8');
        config = JSON.parse(configContent);
      }

      config.enableIntegrationTests = options.integration;

      const verificationSystem = new UpdateVerificationSystem(config);
      
      // 监听验证事件
      verificationSystem.on('verification:started', (session) => {
        console.log(`✓ 验证会话已启动: ${session.id}`);
      });

      verificationSystem.on('verification:stage:started', ({ stage }) => {
        console.log(`  → 执行阶段: ${stage}`);
      });

      verificationSystem.on('verification:stage:completed', ({ stage, result }) => {
        const statusIcon = result.status === 'passed' ? '✓' : 
                          result.status === 'failed' ? '✗' : '⚠';
        console.log(`  ${statusIcon} 阶段完成: ${stage} (${result.status})`);
      });

      const session = await verificationSystem.startVerification(updatePath, {
        skipNonCritical: options.skipNonCritical,
        generateReport: options.report
      });
      
      // 显示验证结果
      console.log('\n=== 验证结果摘要 ===');
      console.log(`会话ID: ${session.id}`);
      console.log(`状态: ${session.status}`);
      console.log(`耗时: ${Math.round(session.duration / 1000)}秒`);
      
      // 显示阶段结果
      console.log('\n=== 阶段结果 ===');
      for (const [stageName, stageData] of session.results.stages.entries()) {
        const statusIcon = stageData.status === 'passed' ? '✓' : 
                          stageData.status === 'failed' ? '✗' : '⚠';
        console.log(`${statusIcon} ${stageName}: ${stageData.status}`);
        
        if (stageData.tests && stageData.tests.length > 0) {
          const passed = stageData.tests.filter(t => t.status === 'passed').length;
          const failed = stageData.tests.filter(t => t.status === 'failed').length;
          const warning = stageData.tests.filter(t => t.status === 'warning').length;
          console.log(`   测试: ${passed}通过, ${failed}失败, ${warning}警告`);
        }
      }

      // 显示发布建议
      const finalReview = session.results.stages.get('final_review');
      if (finalReview && finalReview.recommendations) {
        console.log('\n=== 发布建议 ===');
        finalReview.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
          console.log(`   ${rec.description}`);
          console.log(`   建议: ${rec.action}`);
        });
      }

      // 最终状态
      if (session.status === 'passed') {
        console.log('\n🎉 验证通过，可以发布！');
      } else if (session.status === 'warning') {
        console.log('\n⚠️  验证通过但有警告，建议修复后发布');
      } else {
        console.log('\n❌ 验证失败，需要修复问题后重新验证');
        process.exit(1);
      }

    } catch (error) {
      console.error('验证失败:', error.message);
      process.exit(1);
    }
  });

verifyCommand
  .command('sessions')
  .description('查看验证会话')
  .action(async () => {
    try {
      const verificationSystem = new UpdateVerificationSystem();
      const sessions = verificationSystem.getAllVerificationSessions();
      
      if (sessions.length === 0) {
        console.log('没有验证会话');
        return;
      }

      console.log(`验证会话: ${sessions.length}个\n`);
      
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.id}`);
        console.log(`   路径: ${session.updatePath}`);
        console.log(`   状态: ${session.status}`);
        console.log(`   阶段: ${session.stage}`);
        console.log(`   开始时间: ${new Date(session.startTime).toLocaleString()}`);
        if (session.endTime) {
          console.log(`   结束时间: ${new Date(session.endTime).toLocaleString()}`);
          console.log(`   耗时: ${Math.round(session.duration / 1000)}秒`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('获取会话失败:', error.message);
      process.exit(1);
    }
  });

verifyCommand
  .command('reports')
  .description('查看发布报告')
  .action(async () => {
    try {
      const verificationSystem = new UpdateVerificationSystem();
      const reports = verificationSystem.getAllReleaseReports();
      
      if (reports.length === 0) {
        console.log('没有发布报告');
        return;
      }

      console.log(`发布报告: ${reports.length}个\n`);
      
      reports.forEach((report, index) => {
        console.log(`${index + 1}. ${report.sessionId}`);
        console.log(`   路径: ${report.updatePath}`);
        console.log(`   状态: ${report.status}`);
        console.log(`   生成时间: ${new Date(report.timestamp).toLocaleString()}`);
        console.log(`   总阶段: ${report.summary.totalStages}`);
        console.log(`   总测试: ${report.summary.totalTests}`);
        console.log(`   通过测试: ${report.summary.passedTests}`);
        console.log(`   失败测试: ${report.summary.failedTests}`);
        console.log(`   可发布: ${report.summary.readyForRelease ? '是' : '否'}`);
        console.log('');
      });
    } catch (error) {
      console.error('获取报告失败:', error.message);
      process.exit(1);
    }
  });

// 培训系统命令
const trainingCommand = program
  .command('training')
  .description('维护培训和文档系统');

trainingCommand
  .command('modules')
  .description('查看培训模块')
  .option('-t, --type <type>', '模块类型 (basic|intermediate|advanced|specialized)')
  .action(async (options) => {
    try {
      const trainingSystem = new MaintenanceTrainingSystem();
      
      // 等待系统初始化
      await new Promise(resolve => {
        trainingSystem.on('training:system:initialized', resolve);
      });

      const modules = Array.from(trainingSystem.trainingModules.values());
      let filteredModules = modules;
      
      if (options.type) {
        filteredModules = modules.filter(module => module.type === options.type);
      }

      if (filteredModules.length === 0) {
        console.log('没有找到匹配的培训模块');
        return;
      }

      console.log(`培训模块: ${filteredModules.length}个\n`);
      
      filteredModules.forEach((module, index) => {
        console.log(`${index + 1}. ${module.title}`);
        console.log(`   ID: ${module.id}`);
        console.log(`   类型: ${module.type}`);
        console.log(`   时长: ${module.duration}`);
        console.log(`   描述: ${module.description}`);
        console.log(`   学习目标: ${module.objectives.length}个`);
        console.log('');
      });
    } catch (error) {
      console.error('获取培训模块失败:', error.message);
      process.exit(1);
    }
  });

trainingCommand
  .command('search')
  .description('搜索知识库')
  .argument('<query>', '搜索关键词')
  .option('-t, --type <type>', '条目类型 (guide|faq|troubleshooting|best_practice|case_study)')
  .option('--tags <tags>', '标签过滤，用逗号分隔')
  .action(async (query, options) => {
    try {
      const trainingSystem = new MaintenanceTrainingSystem();
      
      // 等待系统初始化
      await new Promise(resolve => {
        trainingSystem.on('training:system:initialized', resolve);
      });

      const filters = {};
      if (options.type) {
        filters.type = options.type;
      }
      if (options.tags) {
        filters.tags = options.tags.split(',').map(tag => tag.trim());
      }

      const results = trainingSystem.searchKnowledgeBase(query, filters);
      
      if (results.length === 0) {
        console.log('没有找到匹配的结果');
        return;
      }

      console.log(`搜索结果: ${results.length}个\n`);
      
      results.slice(0, 10).forEach((result, index) => {
        console.log(`${index + 1}. ${result.title} (相关性: ${result.relevance})`);
        console.log(`   类型: ${result.type}`);
        console.log(`   描述: ${result.description}`);
        console.log(`   标签: ${result.tags.join(', ')}`);
        console.log(`   更新时间: ${new Date(result.lastUpdated).toLocaleString()}`);
        console.log('');
      });

      if (results.length > 10) {
        console.log(`... 还有 ${results.length - 10} 个结果`);
      }
    } catch (error) {
      console.error('搜索失败:', error.message);
      process.exit(1);
    }
  });

trainingCommand
  .command('faq')
  .description('搜索FAQ')
  .argument('<query>', '搜索关键词')
  .option('-c, --category <category>', 'FAQ分类')
  .action(async (query, options) => {
    try {
      const trainingSystem = new MaintenanceTrainingSystem();
      
      // 等待系统初始化
      await new Promise(resolve => {
        trainingSystem.on('training:system:initialized', resolve);
      });

      const results = trainingSystem.searchFAQ(query, options.category);
      
      if (results.length === 0) {
        console.log('没有找到匹配的FAQ');
        return;
      }

      console.log(`FAQ搜索结果: ${results.length}个\n`);
      
      results.slice(0, 5).forEach((result, index) => {
        console.log(`${index + 1}. ${result.question}`);
        console.log(`   分类: ${result.category}`);
        console.log(`   热度: ${result.popularity}`);
        console.log(`   答案: ${result.answer.substring(0, 200)}${result.answer.length > 200 ? '...' : ''}`);
        console.log(`   标签: ${result.tags.join(', ')}`);
        console.log('');
      });

      if (results.length > 5) {
        console.log(`... 还有 ${results.length - 5} 个FAQ`);
      }
    } catch (error) {
      console.error('搜索FAQ失败:', error.message);
      process.exit(1);
    }
  });

trainingCommand
  .command('stats')
  .description('查看培训统计')
  .action(async () => {
    try {
      const trainingSystem = new MaintenanceTrainingSystem();
      
      // 等待系统初始化
      await new Promise(resolve => {
        trainingSystem.on('training:system:initialized', resolve);
      });

      const stats = trainingSystem.getTrainingStatistics();
      
      console.log('=== 培训系统统计 ===');
      console.log(`培训模块: ${stats.totalModules}个`);
      console.log(`注册用户: ${stats.totalUsers}个`);
      console.log(`知识库条目: ${stats.totalKnowledgeEntries}个`);
      console.log(`FAQ条目: ${stats.totalFAQs}个`);
      console.log(`总注册数: ${stats.totalEnrollments}个`);
      console.log(`完成数: ${stats.totalCompletions}个`);
      console.log(`完成率: ${stats.completionRate}%`);
    } catch (error) {
      console.error('获取统计失败:', error.message);
      process.exit(1);
    }
  });

// 通用配置命令
program
  .command('config')
  .description('生成配置文件模板')
  .option('-o, --output <path>', '输出路径', './maintenance-config.json')
  .action(async (options) => {
    try {
      const configTemplate = {
        maintenance: {
          autoProcessNewContent: true,
          enableImpactAnalysis: true,
          enableDependencyTracking: true,
          qualityThresholds: {
            maxIssuesPerFile: 10,
            maxCriticalIssues: 0,
            maxMajorIssues: 5
          }
        },
        verification: {
          enablePreReleaseChecks: true,
          enableIntegrationTests: true,
          generateDetailedReports: true,
          releaseThresholds: {
            maxCriticalIssues: 0,
            maxMajorIssues: 3,
            maxMinorIssues: 10,
            minQualityScore: 80
          },
          testSuites: {
            syntax: true,
            structure: true,
            links: true,
            images: true,
            formatting: true,
            accessibility: false,
            performance: false
          }
        },
        training: {
          enableProgressTracking: true,
          enableCertification: true,
          autoUpdateMaterials: false
        }
      };

      await fs.writeFile(options.output, JSON.stringify(configTemplate, null, 2));
      console.log(`配置文件模板已生成: ${options.output}`);
    } catch (error) {
      console.error('生成配置文件失败:', error.message);
      process.exit(1);
    }
  });

// 错误处理
program.configureOutput({
  writeErr: (str) => process.stderr.write(`[ERROR] ${str}`)
});

program.exitOverride();

try {
  await program.parseAsync();
} catch (error) {
  if (error.code !== 'commander.help' && error.code !== 'commander.version') {
    console.error('命令执行失败:', error.message);
    process.exit(1);
  }
}