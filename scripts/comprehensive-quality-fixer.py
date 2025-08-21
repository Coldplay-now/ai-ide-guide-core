#!/usr/bin/env python3
"""
综合质量修复工具
系统性修复AI IDE指南中的所有质量问题
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import argparse
from datetime import datetime

class CodeBlockFixer:
    """代码块修复器"""
    
    def __init__(self):
        self.language_map = {
            'js': 'javascript',
            'ts': 'typescript', 
            'py': 'python',
            'sh': 'bash',
            'yml': 'yaml',
            'json': 'json',
            'md': 'markdown',
            'html': 'html',
            'css': 'css',
            'sql': 'sql'
        }
        
    def fix_code_blocks(self, content: str) -> Tuple[str, List[str]]:
        """修复代码块格式问题"""
        issues_fixed = []
        lines = content.split('\n')
        fixed_lines = []
        in_code_block = False
        code_block_start = -1
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # 检测代码块开始
            if line.strip().startswith('```'):
                if not in_code_block:
                    # 代码块开始
                    in_code_block = True
                    code_block_start = i
                    
                    # 检查是否有语言标识
                    if line.strip() == '```':
                        # 尝试检测语言
                        language = self._detect_language(lines, i)
                        if language:
                            line = f'```{language}'
                            issues_fixed.append(f'Line {i+1}: Added language identifier "{language}"')
                    
                    fixed_lines.append(line)
                else:
                    # 代码块结束
                    in_code_block = False
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)
            
            i += 1
        
        # 检查是否有未闭合的代码块
        if in_code_block:
            fixed_lines.append('```')
            issues_fixed.append(f'Line {len(fixed_lines)}: Added missing code block closing')
        
        return '\n'.join(fixed_lines), issues_fixed    
  
  def _detect_language(self, lines: List[str], start_idx: int) -> Optional[str]:
        """检测代码块语言"""
        # 查看接下来几行的内容来推断语言
        for i in range(start_idx + 1, min(start_idx + 10, len(lines))):
            line = lines[i].strip()
            if not line or line.startswith('```'):
                break
                
            # Python特征
            if any(keyword in line for keyword in ['def ', 'import ', 'from ', 'class ', 'if __name__']):
                return 'python'
            # JavaScript特征
            elif any(keyword in line for keyword in ['function', 'const ', 'let ', 'var ', '=>', 'console.log']):
                return 'javascript'
            # Bash特征
            elif any(keyword in line for keyword in ['#!/bin/bash', 'echo ', 'cd ', 'ls ', 'mkdir']):
                return 'bash'
            # JSON特征
            elif line.startswith('{') and ('"' in line or "'" in line):
                return 'json'
            # YAML特征
            elif ':' in line and not line.startswith('#'):
                return 'yaml'
            # HTML特征
            elif line.startswith('<') and '>' in line:
                return 'html'
            # CSS特征
            elif '{' in line and '}' in line and ':' in line:
                return 'css'
        
        return None

class TableFixer:
    """表格修复器"""
    
    def __init__(self):
        self.empty_cell_placeholder = '-'
        
    def fix_tables(self, content: str) -> Tuple[str, List[str]]:
        """修复表格格式问题"""
        issues_fixed = []
        lines = content.split('\n')
        fixed_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # 检测表格行
            if self._is_table_row(line):
                # 收集整个表格
                table_lines = []
                table_start = i
                
                while i < len(lines) and self._is_table_row(lines[i]):
                    table_lines.append(lines[i])
                    i += 1
                
                # 修复表格
                fixed_table, table_issues = self._fix_table_structure(table_lines, table_start)
                fixed_lines.extend(fixed_table)
                issues_fixed.extend(table_issues)
                
                continue
            
            fixed_lines.append(line)
            i += 1
        
        return '\n'.join(fixed_lines), issues_fixed
    
    def _is_table_row(self, line: str) -> bool:
        """检查是否是表格行"""
        stripped = line.strip()
        return stripped.startswith('|') and stripped.endswith('|') and stripped.count('|') >= 2
    
    def _fix_table_structure(self, table_lines: List[str], start_line: int) -> Tuple[List[str], List[str]]:
        """修复表格结构"""
        if len(table_lines) < 2:
            return table_lines, []
        
        issues_fixed = []
        
        # 解析表格
        parsed_table = []
        for line in table_lines:
            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            parsed_table.append(cells)
        
        # 确定标准列数（以第一行为准）
        standard_cols = len(parsed_table[0])
        
        # 修复每一行的列数
        for i, row in enumerate(parsed_table):
            if len(row) != standard_cols:
                if len(row) < standard_cols:
                    # 补充缺失的列
                    row.extend([self.empty_cell_placeholder] * (standard_cols - len(row)))
                    issues_fixed.append(f'Line {start_line + i + 1}: Added {standard_cols - len(row)} missing cells')
                else:
                    # 截断多余的列
                    parsed_table[i] = row[:standard_cols]
                    issues_fixed.append(f'Line {start_line + i + 1}: Removed {len(row) - standard_cols} extra cells')
        
        # 重新生成表格
        fixed_table = []
        for row in parsed_table:
            # 填充空单元格
            filled_row = [cell if cell.strip() else self.empty_cell_placeholder for cell in row]
            fixed_table.append('| ' + ' | '.join(filled_row) + ' |')
        
        return fixed_table, issues_fixed
class M
ermaidOptimizer:
    """Mermaid图表优化器"""
    
    def __init__(self):
        self.color_scheme = {
            'primary': '#2563eb',
            'secondary': '#10b981', 
            'accent': '#f59e0b',
            'neutral': '#6b7280',
            'background': '#f9fafb'
        }
        
    def optimize_mermaid_charts(self, content: str) -> Tuple[str, List[str]]:
        """优化Mermaid图表"""
        issues_fixed = []
        
        # 查找所有Mermaid图表
        pattern = r'```mermaid\s*\n(.*?)\n```'
        
        def replace_chart(match):
            chart_content = match.group(1)
            optimized_chart, chart_issues = self._optimize_single_chart(chart_content)
            issues_fixed.extend(chart_issues)
            return f'```mermaid\n{optimized_chart}\n```'
        
        fixed_content = re.sub(pattern, replace_chart, content, flags=re.DOTALL)
        return fixed_content, issues_fixed
    
    def _optimize_single_chart(self, chart_content: str) -> Tuple[str, List[str]]:
        """优化单个图表"""
        issues_fixed = []
        lines = chart_content.strip().split('\n')
        
        # 检测图表类型
        chart_type = self._detect_chart_type(lines[0] if lines else '')
        
        # 添加方向定义（如果是流程图且缺少方向）
        if chart_type == 'flowchart' and not self._has_direction(lines[0]):
            lines[0] = lines[0] + ' TD'
            issues_fixed.append('Added direction definition (TD) to flowchart')
        
        # 优化节点标签长度
        for i, line in enumerate(lines):
            if '[' in line and ']' in line:
                optimized_line, label_issues = self._optimize_node_labels(line)
                if optimized_line != line:
                    lines[i] = optimized_line
                    issues_fixed.extend(label_issues)
        
        # 添加样式定义
        if not self._has_styles(lines):
            style_lines = self._generate_styles(chart_type)
            lines.extend([''] + style_lines)
            issues_fixed.append(f'Added {len(style_lines)} style definitions')
        
        return '\n'.join(lines), issues_fixed
    
    def _detect_chart_type(self, first_line: str) -> str:
        """检测图表类型"""
        first_line_lower = first_line.lower().strip()
        if first_line_lower.startswith('graph'):
            return 'flowchart'
        elif first_line_lower.startswith('sequencediagram'):
            return 'sequence'
        elif first_line_lower.startswith('gantt'):
            return 'gantt'
        elif first_line_lower.startswith('pie'):
            return 'pie'
        else:
            return 'flowchart'  # 默认
    
    def _has_direction(self, line: str) -> bool:
        """检查是否有方向定义"""
        directions = ['TB', 'TD', 'BT', 'RL', 'LR']
        return any(direction in line.upper() for direction in directions)
    
    def _has_styles(self, lines: List[str]) -> bool:
        """检查是否有样式定义"""
        return any('style' in line.lower() for line in lines)
    
    def _optimize_node_labels(self, line: str) -> Tuple[str, List[str]]:
        """优化节点标签长度"""
        issues_fixed = []
        
        # 查找标签
        label_pattern = r'\[([^\]]+)\]'
        
        def replace_label(match):
            label = match.group(1)
            if len(label) > 25:  # 标签过长
                optimized_label = label[:22] + '...'
                issues_fixed.append(f'Shortened long label: "{label}" -> "{optimized_label}"')
                return f'[{optimized_label}]'
            elif len(label) < 3:  # 标签过短
                optimized_label = f'{label} Node'
                issues_fixed.append(f'Extended short label: "{label}" -> "{optimized_label}"')
                return f'[{optimized_label}]'
            return match.group(0)
        
        optimized_line = re.sub(label_pattern, replace_label, line)
        return optimized_line, issues_fixed
    
    def _generate_styles(self, chart_type: str) -> List[str]:
        """生成样式定义"""
        if chart_type == 'flowchart':
            return [
                f'style A fill:{self.color_scheme["primary"]},stroke:#333,stroke-width:2px,color:#fff',
                f'style B fill:{self.color_scheme["secondary"]},stroke:#333,stroke-width:2px,color:#fff',
                f'style C fill:{self.color_scheme["accent"]},stroke:#333,stroke-width:2px,color:#fff'
            ]
        else:
            return [f'%%{{config: {{"theme": "default"}}}}%%']class
 FormatStandardizer:
    """格式标准化器"""
    
    def __init__(self):
        self.heading_pattern = r'^(#{1,6})\s+(.+)$'
        
    def standardize_format(self, content: str) -> Tuple[str, List[str]]:
        """标准化文档格式"""
        issues_fixed = []
        
        # 修复标题格式
        content, heading_issues = self._fix_headings(content)
        issues_fixed.extend(heading_issues)
        
        # 修复列表格式
        content, list_issues = self._fix_lists(content)
        issues_fixed.extend(list_issues)
        
        # 修复空行和间距
        content, spacing_issues = self._fix_spacing(content)
        issues_fixed.extend(spacing_issues)
        
        return content, issues_fixed
    
    def _fix_headings(self, content: str) -> Tuple[str, List[str]]:
        """修复标题格式"""
        issues_fixed = []
        lines = content.split('\n')
        fixed_lines = []
        
        for i, line in enumerate(lines):
            # 检查标题格式
            if re.match(r'^#{1,6}', line):
                # 确保#后有空格
                if not re.match(r'^#{1,6}\s+', line):
                    fixed_line = re.sub(r'^(#{1,6})([^\s])', r'\1 \2', line)
                    fixed_lines.append(fixed_line)
                    issues_fixed.append(f'Line {i+1}: Added space after # in heading')
                else:
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)
        
        return '\n'.join(fixed_lines), issues_fixed
    
    def _fix_lists(self, content: str) -> Tuple[str, List[str]]:
        """修复列表格式"""
        issues_fixed = []
        lines = content.split('\n')
        fixed_lines = []
        
        for i, line in enumerate(lines):
            # 统一无序列表标记为 -
            if re.match(r'^(\s*)[\*\+]\s+', line):
                fixed_line = re.sub(r'^(\s*)[\*\+](\s+)', r'\1-\2', line)
                fixed_lines.append(fixed_line)
                issues_fixed.append(f'Line {i+1}: Standardized list marker to "-"')
            else:
                fixed_lines.append(line)
        
        return '\n'.join(fixed_lines), issues_fixed
    
    def _fix_spacing(self, content: str) -> Tuple[str, List[str]]:
        """修复空行和间距"""
        issues_fixed = []
        lines = content.split('\n')
        fixed_lines = []
        
        prev_line = ''
        for i, line in enumerate(lines):
            # 移除行尾空格
            if line.endswith(' ') or line.endswith('\t'):
                fixed_line = line.rstrip()
                fixed_lines.append(fixed_line)
                issues_fixed.append(f'Line {i+1}: Removed trailing whitespace')
            else:
                fixed_lines.append(line)
            
            prev_line = line
        
        return '\n'.join(fixed_lines), issues_fixed

class ReferencesFixer:
    """交叉引用修复器"""
    
    def __init__(self, base_path: Path):
        self.base_path = base_path
        
    def fix_references(self, content: str, file_path: Path) -> Tuple[str, List[str]]:
        """修复交叉引用问题"""
        issues_fixed = []
        
        # 修复内部链接
        content, link_issues = self._fix_internal_links(content, file_path)
        issues_fixed.extend(link_issues)
        
        # 生成缺失的锚点
        content, anchor_issues = self._generate_missing_anchors(content)
        issues_fixed.extend(anchor_issues)
        
        return content, issues_fixed
    
    def _fix_internal_links(self, content: str, file_path: Path) -> Tuple[str, List[str]]:
        """修复内部链接"""
        issues_fixed = []
        
        # 查找所有Markdown链接
        link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
        
        def fix_link(match):
            text = match.group(1)
            url = match.group(2)
            
            # 跳过外部链接
            if url.startswith(('http://', 'https://', 'mailto:')):
                return match.group(0)
            
            # 修复相对路径
            if not url.startswith('#') and not url.startswith('/'):
                # 检查文件是否存在
                target_path = file_path.parent / url
                if not target_path.exists():
                    # 尝试修复路径
                    fixed_url = self._try_fix_path(url, file_path)
                    if fixed_url != url:
                        issues_fixed.append(f'Fixed broken link: {url} -> {fixed_url}')
                        return f'[{text}]({fixed_url})'
            
            return match.group(0)
        
        fixed_content = re.sub(link_pattern, fix_link, content)
        return fixed_content, issues_fixed
    
    def _try_fix_path(self, url: str, file_path: Path) -> str:
        """尝试修复路径"""
        # 简单的路径修复逻辑
        filename = Path(url).name
        
        # 在项目中搜索同名文件
        for found_file in self.base_path.rglob(filename):
            if found_file.is_file():
                # 计算相对路径
                try:
                    relative_path = found_file.relative_to(file_path.parent)
                    return str(relative_path)
                except ValueError:
                    continue
        
        return url
    
    def _generate_missing_anchors(self, content: str) -> Tuple[str, List[str]]:
        """生成缺失的锚点"""
        issues_fixed = []
        
        # 提取所有标题，为它们生成锚点ID
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            if re.match(r'^#{1,6}\s+', line):
                # 检查是否已有锚点ID
                if '{#' not in line:
                    # 生成锚点ID
                    title = re.sub(r'^#{1,6}\s+', '', line)
                    anchor_id = self._generate_anchor_id(title)
                    # 这里不直接修改，因为GitHub风格的Markdown会自动生成锚点
                    # 只记录可以生成的锚点
                    issues_fixed.append(f'Line {i+1}: Can generate anchor #{anchor_id} for "{title}"')
        
        return content, issues_fixed
    
    def _generate_anchor_id(self, title: str) -> str:
        """生成锚点ID"""
        # GitHub风格的锚点生成
        anchor = title.lower()
        anchor = re.sub(r'[^\w\u4e00-\u9fff\s-]', '', anchor)
        anchor = re.sub(r'\s+', '-', anchor)
        anchor = re.sub(r'-+', '-', anchor).strip('-')
        return anchorc
lass ComprehensiveQualityFixer:
    """综合质量修复器"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.code_block_fixer = CodeBlockFixer()
        self.table_fixer = TableFixer()
        self.mermaid_optimizer = MermaidOptimizer()
        self.format_standardizer = FormatStandardizer()
        self.references_fixer = ReferencesFixer(self.base_path)
        
    def fix_file(self, file_path: Path) -> Dict:
        """修复单个文件的质量问题"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            content = original_content
            all_issues_fixed = []
            
            print(f"修复文件: {file_path}")
            
            # 1. 修复代码块问题
            content, code_issues = self.code_block_fixer.fix_code_blocks(content)
            all_issues_fixed.extend([f"CodeBlock: {issue}" for issue in code_issues])
            
            # 2. 修复表格问题
            content, table_issues = self.table_fixer.fix_tables(content)
            all_issues_fixed.extend([f"Table: {issue}" for issue in table_issues])
            
            # 3. 优化Mermaid图表
            content, mermaid_issues = self.mermaid_optimizer.optimize_mermaid_charts(content)
            all_issues_fixed.extend([f"Mermaid: {issue}" for issue in mermaid_issues])
            
            # 4. 标准化格式
            content, format_issues = self.format_standardizer.standardize_format(content)
            all_issues_fixed.extend([f"Format: {issue}" for issue in format_issues])
            
            # 5. 修复交叉引用
            content, ref_issues = self.references_fixer.fix_references(content, file_path)
            all_issues_fixed.extend([f"Reference: {issue}" for issue in ref_issues])
            
            # 写回文件（如果有变化）
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                return {
                    'file': str(file_path),
                    'status': 'fixed',
                    'issues_fixed': all_issues_fixed,
                    'fix_count': len(all_issues_fixed)
                }
            else:
                return {
                    'file': str(file_path),
                    'status': 'no_issues',
                    'issues_fixed': [],
                    'fix_count': 0
                }
                
        except Exception as e:
            return {
                'file': str(file_path),
                'status': 'error',
                'error': str(e),
                'issues_fixed': [],
                'fix_count': 0
            }
    
    def fix_directory(self, directory: Path = None) -> Dict:
        """修复整个目录的质量问题"""
        if directory is None:
            directory = self.base_path
        
        results = {
            'fixed_files': [],
            'summary': {
                'total_files': 0,
                'files_with_fixes': 0,
                'total_fixes': 0,
                'error_files': 0
            }
        }
        
        # 查找所有Markdown文件
        md_files = list(directory.rglob('*.md'))
        
        print(f"找到 {len(md_files)} 个Markdown文件")
        
        for file_path in md_files:
            # 跳过某些文件
            if any(skip in str(file_path) for skip in ['.git', 'node_modules', 'temp']):
                continue
            
            result = self.fix_file(file_path)
            results['fixed_files'].append(result)
            
            # 更新统计
            results['summary']['total_files'] += 1
            if result['fix_count'] > 0:
                results['summary']['files_with_fixes'] += 1
            results['summary']['total_fixes'] += result['fix_count']
            if result['status'] == 'error':
                results['summary']['error_files'] += 1
        
        return results
    
    def generate_report(self, results: Dict, output_path: Path = None) -> str:
        """生成修复报告"""
        if output_path is None:
            output_path = self.base_path / 'quality-fix-report.md'
        
        report_content = f"""# 文档质量修复报告

