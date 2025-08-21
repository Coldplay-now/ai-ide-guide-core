# Git工作流程规范


## 分支策略


### 主要分支


- **main**: 生产环境分支，包含稳定的发布版本
- **develop**: 开发分支，包含最新的开发进度
- **release/v2.x**: 发布分支，用于准备新版本发布
- **hotfix/**: 热修复分支，用于紧急修复生产问题

### 功能分支


- **feature/章节名称**: 功能开发分支
- 命名规范：`feature/chapter-name` 或 `feature/section-name`
- 例如：`feature/tool-comparison`, `feature/roi-assessment`

## 提交规范


### 提交消息格式


```

<类型>(<范围>): <描述>

<详细说明>

<相关问题>

```

### 提交类型


- `feat`: 新功能或新章节
- `fix`: 修复错误或内容问题
- `docs`: 文档更新
- `style`: 格式调整（不影响内容含义）
- `refactor`: 内容重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例


```

feat(tool-comparison): 添加主流AI IDE工具对比表格

- 增加GitHub Copilot、Cursor、Replit等工具的详细对比
- 包含功能特性、定价、适用场景等维度
- 添加选型决策树和推荐建议

Closes #123

```

## 协作流程


### 1. 创建功能分支


```bash
git checkout develop
git pull origin develop
git checkout -b feature/chapter-name

```

### 2. 开发和提交


```bash
# 添加文件

git add .

# 提交更改

git commit -m "feat(chapter-name): 描述更改内容"

# 推送到远程

git push origin feature/chapter-name

```

### 3. 创建Pull Request


1. 在GitHub/GitLab上创建Pull Request
2. 目标分支选择`develop`
3. 填写PR模板中的必要信息
4. 指定审核人员

### 4. 代码审核


- 至少需要1名审核人员批准
- 审核内容包括：内容质量、格式规范、技术准确性
- 解决所有审核意见后方可合并

### 5. 合并和清理


```bash
# 合并后删除本地分支

git checkout develop
git pull origin develop
git branch -d feature/chapter-name

# 删除远程分支

git push origin --delete feature/chapter-name

```

## 版本发布流程


### 1. 创建发布分支


```bash
git checkout develop
git pull origin develop
git checkout -b release/v2.1

```

### 2. 准备发布


- 更新版本号
- 更新CHANGELOG.md
- 进行最终测试和审核

### 3. 合并到主分支


```bash
# 合并到main分支

git checkout main
git merge release/v2.1
git tag v2.1
git push origin main --tags

# 合并回develop分支

git checkout develop
git merge release/v2.1
git push origin develop

```

## 文件命名规范


### 文档文件


- 使用小写字母和连字符
- 中文文档使用拼音命名
- 例如：`gongju-duibi.md`, `roi-pinggu.md`

### 图片文件


- 格式：`章节-图片描述.扩展名`
- 例如：`tool-comparison-matrix.png`, `roi-calculation-flow.svg`

### 目录结构


- 使用英文命名目录
- 保持层级清晰，避免过深嵌套
- 例如：`docs/chapters/tool-comparison/`

## 冲突解决


### 预防冲突


5. 经常从develop分支拉取最新更改
6. 保持功能分支的生命周期较短
7. 及时沟通正在编辑的文档部分

### 解决冲突


8. 拉取最新的develop分支
9. 合并到当前功能分支
10. 手动解决冲突
11. 测试并提交解决结果

```bash
git checkout feature/your-branch
git fetch origin
git merge origin/develop

# 解决冲突

git add .
git commit -m "resolve: 解决与develop分支的冲突"

```