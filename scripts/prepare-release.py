#!/usr/bin/env python3
"""
AI IDE开发指南 - 发布准备脚本
自动化准备不同类型的发布包
"""

import os
import sys
import shutil
import json
import argparse
from pathlib import Path
from datetime import datetime
import subprocess

class ReleasePreparator:
    def __init__(self, base_dir=None):
        self.base_dir = Path(base_dir) if base_dir else Path(__file__).parent.parent
        self.temp_dir = self.base_dir / 'temp_release'
        
    def clean_temp_dir(self):
        """清理临时目录"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
        self.temp_dir.mkdir(exist_ok=True)
        
    def copy_base_files(self):
        """复制基础文件"""
        base_files = [
            'README.md',
            'LICENSE', 
            'CHANGELOG.md',
            'RELEASE_NOTES.md',
            'CONTRIBUTING.md',
            'CODE_OF_CONDUCT.md',
            'SECURITY.md',
            '.gitignore'
        ]
        
        for file in base_files:
            src = self.base_dir / file
            if src.exists():
                shutil.copy2(src, self.temp_dir / file)
                print(f"✅ 复制基础文件: {file}")
                
    def copy_github_config(self):
        """复制GitHub配置"""
        github_src = self.base_dir / '.github'
        if github_src.exists():
            github_dst = self.temp_dir / '.github'
            shutil.copytree(github_src, github_dst)
            print("✅ 复制GitHub配置")
            
    def copy_docs(self):
        """复制文档内容"""
        docs_src = self.base_dir / 'docs'
        if docs_src.exists():
            docs_dst = self.temp_dir / 'docs'
            shutil.copytree(docs_src, docs_dst)
            print("✅ 复制文档内容")
            
    def copy_research(self):
        """复制研究资料"""
        research_src = self.base_dir / 'research'
        if research_src.exists():
            research_dst = self.temp_dir / 'research'
            shutil.copytree(research_src, research_dst)
            print("✅ 复制研究资料")
            
    def copy_project_management(self):
        """复制项目管理文档"""
        pm_src = self.base_dir / 'project-management'
        if pm_src.exists():
            pm_dst = self.temp_dir / 'project-management'
            shutil.copytree(pm_src, pm_dst)
            print("✅ 复制项目管理文档")
            
    def copy_quality_standards(self):
        """复制质量标准"""
        quality_src = self.base_dir / 'quality'
        if quality_src.exists():
            quality_dst = self.temp_dir / 'quality'
            shutil.copytree(quality_src, quality_dst)
            print("✅ 复制质量标准")
            
    def copy_scripts(self):
        """复制脚本文件"""
        scripts_src = self.base_dir / 'scripts'
        if scripts_src.exists():
            scripts_dst = self.temp_dir / 'scripts'
            shutil.copytree(scripts_src, scripts_dst)
            print("✅ 复制脚本文件")
            
    def copy_quality_tools(self):
        """复制质量工具（排除运行时文件）"""
        tools_src = self.base_dir / 'quality-tools'
        if tools_src.exists():
            tools_dst = self.temp_dir / 'quality-tools'
            
            # 排除的目录
            exclude_dirs = {
                'deployment',
                'deployment-backups', 
                'verification-reports',
                'final-quality-reports',
                '.quality-backups',
                '.temp_verification',
                'test-temp',
                'node_modules'
            }
            
            def ignore_patterns(dir, files):
                return [f for f in files if f in exclude_dirs or f.endswith(('.log', '.tmp', '.temp'))]
            
            shutil.copytree(tools_src, tools_dst, ignore=ignore_patterns)
            print("✅ 复制质量工具（已排除运行时文件）")
            
    def clean_reports(self):
        """清理动态生成的报告文件"""
        report_patterns = [
            '*-report.md',
            '*-report.json',
            'format-report.md',
            'style-validation-report.md',
            'cross-reference-report.md',
            'chart-quality-report.md',
            'device-compatibility-report.md',
            'publication-report.json',
            'distribution-report.json'
        ]
        
        for pattern in report_patterns:
            for file in self.temp_dir.rglob(pattern):
                file.unlink()
                print(f"🗑️ 删除报告文件: {file.relative_to(self.temp_dir)}")
                
    def create_release_info(self, release_type, version):
        """创建发布信息文件"""
        release_info = {
            "release_type": release_type,
            "version": version,
            "created_at": datetime.now().isoformat(),
            "description": self.get_release_description(release_type),
            "included_components": self.get_included_components(release_type)
        }
        
        with open(self.temp_dir / 'RELEASE_INFO.json', 'w', encoding='utf-8') as f:
            json.dump(release_info, f, indent=2, ensure_ascii=False)
        print("✅ 创建发布信息文件")
        
    def get_release_description(self, release_type):
        """获取发布描述"""
        descriptions = {
            'core': 'AI IDE开发指南核心文档发布，包含所有章节内容、附录和基础配置，面向最终用户',
            'tools': 'AI IDE开发指南质量工具发布，包含所有质量检查和修复工具，面向维护团队'
        }
        return descriptions.get(release_type, '未知发布类型')
        
    def get_included_components(self, release_type):
        """获取包含的组件列表"""
        components = {
            'core': [
                'docs/',
                'README.md',
                'LICENSE',
                'CHANGELOG.md',
                'RELEASE_NOTES.md',
                'CONTRIBUTING.md',
                'CODE_OF_CONDUCT.md',
                'SECURITY.md',
                '.github/'
            ],
            'tools': [
                'quality-tools/',
                'scripts/',
                'README.md',
                'LICENSE'
            ]
        }
        return components.get(release_type, [])
        
    def calculate_size(self):
        """计算发布包大小"""
        total_size = 0
        file_count = 0
        
        for file_path in self.temp_dir.rglob('*'):
            if file_path.is_file():
                total_size += file_path.stat().st_size
                file_count += 1
                
        return total_size, file_count
        
    def create_archive(self, release_type, version):
        """创建发布归档"""
        archive_name = f"ai-ide-guide-v{version}-{release_type}"
        archive_path = self.base_dir / f"{archive_name}.zip"
        
        # 创建ZIP归档
        shutil.make_archive(
            str(self.base_dir / archive_name),
            'zip',
            str(self.temp_dir)
        )
        
        size, file_count = self.calculate_size()
        print(f"📦 创建发布归档: {archive_path.name}")
        print(f"📊 包含文件: {file_count} 个")
        print(f"📏 总大小: {size / 1024 / 1024:.2f} MB")
        
        return archive_path
        
    def prepare_core_release(self, version):
        """准备核心文档发布 - 只包含核心文档，不包含任何工具或开发资源"""
        print("🚀 准备核心文档发布（仅核心内容）...")
        self.clean_temp_dir()
        self.copy_base_files()
        self.copy_github_config()
        self.copy_docs()
        self.clean_reports()
        # 注意：不复制 research/, project-management/, quality/, scripts/, quality-tools/
        print("ℹ️ 核心发布不包含：研究资料、项目管理、质量工具、脚本文件")
        self.create_release_info('core', version)
        return self.create_archive('core', version)
        
    def prepare_developer_release(self, version):
        """准备开发者发布 - 包含开发资源但不包含工具"""
        print("🚀 准备开发者发布（包含开发资源，不包含工具）...")
        self.clean_temp_dir()
        self.copy_base_files()
        self.copy_github_config()
        self.copy_docs()
        self.copy_research()
        self.copy_project_management()
        self.copy_quality_standards()
        self.clean_reports()
        # 注意：不复制 scripts/, quality-tools/
        print("ℹ️ 开发者发布不包含：质量工具、脚本文件")
        print("ℹ️ 开发者发布包含：文档、研究资料、项目管理、质量标准")
        self.create_release_info('developer', version)
        return self.create_archive('developer', version)
        
    def prepare_tools_release(self, version):
        """准备工具发布"""
        print("🚀 准备工具发布...")
        self.clean_temp_dir()
        self.copy_base_files()
        self.copy_scripts()
        self.copy_quality_tools()
        self.clean_reports()
        self.create_release_info('tools', version)
        return self.create_archive('tools', version)
        
    def cleanup(self):
        """清理临时文件"""
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
        print("🧹 清理临时文件完成")

def main():
    parser = argparse.ArgumentParser(description='AI IDE开发指南发布准备工具')
    parser.add_argument('release_type', choices=['core', 'tools'], 
                       help='发布类型: core=核心文档发布, tools=工具发布')
    parser.add_argument('version', help='版本号 (例如: 2.1.0)')
    parser.add_argument('--base-dir', help='项目根目录路径')
    parser.add_argument('--keep-temp', action='store_true', 
                       help='保留临时目录（用于调试）')
    
    args = parser.parse_args()
    
    try:
        preparator = ReleasePreparator(args.base_dir)
        
        if args.release_type == 'core':
            archive_path = preparator.prepare_core_release(args.version)
        elif args.release_type == 'tools':
            archive_path = preparator.prepare_tools_release(args.version)
            
        print(f"\n✅ 发布准备完成!")
        print(f"📦 发布包: {archive_path}")
        print(f"🎯 发布类型: {args.release_type}")
        print(f"🏷️ 版本: {args.version}")
        
        if not args.keep_temp:
            preparator.cleanup()
            
    except Exception as e:
        print(f"❌ 发布准备失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()