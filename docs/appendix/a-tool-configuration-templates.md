# 附录A：工具配置模板

## A.1 GitHub Copilot 配置模板

### A.1.1 VS Code 配置

#### 基础配置文件 (settings.json)

```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false,
    "markdown": true
  },
  "github.copilot.inlineSuggest.enable": true,
  "github.copilot.chat.enabled": true,
  "github.copilot.advanced": {
    "secret_key": "your-secret-key",
    "length": 500,
    "temperature": 0.1,
    "top_p": 1,
    "stop": ["\n\n", "\n#", "\n//", "\n/*"]
  }
}
```

#### 工作区配置 (.vscode/settings.json)

```json
{
  "github.copilot.enable": {
    "javascript": true,
    "typescript": true,
    "python": true,
    "java": true,
    "go": true,
    "rust": true,
    "cpp": true,
    "csharp": true
  },
  "github.copilot.inlineSuggest.enable": true,
  "github.copilot.chat.enabled": true
}
```

### A.1.2 JetBrains IDEs 配置

#### IntelliJ IDEA / PyCharm / WebStorm 配置

```xml
<!-- .idea/copilot.xml -->
<application>
  <component name="CopilotSettings">
    <option name="enabledLanguages">
      <list>
        <option value="java" />
        <option value="python" />
        <option value="javascript" />
        <option value="typescript" />
        <option value="go" />
        <option value="rust" />
      </list>
    </option>
    <option name="inlineSuggestionsEnabled" value="true" />
    <option name="chatEnabled" value="true" />
  </component>
</application>
```

## A.2 Cursor 配置模板

### A.2.1 基础配置

#### 用户配置文件 (cursor-settings.json)

```json
{
  "cursor.general.enableTelemetry": false,
  "cursor.cpp.autocomplete": true,
  "cursor.chat.enabled": true,
  "cursor.prediction.enabled": true,
  "cursor.prediction.partialAccepts": true,
  "cursor.autocomplete.enabled": true,
  "cursor.autocomplete.languages": [
    "javascript",
    "typescript",
    "python",
    "java",
    "go",
    "rust",
    "cpp",
    "csharp"
  ]
}
```##

## A.2.2 项目配置

## .cursor/settings.json

```json
{
  "cursor.rules": [
    "Always use TypeScript for new JavaScript files",
    "Follow the project's existing code style",
    "Add comprehensive comments for complex logic",
    "Use meaningful variable and function names",
    "Implement error handling for all async operations"
  ],
  "cursor.includeDirs": [
    "src/",
    "lib/",
    "components/",
    "utils/"
  ],
  "cursor.excludeDirs": [
    "node_modules/",
    "dist/",
    "build/",
    ".git/"
  ]
}
```

## A.3 Claude Code 配置模板

### A.3.1 API 配置

#### 环境变量配置 (.env)

```bash
# Claude API Configuration
CLAUDE_API_KEY=your-api-key-here
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=0.1

# Project Settings
PROJECT_NAME=your-project-name
PROJECT_LANGUAGE=typescript
PROJECT_FRAMEWORK=react
```

### A.3.2 配置文件 (claude-config.json)

```json
{
  "apiKey": "${CLAUDE_API_KEY}",
  "model": "claude-3-sonnet-20240229",
  "maxTokens": 4096,
  "temperature": 0.1,
  "systemPrompt": "You are a helpful coding assistant. Always provide clean, well-documented code following best practices.",
  "codeStyle": {
    "language": "typescript",
    "framework": "react",
    "testFramework": "jest",
    "linting": "eslint",
    "formatting": "prettier"
  },
  "features": {
    "codeGeneration": true,
    "codeReview": true,
    "debugging": true,
    "testing": true,
    "documentation": true
  }
}
```

## A.4 Windsurf 配置模板

### A.4.1 基础配置

#### windsurf.config.json

