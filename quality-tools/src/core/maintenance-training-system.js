/**
 * 维护培训和文档系统
 * 编写维护人员培训材料、实现最佳实践指南维护、开发知识库和FAQ系统
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

/**
 * 培训模块类型
 */
const TrainingModuleType = {
  BASIC: 'basic',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  SPECIALIZED: 'specialized'
};

/**
 * 培训状态
 */
const TrainingStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired'
};

/**
 * 知识库条目类型
 */
const KnowledgeEntryType = {
  GUIDE: 'guide',
  FAQ: 'faq',
  TROUBLESHOOTING: 'troubleshooting',
  BEST_PRACTICE: 'best_practice',
  CASE_STUDY: 'case_study'
};

class MaintenanceTrainingSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      trainingPath: config.trainingPath || './training-materials',
      knowledgeBasePath: config.knowledgeBasePath || './knowledge-base',
      enableProgressTracking: config.enableProgressTracking !== false,
      enableCertification: config.enableCertification !== false,
      autoUpdateMaterials: config.autoUpdateMaterials !== false,
      ...config
    };

    this.trainingModules = new Map();
    this.knowledgeBase = new Map();
    this.userProgress = new Map();
    this.bestPractices = new Map();
    this.faqEntries = new Map();
    
    this.initializeTrainingSystem();
  }

  /**
   * 初始化培训系统
   */
  async initializeTrainingSystem() {
    try {
      await this.createTrainingMaterials();
      await this.createKnowledgeBase();
      await this.createBestPracticesGuide();
      await this.createFAQSystem();
      
      this.emit('training:system:initialized');
    } catch (error) {
      this.emit('training:system:error', error);
      throw error;
    }
  }

  /**
   * 创建培训材料
   */
  async createTrainingMaterials() {
    // 基础培训模块
    this.trainingModules.set('basic_quality_concepts', {
      id: 'basic_quality_concepts',
      title: '文档质量基础概念',
      type: TrainingModuleType.BASIC,
      duration: '30分钟',
      description: '学习文档质量的基本概念和重要性',
      objectives: [
        '理解文档质量的定义和重要性',
        '掌握常见的文档质量问题类型',
        '学习质量评估的基本方法'
      ],
      content: await this.generateBasicQualityConceptsContent(),
      exercises: await this.generateBasicExercises(),
      assessment: await this.generateBasicAssessment()
    });

    this.trainingModules.set('markdown_best_practices', {
      id: 'markdown_best_practices',
      title: 'Markdown最佳实践',
      type: TrainingModuleType.BASIC,
      duration: '45分钟',
      description: '掌握Markdown编写的最佳实践',
      objectives: [
        '掌握标准Markdown语法',
        '学习文档结构组织方法',
        '了解可访问性要求'
      ],
      content: await this.generateMarkdownBestPracticesContent(),
      exercises: await this.generateMarkdownExercises(),
      assessment: await this.generateMarkdownAssessment()
    });

    this.trainingModules.set('quality_tools_usage', {
      id: 'quality_tools_usage',
      title: '质量工具使用指南',
      type: TrainingModuleType.INTERMEDIATE,
      duration: '60分钟',
      description: '学习如何使用自动化质量检查工具',
      objectives: [
        '掌握质量检查工具的使用方法',
        '学习如何解读质量报告',
        '了解自动修复功能的使用'
      ],
      content: await this.generateQualityToolsContent(),
      exercises: await this.generateToolsExercises(),
      assessment: await this.generateToolsAssessment()
    });

    this.trainingModules.set('advanced_maintenance', {
      id: 'advanced_maintenance',
      title: '高级维护技术',
      type: TrainingModuleType.ADVANCED,
      duration: '90分钟',
      description: '学习高级文档维护和优化技术',
      objectives: [
        '掌握复杂问题的诊断和解决',
        '学习性能优化技术',
        '了解大规模文档维护策略'
      ],
      content: await this.generateAdvancedMaintenanceContent(),
      exercises: await this.generateAdvancedExercises(),
      assessment: await this.generateAdvancedAssessment()
    });

    // 生成培训材料文件
    await this.generateTrainingMaterialFiles();
  }

  /**
   * 生成基础质量概念内容
   */
  async generateBasicQualityConceptsContent() {
    return {
      sections: [
        {
          title: '什么是文档质量',
          content: `
文档质量是指文档在准确性、完整性、一致性、可读性和可维护性方面的综合表现。

## 质量维度

### 1. 准确性 (Accuracy)
- 内容信息正确无误
- 代码示例可以正常运行
- 链接指向正确的资源

### 2. 完整性 (Completeness)
- 涵盖所有必要的信息
- 没有遗漏重要的步骤或概念
- 提供充分的上下文信息

### 3. 一致性 (Consistency)
- 术语使用统一
- 格式风格一致
- 结构组织规范

### 4. 可读性 (Readability)
- 语言清晰易懂
- 结构层次分明
- 视觉呈现良好

### 5. 可维护性 (Maintainability)
- 易于更新和修改
- 模块化组织
- 版本控制友好
          `
        },
        {
          title: '常见质量问题',
          content: `
## 语法和格式问题

### 代码块问题
- 未闭合的代码块
- 缺少语言标识符
- 不正确的缩进

### 表格问题
- 列数不匹配
- 空单元格
- 格式不一致

### 链接问题
- 断链
- 重复锚点
- 无效引用

## 内容质量问题

### 结构问题
- 标题层次跳跃
- 逻辑组织混乱
- 缺少导航

### 可访问性问题
- 缺少alt文本
- 颜色对比度不足
- 语义标记不当
          `
        },
        {
          title: '质量评估方法',
          content: `
## 自动化检查
- 语法验证
- 格式检查
- 链接验证
- 性能分析

## 人工审查
- 内容准确性
- 逻辑完整性
- 用户体验
- 专业性评估

## 用户反馈
- 可用性测试
- 满意度调查
- 错误报告
- 改进建议
          `
        }
      ],
      resources: [
        '文档质量标准规范',
        '质量检查清单',
        '最佳实践指南'
      ]
    };
  }

  /**
   * 生成Markdown最佳实践内容
   */
  async generateMarkdownBestPracticesContent() {
    return {
      sections: [
        {
          title: 'Markdown语法规范',
          content: `
## 标题规范

### 使用ATX风格标题
\`\`\`markdown
# 一级标题
## 二级标题
### 三级标题
\`\`\`

### 标题层次规则
- 保持层次连续性，避免跳级
- 每个文档只有一个H1标题
- 标题前后保持空行

## 列表规范

### 无序列表
\`\`\`markdown
- 项目1
- 项目2
  - 子项目2.1
  - 子项目2.2
\`\`\`

### 有序列表
\`\`\`markdown
1. 第一步
2. 第二步
3. 第三步
\`\`\`

## 代码块规范

### 行内代码
使用 \`代码\` 标记行内代码

### 代码块
\`\`\`javascript
function example() {
  console.log('Hello World');
}
\`\`\`

### 代码块最佳实践
- 始终指定语言标识符
- 保持适当的缩进
- 代码块前后保持空行
          `
        },
        {
          title: '文档结构组织',
          content: `
## 文档结构模板

\`\`\`markdown
# 文档标题

## 概述
简要介绍文档内容和目标

## 目录
- [章节1](#章节1)
- [章节2](#章节2)

## 章节1
详细内容...

### 子章节1.1
具体内容...

## 章节2
详细内容...

## 总结
总结要点

## 参考资料
相关链接和资源
\`\`\`

## 组织原则
- 逻辑清晰，层次分明
- 重要信息前置
- 提供导航和索引
- 保持适当的章节长度
          `
        }
      ]
    };
  }

  /**
   * 生成质量工具内容
   */
  async generateQualityToolsContent() {
    return {
      sections: [
        {
          title: '工具概览',
          content: `
## 质量检查工具套件

### 核心组件
- **QualityChecker**: 自动化质量检查
- **QualityMonitor**: 持续质量监控
- **MaintenanceFlowManager**: 维护流程管理
- **UpdateVerificationSystem**: 更新验证系统

### 修复工具
- **CodeBlockFixer**: 代码块修复
- **TableFixer**: 表格修复
- **MermaidFixer**: 图表优化
- **StructureFixer**: 结构修复
- **LinkFixer**: 链接修复
          `
        },
        {
          title: '使用指南',
          content: `
## 基本使用流程

### 1. 质量检查
\`\`\`bash
npm run quality:check -- --path ./docs
\`\`\`

### 2. 查看报告
\`\`\`bash
npm run quality:report
\`\`\`

### 3. 自动修复
\`\`\`bash
npm run quality:fix -- --auto
\`\`\`

### 4. 验证修复
\`\`\`bash
npm run quality:verify
\`\`\`

## 配置选项

### 质量阈值配置
\`\`\`json
{
  "qualityThresholds": {
    "maxCriticalIssues": 0,
    "maxMajorIssues": 5,
    "maxMinorIssues": 20
  }
}
\`\`\`

### 监控配置
\`\`\`json
{
  "monitoring": {
    "checkInterval": 60000,
    "watchPaths": ["./docs"],
    "enableFileWatcher": true
  }
}
\`\`\`
          `
        }
      ]
    };
  }

  /**
   * 生成高级维护内容
   */
  async generateAdvancedMaintenanceContent() {
    return {
      sections: [
        {
          title: '复杂问题诊断',
          content: `
## 问题分类和诊断

### 语法问题诊断
1. 使用语法验证器检查基本语法
2. 分析错误模式和频率
3. 识别根本原因
4. 制定修复策略

### 性能问题诊断
1. 分析文件大小和复杂度
2. 检查渲染性能
3. 识别性能瓶颈
4. 优化建议

### 结构问题诊断
1. 分析文档架构
2. 检查导航完整性
3. 评估用户体验
4. 重构建议
          `
        },
        {
          title: '大规模维护策略',
          content: `
## 批量处理策略

### 分批处理
- 按文件类型分组
- 按问题严重程度排序
- 设置处理优先级
- 监控处理进度

### 并行处理
- 独立文件并行处理
- 资源使用优化
- 错误隔离
- 结果汇总

### 增量更新
- 只处理变更文件
- 依赖关系分析
- 影响范围评估
- 渐进式部署
          `
        }
      ]
    };
  }

  /**
   * 创建知识库
   */
  async createKnowledgeBase() {
    // 故障排除指南
    this.knowledgeBase.set('troubleshooting_guide', {
      id: 'troubleshooting_guide',
      type: KnowledgeEntryType.TROUBLESHOOTING,
      title: '故障排除指南',
      description: '常见问题的诊断和解决方法',
      content: await this.generateTroubleshootingGuide(),
      tags: ['troubleshooting', 'debugging', 'problems'],
      lastUpdated: new Date().toISOString()
    });

    // 最佳实践指南
    this.knowledgeBase.set('best_practices_guide', {
      id: 'best_practices_guide',
      type: KnowledgeEntryType.BEST_PRACTICE,
      title: '维护最佳实践',
      description: '文档维护的最佳实践和经验总结',
      content: await this.generateBestPracticesGuide(),
      tags: ['best-practices', 'maintenance', 'guidelines'],
      lastUpdated: new Date().toISOString()
    });

    // 案例研究
    this.knowledgeBase.set('case_studies', {
      id: 'case_studies',
      type: KnowledgeEntryType.CASE_STUDY,
      title: '维护案例研究',
      description: '实际维护项目的案例分析',
      content: await this.generateCaseStudies(),
      tags: ['case-study', 'examples', 'lessons-learned'],
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * 生成故障排除指南
   */
  async generateTroubleshootingGuide() {
    return {
      sections: [
        {
          title: '常见问题诊断',
          problems: [
            {
              problem: '质量检查工具无法启动',
              symptoms: [
                '命令执行失败',
                '依赖错误',
                '权限问题'
              ],
              diagnosis: [
                '检查Node.js版本',
                '验证依赖安装',
                '检查文件权限',
                '查看错误日志'
              ],
              solutions: [
                '更新Node.js到支持版本',
                '重新安装依赖包',
                '修复文件权限',
                '清理缓存重试'
              ]
            },
            {
              problem: '自动修复功能异常',
              symptoms: [
                '修复不生效',
                '文件损坏',
                '修复结果不正确'
              ],
              diagnosis: [
                '检查文件编码',
                '验证备份机制',
                '分析修复逻辑',
                '检查文件锁定'
              ],
              solutions: [
                '使用UTF-8编码',
                '恢复备份文件',
                '手动修复问题',
                '释放文件锁定'
              ]
            }
          ]
        },
        {
          title: '性能问题解决',
          problems: [
            {
              problem: '质量检查速度慢',
              symptoms: [
                '处理时间过长',
                '内存使用过高',
                '系统响应慢'
              ],
              diagnosis: [
                '分析文件大小',
                '检查并发设置',
                '监控资源使用',
                '识别性能瓶颈'
              ],
              solutions: [
                '分批处理大文件',
                '调整并发参数',
                '优化算法逻辑',
                '增加系统资源'
              ]
            }
          ]
        }
      ]
    };
  }

  /**
   * 生成最佳实践指南
   */
  async generateBestPracticesGuide() {
    return {
      sections: [
        {
          title: '日常维护最佳实践',
          practices: [
            {
              title: '定期质量检查',
              description: '建立定期的文档质量检查机制',
              steps: [
                '设置自动化检查计划',
                '定义质量标准和阈值',
                '建立问题跟踪流程',
                '定期审查和改进'
              ],
              benefits: [
                '及早发现问题',
                '保持文档质量',
                '减少维护成本',
                '提升用户体验'
              ]
            },
            {
              title: '版本控制集成',
              description: '将质量检查集成到版本控制流程',
              steps: [
                '配置pre-commit钩子',
                '设置CI/CD质量门禁',
                '建立代码审查流程',
                '自动化质量报告'
              ],
              benefits: [
                '防止低质量内容提交',
                '保持代码库整洁',
                '提高团队协作效率',
                '建立质量文化'
              ]
            }
          ]
        },
        {
          title: '团队协作最佳实践',
          practices: [
            {
              title: '角色分工',
              description: '明确团队成员的维护职责',
              roles: [
                {
                  role: '质量管理员',
                  responsibilities: [
                    '制定质量标准',
                    '监控质量指标',
                    '协调修复工作',
                    '培训团队成员'
                  ]
                },
                {
                  role: '内容维护者',
                  responsibilities: [
                    '日常内容更新',
                    '问题修复执行',
                    '质量自检',
                    '反馈问题'
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
  }

  /**
   * 生成案例研究
   */
  async generateCaseStudies() {
    return {
      cases: [
        {
          title: '大型技术文档重构项目',
          background: '某开源项目包含500+文档文件，存在大量质量问题',
          challenges: [
            '文档数量庞大',
            '问题类型复杂',
            '团队资源有限',
            '用户影响最小化'
          ],
          approach: [
            '分阶段重构策略',
            '自动化工具开发',
            '并行处理机制',
            '渐进式发布'
          ],
          results: [
            '质量问题减少90%',
            '维护效率提升3倍',
            '用户满意度显著提升',
            '建立了可持续的维护流程'
          ],
          lessons: [
            '自动化是关键',
            '分阶段执行降低风险',
            '团队培训很重要',
            '持续监控确保效果'
          ]
        },
        {
          title: '多语言文档同步维护',
          background: '产品文档需要支持5种语言，同步维护困难',
          challenges: [
            '多语言一致性',
            '翻译质量控制',
            '更新同步机制',
            '术语标准化'
          ],
          approach: [
            '建立术语库',
            '自动化同步检查',
            '翻译质量验证',
            '版本控制策略'
          ],
          results: [
            '多语言一致性提升',
            '翻译错误减少',
            '更新效率提高',
            '维护成本降低'
          ]
        }
      ]
    };
  }

  /**
   * 创建FAQ系统
   */
  async createFAQSystem() {
    const faqData = [
      {
        id: 'faq_001',
        category: '基础使用',
        question: '如何开始使用质量检查工具？',
        answer: `
首先确保已安装Node.js 16+，然后按以下步骤操作：

1. 安装依赖：
\`\`\`bash
npm install
\`\`\`

2. 运行质量检查：
\`\`\`bash
npm run quality:check
\`\`\`

3. 查看报告：
\`\`\`bash
npm run quality:report
\`\`\`

详细使用指南请参考[工具使用文档](./tools-usage.md)。
        `,
        tags: ['getting-started', 'installation', 'basic-usage'],
        popularity: 95,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'faq_002',
        category: '问题修复',
        question: '自动修复功能安全吗？会不会损坏文件？',
        answer: `
自动修复功能是安全的，系统采用了多重保护机制：

1. **自动备份**：修复前自动创建文件备份
2. **验证机制**：修复后验证文件完整性
3. **回滚功能**：出现问题可以快速回滚
4. **增量修复**：只修改有问题的部分

建议：
- 首次使用前备份重要文件
- 在测试环境先试用
- 定期检查修复结果

如有疑问，可以先使用 \`--dry-run\` 参数预览修复效果。
        `,
        tags: ['auto-fix', 'safety', 'backup'],
        popularity: 88,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'faq_003',
        category: '配置定制',
        question: '如何自定义质量检查规则？',
        answer: `
可以通过配置文件自定义检查规则：

1. 创建配置文件 \`quality-config.json\`：
\`\`\`json
{
  "rules": {
    "codeBlocks": {
      "requireLanguage": true,
      "requireSpacing": true
    },
    "tables": {
      "maxColumns": 8,
      "requireHeaders": true
    },
    "links": {
      "checkExternal": false,
      "allowedDomains": ["example.com"]
    }
  },
  "thresholds": {
    "maxCriticalIssues": 0,
    "maxMajorIssues": 5
  }
}
\`\`\`

2. 使用配置文件：
\`\`\`bash
npm run quality:check -- --config quality-config.json
\`\`\`

详细配置选项请参考[配置指南](./configuration.md)。
        `,
        tags: ['configuration', 'customization', 'rules'],
        popularity: 76,
        lastUpdated: new Date().toISOString()
      }
    ];

    faqData.forEach(faq => {
      this.faqEntries.set(faq.id, faq);
    });
  }

  /**
   * 生成培训材料文件
   */
  async generateTrainingMaterialFiles() {
    const trainingDir = this.config.trainingPath;
    await fs.mkdir(trainingDir, { recursive: true });

    // 生成培训模块文件
    for (const [moduleId, module] of this.trainingModules.entries()) {
      const moduleDir = path.join(trainingDir, moduleId);
      await fs.mkdir(moduleDir, { recursive: true });

      // 生成模块主文件
      const moduleContent = this.formatTrainingModule(module);
      await fs.writeFile(
        path.join(moduleDir, 'README.md'),
        moduleContent
      );

      // 生成练习文件
      if (module.exercises) {
        await fs.writeFile(
          path.join(moduleDir, 'exercises.md'),
          this.formatExercises(module.exercises)
        );
      }

      // 生成评估文件
      if (module.assessment) {
        await fs.writeFile(
          path.join(moduleDir, 'assessment.md'),
          this.formatAssessment(module.assessment)
        );
      }
    }

    // 生成培训索引文件
    await this.generateTrainingIndex();
  }

  /**
   * 格式化培训模块
   */
  formatTrainingModule(module) {
    return `# ${module.title}

**类型**: ${module.type}  
**时长**: ${module.duration}  
**描述**: ${module.description}

## 学习目标

${module.objectives.map(obj => `- ${obj}`).join('\n')}

## 内容大纲

${module.content.sections.map(section => `
### ${section.title}

${section.content}
`).join('\n')}

## 相关资源

${module.content.resources ? module.content.resources.map(resource => `- ${resource}`).join('\n') : ''}

## 下一步

完成本模块学习后，请：
1. 完成相关练习
2. 参加模块评估
3. 继续下一个模块

---

*最后更新: ${new Date().toLocaleDateString('zh-CN')}*
`;
  }

  /**
   * 格式化练习
   */
  formatExercises(exercises) {
    return `# 练习题

${exercises.map((exercise, index) => `
## 练习 ${index + 1}: ${exercise.title}

**难度**: ${exercise.difficulty}  
**预计时间**: ${exercise.estimatedTime}

### 题目描述
${exercise.description}

### 要求
${exercise.requirements.map(req => `- ${req}`).join('\n')}

### 提示
${exercise.hints ? exercise.hints.map(hint => `- ${hint}`).join('\n') : '无'}

### 参考答案
<details>
<summary>点击查看答案</summary>

${exercise.solution}
</details>

---
`).join('\n')}`;
  }

  /**
   * 格式化评估
   */
  formatAssessment(assessment) {
    return `# 模块评估

**总分**: ${assessment.totalScore}分  
**及格分**: ${assessment.passingScore}分  
**时间限制**: ${assessment.timeLimit}

## 评估说明
${assessment.instructions}

## 题目

${assessment.questions.map((question, index) => `
### 第${index + 1}题 (${question.points}分)

**类型**: ${question.type}

${question.question}

${question.type === 'multiple_choice' ? 
  question.options.map((option, i) => `${String.fromCharCode(65 + i)}. ${option}`).join('\n') : 
  ''}

${question.type === 'true_false' ? '请回答：正确 / 错误' : ''}

---
`).join('\n')}

## 评分标准

${assessment.gradingCriteria.map(criteria => `
### ${criteria.category}
${criteria.description}
- 优秀 (${criteria.excellent}分): ${criteria.excellentDesc}
- 良好 (${criteria.good}分): ${criteria.goodDesc}
- 及格 (${criteria.passing}分): ${criteria.passingDesc}
`).join('\n')}
`;
  }

  /**
   * 生成培训索引
   */
  async generateTrainingIndex() {
    const indexContent = `# 维护培训材料

## 培训模块

${Array.from(this.trainingModules.values()).map(module => `
### [${module.title}](./${module.id}/README.md)

**类型**: ${module.type}  
**时长**: ${module.duration}  
**描述**: ${module.description}

**学习路径**: ${this.getModulePrerequisites(module.id).join(' → ')}
`).join('\n')}

## 学习建议

### 新手入门路径
1. 基础质量概念
2. Markdown最佳实践
3. 质量工具使用指南

### 进阶学习路径
1. 完成基础模块
2. 高级维护技术
3. 专项技能培训

### 认证要求
- 完成所有基础模块
- 通过模块评估（80分以上）
- 完成实践项目

## 支持资源

- [知识库](../knowledge-base/README.md)
- [FAQ](../faq/README.md)
- [最佳实践指南](../best-practices/README.md)

---

*培训材料持续更新中，如有问题请联系培训管理员*
`;

    await fs.writeFile(
      path.join(this.config.trainingPath, 'README.md'),
      indexContent
    );
  }

  /**
   * 获取模块前置要求
   */
  getModulePrerequisites(moduleId) {
    const prerequisites = {
      'basic_quality_concepts': ['基础质量概念'],
      'markdown_best_practices': ['基础质量概念', 'Markdown最佳实践'],
      'quality_tools_usage': ['基础质量概念', 'Markdown最佳实践', '质量工具使用'],
      'advanced_maintenance': ['基础质量概念', 'Markdown最佳实践', '质量工具使用', '高级维护技术']
    };

    return prerequisites[moduleId] || [moduleId];
  }

  /**
   * 生成基础练习
   */
  async generateBasicExercises() {
    return [
      {
        title: '识别文档质量问题',
        difficulty: '简单',
        estimatedTime: '15分钟',
        description: '分析给定的文档片段，识别其中的质量问题',
        requirements: [
          '列出发现的所有质量问题',
          '按严重程度分类',
          '提出改进建议'
        ],
        hints: [
          '注意检查语法错误',
          '关注格式一致性',
          '考虑可读性问题'
        ],
        solution: `
常见问题包括：
1. 语法错误：未闭合的代码块、表格格式错误
2. 格式问题：标题层次跳跃、列表格式不一致
3. 内容问题：断链、缺少描述、术语不统一
        `
      }
    ];
  }

  /**
   * 生成基础评估
   */
  async generateBasicAssessment() {
    return {
      totalScore: 100,
      passingScore: 80,
      timeLimit: '30分钟',
      instructions: '请仔细阅读题目，选择最佳答案。每题只有一个正确答案。',
      questions: [
        {
          type: 'multiple_choice',
          question: '以下哪个不是文档质量的主要维度？',
          options: [
            '准确性',
            '完整性',
            '美观性',
            '可维护性'
          ],
          correctAnswer: 2,
          points: 10
        },
        {
          type: 'true_false',
          question: '自动化质量检查可以完全替代人工审查。',
          correctAnswer: false,
          points: 10
        }
      ],
      gradingCriteria: [
        {
          category: '理论知识',
          description: '对文档质量概念的理解',
          excellent: 90,
          excellentDesc: '完全掌握质量概念和原则',
          good: 80,
          goodDesc: '基本掌握主要概念',
          passing: 70,
          passingDesc: '了解基本概念'
        }
      ]
    };
  }

  /**
   * 生成Markdown练习
   */
  async generateMarkdownExercises() {
    return [
      {
        title: '修复Markdown格式问题',
        difficulty: '中等',
        estimatedTime: '20分钟',
        description: '修复给定Markdown文档中的格式问题',
        requirements: [
          '修复所有语法错误',
          '统一格式风格',
          '改善文档结构'
        ],
        solution: '参考Markdown最佳实践指南进行修复'
      }
    ];
  }

  /**
   * 生成Markdown评估
   */
  async generateMarkdownAssessment() {
    return {
      totalScore: 100,
      passingScore: 80,
      timeLimit: '45分钟',
      instructions: '请根据Markdown最佳实践回答问题',
      questions: [
        {
          type: 'multiple_choice',
          question: '正确的代码块语法是？',
          options: [
            '```code```',
            '```javascript\ncode\n```',
            '`code`',
            '~~~code~~~'
          ],
          correctAnswer: 1,
          points: 15
        }
      ],
      gradingCriteria: [
        {
          category: 'Markdown语法',
          description: '对Markdown语法的掌握程度',
          excellent: 90,
          excellentDesc: '熟练掌握所有语法规则',
          good: 80,
          goodDesc: '掌握常用语法规则',
          passing: 70,
          passingDesc: '了解基本语法规则'
        }
      ]
    };
  }

  /**
   * 生成工具练习
   */
  async generateToolsExercises() {
    return [
      {
        title: '使用质量检查工具',
        difficulty: '中等',
        estimatedTime: '30分钟',
        description: '使用质量检查工具分析文档并生成报告',
        requirements: [
          '运行质量检查',
          '解读检查报告',
          '执行自动修复',
          '验证修复结果'
        ],
        solution: '按照工具使用指南逐步操作'
      }
    ];
  }

  /**
   * 生成工具评估
   */
  async generateToolsAssessment() {
    return {
      totalScore: 100,
      passingScore: 80,
      timeLimit: '60分钟',
      instructions: '请根据工具使用经验回答问题',
      questions: [
        {
          type: 'multiple_choice',
          question: '质量检查的第一步应该是？',
          options: [
            '直接运行自动修复',
            '运行质量检查生成报告',
            '手动检查所有文件',
            '备份所有文件'
          ],
          correctAnswer: 1,
          points: 20
        }
      ],
      gradingCriteria: [
        {
          category: '工具使用',
          description: '对质量工具的使用熟练程度',
          excellent: 90,
          excellentDesc: '熟练使用所有工具功能',
          good: 80,
          goodDesc: '掌握主要工具功能',
          passing: 70,
          passingDesc: '了解基本工具使用'
        }
      ]
    };
  }

  /**
   * 生成高级练习
   */
  async generateAdvancedExercises() {
    return [
      {
        title: '复杂问题诊断和解决',
        difficulty: '困难',
        estimatedTime: '60分钟',
        description: '诊断和解决复杂的文档质量问题',
        requirements: [
          '分析问题根本原因',
          '制定解决方案',
          '实施修复措施',
          '验证解决效果'
        ],
        solution: '需要综合运用多种技术和方法'
      }
    ];
  }

  /**
   * 生成高级评估
   */
  async generateAdvancedAssessment() {
    return {
      totalScore: 100,
      passingScore: 80,
      timeLimit: '90分钟',
      instructions: '请根据高级维护技术知识回答问题',
      questions: [
        {
          type: 'essay',
          question: '描述大规模文档维护的策略和注意事项',
          points: 50
        }
      ],
      gradingCriteria: [
        {
          category: '高级技术',
          description: '对高级维护技术的掌握',
          excellent: 90,
          excellentDesc: '深入理解并能灵活运用',
          good: 80,
          goodDesc: '理解主要概念和方法',
          passing: 70,
          passingDesc: '了解基本概念'
        }
      ]
    };
  }

  /**
   * 用户进度跟踪
   */
  async trackUserProgress(userId, moduleId, progress) {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, new Map());
    }

    const userModules = this.userProgress.get(userId);
    userModules.set(moduleId, {
      ...progress,
      lastUpdated: new Date().toISOString()
    });

    this.emit('progress:updated', { userId, moduleId, progress });
  }

  /**
   * 获取用户进度
   */
  getUserProgress(userId) {
    return this.userProgress.get(userId) || new Map();
  }

  /**
   * 搜索知识库
   */
  searchKnowledgeBase(query, filters = {}) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const entry of this.knowledgeBase.values()) {
      // 类型过滤
      if (filters.type && entry.type !== filters.type) {
        continue;
      }

      // 标签过滤
      if (filters.tags && !filters.tags.some(tag => entry.tags.includes(tag))) {
        continue;
      }

      // 内容搜索
      const titleMatch = entry.title.toLowerCase().includes(queryLower);
      const descriptionMatch = entry.description.toLowerCase().includes(queryLower);
      const contentMatch = JSON.stringify(entry.content).toLowerCase().includes(queryLower);

      if (titleMatch || descriptionMatch || contentMatch) {
        results.push({
          ...entry,
          relevance: this.calculateRelevance(entry, queryLower)
        });
      }
    }

    // 按相关性排序
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * 计算相关性分数
   */
  calculateRelevance(entry, query) {
    let score = 0;
    
    if (entry.title.toLowerCase().includes(query)) score += 10;
    if (entry.description.toLowerCase().includes(query)) score += 5;
    if (entry.tags.some(tag => tag.includes(query))) score += 3;
    
    return score;
  }

  /**
   * 搜索FAQ
   */
  searchFAQ(query, category = null) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const faq of this.faqEntries.values()) {
      // 分类过滤
      if (category && faq.category !== category) {
        continue;
      }

      // 内容搜索
      const questionMatch = faq.question.toLowerCase().includes(queryLower);
      const answerMatch = faq.answer.toLowerCase().includes(queryLower);
      const tagMatch = faq.tags.some(tag => tag.includes(queryLower));

      if (questionMatch || answerMatch || tagMatch) {
        results.push({
          ...faq,
          relevance: this.calculateFAQRelevance(faq, queryLower)
        });
      }
    }

    // 按相关性和热度排序
    return results.sort((a, b) => {
      if (a.relevance !== b.relevance) {
        return b.relevance - a.relevance;
      }
      return b.popularity - a.popularity;
    });
  }

  /**
   * 计算FAQ相关性分数
   */
  calculateFAQRelevance(faq, query) {
    let score = 0;
    
    if (faq.question.toLowerCase().includes(query)) score += 10;
    if (faq.answer.toLowerCase().includes(query)) score += 5;
    if (faq.tags.some(tag => tag.includes(query))) score += 3;
    
    // 热度加权
    score += faq.popularity / 10;
    
    return score;
  }

  /**
   * 添加FAQ条目
   */
  addFAQEntry(faqData) {
    const faq = {
      id: faqData.id || this.generateFAQId(),
      category: faqData.category,
      question: faqData.question,
      answer: faqData.answer,
      tags: faqData.tags || [],
      popularity: faqData.popularity || 0,
      lastUpdated: new Date().toISOString()
    };

    this.faqEntries.set(faq.id, faq);
    this.emit('faq:added', faq);
    
    return faq;
  }

  /**
   * 更新FAQ条目
   */
  updateFAQEntry(faqId, updates) {
    const faq = this.faqEntries.get(faqId);
    if (!faq) {
      throw new Error(`FAQ条目不存在: ${faqId}`);
    }

    const updatedFAQ = {
      ...faq,
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    this.faqEntries.set(faqId, updatedFAQ);
    this.emit('faq:updated', updatedFAQ);
    
    return updatedFAQ;
  }

  /**
   * 生成FAQ ID
   */
  generateFAQId() {
    const count = this.faqEntries.size + 1;
    return `faq_${count.toString().padStart(3, '0')}`;
  }

  /**
   * 导出培训数据
   */
  async exportTrainingData(outputPath) {
    const data = {
      timestamp: new Date().toISOString(),
      trainingModules: Object.fromEntries(this.trainingModules),
      knowledgeBase: Object.fromEntries(this.knowledgeBase),
      faqEntries: Object.fromEntries(this.faqEntries),
      userProgress: Object.fromEntries(
        Array.from(this.userProgress.entries()).map(([userId, progress]) => [
          userId,
          Object.fromEntries(progress)
        ])
      )
    };

    await fs.writeFile(
      path.join(outputPath, 'training-data.json'),
      JSON.stringify(data, null, 2)
    );

    return data;
  }

  /**
   * 获取培训统计
   */
  getTrainingStatistics() {
    const totalModules = this.trainingModules.size;
    const totalUsers = this.userProgress.size;
    const totalKnowledgeEntries = this.knowledgeBase.size;
    const totalFAQs = this.faqEntries.size;

    // 计算完成率
    let totalCompletions = 0;
    let totalEnrollments = 0;

    for (const userModules of this.userProgress.values()) {
      for (const progress of userModules.values()) {
        totalEnrollments++;
        if (progress.status === TrainingStatus.COMPLETED) {
          totalCompletions++;
        }
      }
    }

    const completionRate = totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

    return {
      totalModules,
      totalUsers,
      totalKnowledgeEntries,
      totalFAQs,
      totalEnrollments,
      totalCompletions,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }
}

export {
  MaintenanceTrainingSystem,
  TrainingModuleType,
  TrainingStatus,
  KnowledgeEntryType
};