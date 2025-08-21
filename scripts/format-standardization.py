#!/usr/bin/env python3
"""
文档格式和样式统一化脚本
用于统一AI IDE指南v2.0项目中所有文档的格式和样式
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Tuple
import argparse

class DocumentFormatter:
    """文档格式化器"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.style_config = self.load_style_config()
        self.processed_files = []
        self.issues_found = []
        
    def load_style_config(self) -> Dict:
        """加载样式配置"""
        return {
            "heading_style": {
                "h1_pattern": r"^# (.+)$",
                "h2_pattern": r"^## (.+)$", 
                "h3_pattern": r"^### (.+)$",
                "h4_pattern": r"^#### (.+)$",
                "h5_pattern": r"^##### (.+)$"
            },
            "list_style": {
                "unordered_marker": "-",
                "ordered_format": "1.",
                "indent_size": 2
            },
            "table_style": {
                "alignment": "left",
                "padding": 1
            },
            "code_style": {
                "fence": "```",
                "inline": "`"
            },
            "link_style": {
                "format": "[text](url)"
            }
        }
    
    def standardize_headings(self, content: str) -> str:
        """标准化标题格式"""
        lines = content.split('\n')
        standardized_lines = []
        
        for line in lines:
            # 确保标题前后有空行
            if re.match(r'^#{1,5}\s+.+', line):
                # 标题前加空行（如果前一行不是空行）
                if standardized_lines and standardized_lines[-1].strip():
                    standardized_lines.append('')
                
                # 标准化标题格式：确保#后有一个空格
                heading_match = re.match(r'^(#{1,5})\s*(.+)', line)
                if heading_match:
                    level, title = heading_match.groups()
                    standardized_line = f"{level} {title.strip()}"
                    standardized_lines.append(standardized_line)
                    # 标题后加空行
                    standardized_lines.append('')
                else:
                    standardized_lines.append(line)
            else:
                standardized_lines.append(line)
        
        return '\n'.join(standardized_lines)
    
    def standardize_lists(self, content: str) -> str:
        """标准化列表格式"""
        lines = content.split('\n')
        standardized_lines = []
        in_list = False
        
        for i, line in enumerate(lines):
            # 检测无序列表
            if re.match(r'^(\s*)[-*+]\s+(.+)', line):
                match = re.match(r'^(\s*)[-*+]\s+(.+)', line)
                indent, text = match.groups()
                # 统一使用 - 作为无序列表标记
                standardized_line = f"{indent}- {text}"
                standardized_lines.append(standardized_line)
                in_list = True
            
            # 检测有序列表
            elif re.match(r'^(\s*)\d+\.\s+(.+)', line):
                match = re.match(r'^(\s*)\d+\.\s+(.+)', line)
                indent, text = match.groups()
                # 重新编号有序列表
                level = len(indent) // 2
                if level == 0:
                    number = self.get_list_number(standardized_lines, 0)
                else:
                    number = self.get_list_number(standardized_lines, level)
                standardized_line = f"{indent}{number}. {text}"
                standardized_lines.append(standardized_line)
                in_list = True
            
            # 检测任务列表
            elif re.match(r'^(\s*)- \[([ x])\]\s+(.+)', line):
                match = re.match(r'^(\s*)- \[([ x])\]\s+(.+)', line)
                indent, status, text = match.groups()
                standardized_line = f"{indent}- [{status}] {text}"
                standardized_lines.append(standardized_line)
                in_list = True
            
            else:
                # 如果不是列表项，检查是否需要在列表后加空行
                if in_list and line.strip() and not re.match(r'^\s*[-*+\d]', line):
                    if standardized_lines and standardized_lines[-1].strip():
                        standardized_lines.append('')
                    in_list = False
                
                standardized_lines.append(line)
        
        return '\n'.join(standardized_lines)
    
    def get_list_number(self, lines: List[str], level: int) -> int:
        """获取有序列表的下一个编号"""
        count = 0
        indent_pattern = r'^' + r'\s' * (level * 2) + r'\d+\.\s+'
        
        # 从后往前查找同级别的列表项
        for line in reversed(lines):
            if re.match(indent_pattern, line):
                match = re.match(r'^' + r'\s' * (level * 2) + r'(\d+)\.\s+', line)
                if match:
                    return int(match.group(1)) + 1
        
        return 1
    
    def standardize_tables(self, content: str) -> str:
        """标准化表格格式"""
        lines = content.split('\n')
        standardized_lines = []
        in_table = False
        
        for i, line in enumerate(lines):
            # 检测表格行
            if '|' in line and line.strip().startswith('|') and line.strip().endswith('|'):
                # 标准化表格格式
                cells = [cell.strip() for cell in line.split('|')[1:-1]]
                
                # 检查是否是分隔行
                if all(re.match(r'^:?-+:?$', cell) for cell in cells):
                    # 标准化分隔行
                    separator_cells = []
                    for cell in cells:
                        if cell.startswith(':') and cell.endswith(':'):
                            separator_cells.append(':' + '-' * max(3, len(cell)-2) + ':')
                        elif cell.endswith(':'):
                            separator_cells.append('-' * max(3, len(cell)-1) + ':')
                        elif cell.startswith(':'):
                            separator_cells.append(':' + '-' * max(3, len(cell)-1))
                        else:
                            separator_cells.append('-' * max(3, len(cell)))
                    standardized_line = '| ' + ' | '.join(separator_cells) + ' |'
                else:
                    # 标准化数据行
                    standardized_line = '| ' + ' | '.join(cells) + ' |'
                
                standardized_lines.append(standardized_line)
                in_table = True
            else:
                if in_table and line.strip():
                    # 表格结束后加空行
                    if standardized_lines and standardized_lines[-1].strip():
                        standardized_lines.append('')
                    in_table = False
                
                standardized_lines.append(line)
        
        return '\n'.join(standardized_lines)
    
    def standardize_code_blocks(self, content: str) -> str:
        """标准化代码块格式"""
        # 确保代码块使用三个反引号
        content = re.sub(r'^```(\w*)\s*$', r'```\1', content, flags=re.MULTILINE)
        
        # 确保代码块前后有空行
        lines = content.split('\n')
        standardized_lines = []
        
        for i, line in enumerate(lines):
            if line.startswith('```'):
                # 代码块开始或结束
                if i > 0 and standardized_lines and standardized_lines[-1].strip():
                    standardized_lines.append('')
                standardized_lines.append(line)
                if line == '```' and i < len(lines) - 1 and lines[i + 1].strip():
                    standardized_lines.append('')
            else:
                standardized_lines.append(line)
        
        return '\n'.join(standardized_lines)
    
    def standardize_links(self, content: str) -> str:
        """标准化链接格式"""
        # 标准化Markdown链接格式
        content = re.sub(r'\[([^\]]+)\]\s*\(\s*([^)]+)\s*\)', r'[\1](\2)', content)
        return content
    
    def check_cross_references(self, content: str, file_path: Path) -> List[str]:
        """检查交叉引用的准确性"""
        issues = []
        
        # 检查内部链接
        internal_links = re.findall(r'\[([^\]]+)\]\(#([^)]+)\)', content)
        for link_text, anchor in internal_links:
            # 检查锚点是否存在
            anchor_pattern = re.sub(r'[^\w\u4e00-\u9fff-]', '-', anchor.lower())
            if not re.search(rf'#{{{1,6}}}\s+.*{re.escape(anchor_pattern)}', content, re.IGNORECASE):
                issues.append(f"内部链接锚点不存在: #{anchor} in {file_path}")
        
        # 检查相对路径链接
        relative_links = re.findall(r'\[([^\]]+)\]\(([^)]+\.md[^)]*)\)', content)
        for link_text, path in relative_links:
            if not path.startswith('http'):
                target_path = file_path.parent / path
                if not target_path.exists():
                    issues.append(f"相对路径链接文件不存在: {path} in {file_path}")
        
        return issues
    
    def add_chapter_numbering(self, content: str, chapter_num: int) -> str:
        """添加章节编号"""
        lines = content.split('\n')
        standardized_lines = []
        section_counters = [0, 0, 0, 0]  # 对应h2, h3, h4, h5的计数器
        
        for line in lines:
            # 检查标题级别
            heading_match = re.match(r'^(#{1,5})\s+(.+)', line)
            if heading_match:
                level_str, title = heading_match.groups()
                level = len(level_str)
                
                if level == 1:
                    # 一级标题：章节标题
                    if not re.match(r'^第\d+章', title):
                        standardized_line = f"# 第{chapter_num}章 {title}"
                    else:
                        standardized_line = line
                elif level == 2:
                    # 二级标题
                    section_counters[0] += 1
                    section_counters[1:] = [0, 0, 0]  # 重置下级计数器
                    if not re.match(rf'^{chapter_num}\.\d+', title):
                        standardized_line = f"## {chapter_num}.{section_counters[0]} {title}"
                    else:
                        standardized_line = line
                elif level == 3:
                    # 三级标题
                    section_counters[1] += 1
                    section_counters[2:] = [0, 0]  # 重置下级计数器
                    if not re.match(rf'^{chapter_num}\.\d+\.\d+', title):
                        standardized_line = f"### {chapter_num}.{section_counters[0]}.{section_counters[1]} {title}"
                    else:
                        standardized_line = line
                elif level == 4:
                    # 四级标题
                    section_counters[2] += 1
                    section_counters[3] = 0  # 重置下级计数器
                    if not re.match(rf'^{chapter_num}\.\d+\.\d+\.\d+', title):
                        standardized_line = f"#### {chapter_num}.{section_counters[0]}.{section_counters[1]}.{section_counters[2]} {title}"
                    else:
                        standardized_line = line
                elif level == 5:
                    # 五级标题
                    section_counters[3] += 1
                    if not re.match(rf'^{chapter_num}\.\d+\.\d+\.\d+\.\d+', title):
                        standardized_line = f"##### {chapter_num}.{section_counters[0]}.{section_counters[1]}.{section_counters[2]}.{section_counters[3]} {title}"
                    else:
                        standardized_line = line
                else:
                    standardized_line = line
                
                standardized_lines.append(standardized_line)
            else:
                standardized_lines.append(line)
        
        return '\n'.join(standardized_lines)
    
    def optimize_chart_display(self, content: str) -> str:
        """优化图表和表格的显示效果"""
        lines = content.split('\n')
        standardized_lines = []
        
        for i, line in enumerate(lines):
            # 为Mermaid图表添加容器
            if line.strip().startswith('```mermaid'):
                standardized_lines.append('')
                standardized_lines.append('<div class="chart-container">')
                standardized_lines.append(line)
            elif line.strip() == '```' and i > 0 and '```mermaid' in lines[i-1::-1][:10]:
                standardized_lines.append(line)
                standardized_lines.append('</div>')
                standardized_lines.append('')
            else:
                standardized_lines.append(line)
        
        return '\n'.join(standardized_lines)
    
    def validate_links_and_references(self, content: str, file_path: Path) -> List[str]:
        """验证链接和引用的准确性"""
        issues = []
        
        # 检查图片链接
        image_links = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', content)
        for alt_text, img_path in image_links:
            if not img_path.startswith('http'):
                target_path = file_path.parent / img_path
                if not target_path.exists():
                    issues.append(f"图片文件不存在: {img_path} in {file_path}")
        
        # 检查文档内部引用
        doc_refs = re.findall(r'\[([^\]]+)\]\(([^)]+\.md[^)]*)\)', content)
        for ref_text, doc_path in doc_refs:
            if not doc_path.startswith('http'):
                target_path = file_path.parent / doc_path
                if not target_path.exists():
                    issues.append(f"文档引用不存在: {doc_path} in {file_path}")
        
        return issues
    
    def process_file(self, file_path: Path) -> Dict:
        """处理单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # 应用各种格式化规则
            content = original_content
            content = self.standardize_headings(content)
            content = self.standardize_lists(content)
            content = self.standardize_tables(content)
            content = self.standardize_code_blocks(content)
            content = self.standardize_links(content)
            content = self.optimize_chart_display(content)
            
            # 添加章节编号（仅对章节文件）
            if 'chapters' in str(file_path):
                chapter_match = re.search(r'(\d+)', file_path.stem)
                if chapter_match:
                    chapter_num = int(chapter_match.group(1))
                    content = self.add_chapter_numbering(content, chapter_num)
            
            # 检查问题
            issues = []
            issues.extend(self.check_cross_references(content, file_path))
            issues.extend(self.validate_links_and_references(content, file_path))
            
            # 写回文件（如果有变化）
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                return {
                    'file': str(file_path),
                    'status': 'updated',
                    'issues': issues,
                    'changes': self.get_changes_summary(original_content, content)
                }
            else:
                return {
                    'file': str(file_path),
                    'status': 'no_changes',
                    'issues': issues,
                    'changes': []
                }
                
        except Exception as e:
            return {
                'file': str(file_path),
                'status': 'error',
                'error': str(e),
                'issues': [],
                'changes': []
            }
    
    def get_changes_summary(self, original: str, updated: str) -> List[str]:
        """获取变更摘要"""
        changes = []
        
        # 简单的变更检测
        if len(original.split('\n')) != len(updated.split('\n')):
            changes.append(f"行数变化: {len(original.split('\n'))} -> {len(updated.split('\n'))}")
        
        # 检测标题变化
        original_headings = re.findall(r'^#{1,5}\s+(.+)', original, re.MULTILINE)
        updated_headings = re.findall(r'^#{1,5}\s+(.+)', updated, re.MULTILINE)
        if original_headings != updated_headings:
            changes.append("标题格式已标准化")
        
        # 检测列表变化
        original_lists = re.findall(r'^(\s*)[-*+]\s+', original, re.MULTILINE)
        updated_lists = re.findall(r'^(\s*)[-*+]\s+', updated, re.MULTILINE)
        if len(original_lists) != len(updated_lists):
            changes.append("列表格式已标准化")
        
        return changes
    
    def process_directory(self, directory: Path = None) -> Dict:
        """处理整个目录"""
        if directory is None:
            directory = self.base_path
        
        results = {
            'processed_files': [],
            'total_issues': [],
            'summary': {
                'total_files': 0,
                'updated_files': 0,
                'error_files': 0,
                'total_issues': 0
            }
        }
        
        # 查找所有Markdown文件
        md_files = list(directory.rglob('*.md'))
        
        for file_path in md_files:
            # 跳过某些文件
            if any(skip in str(file_path) for skip in ['.git', 'node_modules', 'temp']):
                continue
            
            result = self.process_file(file_path)
            results['processed_files'].append(result)
            results['total_issues'].extend(result['issues'])
            
            # 更新统计
            results['summary']['total_files'] += 1
            if result['status'] == 'updated':
                results['summary']['updated_files'] += 1
            elif result['status'] == 'error':
                results['summary']['error_files'] += 1
            results['summary']['total_issues'] += len(result['issues'])
        
        return results
    
    def generate_report(self, results: Dict, output_path: Path = None) -> str:
        """生成格式化报告"""
        if output_path is None:
            output_path = self.base_path / 'format-standardization-report.md'
        
        report_content = f"""# 文档格式标准化报告

