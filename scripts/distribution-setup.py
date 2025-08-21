#!/usr/bin/env python3
"""
分发设置脚本
设置AI IDE指南v2.0项目的文档访问和下载渠道
"""

import os
import re
import json
import shutil
from pathlib import Path
from typing import List, Dict
import argparse
from datetime import datetime

class DistributionSetup:
    """分发设置器"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.dist_dir = self.base_path / 'dist'
        self.config = self.load_distribution_config()
        
    def load_distribution_config(self) -> Dict:
        """加载分发配置"""
        return {
            'cdn_config': {
                'base_url': 'https://cdn.ai-ide-guide.example.com',
                'cache_control': 'public, max-age=3600',
                'compression': True,
                'formats': ['gzip', 'brotli']
            },
            'github_pages': {
                'repository': 'ai-ide-guide/ai-ide-guide-v2',
                'branch': 'gh-pages',
                'custom_domain': 'ai-ide-guide.example.com'
            },
            'download_mirrors': [
                {
                    'name': '主站下载',
                    'url': 'https://ai-ide-guide.example.com/downloads/',
                    'priority': 1
                },
                {
                    'name': 'GitHub Releases',
                    'url': 'https://github.com/ai-ide-guide/ai-ide-guide-v2/releases/',
                    'priority': 2
                },
                {
                    'name': 'CDN镜像',
                    'url': 'https://cdn.ai-ide-guide.example.com/downloads/',
                    'priority': 3
                }
            ],
            'access_methods': {
                'web': {
                    'url': 'https://ai-ide-guide.example.com',
                    'mobile_url': 'https://m.ai-ide-guide.example.com',
                    'offline_support': True
                },
                'api': {
                    'base_url': 'https://api.ai-ide-guide.example.com/v1',
                    'endpoints': [
                        '/chapters',
                        '/search',
                        '/downloads',
                        '/version'
                    ]
                },
                'rss': {
                    'feed_url': 'https://ai-ide-guide.example.com/feed.xml',
                    'updates_only': True
                }
            }
        }
    
    def create_github_pages_config(self):
        """创建GitHub Pages配置"""
        print("创建GitHub Pages配置...")
        
        # 创建_config.yml
        jekyll_config = f"""
title: AI IDE开发指南 v2.0
description: 使用AI IDE进行软件开发全周期管理的完整指南
url: "https://{self.config['github_pages']['custom_domain']}"
baseurl: ""

# 构建设置
markdown: kramdown
highlighter: rouge
theme: minima

# 插件
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag

# 排除文件
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules
  - vendor/bundle/
  - vendor/cache/
  - vendor/gems/
  - vendor/ruby/
  - scripts/
  - .git/

# 集合配置
collections:
  chapters:
    output: true
    permalink: /:collection/:name/

# 默认值
defaults:
  - scope:
      path: ""
      type: "chapters"
    values:
      layout: "chapter"
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"

# SEO设置
author: AI IDE开发指南项目组
twitter:
  username: ai_ide_guide
  card: summary_large_image

social:
  name: AI IDE开发指南
  links:
    - https://github.com/ai-ide-guide/ai-ide-guide-v2

# 分析
google_analytics: UA-XXXXXXXX-X
"""
        
        with open(self.dist_dir / '_config.yml', 'w', encoding='utf-8') as f:
            f.write(jekyll_config)
        
        # 创建Gemfile
        gemfile_content = """
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
gem "jekyll-feed"
gem "jekyll-sitemap"
gem "jekyll-seo-tag"

# Windows and JRuby does not include zoneinfo files
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :mswin, :x64_mingw]
"""
        
        with open(self.dist_dir / 'Gemfile', 'w', encoding='utf-8') as f:
            f.write(gemfile_content)
        
        # 创建CNAME文件
        with open(self.dist_dir / 'CNAME', 'w', encoding='utf-8') as f:
            f.write(self.config['github_pages']['custom_domain'])
    
    def create_cdn_config(self):
        """创建CDN配置"""
        print("创建CDN配置...")
        
        # 创建.htaccess文件
        htaccess_content = f"""
# 缓存控制
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType application/zip "access plus 1 month"
</IfModule>

