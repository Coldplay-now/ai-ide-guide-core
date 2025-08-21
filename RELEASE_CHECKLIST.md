# AI IDE开发指南 - 发布检查清单

## 发布前准备

### 📋 内容检查
- [ ] 所有章节内容已完成并审核
- [ ] 图表和表格格式正确
- [ ] 链接和引用有效
- [ ] 代码示例可执行
- [ ] 术语使用一致

### 📊 质量验证
- [ ] 运行全面质量检查
  ```bash
  cd quality-tools
  node src/cli.js verify-comprehensive
  ```
- [ ] 质量评分 ≥ 85/100
- [ ] 无关键问题 (Critical Issues = 0)
- [ ] 渲染效果测试通过
- [ ] 跨平台兼容性验证

### 📝 文档更新
- [ ] 更新 `CHANGELOG.md`
- [ ] 更新 `RELEASE_NOTES.md`
- [ ] 更新版本号
- [ ] 检查 `README.md` 的准确性
- [ ] 更新贡献指南（如有变化）

### 🧹 清理工作
- [ ] 删除临时文件和报告
  ```bash
  # 清理质量报告
  rm -f *-report.md *-report.json
  
  # 清理工具运行时文件
  rm -rf quality-tools/deployment/
  rm -rf quality-tools/verification-reports/
  rm -rf quality-tools/final-quality-reports/
  ```
- [ ] 清理备份文件
- [ ] 检查 `.gitignore` 是否正确

## 发布类型选择

### 🎯 核心文档发布 (Core Release)
**适用场景**: 面向最终用户的稳定版本

**包含内容**:
- ✅ docs/ (完整文档)
- ✅ README.md, LICENSE, CHANGELOG.md
- ✅ .github/ (GitHub配置)
- ❌ research/ (研究资料 - 内部使用)
- ❌ project-management/ (项目管理 - 内部使用)
- ❌ quality/ (质量标准 - 内部使用)
- ❌ quality-tools/ (质量工具 - 单独发布)
- ❌ scripts/ (脚本文件 - 单独发布)

**发布命令**:
```bash
# 自动发布
python scripts/prepare-release.py core 2.1.0

# 或使用Git标签触发
git tag v2.1.0-core
git push origin v2.1.0-core
```



### 🛠️ 工具发布 (Tools Release)
**适用场景**: 质量工具的独立发布

**包含内容**:
- ✅ quality-tools/ (质量工具)
- ✅ scripts/ (自动化脚本)
- ✅ README.md, LICENSE
- ❌ docs/ (文档内容)

**发布命令**:
```bash
# 自动发布
python scripts/prepare-release.py tools 1.0.0

# 或使用Git标签触发
git tag tools-v1.0.0
git push origin tools-v1.0.0
```

## 发布流程

### 1️⃣ 准备阶段
```bash
# 1. 切换到主分支
git checkout main
git pull origin main

# 2. 创建发布分支
git checkout -b release/v2.1.0

# 3. 运行质量检查
cd quality-tools
node src/cli.js verify-comprehensive

# 4. 生成最终报告
node src/cli.js generate-final-report
```

### 2️⃣ 版本更新
```bash
# 1. 更新版本信息
# 编辑 CHANGELOG.md
# 编辑 RELEASE_NOTES.md

# 2. 提交更改
git add .
git commit -m "chore: prepare release v2.1.0"

# 3. 合并到主分支
git checkout main
git merge release/v2.1.0
```

### 3️⃣ 发布执行
```bash
# 选择发布类型并执行

# 核心文档发布
git tag v2.1.0-core
git push origin v2.1.0-core

# 工具发布（如果工具有更新）
git tag tools-v1.0.0
git push origin tools-v1.0.0
```

### 4️⃣ 发布后验证
- [ ] 检查GitHub Releases页面
- [ ] 下载并测试发布包
- [ ] 验证文档渲染正确
- [ ] 检查下载链接有效
- [ ] 确认发布说明准确

## 版本号规范

### 语义化版本控制
- **主版本号** (Major): 不兼容的重大更改
- **次版本号** (Minor): 向后兼容的功能性新增
- **修订号** (Patch): 向后兼容的问题修正

### 标签命名规范
- 核心文档: `v2.1.0-core`
- 工具版本: `tools-v1.0.0`

### 示例版本历史
```
v2.0.0-core     # 主要版本发布
v2.0.1-core     # 修复版本
v2.1.0-core     # 功能更新版本
tools-v1.0.0    # 工具初始版本
tools-v1.1.0    # 工具功能更新
```

## 发布后任务

### 📢 通知和推广
- [ ] 更新项目主页
- [ ] 发布博客文章（如适用）
- [ ] 通知相关团队和用户
- [ ] 更新相关文档链接

### 📊 监控和反馈
- [ ] 监控下载统计
- [ ] 收集用户反馈
- [ ] 跟踪问题报告
- [ ] 计划下一版本

### 🔄 持续改进
- [ ] 分析发布过程
- [ ] 更新发布流程（如需要）
- [ ] 改进自动化工具
- [ ] 优化质量检查

## 紧急发布流程

### 🚨 热修复发布
如果发现严重问题需要紧急修复：

```bash
# 1. 创建热修复分支
git checkout -b hotfix/v2.1.1 v2.1.0-core

# 2. 修复问题
# ... 进行必要的修复

# 3. 测试修复
cd quality-tools
node src/cli.js verify-comprehensive

# 4. 发布热修复版本
git tag v2.1.1-core
git push origin v2.1.1-core

# 5. 合并回主分支
git checkout main
git merge hotfix/v2.1.1
```

## 回滚策略

### 📦 发布回滚
如果发布后发现重大问题：

1. **立即措施**:
   - 在GitHub Releases中标记为"Pre-release"
   - 添加警告说明

2. **修复措施**:
   - 创建修复版本
   - 发布新的稳定版本
   - 更新发布说明

3. **通知措施**:
   - 通知所有用户
   - 提供迁移指南
   - 更新相关文档

## 工具和资源

### 🔧 发布工具
- `scripts/prepare-release.py` - 发布准备脚本
- GitHub Actions - 自动化发布流程
- `quality-tools/` - 质量检查工具

### 📚 参考文档
- [语义化版本控制](https://semver.org/lang/zh-CN/)
- [GitHub Releases文档](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Git标签管理](https://git-scm.com/book/zh/v2/Git-基础-打标签)

---

**最后更新**: 2025年8月21日  
**版本**: 1.0.0  
**维护者**: AI IDE指南团队