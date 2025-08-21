#!/usr/bin/env python3
"""
文档样式验证脚本
验证AI IDE指南v2.0项目中所有文档是否符合样式规范
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Tuple
import argparse

class StyleValidator:
    """文档样式验证器"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.validation_rules = self.load_validation_rules()
        self.validation_results = []
        
    def load_validation_rules(self) -> Dict:
        """加载验证规则"""
        return {
            "heading_rules": {
                "h1_should_be_chapter": True,
                "heading_should_have_space_after_hash": True,
                "heading_should_have_empty_line_before": True,
                "heading_should_have_empty_line_after": True,
                "heading_levels_should_be_sequential": True
            },
            "list_rules": {
                "unordered_lists_should_use_dash": True,
                "ordered_lists_should_be_numbered_correctly": True,
                "list_items_should_have_consistent_indentation": True,
                "task_lists_should_use_standard_format": True
            },
            "table_rules": {
                "tables_should_have_header_separator": True,
                "table_cells_should_be_padded": True,
                "tables_should_have_empty_lines_around": True
            },
            "code_rules": {
                "code_blocks_should_specify_language": True,
                "code_blocks_should_have_empty_lines_around": True,
                "inline_code_should_use_backticks": True
            },
            "link_rules": {
                "links_should_use_standard_format": True,
                "internal_links_should_exist": True,
                "image_files_should_exist": True
            },
            "content_rules": {
                "lines_should_not_be_too_long": 120,
                "should_not_have_trailing_whitespace": True,
                "should_use_consistent_terminology": True
            }
        }
    
    def validate_headings(self, content: str, file_path: Path) -> List[Dict]:
        """验证标题格式"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            if re.match(r'^#{1,6}', line):
                # 检查#后是否有空格
                if not re.match(r'^#{1,6}\s+', line):
                    issues.append({
                        'type': 'heading_format',
                        'line': i + 1,
                        'message': '标题#后应该有空格',
                        'content': line.strip()
                    })
                
                # 检查标题前是否有空行
                if i > 0 and lines[i-1].strip() != '':
                    issues.append({
                        'type': 'heading_spacing',
                        'line': i + 1,
                        'message': '标题前应该有空行',
                        'content': line.strip()
                    })
                
                # 检查标题后是否有空行
                if i < len(lines) - 1 and lines[i+1].strip() != '' and not re.match(r'^#{1,6}', lines[i+1]):
                    issues.append({
                        'type': 'heading_spacing',
                        'line': i + 1,
                        'message': '标题后应该有空行',
                        'content': line.strip()
                    })
        
        # 检查标题层级是否连续
        heading_levels = []
        for line in lines:
            match = re.match(r'^(#{1,6})\s+', line)
            if match:
                heading_levels.append(len(match.group(1)))
        
        for i in range(1, len(heading_levels)):
            if heading_levels[i] > heading_levels[i-1] + 1:
                issues.append({
                    'type': 'heading_level',
                    'line': 0,
                    'message': f'标题层级跳跃：从{heading_levels[i-1]}级跳到{heading_levels[i]}级',
                    'content': ''
                })
        
        return issues
    
    def validate_lists(self, content: str, file_path: Path) -> List[Dict]:
        """验证列表格式"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            # 检查无序列表标记
            if re.match(r'^(\s*)[-*+]\s+', line):
                match = re.match(r'^(\s*)([-*+])\s+', line)
                indent, marker = match.groups()
                
                if marker != '-':
                    issues.append({
                        'type': 'list_marker',
                        'line': i + 1,
                        'message': '无序列表应使用"-"作为标记',
                        'content': line.strip()
                    })
                
                # 检查缩进是否为2的倍数
                if len(indent) % 2 != 0:
                    issues.append({
                        'type': 'list_indentation',
                        'line': i + 1,
                        'message': '列表缩进应为2的倍数',
                        'content': line.strip()
                    })
            
            # 检查有序列表编号
            elif re.match(r'^(\s*)\d+\.\s+', line):
                # 这里可以添加有序列表编号连续性检查
                pass
            
            # 检查任务列表格式
            elif re.match(r'^(\s*)- \[[ x]\]\s+', line):
                if not re.match(r'^(\s*)- \[([ x])\]\s+', line):
                    issues.append({
                        'type': 'task_list_format',
                        'line': i + 1,
                        'message': '任务列表格式不正确，应为"- [ ]"或"- [x]"',
                        'content': line.strip()
                    })
        
        return issues
    
    def validate_tables(self, content: str, file_path: Path) -> List[Dict]:
        """验证表格格式"""
        issues = []
        lines = content.split('\n')
        in_table = False
        table_start = -1
        
        for i, line in enumerate(lines):
            if '|' in line and line.strip().startswith('|') and line.strip().endswith('|'):
                if not in_table:
                    in_table = True
                    table_start = i
                    
                    # 检查表格前是否有空行
                    if i > 0 and lines[i-1].strip() != '':
                        issues.append({
                            'type': 'table_spacing',
                            'line': i + 1,
                            'message': '表格前应该有空行',
                            'content': line.strip()
                        })
                
                # 检查表格格式
                cells = line.split('|')[1:-1]
                for j, cell in enumerate(cells):
                    if not cell.startswith(' ') or not cell.endswith(' '):
                        issues.append({
                            'type': 'table_cell_padding',
                            'line': i + 1,
                            'message': '表格单元格应该有空格填充',
                            'content': line.strip()
                        })
                        break
            else:
                if in_table:
                    in_table = False
                    # 检查表格后是否有空行
                    if line.strip() != '':
                        issues.append({
                            'type': 'table_spacing',
                            'line': i,
                            'message': '表格后应该有空行',
                            'content': lines[i-1].strip()
                        })
        
        return issues
    
    def validate_code_blocks(self, content: str, file_path: Path) -> List[Dict]:
        """验证代码块格式"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            if line.strip().startswith('```'):
                # 检查代码块前是否有空行
                if i > 0 and lines[i-1].strip() != '':
                    issues.append({
                        'type': 'code_block_spacing',
                        'line': i + 1,
                        'message': '代码块前应该有空行',
                        'content': line.strip()
                    })
                
                # 检查是否指定了语言
                if line.strip() == '```':
                    # 查找对应的结束标记
                    for j in range(i + 1, len(lines)):
                        if lines[j].strip() == '```':
                            # 检查代码块后是否有空行
                            if j < len(lines) - 1 and lines[j+1].strip() != '':
                                issues.append({
                                    'type': 'code_block_spacing',
                                    'line': j + 2,
                                    'message': '代码块后应该有空行',
                                    'content': lines[j+1].strip()
                                })
                            break
                elif not re.match(r'^```\w+', line.strip()):
                    issues.append({
                        'type': 'code_block_language',
                        'line': i + 1,
                        'message': '代码块应该指定语言类型',
                        'content': line.strip()
                    })
        
        return issues
    
    def validate_links(self, content: str, file_path: Path) -> List[Dict]:
        """验证链接格式"""
        issues = []
        
        # 检查Markdown链接格式
        malformed_links = re.findall(r'\[([^\]]*)\]\s*\(\s*([^)]*)\s*\)', content)
        for match in re.finditer(r'\[([^\]]*)\]\s+\(\s*([^)]*)\s*\)', content):
            line_num = content[:match.start()].count('\n') + 1
            issues.append({
                'type': 'link_format',
                'line': line_num,
                'message': '链接格式不正确，]和(之间不应有空格',
                'content': match.group(0)
            })
        
        # 检查图片链接
        image_links = re.findall(r'!\[([^\]]*)\]\(([^)]+)\)', content)
        for alt_text, img_path in image_links:
            if not img_path.startswith('http') and not img_path.startswith('data:'):
                target_path = file_path.parent / img_path
                if not target_path.exists():
                    line_num = content.find(f'![{alt_text}]({img_path})').count('\n') + 1
                    issues.append({
                        'type': 'missing_image',
                        'line': line_num,
                        'message': f'图片文件不存在: {img_path}',
                        'content': f'![{alt_text}]({img_path})'
                    })
        
        return issues
    
    def validate_content_quality(self, content: str, file_path: Path) -> List[Dict]:
        """验证内容质量"""
        issues = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            # 检查行长度
            if len(line) > self.validation_rules['content_rules']['lines_should_not_be_too_long']:
                issues.append({
                    'type': 'line_too_long',
                    'line': i + 1,
                    'message': f'行长度超过{self.validation_rules["content_rules"]["lines_should_not_be_too_long"]}字符',
                    'content': line[:50] + '...' if len(line) > 50 else line
                })
            
            # 检查行尾空格
            if line.endswith(' ') or line.endswith('\t'):
                issues.append({
                    'type': 'trailing_whitespace',
                    'line': i + 1,
                    'message': '行尾有多余的空格或制表符',
                    'content': repr(line)
                })
        
        return issues
    
    def validate_terminology(self, content: str, file_path: Path) -> List[Dict]:
        """验证术语使用一致性"""
        issues = []
        
        # 定义术语映射
        terminology_map = {
            'AI IDE': ['ai ide', 'AI-IDE', 'ai-ide'],
            'GitHub Copilot': ['github copilot', 'Github Copilot'],
            'ROI': ['roi', 'R.O.I.'],
            '代码生成': ['代码自动生成', '自动代码生成'],
            '智能补全': ['自动补全', '代码补全']
        }
        
        for standard_term, variants in terminology_map.items():
            for variant in variants:
                if variant in content:
                    # 找到所有匹配位置
                    for match in re.finditer(re.escape(variant), content, re.IGNORECASE):
                        line_num = content[:match.start()].count('\n') + 1
                        issues.append({
                            'type': 'terminology_inconsistency',
                            'line': line_num,
                            'message': f'术语不一致：应使用"{standard_term}"而不是"{variant}"',
                            'content': variant
                        })
        
        return issues
    
    def validate_file(self, file_path: Path) -> Dict:
        """验证单个文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            all_issues = []
            
            # 应用各种验证规则
            all_issues.extend(self.validate_headings(content, file_path))
            all_issues.extend(self.validate_lists(content, file_path))
            all_issues.extend(self.validate_tables(content, file_path))
            all_issues.extend(self.validate_code_blocks(content, file_path))
            all_issues.extend(self.validate_links(content, file_path))
            all_issues.extend(self.validate_content_quality(content, file_path))
            all_issues.extend(self.validate_terminology(content, file_path))
            
            return {
                'file': str(file_path),
                'status': 'success',
                'issues': all_issues,
                'issue_count': len(all_issues)
            }
            
        except Exception as e:
            return {
                'file': str(file_path),
                'status': 'error',
                'error': str(e),
                'issues': [],
                'issue_count': 0
            }
    
    def validate_directory(self, directory: Path = None) -> Dict:
        """验证整个目录"""
        if directory is None:
            directory = self.base_path
        
        results = {
            'validated_files': [],
            'summary': {
                'total_files': 0,
                'files_with_issues': 0,
                'total_issues': 0,
                'error_files': 0,
                'issue_types': {}
            }
        }
        
        # 查找所有Markdown文件
        md_files = list(directory.rglob('*.md'))
        
        for file_path in md_files:
            # 跳过某些文件
            if any(skip in str(file_path) for skip in ['.git', 'node_modules', 'temp']):
                continue
            
            result = self.validate_file(file_path)
            results['validated_files'].append(result)
            
            # 更新统计
            results['summary']['total_files'] += 1
            if result['issue_count'] > 0:
                results['summary']['files_with_issues'] += 1
            results['summary']['total_issues'] += result['issue_count']
            if result['status'] == 'error':
                results['summary']['error_files'] += 1
            
            # 统计问题类型
            for issue in result['issues']:
                issue_type = issue['type']
                if issue_type not in results['summary']['issue_types']:
                    results['summary']['issue_types'][issue_type] = 0
                results['summary']['issue_types'][issue_type] += 1
        
        return results
    
    def generate_validation_report(self, results: Dict, output_path: Path = None) -> str:
        """生成验证报告"""
        if output_path is None:
            output_path = self.base_path / 'style-validation-report.md'
        
        report_content = f"""# 文档样式验证报告

## 验证摘要

- **验证文件总数**: {results['summary']['total_files']}
- **有问题的文件**: {results['summary']['files_with_issues']}
- **问题总数**: {results['summary']['total_issues']}
- **错误文件数**: {results['summary']['error_files']}

## 问题类型统计

"""
        
        for issue_type, count in sorted(results['summary']['issue_types'].items()):
            report_content += f"- **{issue_type}**: {count}个\n"
        
        report_content += "\n## 详细问题列表\n\n"
        
        for file_result in results['validated_files']:
            if file_result['issue_count'] > 0:
                report_content += f"### {file_result['file']}\n"
                report_content += f"**问题数量**: {file_result['issue_count']}\n\n"
                
                # 按类型分组问题
                issues_by_type = {}
                for issue in file_result['issues']:
                    issue_type = issue['type']
                    if issue_type not in issues_by_type:
                        issues_by_type[issue_type] = []
                    issues_by_type[issue_type].append(issue)
                
                for issue_type, issues in issues_by_type.items():
                    report_content += f"#### {issue_type}\n"
                    for issue in issues:
                        report_content += f"- **行 {issue['line']}**: {issue['message']}\n"
                        if issue['content']:
                            report_content += f"  ```\n  {issue['content']}\n  ```\n"
                    report_content += "\n"
        
        report_content += f"""
## 验证规则说明

### 标题规则
- 标题#后应该有空格
- 标题前后应该有空行
- 标题层级应该连续，不能跳跃

### 列表规则
- 无序列表统一使用"-"标记
- 列表缩进应为2的倍数
- 任务列表使用标准格式"- [ ]"或"- [x]"

### 表格规则
- 表格前后应该有空行
- 表格单元格应该有空格填充
- 表格应该有标准的分隔行

### 代码块规则
- 代码块前后应该有空行
- 代码块应该指定语言类型
- 使用标准的三个反引号格式

### 链接规则
- 使用标准的Markdown链接格式
- 图片文件应该存在
- 内部链接应该有效

### 内容质量规则
- 行长度不应超过120字符
- 不应有行尾空格
- 术语使用应该一致

---

**报告生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(output_path)

def main():
    parser = argparse.ArgumentParser(description='AI IDE指南文档样式验证工具')
    parser.add_argument('--path', '-p', default='ai-ide-guide-v2', 
                       help='要验证的文档目录路径')
    parser.add_argument('--report', '-r', 
                       help='报告输出路径')
    parser.add_argument('--strict', action='store_true',
                       help='严格模式，所有问题都视为错误')
    
    args = parser.parse_args()
    
    validator = StyleValidator(args.path)
    
    print("开始文档样式验证...")
    results = validator.validate_directory()
    
    print(f"\n验证完成!")
    print(f"- 验证文件: {results['summary']['total_files']}")
    print(f"- 有问题文件: {results['summary']['files_with_issues']}")
    print(f"- 问题总数: {results['summary']['total_issues']}")
    
    if results['summary']['issue_types']:
        print("\n问题类型分布:")
        for issue_type, count in sorted(results['summary']['issue_types'].items()):
            print(f"  - {issue_type}: {count}")
    
    # 生成报告
    report_path = validator.generate_validation_report(results, 
                                                     Path(args.report) if args.report else None)
    print(f"\n验证报告已生成: {report_path}")

if __name__ == '__main__':
    main()