# 压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# CORS设置
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type"
</IfModule>

# 重写规则
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # 强制HTTPS
    RewriteCond %{{HTTPS}} off
    RewriteRule ^(.*)$ https://%{{HTTP_HOST}}%{{REQUEST_URI}} [L,R=301]
    
    # 移动端重定向
    RewriteCond %{{HTTP_USER_AGENT}} "android|blackberry|iphone|ipod|iemobile|opera mobile|palmos|webos|googlebot-mobile" [NC]
    RewriteRule ^$ https://m.{self.config['github_pages']['custom_domain']}/ [L,R=302]
</IfModule>

# 安全头
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
"""
        
        with open(self.dist_dir / '.htaccess', 'w', encoding='utf-8') as f:
            f.write(htaccess_content)
        
        # 创建robots.txt
        robots_content = f"""
User-agent: *
Allow: /

Sitemap: https://{self.config['github_pages']['custom_domain']}/sitemap.xml
"""
        
        with open(self.dist_dir / 'robots.txt', 'w', encoding='utf-8') as f:
            f.write(robots_content)
    
    def create_api_endpoints(self):
        """创建API端点"""
        print("创建API端点...")
        
        api_dir = self.dist_dir / 'api' / 'v1'
        api_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建版本信息端点
        version_info = {
            'version': '2.0.0',
            'release_date': datetime.now().isoformat(),
            'status': 'stable',
            'formats': ['html', 'pdf', 'epub', 'markdown'],
            'languages': ['zh-CN'],
            'download_urls': {
                'pdf': f"https://{self.config['github_pages']['custom_domain']}/downloads/ai-ide-guide-v2.0.0.pdf",
                'epub': f"https://{self.config['github_pages']['custom_domain']}/downloads/ai-ide-guide-v2.0.0.epub",
                'markdown': f"https://{self.config['github_pages']['custom_domain']}/downloads/ai-ide-guide-v2.0.0-markdown.zip",
                'templates': f"https://{self.config['github_pages']['custom_domain']}/downloads/ai-ide-guide-v2.0.0-templates.zip"
            }
        }
        
        with open(api_dir / 'version.json', 'w', encoding='utf-8') as f:
            json.dump(version_info, f, indent=2, ensure_ascii=False)
        
        # 创建章节列表端点
        chapters_info = self.get_chapters_info()
        with open(api_dir / 'chapters.json', 'w', encoding='utf-8') as f:
            json.dump(chapters_info, f, indent=2, ensure_ascii=False)
        
        # 创建下载信息端点
        downloads_info = {
            'mirrors': self.config['download_mirrors'],
            'files': [
                {
                    'name': 'PDF完整版',
                    'filename': 'ai-ide-guide-v2.0.0.pdf',
                    'size': '15MB',
                    'description': '适合打印和离线阅读的PDF版本'
                },
                {
                    'name': 'EPUB电子书',
                    'filename': 'ai-ide-guide-v2.0.0.epub',
                    'size': '8MB',
                    'description': '适合电子书阅读器的EPUB版本'
                },
                {
                    'name': 'Markdown源文件',
                    'filename': 'ai-ide-guide-v2.0.0-markdown.zip',
                    'size': '5MB',
                    'description': '包含所有Markdown源文件和资源'
                },
                {
                    'name': '配置模板包',
                    'filename': 'ai-ide-guide-v2.0.0-templates.zip',
                    'size': '2MB',
                    'description': '包含所有配置文件模板'
                }
            ]
        }
        
        with open(api_dir / 'downloads.json', 'w', encoding='utf-8') as f:
            json.dump(downloads_info, f, indent=2, ensure_ascii=False)
    
    def get_chapters_info(self) -> List[Dict]:
        """获取章节信息"""
        chapters = []
        chapters_dir = self.base_path / 'docs' / 'chapters'
        
        if chapters_dir.exists():
            chapter_files = sorted(chapters_dir.glob('*.md'))
            
            for chapter_file in chapter_files:
                try:
                    with open(chapter_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # 提取章节信息
                    title_match = re.search(r'^# (.+)', content, re.MULTILINE)
                    title = title_match.group(1) if title_match else chapter_file.stem
                    
                    # 提取摘要（第一段）
                    paragraphs = content.split('\n\n')
                    summary = ''
                    for para in paragraphs[1:]:  # 跳过标题
                        if para.strip() and not para.startswith('#'):
                            summary = para.strip()[:200] + '...'
                            break
                    
                    # 提取二级标题
                    sections = re.findall(r'^## (.+)', content, re.MULTILINE)
                    
                    chapters.append({
                        'id': chapter_file.stem,
                        'title': title,
                        'summary': summary,
                        'sections': sections,
                        'url': f"/chapters/{chapter_file.stem}/",
                        'word_count': len(content.split()),
                        'reading_time': max(1, len(content.split()) // 200)  # 假设每分钟200词
                    })
                    
                except Exception as e:
                    print(f"处理章节文件失败 {chapter_file}: {e}")
        
        return chapters
    
    def create_rss_feed(self):
        """创建RSS订阅"""
        print("创建RSS订阅...")
        
        rss_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>AI IDE开发指南</title>
        <description>使用AI IDE进行软件开发全周期管理的完整指南</description>
        <link>https://{self.config['github_pages']['custom_domain']}</link>
        <atom:link href="https://{self.config['github_pages']['custom_domain']}/feed.xml" rel="self" type="application/rss+xml"/>
        <language>zh-CN</language>
        <lastBuildDate>{datetime.now().strftime('%a, %d %b %Y %H:%M:%S %z')}</lastBuildDate>
        <generator>AI IDE Guide Generator</generator>
        
        <item>
            <title>AI IDE开发指南 v2.0.0 发布</title>
            <description>全新的AI IDE开发指南v2.0.0正式发布，包含完整的技术概述、工具对比、实施指导等内容。</description>
            <link>https://{self.config['github_pages']['custom_domain']}</link>
            <guid>https://{self.config['github_pages']['custom_domain']}/releases/v2.0.0</guid>
            <pubDate>{datetime.now().strftime('%a, %d %b %Y %H:%M:%S %z')}</pubDate>
        </item>
    </channel>
</rss>"""
        
        with open(self.dist_dir / 'feed.xml', 'w', encoding='utf-8') as f:
            f.write(rss_content)
    
    def create_sitemap(self):
        """创建站点地图"""
        print("创建站点地图...")
        
        base_url = f"https://{self.config['github_pages']['custom_domain']}"
        
        sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>{base_url}/</loc>
        <lastmod>{datetime.now().strftime('%Y-%m-%d')}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>{base_url}/downloads/</loc>
        <lastmod>{datetime.now().strftime('%Y-%m-%d')}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
