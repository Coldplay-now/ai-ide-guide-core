# AI IDE开发指南v2.0 - 简化发布策略

## 概述

本文档定义了AI IDE开发指南项目的简化发布策略，明确了两种发布类型：核心文档发布和工具发布。

## 发布分类

### 1. 核心文档发布 (Core Documentation Release)
**目标用户**: 最终用户、开发者、技术决策者
**发布频率**: 主要版本发布时
**内容**: 仅包含核心文档内容，面向最终用户

### 2. 工具发布 (Tools Release)
**目标用户**: 文档维护团队、质量保证团队
**发布频率**: 工具更新时
**内容**: 仅包含质量工具和脚本，面向维护人员

## 文件分类和发布策略

### ✅ 核心文档发布包含的文件

#### 📚 核心文档内容
```
docs/
├── chapters/           # 所有章节内容
├── appendix/          # 附录内容
├── assets/            # 图表、表格、图片等资源
└── templates/         # 文档模板
```

#### 📋 项目元信息
```
README.md              # 项目介绍和使用指南
LICENSE                # 开源许可证
CHANGELOG.md           # 版本变更记录
RELEASE_NOTES.md       # 发布说明
CONTRIBUTING.md        # 贡献指南
CODE_OF_CONDUCT.md     # 行为准则
SECURITY.md            # 安全政策
```

#### 🔧 基础配置
```
.gitignore             # Git忽略规则
.github/               # GitHub配置
├── workflows/         # CI/CD工作流
├── ISSUE_TEMPLATE/    # Issue模板
└── pull_request_template.md
```

### 🛠️ 工具发布包含的文件

#### 质量工具和脚本
```
quality-tools/         # 质量检查工具
├── src/              # 工具源代码
├── test/             # 测试文件
├── config/           # 配置文件
├── package.json      # 依赖管理
└── README.md         # 工具使用说明

scripts/              # 构建和处理脚本
├── prepare-release.py
├── format-standardization.py
└── 其他自动化脚本

README.md             # 工具包说明
LICENSE               # 许可证
```

### ❌ 不发布的文件 (内部开发使用)

#### 🔒 内部开发资源
```
research/             # 研究资料 - 内部使用
project-management/   # 项目管理文档 - 内部使用
quality/              # 质量标准和检查清单 - 内部使用
.kiro/               # Kiro IDE配置 - 内部使用
```

#### 🗑️ 临时和生成文件
```
# 构建输出
dist/
build/
*.zip

# 临时文件
*.tmp
*.temp
*~
.DS_Store
Thumbs.db

# 动态生成的报告文件
*-report.md
*-report.json
format-report.md
style-validation-report.md
cross-reference-report.md
chart-quality-report.md
device-compatibility-report.md

# 工具运行时文件
quality-tools/deployment/
quality-tools/deployment-backups/
quality-tools/verification-reports/
quality-tools/final-quality-reports/
quality-tools/.quality-backups/
quality-tools/.temp_verification/
quality-tools/test-temp/
quality-tools/node_modules/

# 缓存和日志
.cache/
*.cache
*.log
logs/

# 编辑器配置
.vscode/
.idea/
*.swp
*.swo

# 开发环境
node_modules/
__pycache__/
*.py[cod]
venv/
env/

# 备份文件
*.bak
*.backup

# 敏感文件
.env
.env.local
*.key
*.pem
```

## 发布流程

### 1. 核心文档发布
```bash
# 使用发布脚本
python scripts/prepare-release.py core 2.1.0

# 或使用Git标签触发自动发布
git tag v2.1.0-core
git push origin v2.1.0-core
```

**发布包内容**:
- 📚 完整的用户文档
- 📋 项目基础信息
- ⚙️ GitHub配置
- 🚫 不包含任何内部开发资源或工具

### 2. 工具发布
```bash
# 使用发布脚本
python scripts/prepare-release.py tools 1.0.0

# 或使用Git标签触发自动发布
git tag tools-v1.0.0
git push origin tools-v1.0.0
```

**发布包内容**:
- 🛠️ 完整的质量工具
- 📜 自动化脚本
- 📖 工具使用说明
- 🚫 不包含文档内容

## 版本号规范

### 核心文档版本
- 格式: `v2.1.0-core`
- 语义化版本控制: `主版本.次版本.修订版`

### 工具版本
- 格式: `tools-v1.0.0`
- 独立版本控制，与文档版本分离

## 自动化发布

### GitHub Actions 工作流

#### 核心文档发布
- 触发器: `v*-core` 标签
- 工作流: `.github/workflows/release-core.yml`
- 输出: 核心文档发布包

#### 工具发布
- 触发器: `tools-v*` 标签
- 工作流: `.github/workflows/release-tools.yml`
- 输出: 工具发布包

## 发布检查清单

### 发布前检查
- [ ] 文档内容完整且准确
- [ ] 运行质量检查通过
- [ ] 更新 CHANGELOG.md 和 RELEASE_NOTES.md
- [ ] 清理临时文件和报告
- [ ] 版本号正确

### 核心文档发布检查
- [ ] 只包含 docs/, README.md, LICENSE 等用户文件
- [ ] 不包含 research/, project-management/, quality/, scripts/, quality-tools/
- [ ] 文档链接和引用正确
- [ ] 发布包大小合理（预期 < 50MB）

### 工具发布检查
- [ ] 只包含 quality-tools/, scripts/, 基础文件
- [ ] 不包含文档内容和内部开发资源
- [ ] 工具测试通过
- [ ] 依赖项正确配置

## 更新的 .gitignore

```gitignore
# 构建输出
dist/
build/
*.zip

# 临时文件
*.tmp
*.temp
*~
.DS_Store
Thumbs.db

# 日志文件
*.log
logs/

# 缓存文件
.cache/
*.cache

# 编辑器文件
.vscode/
.idea/
*.swp
*.swo

# Python
__pycache__/
*.py[cod]
*.so
.Python
env/
venv/
ENV/
env.bak/
venv.bak/

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json

# 动态生成的报告文件（不应版本控制）
*-report.md
*-report.json
format-report.md
style-validation-report.md
cross-reference-report.md
chart-quality-report.md
device-compatibility-report.md
publication-report.json
distribution-report.json

# 工具运行时文件
quality-tools/deployment/
quality-tools/deployment-backups/
quality-tools/verification-reports/
quality-tools/final-quality-reports/
quality-tools/.quality-backups/
quality-tools/.temp_verification/
quality-tools/test-temp/

# 备份文件
*.bak
*.backup

# 敏感文件
.env
.env.local
*.key
*.pem

# IDE配置
.kiro/

# 系统文件
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
```

## 发布示例

### 核心文档发布 v2.1.0
```
ai-ide-guide-v2.1.0-core.zip
├── docs/                    # 完整文档
├── .github/                 # GitHub配置
├── README.md
├── LICENSE
├── CHANGELOG.md
├── RELEASE_NOTES.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── .gitignore
```

### 工具发布 v1.0.0
```
ai-ide-guide-tools-v1.0.0.zip
├── quality-tools/           # 质量工具
├── scripts/                 # 自动化脚本
├── README.md               # 工具说明
└── LICENSE
```

## 维护建议

1. **简化原则**: 只发布用户真正需要的内容
2. **分离关注点**: 文档和工具分别发布，各自独立版本控制
3. **自动化**: 使用脚本和GitHub Actions自动化发布流程
4. **质量保证**: 发布前必须通过质量检查
5. **用户体验**: 确保发布包易于下载和使用

---

*最后更新: 2025年8月21日*
*版本: 2.0.0*