```json
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.1,
    "maxTokens": 2048
  },
  "editor": {
    "theme": "dark",
    "fontSize": 14,
    "tabSize": 2,
    "wordWrap": true
  },
  "features": {
    "autoComplete": true,
    "codeGeneration": true,
    "errorDetection": true,
    "refactoring": true
  },
  "languages": {
    "javascript": {
      "enabled": true,
      "linter": "eslint",
      "formatter": "prettier"
    },
    "typescript": {
      "enabled": true,
      "linter": "eslint",
      "formatter": "prettier"
    },
    "python": {
      "enabled": true,
      "linter": "pylint",
      "formatter": "black"
    }
  }
}
```

## A.5 环境搭建指南

### A.5.1 通用环境准备

#### 系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+)
- **内存**: 最低 8GB RAM，推荐 16GB+
- **存储**: 至少 10GB 可用空间
- **网络**: 稳定的互联网连接

#### 必需软件

```bash
# Node.js 和 npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Git
sudo apt-get install git

# Python (如果需要)
sudo apt-get install python3 python3-pip

# Docker (可选)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### A.5.2 VS Code + GitHub Copilot 环境搭建

#### 步骤1: 安装 VS Code

```bash
# Ubuntu/Debian
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code

# macOS
brew install --cask visual-studio-code

# Windows
# 从官网下载安装包
```

#### 步骤2: 安装 GitHub Copilot 扩展

```bash
# 通过命令行安装
code --install-extension GitHub.copilot
code --install-extension GitHub.copilot-chat
```

#### 步骤3: 配置认证

1. 在 VS Code 中按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (macOS)
2. 输入 "GitHub Copilot: Sign In"
3. 按照提示完成 GitHub 账户认证

### A.5.3 Cursor 环境搭建

#### 步骤1: 下载安装 Cursor

```bash
# macOS
brew install --cask cursor

# Windows - 从官网下载
# https://cursor.sh/

# Linux
wget https://download.cursor.sh/linux/appImage/x64
chmod +x cursor-*.AppImage
./cursor-*.AppImage
```

#### 步骤2: 初始配置

1. 启动 Cursor
2. 选择 AI 模型 (GPT-4, Claude, 等)
3. 配置 API 密钥
4. 导入现有项目或创建新项目

## A.6 集成配置指南

### A.6.1 Git 集成配置

#### .gitignore 模板

```gitignore
# AI IDE 相关文件
.cursor/
.copilot/
.claude/
*.ai-cache
ai-suggestions.log

# 环境变量
.env
.env.local
.env.development
.env.production

# IDE 配置
.vscode/settings.json
.idea/
*.swp
*.swo

# 依赖和构建
node_modules/
dist/
build/
target/
```

#### Git Hooks 配置

```bash
#!/bin/sh
# .git/hooks/pre-commit
# AI 代码质量检查

echo "Running AI-assisted code quality checks..."

# 运行 linter
npm run lint
if [ $? -ne 0 ]; then
  echo "Linting failed. Please fix the issues before committing."
  exit 1
fi

# 运行测试
npm run test
if [ $? -ne 0 ]; then
  echo "Tests failed. Please fix the issues before committing."
  exit 1
fi

echo "All checks passed!"
```

### A.6.2 CI/CD 集成配置

#### GitHub Actions 配置 (.github/workflows/ai-code-review.yml)

```yaml
name: AI Code Review

on:
  pull_request:
    branches: [ main, develop ]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run AI-assisted code review
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      run: |
        npm run ai-review
    
    - name: Comment PR
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const review = fs.readFileSync('ai-review-results.md', 'utf8');
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: review
          });
```#

## A.7 自动化配置脚本

## A.7.1 一键环境配置脚本

#### setup-ai-ide.sh

```bash
#!/bin/bash

# AI IDE 环境一键配置脚本
# 支持 Ubuntu/Debian, macOS, CentOS/RHEL

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            OS="debian"
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
        else
            OS="linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    else
        log_error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    log_info "检测到操作系统: $OS"
}