"""
        
        # 添加章节页面
        chapters_info = self.get_chapters_info()
        for chapter in chapters_info:
            sitemap_content += f"""    <url>
        <loc>{base_url}{chapter['url']}</loc>
        <lastmod>{datetime.now().strftime('%Y-%m-%d')}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.9</priority>
    </url>
"""
        
        sitemap_content += "</urlset>"
        
        with open(self.dist_dir / 'sitemap.xml', 'w', encoding='utf-8') as f:
            f.write(sitemap_content)
    
    def create_deployment_scripts(self):
        """创建部署脚本"""
        print("创建部署脚本...")
        
        scripts_dir = self.dist_dir / 'scripts'
        scripts_dir.mkdir(exist_ok=True)
        
        # GitHub Pages部署脚本
        gh_deploy_script = f"""#!/bin/bash
# GitHub Pages部署脚本

set -e

echo "开始部署到GitHub Pages..."

# 检查是否在正确的分支
if [ "$(git branch --show-current)" != "main" ]; then
    echo "错误: 请在main分支上运行此脚本"
    exit 1
fi

# 构建项目
echo "构建项目..."
python scripts/publication-preparer.py --version 2.0.0

# 切换到gh-pages分支
echo "切换到gh-pages分支..."
git checkout gh-pages || git checkout -b gh-pages

# 清理旧文件
echo "清理旧文件..."
git rm -rf . || true