## 执行摘要

- **处理文件总数**: {results['summary']['total_files']}
- **更新文件数量**: {results['summary']['updated_files']}
- **错误文件数量**: {results['summary']['error_files']}
- **发现问题总数**: {results['summary']['total_issues']}

## 处理详情

### 成功更新的文件

"""
        
        for file_result in results['processed_files']:
            if file_result['status'] == 'updated':
                report_content += f"#### {file_result['file']}\n"
                report_content += f"**状态**: 已更新\n"
                if file_result['changes']:
                    report_content += f"**变更内容**:\n"
                    for change in file_result['changes']:
                        report_content += f"- {change}\n"
                report_content += "\n"
        
        if results['total_issues']:
            report_content += "### 发现的问题\n\n"
            for issue in results['total_issues']:
                report_content += f"- {issue}\n"
            report_content += "\n"
        
        report_content += f"""
## 格式化规则应用情况

### 标题格式化
- 统一标题前后空行
- 标准化标题编号格式
- 确保标题层级连续性

### 列表格式化
- 统一使用 `-` 作为无序列表标记
- 重新编号有序列表
- 标准化任务列表格式

### 表格格式化
- 统一表格对齐方式
- 标准化分隔行格式
- 优化表格可读性

### 代码块格式化
- 确保代码块前后空行
- 标准化代码块标记
- 添加语言标识

### 链接格式化
- 标准化链接格式
- 验证链接有效性
- 检查交叉引用准确性

---

**报告生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(output_path)

def main():
    parser = argparse.ArgumentParser(description='AI IDE指南文档格式标准化工具')
    parser.add_argument('--path', '-p', default='ai-ide-guide-v2', 
                       help='要处理的文档目录路径')
    parser.add_argument('--report', '-r', 
                       help='报告输出路径')
    parser.add_argument('--dry-run', action='store_true',
                       help='仅检查不修改文件')
    
    args = parser.parse_args()
    
    formatter = DocumentFormatter(args.path)
    
    print("开始文档格式标准化...")
    results = formatter.process_directory()
    
    print(f"\n处理完成!")
    print(f"- 处理文件: {results['summary']['total_files']}")
    print(f"- 更新文件: {results['summary']['updated_files']}")
    print(f"- 发现问题: {results['summary']['total_issues']}")
    
    # 生成报告
    report_path = formatter.generate_report(results, 
                                          Path(args.report) if args.report else None)
    print(f"- 报告已生成: {report_path}")

if __name__ == '__main__':
    main()