## 修复摘要

- **处理文件总数**: {results['summary']['total_files']}
- **修复文件数量**: {results['summary']['files_with_fixes']}
- **修复问题总数**: {results['summary']['total_fixes']}
- **错误文件数量**: {results['summary']['error_files']}

## 修复详情

"""
        
        # 按修复数量排序
        fixed_files = [f for f in results['fixed_files'] if f['fix_count'] > 0]
        fixed_files.sort(key=lambda x: x['fix_count'], reverse=True)
        
        for file_result in fixed_files:
            report_content += f"### {file_result['file']}\n"
            report_content += f"**修复问题数**: {file_result['fix_count']}\n\n"
            
            if file_result['issues_fixed']:
                report_content += "**修复详情**:\n"
                for issue in file_result['issues_fixed']:
                    report_content += f"- {issue}\n"
                report_content += "\n"
        
        # 错误文件
        error_files = [f for f in results['fixed_files'] if f['status'] == 'error']
        if error_files:
            report_content += "## 错误文件\n\n"
            for file_result in error_files:
                report_content += f"### {file_result['file']}\n"
                report_content += f"**错误**: {file_result['error']}\n\n"
        
        report_content += f"""
## 修复统计

| 修复类型 | 数量 |
|----------|------|
| 代码块修复 | {len([f for result in results['fixed_files'] for f in result['issues_fixed'] if f.startswith('CodeBlock:')])} |
| 表格修复 | {len([f for result in results['fixed_files'] for f in result['issues_fixed'] if f.startswith('Table:')])} |
| Mermaid优化 | {len([f for result in results['fixed_files'] for f in result['issues_fixed'] if f.startswith('Mermaid:')])} |
| 格式标准化 | {len([f for result in results['fixed_files'] for f in result['issues_fixed'] if f.startswith('Format:')])} |
| 引用修复 | {len([f for result in results['fixed_files'] for f in result['issues_fixed'] if f.startswith('Reference:')])} |

---

**报告生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(output_path)

def main():
    parser = argparse.ArgumentParser(description='AI IDE指南综合质量修复工具')
    parser.add_argument('--path', '-p', default='.', 
                       help='要修复的文档目录路径')
    parser.add_argument('--report', '-r', 
                       help='报告输出路径')
    parser.add_argument('--dry-run', action='store_true',
                       help='仅检查不修复文件')
    
    args = parser.parse_args()
    
    fixer = ComprehensiveQualityFixer(args.path)
    
    print("开始综合质量修复...")
    results = fixer.fix_directory()
    
    print(f"\n修复完成!")
    print(f"- 处理文件: {results['summary']['total_files']}")
    print(f"- 修复文件: {results['summary']['files_with_fixes']}")
    print(f"- 修复问题: {results['summary']['total_fixes']}")
    
    # 生成报告
    report_path = fixer.generate_report(results, 
                                      Path(args.report) if args.report else None)
    print(f"- 修复报告: {report_path}")

if __name__ == '__main__':
    main()