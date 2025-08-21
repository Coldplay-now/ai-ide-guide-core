#!/usr/bin/env python3
"""
交叉引用验证脚本
验证AI IDE指南v2.0项目中所有文档的交叉引用准确性
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Set, Tuple
import argparse
from urllib.parse import urlparse

class CrossReferenceValidator:
    """交叉引用验证器"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.all_files = {}  # 存储所有文件的内容和元数据
        self.all_headings = {}  # 存储所有文件的标题
        self.all_links = {}  # 存储所有链接
        self.validation_results = []
        
    def scan_all_files(self):
        """扫描所有文件，建立索引"""
        print("扫描文档文件...")
        
        md_files = list(self.base_path.rglob('*.md'))
        
        for file_path in md_files:
            if any(skip in str(file_path) for skip in ['.git', 'node_modules', 'temp']):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                relative_path = file_path.relative_to(self.base_path)
                
                self.all_files[str(relative_path)] = {
                    'path': file_path,
                    'content': content,
                    'headings': self.extract_headings(content),
                    'links': self.extract_links(content),
                    'images': self.extract_images(content)
                }
                
            except Exception as e:
                print(f"读取文件失败 {file_path}: {e}")
        
        print(f"扫描完成，共找到 {len(self.all_files)} 个文档文件")
    
    def extract_headings(self, content: str) -> List[Dict]:
        """提取文档中的所有标题"""
        headings = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            match = re.match(r'^(#{1,6})\s+(.+)', line)
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                
                # 生成锚点ID（GitHub风格）
                anchor_id = re.sub(r'[^\w\u4e00-\u9fff\s-]', '', title.lower())
                anchor_id = re.sub(r'\s+', '-', anchor_id)
                anchor_id = re.sub(r'-+', '-', anchor_id).strip('-')
                
                headings.append({
                    'level': level,
                    'title': title,
                    'anchor': anchor_id,
                    'line': i + 1
                })
        
        return headings
    
    def extract_links(self, content: str) -> List[Dict]:
        """提取文档中的所有链接"""
        links = []
        
        # 提取Markdown链接
        for match in re.finditer(r'\[([^\]]*)\]\(([^)]+)\)', content):
            text = match.group(1)
            url = match.group(2)
            line_num = content[:match.start()].count('\n') + 1
            
            links.append({
                'type': 'markdown',
                'text': text,
                'url': url,
                'line': line_num,
                'raw': match.group(0)
            })
        
        # 提取HTML链接
        for match in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>([^<]*)</a>', content, re.IGNORECASE):
            url = match.group(1)
            text = match.group(2)
            line_num = content[:match.start()].count('\n') + 1
            
            links.append({
                'type': 'html',
                'text': text,
                'url': url,
                'line': line_num,
                'raw': match.group(0)
            })
        
        return links
    
    def extract_images(self, content: str) -> List[Dict]:
        """提取文档中的所有图片"""
        images = []
        
        # 提取Markdown图片
        for match in re.finditer(r'!\[([^\]]*)\]\(([^)]+)\)', content):
            alt_text = match.group(1)
            src = match.group(2)
            line_num = content[:match.start()].count('\n') + 1
            
            images.append({
                'type': 'markdown',
                'alt': alt_text,
                'src': src,
                'line': line_num,
                'raw': match.group(0)
            })
        
        # 提取HTML图片
        for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', content, re.IGNORECASE):
            src = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            
            # 提取alt属性
            alt_match = re.search(r'alt=["\']([^"\']*)["\']', match.group(0), re.IGNORECASE)
            alt_text = alt_match.group(1) if alt_match else ''
            
            images.append({
                'type': 'html',
                'alt': alt_text,
                'src': src,
                'line': line_num,
                'raw': match.group(0)
            })
        
        return images
    
    def validate_internal_links(self) -> List[Dict]:
        """验证内部链接"""
        issues = []
        
        for file_path, file_data in self.all_files.items():
            for link in file_data['links']:
                url = link['url']
                
                # 跳过外部链接
                if url.startswith(('http://', 'https://', 'mailto:', 'tel:')):
                    continue
                
                # 处理锚点链接
                if url.startswith('#'):
                    anchor = url[1:]
                    # 检查当前文件中是否存在该锚点
                    found = False
                    for heading in file_data['headings']:
                        if heading['anchor'] == anchor:
                            found = True
                            break
                    
                    if not found:
                        issues.append({
                            'type': 'missing_anchor',
                            'file': file_path,
                            'line': link['line'],
                            'message': f'锚点不存在: #{anchor}',
                            'link': link['raw']
                        })
                
                # 处理相对路径链接
                elif not url.startswith('/') and '://' not in url:
                    # 分离文件路径和锚点
                    if '#' in url:
                        file_part, anchor_part = url.split('#', 1)
                    else:
                        file_part, anchor_part = url, None
                    
                    if file_part:
                        # 计算目标文件的绝对路径
                        current_dir = Path(file_path).parent
                        target_path = current_dir / file_part
                        
                        # 标准化路径
                        try:
                            target_path = target_path.resolve()
                            relative_target = target_path.relative_to(self.base_path.resolve())
                            target_key = str(relative_target)
                        except (ValueError, OSError):
                            target_key = None
                        
                        # 检查文件是否存在
                        if target_key not in self.all_files:
                            issues.append({
                                'type': 'missing_file',
                                'file': file_path,
                                'line': link['line'],
                                'message': f'链接文件不存在: {file_part}',
                                'link': link['raw']
                            })
                        elif anchor_part:
                            # 检查目标文件中的锚点
                            target_file = self.all_files[target_key]
                            found = False
                            for heading in target_file['headings']:
                                if heading['anchor'] == anchor_part:
                                    found = True
                                    break
                            
                            if not found:
                                issues.append({
                                    'type': 'missing_target_anchor',
                                    'file': file_path,
                                    'line': link['line'],
                                    'message': f'目标文件中锚点不存在: {file_part}#{anchor_part}',
                                    'link': link['raw']
                                })
        
        return issues
    
    def validate_images(self) -> List[Dict]:
        """验证图片链接"""
        issues = []
        
        for file_path, file_data in self.all_files.items():
            for image in file_data['images']:
                src = image['src']
                
                # 跳过外部图片和数据URL
                if src.startswith(('http://', 'https://', 'data:')):
                    continue
                
                # 检查相对路径图片
                if not src.startswith('/'):
                    current_dir = Path(file_path).parent
                    image_path = self.base_path / current_dir / src
                    
                    if not image_path.exists():
                        issues.append({
                            'type': 'missing_image',
                            'file': file_path,
                            'line': image['line'],
                            'message': f'图片文件不存在: {src}',
                            'image': image['raw']
                        })
        
        return issues
    
    def validate_external_links(self) -> List[Dict]:
        """验证外部链接（基础检查）"""
        issues = []
        
        for file_path, file_data in self.all_files.items():
            for link in file_data['links']:
                url = link['url']
                
                # 检查外部链接格式
                if url.startswith(('http://', 'https://')):
                    parsed = urlparse(url)
                    
                    # 基本格式检查
                    if not parsed.netloc:
                        issues.append({
                            'type': 'malformed_url',
                            'file': file_path,
                            'line': link['line'],
                            'message': f'URL格式错误: {url}',
                            'link': link['raw']
                        })
                    
                    # 检查常见的错误
                    if ' ' in url:
                        issues.append({
                            'type': 'url_with_spaces',
                            'file': file_path,
                            'line': link['line'],
                            'message': f'URL包含空格: {url}',
                            'link': link['raw']
                        })
        
        return issues
    
    def check_duplicate_headings(self) -> List[Dict]:
        """检查重复的标题"""
        issues = []
        
        for file_path, file_data in self.all_files.items():
            heading_anchors = {}
            
            for heading in file_data['headings']:
                anchor = heading['anchor']
                if anchor in heading_anchors:
                    issues.append({
                        'type': 'duplicate_heading',
                        'file': file_path,
                        'line': heading['line'],
                        'message': f'重复的标题锚点: {anchor}',
                        'heading': heading['title']
                    })
                else:
                    heading_anchors[anchor] = heading
        
        return issues
    
    def check_orphaned_files(self) -> List[Dict]:
        """检查孤立文件（没有被其他文件引用的文件）"""
        issues = []
        referenced_files = set()
        
        # 收集所有被引用的文件
        for file_path, file_data in self.all_files.items():
            for link in file_data['links']:
                url = link['url']
                
                # 处理相对路径链接
                if not url.startswith(('http://', 'https://', 'mailto:', 'tel:', '#')):
                    if '#' in url:
                        file_part = url.split('#')[0]
                    else:
                        file_part = url
                    
                    if file_part:
                        current_dir = Path(file_path).parent
                        target_path = current_dir / file_part
                        
                        try:
                            target_path = target_path.resolve()
                            relative_target = target_path.relative_to(self.base_path.resolve())
                            referenced_files.add(str(relative_target))
                        except (ValueError, OSError):
                            pass
        
        # 检查哪些文件没有被引用
        for file_path in self.all_files.keys():
            # 跳过特殊文件
            if any(special in file_path.lower() for special in ['readme', 'index', 'toc', '目录']):
                continue
            
            if file_path not in referenced_files:
                issues.append({
                    'type': 'orphaned_file',
                    'file': file_path,
                    'line': 0,
                    'message': '文件没有被其他文档引用',
                    'suggestion': '考虑添加到目录或相关文档中'
                })
        
        return issues
    
    def validate_all(self) -> Dict:
        """执行所有验证"""
        self.scan_all_files()
        
        all_issues = []
        
        print("验证内部链接...")
        all_issues.extend(self.validate_internal_links())
        
        print("验证图片链接...")
        all_issues.extend(self.validate_images())
        
        print("验证外部链接...")
        all_issues.extend(self.validate_external_links())
        
        print("检查重复标题...")
        all_issues.extend(self.check_duplicate_headings())
        
        print("检查孤立文件...")
        all_issues.extend(self.check_orphaned_files())
        
        # 按类型统计问题
        issue_types = {}
        for issue in all_issues:
            issue_type = issue['type']
            if issue_type not in issue_types:
                issue_types[issue_type] = 0
            issue_types[issue_type] += 1
        
        return {
            'total_files': len(self.all_files),
            'total_issues': len(all_issues),
            'issues': all_issues,
            'issue_types': issue_types
        }
    
    def generate_report(self, results: Dict, output_path: Path = None) -> str:
        """生成验证报告"""
        if output_path is None:
            output_path = self.base_path / 'cross-reference-report.md'
        
        report_content = f"""# 交叉引用验证报告

## 验证摘要

- **验证文件总数**: {results['total_files']}
- **发现问题总数**: {results['total_issues']}

## 问题类型统计

"""
        
        for issue_type, count in sorted(results['issue_types'].items()):
            issue_type_names = {
                'missing_anchor': '缺失锚点',
                'missing_file': '缺失文件',
                'missing_target_anchor': '目标锚点缺失',
                'missing_image': '缺失图片',
                'malformed_url': 'URL格式错误',
                'url_with_spaces': 'URL包含空格',
                'duplicate_heading': '重复标题',
                'orphaned_file': '孤立文件'
            }
            type_name = issue_type_names.get(issue_type, issue_type)
            report_content += f"- **{type_name}**: {count}个\n"
        
        report_content += "\n## 详细问题列表\n\n"
        
        # 按文件分组问题
        issues_by_file = {}
        for issue in results['issues']:
            file_path = issue['file']
            if file_path not in issues_by_file:
                issues_by_file[file_path] = []
            issues_by_file[file_path].append(issue)
        
        for file_path, issues in sorted(issues_by_file.items()):
            report_content += f"### {file_path}\n"
            report_content += f"**问题数量**: {len(issues)}\n\n"
            
            # 按类型分组
            issues_by_type = {}
            for issue in issues:
                issue_type = issue['type']
                if issue_type not in issues_by_type:
                    issues_by_type[issue_type] = []
                issues_by_type[issue_type].append(issue)
            
            for issue_type, type_issues in issues_by_type.items():
                issue_type_names = {
                    'missing_anchor': '缺失锚点',
                    'missing_file': '缺失文件',
                    'missing_target_anchor': '目标锚点缺失',
                    'missing_image': '缺失图片',
                    'malformed_url': 'URL格式错误',
                    'url_with_spaces': 'URL包含空格',
                    'duplicate_heading': '重复标题',
                    'orphaned_file': '孤立文件'
                }
                type_name = issue_type_names.get(issue_type, issue_type)
                report_content += f"#### {type_name}\n"
                
                for issue in type_issues:
                    if issue['line'] > 0:
                        report_content += f"- **行 {issue['line']}**: {issue['message']}\n"
                    else:
                        report_content += f"- {issue['message']}\n"
                    
                    if 'link' in issue:
                        report_content += f"  ```\n  {issue['link']}\n  ```\n"
                    elif 'image' in issue:
                        report_content += f"  ```\n  {issue['image']}\n  ```\n"
                    elif 'heading' in issue:
                        report_content += f"  标题: {issue['heading']}\n"
                    
                    if 'suggestion' in issue:
                        report_content += f"  建议: {issue['suggestion']}\n"
                    
                    report_content += "\n"
        
        report_content += f"""
## 修复建议

### 缺失锚点
- 检查标题是否存在拼写错误
- 确认标题格式是否正确
- 考虑使用标题的完整文本作为锚点

### 缺失文件
- 检查文件路径是否正确
- 确认文件是否已创建
- 更新链接指向正确的文件

### 缺失图片
- 检查图片文件是否存在
- 确认图片路径是否正确
- 考虑使用相对路径

### 重复标题
- 为重复的标题添加唯一标识
- 重新组织文档结构
- 使用更具体的标题

### 孤立文件
- 将文件添加到目录结构中
- 在相关文档中添加链接
- 考虑是否需要该文件

---

**报告生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(output_path)

def main():
    parser = argparse.ArgumentParser(description='AI IDE指南交叉引用验证工具')
    parser.add_argument('--path', '-p', default='ai-ide-guide-v2', 
                       help='要验证的文档目录路径')
    parser.add_argument('--report', '-r', 
                       help='报告输出路径')
    
    args = parser.parse_args()
    
    validator = CrossReferenceValidator(args.path)
    
    print("开始交叉引用验证...")
    results = validator.validate_all()
    
    print(f"\n验证完成!")
    print(f"- 验证文件: {results['total_files']}")
    print(f"- 发现问题: {results['total_issues']}")
    
    if results['issue_types']:
        print("\n问题类型分布:")
        for issue_type, count in sorted(results['issue_types'].items()):
            print(f"  - {issue_type}: {count}")
    
    # 生成报告
    report_path = validator.generate_report(results, 
                                          Path(args.report) if args.report else None)
    print(f"\n验证报告已生成: {report_path}")

if __name__ == '__main__':
    main()