# 安装基础依赖
install_dependencies() {
    log_info "安装基础依赖..."
    
    case $OS in
        "debian")
            sudo apt update
            sudo apt install -y curl wget git build-essential
            ;;
        "redhat")
            sudo yum update -y
            sudo yum install -y curl wget git gcc gcc-c++ make
            ;;
        "macos")
            if ! command -v brew &> /dev/null; then
                log_info "安装 Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install curl wget git
            ;;
    esac
}

# 安装 Node.js
install_nodejs() {
    log_info "安装 Node.js..."
    
    if command -v node &> /dev/null; then
        log_warn "Node.js 已安装，版本: $(node --version)"
        return
    fi
    
    case $OS in
        "debian")
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        "redhat")
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        "macos")
            brew install node
            ;;
    esac
    
    log_info "Node.js 安装完成，版本: $(node --version)"
}

# 安装 VS Code
install_vscode() {
    log_info "安装 VS Code..."
    
    if command -v code &> /dev/null; then
        log_warn "VS Code 已安装"
        return
    fi
    
    case $OS in
        "debian")
            wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
            sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
            sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
            sudo apt update
            sudo apt install code
            ;;
        "redhat")
            sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
            sudo sh -c 'echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/vscode.repo'
            sudo yum check-update
            sudo yum install code
            ;;
        "macos")
            brew install --cask visual-studio-code
            ;;
    esac
    
    log_info "VS Code 安装完成"
}

# 安装 VS Code 扩展
install_vscode_extensions() {
    log_info "安装 VS Code 扩展..."
    
    extensions=(
        "GitHub.copilot"
        "GitHub.copilot-chat"
        "ms-python.python"
        "ms-vscode.vscode-typescript-next"
        "bradlc.vscode-tailwindcss"
        "esbenp.prettier-vscode"
        "ms-vscode.vscode-eslint"
    )
    
    for ext in "${extensions[@]}"; do
        log_info "安装扩展: $ext"
        code --install-extension $ext
    done
}

# 创建配置文件
create_config_files() {
    log_info "创建配置文件..."
    
    # 创建 VS Code 配置目录
    mkdir -p ~/.config/Code/User
    
    # 创建 settings.json
    cat > ~/.config/Code/User/settings.json << 'EOF'
{
    "github.copilot.enable": {
        "*": true,
        "yaml": false,
        "plaintext": false,
        "markdown": true
    },
    "github.copilot.inlineSuggest.enable": true,
    "github.copilot.chat.enabled": true,
    "editor.fontSize": 14,
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.formatOnSave": true,
    "files.autoSave": "afterDelay",
    "files.autoSaveDelay": 1000
}
EOF
    
    log_info "配置文件创建完成"
}

# 主函数
main() {
    log_info "开始 AI IDE 环境配置..."
    
    detect_os
    install_dependencies
    install_nodejs
    install_vscode
    install_vscode_extensions
    create_config_files
    
    log_info "AI IDE 环境配置完成！"
    log_info "请重启终端并运行 'code .' 来启动 VS Code"
}

# 运行主函数
main "$@"
```

### A.7.2 项目初始化脚本

#### init-ai-project.sh

```bash
#!/bin/bash

# AI 项目初始化脚本

PROJECT_NAME=$1
PROJECT_TYPE=$2

if [ -z "$PROJECT_NAME" ]; then
    echo "用法: $0 <项目名称> [项目类型]"
    echo "项目类型: react, vue, node, python, java"
    exit 1
fi

if [ -z "$PROJECT_TYPE" ]; then
    PROJECT_TYPE="node"
fi

echo "创建 AI 项目: $PROJECT_NAME (类型: $PROJECT_TYPE)"

# 创建项目目录
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# 根据项目类型初始化
case $PROJECT_TYPE in
    "react")
        npx create-react-app . --template typescript
        ;;
    "vue")
        npm create vue@latest .
        ;;
    "node")
        npm init -y
        npm install express typescript @types/node ts-node nodemon
        ;;
    "python")
        python3 -m venv venv
        source venv/bin/activate
        pip install flask fastapi uvicorn
        ;;
    "java")
        mvn archetype:generate -DgroupId=com.example -DartifactId=$PROJECT_NAME -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false
        ;;
