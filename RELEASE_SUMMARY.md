# AI IDE开发指南 - 发布策略总结

## 🎯 发布原则

**简化原则**: 只发布用户真正需要的内容，内部开发资源不对外发布。

## 📦 发布类型

### 1. 核心文档发布 (Core Release)
- **标签格式**: `v2.1.0-core`
- **目标用户**: 最终用户、开发者、技术决策者
- **包含内容**: 仅核心文档和基础项目信息
- **发布命令**: `python scripts/prepare-release.py core 2.1.0`

### 2. 工具发布 (Tools Release)
- **标签格式**: `tools-v1.0.0`
- **目标用户**: 文档维护团队、质量保证团队
- **包含内容**: 质量工具和自动化脚本
- **发布命令**: `python scripts/prepare-release.py tools 1.0.0`

## ✅ 发布内容对比

| 文件/目录 | 核心文档发布 | 工具发布 | 说明 |
|-----------|-------------|----------|------|
| `docs/` | ✅ | ❌ | 用户文档 |
| `README.md` | ✅ | ✅ | 项目说明 |
| `LICENSE` | ✅ | ✅ | 许可证 |
| `CHANGELOG.md` | ✅ | ❌ | 版本记录 |
| `.github/` | ✅ | ❌ | GitHub配置 |
| `quality-tools/` | ❌ | ✅ | 质量工具 |
| `scripts/` | ❌ | ✅ | 自动化脚本 |
| `research/` | ❌ | ❌ | 内部研究资料 |
| `project-management/` | ❌ | ❌ | 内部项目管理 |
| `quality/` | ❌ | ❌ | 内部质量标准 |

## 🚫 不发布的内容

以下内容仅用于项目内部开发和维护，**不对外发布**：

- `research/` - 研究和调研资料
- `project-management/` - 项目管理文档
- `quality/` - 质量标准和流程
- `.kiro/` - Kiro IDE配置
- 所有临时文件和动态生成的报告
- 工具运行时文件和缓存

## 🔄 发布流程

### 快速发布
```bash
# 核心文档发布
git tag v2.1.0-core && git push origin v2.1.0-core

# 工具发布
git tag tools-v1.0.0 && git push origin tools-v1.0.0
```

### 手动发布
```bash
# 准备核心文档发布
python scripts/prepare-release.py core 2.1.0

# 准备工具发布
python scripts/prepare-release.py tools 1.0.0
```

## 📋 发布检查

### 核心文档发布检查
- [ ] 只包含用户需要的文档内容
- [ ] 不包含任何内部开发资源
- [ ] 文档链接和引用正确
- [ ] 发布包大小合理 (< 50MB)

### 工具发布检查
- [ ] 只包含工具和脚本
- [ ] 不包含文档内容
- [ ] 工具测试通过
- [ ] 依赖项配置正确

## 🎉 发布后

1. 检查GitHub Releases页面
2. 测试下载和使用
3. 收集用户反馈
4. 监控使用情况

---

**核心理念**: 保持发布内容的精简和专注，让用户获得他们真正需要的内容。