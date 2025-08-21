# AI IDE开发指南v2.0 - Git发布策略

## 概述

本文档定义了AI IDE开发指南项目的Git发布策略，明确了哪些文件应该包含在发布中，哪些应该排除，以及如何管理不同类型的发布。

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

### ✅ 必须包含的文件 (Core Release Files)

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

### 🛠️ 工具发布专用文件 (仅工具发布时包含)
```
scripts/              # 构建和处理脚本 - 仅工具版本包含
quality-tools/        # 质量检查工具 - 仅工具版本包含
├── src/             # 工具源代码
├── test/            # 测试文件
├── config/          # 配置文件
├── package.json     # 依赖管理
└── README.md        # 工具使用说明
```

**注意**: 这些工具和脚本文件**仅在工具发布中提供**，不包含在核心文档发布中。

### ❌ 不应包含的文件 (Excluded Files)

#### �️️ 开发工具和脚本 (核心发布和开发者发布中排除)
```
scripts/              # 构建和处理脚本 - 仅工具发布包含
quality-tools/        # 质量检查工具 - 仅工具发布包含
```

**重要说明**: 
- 核心文档发布：**不包含**任何工具和脚本
- 开发者发布：**不包含**工具和脚本，但包含研究资料和项目管理文档
- 工具发布：**专门**提供工具和脚本

#### 🗑️ 临时和生成文件
```
# 构建输出
dist/                  # 构建输出目录
build/                 # 构建临时目录

# 临时文件
*.tmp
*.temp
*~
.DS_Store
Thumbs.db

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
```

#### 📊 动态生成的报告
```
# 质量报告（动态生成，不应版本控制）
*-report.md
format-report.md
style-validation-report.md
cross-reference-report.md
chart-quality-report.md
device-compatibility-report.md
publication-report.json
distribution-report.json
```

#### 🔧 工具运行时文件
```
# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json      # 可选：开发环境锁定文件

# Python
__pycache__/
*.py[cod]
*$py.class
venv/
env/

# 备份和部署文件
*.bak
*.backup
deployment/
deployment-backups/
verification-reports/
final-quality-reports/
.quality-backups/
.temp_verification/
test-temp/
```

#### 🔒 敏感和内部文件
```
.kiro/                 # Kiro IDE配置
.env                   # 环境变量
.env.local
*.key
*.pem
config/secrets/
```

## 发布分支策略

### 主分支 (main/master)
- **用途**: 稳定的发布版本
- **内容**: 核心文档 + 基础配置
- **保护**: 需要PR和代码审查

### 开发分支 (develop)
- **用途**: 开发中的版本
- **内容**: 所有文件（除了排除列表）
- **合并**: 定期合并到main

### 发布分支 (release/*)
- **用途**: 准备发布的版本
- **命名**: release/v2.1.0
- **内容**: 根据发布类型选择文件

### 功能分支 (feature/*)
- **用途**: 新功能开发
- **命名**: feature/chapter-updates
- **合并**: 合并到develop

## 发布流程

### 1. 准备发布
```bash
# 创建发布分支
git checkout -b release/v2.1.0 develop

# 清理不需要的文件
git rm -r --cached quality-tools/deployment/
git rm -r --cached quality-tools/verification-reports/
git rm -r --cached quality-tools/final-quality-reports/
git rm --cached *-report.md

# 更新版本信息
# 编辑 CHANGELOG.md, RELEASE_NOTES.md
```

### 2. 核心文档发布 (最精简版本)
```bash
# 只包含核心文档内容，排除所有开发资源和工具
git checkout release/v2.1.0
git rm -r --cached research/           # 移除研究资料
git rm -r --cached project-management/ # 移除项目管理文档
git rm -r --cached quality/           # 移除质量标准
git rm -r --cached quality-tools/     # 移除质量工具
git rm -r --cached scripts/           # 移除脚本文件

# 创建发布标签
git tag -a v2.1.0-core -m "AI IDE Guide v2.1.0 - Core Documentation Only"
```

### 3. 开发者发布 (包含开发资源，但不包含工具)
```bash
# 包含文档和开发资源，但排除工具
git checkout release/v2.1.0
git rm -r --cached quality-tools/     # 移除质量工具
git rm -r --cached scripts/           # 移除脚本文件
# 保留 docs/, research/, project-management/, quality/

git tag -a v2.1.0-dev -m "AI IDE Guide v2.1.0 - Developer Release (No Tools)"
```

### 4. 工具发布
```bash
# 专门的工具发布
git subtree push --prefix=quality-tools origin tools/v1.0.0
git tag -a tools-v1.0.0 -m "Quality Tools v1.0.0"
```

## 自动化发布配置

### GitHub Actions 工作流

#### 核心文档发布
```yaml
# .github/workflows/release-core.yml
name: Release Core Documentation
on:
  push:
    tags:
      - 'v*-core'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Create Core Release
        run: |
          # 移除非核心文件
          rm -rf research/ project-management/ quality-tools/ scripts/
          rm -f *-report.md
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ github.ref }}
          release_name: AI IDE Guide ${{ github.ref }}
          body: Core documentation release
```

#### 完整发布
```yaml
# .github/workflows/release-full.yml
name: Release Full Documentation
on:
  push:
    tags:
      - 'v*-full'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Clean temporary files
        run: |
          find . -name "*-report.md" -delete
          rm -rf quality-tools/deployment/
          rm -rf quality-tools/verification-reports/
          rm -rf quality-tools/final-quality-reports/
      - name: Create Release
        uses: actions/create-release@v1
```

## 更新的 .gitignore

基于发布策略，建议更新 .gitignore：

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
*$py.class
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

# 动态生成的报告文件
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

## 发布检查清单

### 发布前检查
- [ ] 所有文档内容已更新
- [ ] CHANGELOG.md 已更新
- [ ] RELEASE_NOTES.md 已准备
- [ ] 版本号已更新
- [ ] 质量检查已通过
- [ ] 临时文件已清理
- [ ] 敏感信息已移除

### 发布后验证
- [ ] 发布包大小合理
- [ ] 核心文档完整
- [ ] 链接和引用正常
- [ ] 下载和访问正常
- [ ] 文档渲染正确

## 维护建议

1. **定期清理**: 每月清理一次临时文件和过期报告
2. **版本管理**: 使用语义化版本控制
3. **文档同步**: 确保不同发布版本的文档一致性
4. **自动化**: 尽可能自动化发布流程
5. **监控**: 监控发布包的大小和内容变化

---

*最后更新: 2025年8月21日*
*版本: 1.0.0*