esac

# 创建 AI 配置文件
mkdir -p .ai-config

cat > .ai-config/prompts.md << 'EOF'
# AI 提示词配置

## 代码生成提示词
- 请使用 TypeScript 编写代码
- 遵循项目的代码风格
- 添加适当的注释
- 实现错误处理

## 代码审查提示词
- 检查代码质量
- 识别潜在的 bug
- 建议性能优化
- 确保安全性
EOF

# 创建 .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
venv/
target/

# Build outputs
dist/
build/
*.jar
*.war

# AI IDE files
.cursor/
.copilot/
.ai-cache

# Environment variables
.env
.env.local

# IDE files
.vscode/settings.json
.idea/
EOF

echo "项目 $PROJECT_NAME 初始化完成！"
```

## A.8 配置故障排除指南

### A.8.1 常见问题及解决方案

#### 问题1: GitHub Copilot 无法激活

**症状**: VS Code 中 Copilot 图标显示错误状态

**解决方案**:

1. 检查 GitHub 账户是否有 Copilot 订阅
2. 重新登录 GitHub 账户
3. 清除 VS Code 缓存

```bash
# 清除 VS Code 缓存
rm -rf ~/.vscode/extensions/github.copilot-*
code --install-extension GitHub.copilot
```

#### 问题2: Cursor 连接超时

**症状**: Cursor 无法连接到 AI 服务

**解决方案**:

1. 检查网络连接
2. 验证 API 密钥
3. 检查防火墙设置

```bash
# 测试网络连接
curl -I https://api.openai.com/v1/models
curl -I https://api.anthropic.com/v1/messages
```

#### 问题3: 配置文件不生效

**症状**: 修改配置后没有变化

**解决方案**:

1. 检查配置文件路径
2. 验证 JSON 格式
3. 重启 IDE

```bash
# 验证 JSON 格式
python -m json.tool settings.json
```

### A.8.2 性能优化建议

#### 内存使用优化

```json
{
  "github.copilot.advanced": {
    "length": 300,
    "temperature": 0.1,
    "top_p": 0.95
  },
  "cursor.prediction.maxCompletions": 3,
  "cursor.autocomplete.debounceMs": 150
}
```

#### 网络优化

```json
{
  "http.proxy": "http://proxy.company.com:8080",
  "http.proxyStrictSSL": false,
  "github.copilot.proxy": "http://proxy.company.com:8080"
}
```

### A.8.3 日志和调试

#### 启用详细日志

```json
{
  "github.copilot.advanced": {
    "debug": true,
    "logLevel": "debug"
  }
}
```

#### 查看日志文件

```bash
# VS Code 日志
tail -f ~/.config/Code/logs/*/exthost*/output_logging_*/GitHub.copilot

# Cursor 日志
tail -f ~/.cursor/logs/main.log
```

## A.9 企业级配置模板

### A.9.1 企业安全配置

#### 企业级 settings.json

```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "plaintext": false
  },
  "github.copilot.advanced": {
    "secret_key": "${COPILOT_SECRET_KEY}",
    "inlineSuggestEnable": true,
    "listCount": 3,
    "indentationMode": {
      "python": "space",
      "javascript": "space",
      "typescript": "space"
    }
  },
  "security.workspace.trust.enabled": true,
  "security.workspace.trust.banner": "always",
  "telemetry.telemetryLevel": "off",
  "update.mode": "manual"
}
```

### A.9.2 团队协作配置

#### 团队共享配置 (.vscode/settings.json)

```json
{
  "github.copilot.enable": {
    "javascript": true,
    "typescript": true,
    "python": true,
    "java": true
  },
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact"
  ],
  "prettier.requireConfig": true,
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true
}
```

这完成了工具配置模板的创建。现在让我标记这个子任务为完成并继续下一个子任务。
