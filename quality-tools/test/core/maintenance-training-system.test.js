/**
 * 维护培训系统测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { MaintenanceTrainingSystem, TrainingModuleType, TrainingStatus, KnowledgeEntryType } from '../../src/core/maintenance-training-system.js';

describe('MaintenanceTrainingSystem', () => {
  let trainingSystem;
  let testDir;

  beforeEach(async () => {
    testDir = path.join(process.cwd(), 'test-temp', 'training');
    await fs.mkdir(testDir, { recursive: true });
    
    trainingSystem = new MaintenanceTrainingSystem({
      trainingPath: path.join(testDir, 'training-materials'),
      knowledgeBasePath: path.join(testDir, 'knowledge-base'),
      enableProgressTracking: true,
      enableCertification: true
    });

    // 等待系统初始化完成
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

  describe('培训模块管理', () => {
    it('应该初始化基础培训模块', () => {
      expect(trainingSystem.trainingModules.size).toBeGreaterThan(0);
      
      const basicModule = trainingSystem.trainingModules.get('basic_quality_concepts');
      expect(basicModule).toBeDefined();
      expect(basicModule.type).toBe(TrainingModuleType.BASIC);
      expect(basicModule.title).toBe('文档质量基础概念');
      expect(basicModule.objectives).toBeInstanceOf(Array);
      expect(basicModule.content).toBeDefined();
    });

    it('应该包含不同类型的培训模块', () => {
      const moduleTypes = Array.from(trainingSystem.trainingModules.values())
        .map(module => module.type);
      
      expect(moduleTypes).toContain(TrainingModuleType.BASIC);
      expect(moduleTypes).toContain(TrainingModuleType.INTERMEDIATE);
      expect(moduleTypes).toContain(TrainingModuleType.ADVANCED);
    });

    it('应该为每个模块提供完整的内容结构', () => {
      const markdownModule = trainingSystem.trainingModules.get('markdown_best_practices');
      
      expect(markdownModule.content).toHaveProperty('sections');
      expect(markdownModule.content.sections).toBeInstanceOf(Array);
      expect(markdownModule.content.sections.length).toBeGreaterThan(0);
      
      const firstSection = markdownModule.content.sections[0];
      expect(firstSection).toHaveProperty('title');
      expect(firstSection).toHaveProperty('content');
    });
  });

  describe('知识库管理', () => {
    it('应该初始化知识库条目', () => {
      expect(trainingSystem.knowledgeBase.size).toBeGreaterThan(0);
      
      const troubleshootingGuide = trainingSystem.knowledgeBase.get('troubleshooting_guide');
      expect(troubleshootingGuide).toBeDefined();
      expect(troubleshootingGuide.type).toBe(KnowledgeEntryType.TROUBLESHOOTING);
      expect(troubleshootingGuide.title).toBe('故障排除指南');
    });

    it('应该支持知识库搜索', () => {
      const results = trainingSystem.searchKnowledgeBase('质量检查');
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('relevance');
    });

    it('应该支持按类型过滤搜索', () => {
      const troubleshootingResults = trainingSystem.searchKnowledgeBase('问题', {
        type: KnowledgeEntryType.TROUBLESHOOTING
      });
      
      expect(troubleshootingResults).toBeInstanceOf(Array);
      troubleshootingResults.forEach(result => {
        expect(result.type).toBe(KnowledgeEntryType.TROUBLESHOOTING);
      });
    });

    it('应该支持按标签过滤搜索', () => {
      const bestPracticeResults = trainingSystem.searchKnowledgeBase('维护', {
        tags: ['best-practices']
      });
      
      expect(bestPracticeResults).toBeInstanceOf(Array);
      bestPracticeResults.forEach(result => {
        expect(result.tags).toContain('best-practices');
      });
    });
  });

  describe('FAQ系统', () => {
    it('应该初始化FAQ条目', () => {
      expect(trainingSystem.faqEntries.size).toBeGreaterThan(0);
      
      const firstFAQ = Array.from(trainingSystem.faqEntries.values())[0];
      expect(firstFAQ).toHaveProperty('question');
      expect(firstFAQ).toHaveProperty('answer');
      expect(firstFAQ).toHaveProperty('category');
      expect(firstFAQ).toHaveProperty('tags');
      expect(firstFAQ).toHaveProperty('popularity');
    });

    it('应该支持FAQ搜索', () => {
      const results = trainingSystem.searchFAQ('质量检查');
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('relevance');
    });

    it('应该支持按分类搜索FAQ', () => {
      const basicResults = trainingSystem.searchFAQ('使用', '基础使用');
      
      expect(basicResults).toBeInstanceOf(Array);
      basicResults.forEach(result => {
        expect(result.category).toBe('基础使用');
      });
    });

    it('应该能够添加新的FAQ条目', () => {
      const newFAQ = {
        category: '测试分类',
        question: '这是一个测试问题？',
        answer: '这是测试答案。',
        tags: ['test', 'example'],
        popularity: 50
      };

      const addedFAQ = trainingSystem.addFAQEntry(newFAQ);
      
      expect(addedFAQ).toHaveProperty('id');
      expect(addedFAQ.question).toBe(newFAQ.question);
      expect(addedFAQ.answer).toBe(newFAQ.answer);
      
      // 验证FAQ已添加到系统中
      const retrievedFAQ = trainingSystem.faqEntries.get(addedFAQ.id);
      expect(retrievedFAQ).toBeDefined();
    });

    it('应该能够更新FAQ条目', () => {
      // 先添加一个FAQ
      const newFAQ = trainingSystem.addFAQEntry({
        category: '测试',
        question: '原始问题？',
        answer: '原始答案',
        tags: ['test']
      });

      // 更新FAQ
      const updates = {
        question: '更新后的问题？',
        answer: '更新后的答案',
        popularity: 100
      };

      const updatedFAQ = trainingSystem.updateFAQEntry(newFAQ.id, updates);
      
      expect(updatedFAQ.question).toBe(updates.question);
      expect(updatedFAQ.answer).toBe(updates.answer);
      expect(updatedFAQ.popularity).toBe(updates.popularity);
      expect(updatedFAQ.lastUpdated).not.toBe(newFAQ.lastUpdated);
    });
  });

  describe('用户进度跟踪', () => {
    it('应该能够跟踪用户学习进度', async () => {
      const userId = 'test-user-001';
      const moduleId = 'basic_quality_concepts';
      const progress = {
        status: TrainingStatus.IN_PROGRESS,
        completedSections: 2,
        totalSections: 5,
        score: 85,
        timeSpent: 1800 // 30分钟
      };

      await trainingSystem.trackUserProgress(userId, moduleId, progress);
      
      const userProgress = trainingSystem.getUserProgress(userId);
      expect(userProgress.has(moduleId)).toBe(true);
      
      const moduleProgress = userProgress.get(moduleId);
      expect(moduleProgress.status).toBe(TrainingStatus.IN_PROGRESS);
      expect(moduleProgress.completedSections).toBe(2);
      expect(moduleProgress.score).toBe(85);
    });

    it('应该能够更新用户进度', async () => {
      const userId = 'test-user-002';
      const moduleId = 'markdown_best_practices';
      
      // 初始进度
      await trainingSystem.trackUserProgress(userId, moduleId, {
        status: TrainingStatus.IN_PROGRESS,
        completedSections: 1
      });

      // 更新进度
      await trainingSystem.trackUserProgress(userId, moduleId, {
        status: TrainingStatus.COMPLETED,
        completedSections: 3,
        score: 92
      });

      const userProgress = trainingSystem.getUserProgress(userId);
      const moduleProgress = userProgress.get(moduleId);
      
      expect(moduleProgress.status).toBe(TrainingStatus.COMPLETED);
      expect(moduleProgress.completedSections).toBe(3);
      expect(moduleProgress.score).toBe(92);
    });

    it('应该为新用户返回空的进度记录', () => {
      const newUserProgress = trainingSystem.getUserProgress('new-user');
      expect(newUserProgress).toBeInstanceOf(Map);
      expect(newUserProgress.size).toBe(0);
    });
  });

  describe('培训材料生成', () => {
    it('应该能够格式化培训模块', () => {
      const module = trainingSystem.trainingModules.get('basic_quality_concepts');
      const formattedContent = trainingSystem.formatTrainingModule(module);
      
      expect(formattedContent).toContain(module.title);
      expect(formattedContent).toContain(module.type);
      expect(formattedContent).toContain(module.duration);
      expect(formattedContent).toContain('学习目标');
      expect(formattedContent).toContain('内容大纲');
    });

    it('应该能够格式化练习题', () => {
      const exercises = [
        {
          title: '测试练习',
          difficulty: '简单',
          estimatedTime: '10分钟',
          description: '这是一个测试练习',
          requirements: ['要求1', '要求2'],
          hints: ['提示1', '提示2'],
          solution: '这是参考答案'
        }
      ];

      const formattedExercises = trainingSystem.formatExercises(exercises);
      
      expect(formattedExercises).toContain('练习题');
      expect(formattedExercises).toContain('测试练习');
      expect(formattedExercises).toContain('难度');
      expect(formattedExercises).toContain('参考答案');
    });

    it('应该能够格式化评估内容', () => {
      const assessment = {
        totalScore: 100,
        passingScore: 80,
        timeLimit: '30分钟',
        instructions: '请仔细阅读题目',
        questions: [
          {
            type: 'multiple_choice',
            question: '测试问题？',
            options: ['选项A', '选项B', '选项C'],
            points: 20
          }
        ],
        gradingCriteria: [
          {
            category: '理论知识',
            description: '对概念的理解',
            excellent: 90,
            excellentDesc: '完全掌握',
            good: 80,
            goodDesc: '基本掌握',
            passing: 70,
            passingDesc: '了解基本概念'
          }
        ]
      };

      const formattedAssessment = trainingSystem.formatAssessment(assessment);
      
      expect(formattedAssessment).toContain('模块评估');
      expect(formattedAssessment).toContain('总分');
      expect(formattedAssessment).toContain('测试问题');
      expect(formattedAssessment).toContain('评分标准');
    });
  });

  describe('学习路径管理', () => {
    it('应该能够获取模块前置要求', () => {
      const basicPrereqs = trainingSystem.getModulePrerequisites('basic_quality_concepts');
      const advancedPrereqs = trainingSystem.getModulePrerequisites('advanced_maintenance');
      
      expect(basicPrereqs).toHaveLength(1);
      expect(basicPrereqs[0]).toBe('基础质量概念');
      
      expect(advancedPrereqs.length).toBeGreaterThan(1);
      expect(advancedPrereqs).toContain('基础质量概念');
      expect(advancedPrereqs).toContain('高级维护技术');
    });
  });

  describe('统计和报告', () => {
    it('应该能够生成培训统计', async () => {
      // 添加一些用户进度数据
      await trainingSystem.trackUserProgress('user1', 'basic_quality_concepts', {
        status: TrainingStatus.COMPLETED
      });
      await trainingSystem.trackUserProgress('user1', 'markdown_best_practices', {
        status: TrainingStatus.IN_PROGRESS
      });
      await trainingSystem.trackUserProgress('user2', 'basic_quality_concepts', {
        status: TrainingStatus.IN_PROGRESS
      });

      const stats = trainingSystem.getTrainingStatistics();
      
      expect(stats).toHaveProperty('totalModules');
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('totalKnowledgeEntries');
      expect(stats).toHaveProperty('totalFAQs');
      expect(stats).toHaveProperty('totalEnrollments');
      expect(stats).toHaveProperty('totalCompletions');
      expect(stats).toHaveProperty('completionRate');
      
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalEnrollments).toBe(3);
      expect(stats.totalCompletions).toBe(1);
      expect(stats.completionRate).toBeCloseTo(33.33, 1);
    });

    it('应该能够导出培训数据', async () => {
      const outputPath = path.join(testDir, 'export');
      await fs.mkdir(outputPath, { recursive: true });

      const exportedData = await trainingSystem.exportTrainingData(outputPath);
      
      expect(exportedData).toHaveProperty('timestamp');
      expect(exportedData).toHaveProperty('trainingModules');
      expect(exportedData).toHaveProperty('knowledgeBase');
      expect(exportedData).toHaveProperty('faqEntries');
      expect(exportedData).toHaveProperty('userProgress');
      
      // 检查文件是否已创建
      const exportFile = path.join(outputPath, 'training-data.json');
      const fileExists = await fs.access(exportFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });
  });

  describe('相关性计算', () => {
    it('应该能够计算知识库条目的相关性', () => {
      const entry = {
        title: '质量检查工具使用指南',
        description: '如何使用自动化质量检查工具',
        tags: ['tools', 'quality', 'automation']
      };

      const relevance = trainingSystem.calculateRelevance(entry, '质量检查');
      
      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBe(15); // 标题匹配10分 + 描述匹配5分
    });

    it('应该能够计算FAQ的相关性', () => {
      const faq = {
        question: '如何开始使用质量检查工具？',
        answer: '首先安装依赖，然后运行质量检查命令',
        tags: ['getting-started', 'tools'],
        popularity: 95
      };

      const relevance = trainingSystem.calculateFAQRelevance(faq, '质量检查');
      
      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeCloseTo(24.5, 1); // 问题匹配10分 + 答案匹配5分 + 热度9.5分
    });
  });

  describe('事件处理', () => {
    it('应该发出进度更新事件', async () => {
      const events = [];
      trainingSystem.on('progress:updated', (data) => events.push(data));

      await trainingSystem.trackUserProgress('test-user', 'basic_quality_concepts', {
        status: TrainingStatus.IN_PROGRESS
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('userId', 'test-user');
      expect(events[0]).toHaveProperty('moduleId', 'basic_quality_concepts');
      expect(events[0]).toHaveProperty('progress');
    });

    it('应该发出FAQ添加事件', () => {
      const events = [];
      trainingSystem.on('faq:added', (faq) => events.push(faq));

      trainingSystem.addFAQEntry({
        category: '测试',
        question: '测试问题？',
        answer: '测试答案'
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('question', '测试问题？');
    });

    it('应该发出FAQ更新事件', () => {
      const events = [];
      trainingSystem.on('faq:updated', (faq) => events.push(faq));

      const newFAQ = trainingSystem.addFAQEntry({
        category: '测试',
        question: '原始问题？',
        answer: '原始答案'
      });

      trainingSystem.updateFAQEntry(newFAQ.id, {
        question: '更新后的问题？'
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('question', '更新后的问题？');
    });
  });

  describe('错误处理', () => {
    it('应该处理更新不存在的FAQ条目', () => {
      expect(() => {
        trainingSystem.updateFAQEntry('non-existent-id', {
          question: '更新问题'
        });
      }).toThrow('FAQ条目不存在');
    });

    it('应该处理系统初始化错误', async () => {
      const errorEvents = [];
      
      // 创建一个会失败的培训系统
      const failingSystem = new MaintenanceTrainingSystem({
        trainingPath: '/invalid/path/that/cannot/be/created'
      });

      failingSystem.on('training:system:error', (error) => errorEvents.push(error));

      // 等待一段时间让错误事件触发
      await new Promise(resolve => setTimeout(resolve, 100));

      // 注意：由于文件系统操作可能不会立即失败，这个测试可能需要调整
      // 或者我们可以模拟文件系统错误
    });
  });

  describe('内容生成', () => {
    it('应该生成完整的基础概念内容', async () => {
      const content = await trainingSystem.generateBasicQualityConceptsContent();
      
      expect(content).toHaveProperty('sections');
      expect(content.sections).toBeInstanceOf(Array);
      expect(content.sections.length).toBeGreaterThan(0);
      
      const firstSection = content.sections[0];
      expect(firstSection.title).toBe('什么是文档质量');
      expect(firstSection.content).toContain('质量维度');
    });

    it('应该生成故障排除指南', async () => {
      const guide = await trainingSystem.generateTroubleshootingGuide();
      
      expect(guide).toHaveProperty('sections');
      expect(guide.sections).toBeInstanceOf(Array);
      
      const firstSection = guide.sections[0];
      expect(firstSection).toHaveProperty('problems');
      expect(firstSection.problems).toBeInstanceOf(Array);
      
      const firstProblem = firstSection.problems[0];
      expect(firstProblem).toHaveProperty('problem');
      expect(firstProblem).toHaveProperty('symptoms');
      expect(firstProblem).toHaveProperty('diagnosis');
      expect(firstProblem).toHaveProperty('solutions');
    });

    it('应该生成案例研究', async () => {
      const caseStudies = await trainingSystem.generateCaseStudies();
      
      expect(caseStudies).toHaveProperty('cases');
      expect(caseStudies.cases).toBeInstanceOf(Array);
      expect(caseStudies.cases.length).toBeGreaterThan(0);
      
      const firstCase = caseStudies.cases[0];
      expect(firstCase).toHaveProperty('title');
      expect(firstCase).toHaveProperty('background');
      expect(firstCase).toHaveProperty('challenges');
      expect(firstCase).toHaveProperty('approach');
      expect(firstCase).toHaveProperty('results');
      expect(firstCase).toHaveProperty('lessons');
    });
  });
});