# 复制新文件
echo "复制新文件..."
cp -r dist/* .

# 提交更改
echo "提交更改..."
git add .
git commit -m "Deploy v2.0.0 - $(date)"

# 推送到远程
echo "推送到远程..."
git push origin gh-pages

# 返回main分支
git checkout main

echo "部署完成!"
echo "网站将在几分钟后更新: https://{self.config['github_pages']['custom_domain']}"
"""
        
        with open(scripts_dir / 'deploy-gh-pages.sh', 'w', encoding='utf-8') as f:
            f.write(gh_deploy_script)
        
        # CDN部署脚本
        cdn_deploy_script = """#!/bin/bash
# CDN部署脚本

set -e

echo "开始部署到CDN..."

# 检查环境变量
if [ -z "$CDN_ACCESS_KEY" ] || [ -z "$CDN_SECRET_KEY" ]; then
    echo "错误: 请设置CDN_ACCESS_KEY和CDN_SECRET_KEY环境变量"
    exit 1
fi

# 构建项目
echo "构建项目..."
python scripts/publication-preparer.py --version 2.0.0

# 同步到CDN
echo "同步文件到CDN..."
aws s3 sync dist/ s3://ai-ide-guide-cdn/ --delete --cache-control "public, max-age=3600"

# 清除CDN缓存
echo "清除CDN缓存..."
aws cloudfront create-invalidation --distribution-id $CDN_DISTRIBUTION_ID --paths "/*"

echo "CDN部署完成!"
"""
        
        with open(scripts_dir / 'deploy-cdn.sh', 'w', encoding='utf-8') as f:
            f.write(cdn_deploy_script)
        
        # 使脚本可执行
        os.chmod(scripts_dir / 'deploy-gh-pages.sh', 0o755)
        os.chmod(scripts_dir / 'deploy-cdn.sh', 0o755)
    
    def create_access_documentation(self):
        """创建访问文档"""
        print("创建访问文档...")
        
        access_doc = f"""# 文档访问指南

## 在线访问

### 主站访问
- **网址**: https://{self.config['github_pages']['custom_domain']}
- **移动版**: https://m.{self.config['github_pages']['custom_domain']}
- **特点**: 完整功能，支持搜索和交互导航

### GitHub Pages
- **网址**: https://ai-ide-guide.github.io/ai-ide-guide-v2/
- **特点**: 稳定可靠，自动更新

## 下载访问

### 主要下载渠道

1. **主站下载**
   - 网址: https://{self.config['github_pages']['custom_domain']}/downloads/
   - 特点: 最新版本，下载速度快

2. **GitHub Releases**
   - 网址: https://github.com/ai-ide-guide/ai-ide-guide-v2/releases/
   - 特点: 版本历史完整，包含发布说明

3. **CDN镜像**
   - 网址: https://cdn.{self.config['github_pages']['custom_domain']}/downloads/
   - 特点: 全球加速，高可用性

### 可用格式

- **PDF版本** (推荐)
  - 文件: ai-ide-guide-v2.0.0.pdf
  - 大小: ~15MB
  - 适用: 打印、离线阅读

- **EPUB电子书**
  - 文件: ai-ide-guide-v2.0.0.epub
  - 大小: ~8MB
  - 适用: 电子书阅读器

- **Markdown源文件**
  - 文件: ai-ide-guide-v2.0.0-markdown.zip
  - 大小: ~5MB
  - 适用: 开发者、自定义构建

- **配置模板包**
  - 文件: ai-ide-guide-v2.0.0-templates.zip
  - 大小: ~2MB
  - 适用: 快速配置、参考实现

## API访问

### REST API
- **基础URL**: https://api.{self.config['github_pages']['custom_domain']}/v1
- **端点**:
  - `/version` - 版本信息
  - `/chapters` - 章节列表
  - `/downloads` - 下载信息
  - `/search` - 内容搜索

### 使用示例

```bash
# 获取版本信息
curl https://api.{self.config['github_pages']['custom_domain']}/v1/version

# 获取章节列表
curl https://api.{self.config['github_pages']['custom_domain']}/v1/chapters

# 获取下载信息
curl https://api.{self.config['github_pages']['custom_domain']}/v1/downloads
```

## RSS订阅

- **订阅地址**: https://{self.config['github_pages']['custom_domain']}/feed.xml
- **更新频率**: 有新版本时更新
- **内容**: 版本发布通知、重要更新

## 离线访问

### 本地部署

1. 下载源文件包
2. 解压到本地目录
3. 使用HTTP服务器运行

```bash
# 使用Python内置服务器
python -m http.server 8000

# 使用Node.js服务器
npx http-server

# 使用Nginx
nginx -c /path/to/nginx.conf
```

### 离线阅读

- PDF版本支持完全离线阅读
- EPUB版本可在电子书阅读器中离线使用
- Web版本支持浏览器缓存，可部分离线访问

## 移动设备访问

### 响应式设计
- 自动适配手机、平板屏幕
- 优化触摸操作体验
- 支持横竖屏切换

### 移动应用
- 计划开发原生移动应用
- 支持离线下载和阅读
- 提供更好的移动体验

## 技术支持

### 问题反馈
- **GitHub Issues**: https://github.com/ai-ide-guide/ai-ide-guide-v2/issues
- **邮箱**: support@{self.config['github_pages']['custom_domain']}
- **微信群**: 扫描二维码加入

### 贡献参与
- **内容贡献**: 提交Pull Request
- **翻译协助**: 联系项目维护者
- **案例分享**: 发送到contribute@{self.config['github_pages']['custom_domain']}

---

**最后更新**: {datetime.now().strftime('%Y-%m-%d')}
"""
        
        with open(self.dist_dir / 'ACCESS_GUIDE.md', 'w', encoding='utf-8') as f:
            f.write(access_doc)
    
    def setup_distribution(self) -> Dict:
        """设置分发渠道"""
        print("设置AI IDE指南分发渠道...")
        
        if not self.dist_dir.exists():
            print("错误: 分发目录不存在，请先运行publication-preparer.py")
            return {}
        
        # 创建各种配置
        self.create_github_pages_config()
        self.create_cdn_config()
        self.create_api_endpoints()
        self.create_rss_feed()
        self.create_sitemap()
        self.create_deployment_scripts()
        self.create_access_documentation()
        
        # 生成分发报告
        report = {
            'setup_date': datetime.now().isoformat(),
            'distribution_channels': {
                'github_pages': {
                    'enabled': True,
                    'url': f"https://{self.config['github_pages']['custom_domain']}",
                    'custom_domain': self.config['github_pages']['custom_domain']
                },
                'cdn': {
                    'enabled': True,
                    'base_url': self.config['cdn_config']['base_url']
                },
                'api': {
                    'enabled': True,
                    'base_url': self.config['access_methods']['api']['base_url'],
                    'endpoints': len(self.config['access_methods']['api']['endpoints'])
                },
                'rss': {
                    'enabled': True,
                    'feed_url': self.config['access_methods']['rss']['feed_url']
                }
            },
            'download_mirrors': len(self.config['download_mirrors']),
            'deployment_scripts': ['deploy-gh-pages.sh', 'deploy-cdn.sh'],
            'configuration_files': [
                '_config.yml',
                'Gemfile',
                'CNAME',
                '.htaccess',
                'robots.txt',
                'sitemap.xml',
                'feed.xml'
            ]
        }
        
        # 保存报告
        with open(self.dist_dir / 'distribution-report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n分发设置完成!")
        print(f"- GitHub Pages: {report['distribution_channels']['github_pages']['url']}")
        print(f"- API端点: {len(self.config['access_methods']['api']['endpoints'])}个")
        print(f"- 下载镜像: {report['download_mirrors']}个")
        print(f"- 部署脚本: {len(report['deployment_scripts'])}个")
        
        return report

def main():
    parser = argparse.ArgumentParser(description='AI IDE指南分发设置工具')
    parser.add_argument('--path', '-p', default='ai-ide-guide-v2', 
                       help='项目根目录路径')
    
    args = parser.parse_args()
    
    setup = DistributionSetup(args.path)
    
    # 设置分发
    report = setup.setup_distribution()
    
    if report:
        print(f"\n分发设置报告:")
        print(f"- 设置时间: {report['setup_date']}")
        print(f"- 分发渠道: {len(report['distribution_channels'])}个")
        print(f"- 配置文件: {len(report['configuration_files'])}个")

if __name__ == '__main__':
    main()