#!/usr/bin/env python3
"""
图表质量验证脚本
验证AI IDE指南v2.0项目中所有图表的质量和可读性
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Set, Tuple
import argparse

class ChartQualityValidator:
    """图表质量验证器"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.chart_standards = self.load_chart_standards()
        self.validation_results = []
        
    def load_chart_standards(self) -> Dict:
        """加载图表标准"""
        return {
            "mermaid_standards": {
                "required_elements": ["title", "style", "proper_syntax"],
                "max_nodes": 20,
                "min_nodes": 3,
                "color_scheme": {
                    "primary": "#2563eb",
                    "secondary": "#10b981", 
                    "accent": "#f59e0b",
                    "neutral": "#6b7280"
                }
            },
            "table_standards": {
                "min_columns": 2,
                "max_columns": 8,
                "header_required": True,
                "alignment_consistent": True,
                "cell_padding": True
            },
            "image_standards": {
                "supported_formats": [".png", ".jpg", ".jpeg", ".svg", ".gif"],
                "max_file_size": 5 * 1024 * 1024,  # 5MB
                "min_width": 300,
                "recommended_width": 800
            },
            "accessibility_standards": {
                "alt_text_required": True,
                "alt_text_min_length": 10,
                "alt_text_max_length": 125,
                "descriptive_captions": True
            }
        }
    
    def extract_mermaid_charts(self, content: str, file_path: Path) -> List[Dict]:
        """提取Mermaid图表"""
        charts = []
        
        # 查找Mermaid代码块
        pattern = r'```mermaid\s*\n(.*?)\n```'
        matches = re.finditer(pattern, content, re.DOTALL)
        
        for match in matches:
            chart_content = match.group(1).strip()
            start_line = content[:match.start()].count('\n') + 1
            
            charts.append({
                'type': 'mermaid',
                'content': chart_content,
                'line': start_line,
                'file': str(file_path),
                'raw': match.group(0)
            })
        
        return charts
    
    def extract_tables(self, content: str, file_path: Path) -> List[Dict]:
        """提取表格"""
        tables = []
        lines = content.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # 检测表格开始
            if '|' in line and line.startswith('|') and line.endswith('|'):
                table_lines = []
                table_start = i + 1
                
                # 收集表格行
                while i < len(lines) and '|' in lines[i] and lines[i].strip().startswith('|'):
                    table_lines.append(lines[i])
                    i += 1
                
                if len(table_lines) >= 2:  # 至少有标题和分隔行
                    tables.append({
                        'type': 'table',
                        'lines': table_lines,
                        'line': table_start,
                        'file': str(file_path),
                        'raw': '\n'.join(table_lines)
                    })
                
                continue
            
            i += 1
        
        return tables
    
    def extract_images(self, content: str, file_path: Path) -> List[Dict]:
        """提取图片"""
        images = []
        
        # Markdown图片
        for match in re.finditer(r'!\[([^\]]*)\]\(([^)]+)\)', content):
            alt_text = match.group(1)
            src = match.group(2)
            line_num = content[:match.start()].count('\n') + 1
            
            images.append({
                'type': 'markdown_image',
                'alt': alt_text,
                'src': src,
                'line': line_num,
                'file': str(file_path),
                'raw': match.group(0)
            })
        
        # HTML图片
        for match in re.finditer(r'<img[^>]+>', content, re.IGNORECASE):
            line_num = content[:match.start()].count('\n') + 1
            img_tag = match.group(0)
            
            # 提取src属性
            src_match = re.search(r'src=["\']([^"\']+)["\']', img_tag, re.IGNORECASE)
            src = src_match.group(1) if src_match else ''
            
            # 提取alt属性
            alt_match = re.search(r'alt=["\']([^"\']*)["\']', img_tag, re.IGNORECASE)
            alt_text = alt_match.group(1) if alt_match else ''
            
            images.append({
                'type': 'html_image',
                'alt': alt_text,
                'src': src,
                'line': line_num,
                'file': str(file_path),
                'raw': img_tag
            })
        
        return images
    
    def validate_mermaid_chart(self, chart: Dict) -> List[Dict]:
        """验证Mermaid图表质量"""
        issues = []
        content = chart['content']
        
        # 检查图表类型
        chart_type = self.detect_mermaid_type(content)
        if not chart_type:
            issues.append({
                'type': 'mermaid_unknown_type',
                'severity': 'error',
                'message': '无法识别Mermaid图表类型',
                'line': chart['line'],
                'file': chart['file']
            })
            return issues
        
        # 检查语法基础结构
        if not self.validate_mermaid_syntax(content, chart_type):
            issues.append({
                'type': 'mermaid_syntax_error',
                'severity': 'error',
                'message': f'{chart_type}图表语法错误',
                'line': chart['line'],
                'file': chart['file']
            })
        
        # 检查节点数量
        node_count = self.count_mermaid_nodes(content, chart_type)
        if node_count < self.chart_standards['mermaid_standards']['min_nodes']:
            issues.append({
                'type': 'mermaid_too_few_nodes',
                'severity': 'warning',
                'message': f'图表节点过少({node_count}个)，建议至少{self.chart_standards["mermaid_standards"]["min_nodes"]}个',
                'line': chart['line'],
                'file': chart['file']
            })
        elif node_count > self.chart_standards['mermaid_standards']['max_nodes']:
            issues.append({
                'type': 'mermaid_too_many_nodes',
                'severity': 'warning',
                'message': f'图表节点过多({node_count}个)，建议不超过{self.chart_standards["mermaid_standards"]["max_nodes"]}个',
                'line': chart['line'],
                'file': chart['file']
            })
        
        # 检查样式定义
        if not self.has_mermaid_styles(content):
            issues.append({
                'type': 'mermaid_no_styles',
                'severity': 'info',
                'message': '建议为图表添加样式定义以提高可读性',
                'line': chart['line'],
                'file': chart['file']
            })
        
        # 检查颜色使用
        color_issues = self.validate_mermaid_colors(content)
        issues.extend([{**issue, 'line': chart['line'], 'file': chart['file']} for issue in color_issues])
        
        # 检查可读性
        readability_issues = self.validate_mermaid_readability(content, chart_type)
        issues.extend([{**issue, 'line': chart['line'], 'file': chart['file']} for issue in readability_issues])
        
        return issues
    
    def detect_mermaid_type(self, content: str) -> str:
        """检测Mermaid图表类型"""
        content_lower = content.lower().strip()
        
        if content_lower.startswith('graph'):
            return 'flowchart'
        elif content_lower.startswith('sequencediagram'):
            return 'sequence'
        elif content_lower.startswith('gantt'):
            return 'gantt'
        elif content_lower.startswith('pie'):
            return 'pie'
        elif content_lower.startswith('classDiagram'):
            return 'class'
        elif content_lower.startswith('stateDiagram'):
            return 'state'
        elif content_lower.startswith('erDiagram'):
            return 'er'
        elif 'flowchart' in content_lower:
            return 'flowchart'
        else:
            return None
    
    def validate_mermaid_syntax(self, content: str, chart_type: str) -> bool:
        """验证Mermaid语法"""
        try:
            lines = content.strip().split('\n')
            
            if chart_type == 'flowchart':
                # 检查流程图语法
                for line in lines[1:]:  # 跳过第一行的图表类型声明
                    line = line.strip()
                    if not line or line.startswith('style'):
                        continue
                    
                    # 基本的节点和连接语法检查
                    if '-->' in line or '---' in line:
                        continue
                    elif re.match(r'^[A-Za-z0-9_]+(\[.*?\])?$', line):
                        continue
                    elif re.match(r'^[A-Za-z0-9_]+\s*-->\s*[A-Za-z0-9_]+', line):
                        continue
                    else:
                        # 可能是复杂语法，暂时通过
                        pass
            
            elif chart_type == 'sequence':
                # 检查时序图语法
                for line in lines[1:]:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # 基本的参与者和消息语法检查
                    if 'participant' in line or '-->' in line or '->>' in line:
                        continue
            
            # 其他图表类型的基本检查
            return True
            
        except Exception:
            return False
    
    def count_mermaid_nodes(self, content: str, chart_type: str) -> int:
        """计算Mermaid图表中的节点数量"""
        if chart_type == 'flowchart':
            # 统计流程图节点
            nodes = set()
            lines = content.split('\n')
            
            for line in lines:
                line = line.strip()
                if '-->' in line:
                    # 解析连接线
                    parts = re.split(r'-->', line)
                    for part in parts:
                        node = re.sub(r'\[.*?\]|\(.*?\)|\{.*?\}', '', part).strip()
                        if node:
                            nodes.add(node)
                elif re.match(r'^[A-Za-z0-9_]+(\[.*?\])?', line):
                    # 单独的节点定义
                    node = re.match(r'^([A-Za-z0-9_]+)', line).group(1)
                    nodes.add(node)
            
            return len(nodes)
        
        elif chart_type == 'sequence':
            # 统计时序图参与者
            participants = set()
            lines = content.split('\n')
            
            for line in lines:
                if 'participant' in line:
                    match = re.search(r'participant\s+(\w+)', line)
                    if match:
                        participants.add(match.group(1))
                elif '-->' in line or '->>' in line:
                    # 解析消息
                    parts = re.split(r'-->|->>', line)
                    for part in parts[:2]:  # 只取发送者和接收者
                        participant = part.strip().split()[0]
                        if participant:
                            participants.add(participant)
            
            return len(participants)
        
        else:
            # 其他类型的简单估算
            return len([line for line in content.split('\n') if line.strip() and not line.strip().startswith('style')])
    
    def has_mermaid_styles(self, content: str) -> bool:
        """检查是否有样式定义"""
        return 'style' in content.lower() or 'fill:' in content.lower()
    
    def validate_mermaid_colors(self, content: str) -> List[Dict]:
        """验证Mermaid颜色使用"""
        issues = []
        
        # 提取颜色定义
        color_matches = re.findall(r'fill:(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\w+)', content)
        
        standard_colors = set(self.chart_standards['mermaid_standards']['color_scheme'].values())
        
        for color in color_matches:
            if color.startswith('#'):
                # 检查是否使用了标准颜色
                if color.lower() not in [c.lower() for c in standard_colors]:
                    issues.append({
                        'type': 'mermaid_non_standard_color',
                        'severity': 'info',
                        'message': f'使用了非标准颜色: {color}，建议使用标准配色方案'
                    })
        
        return issues
    
    def validate_mermaid_readability(self, content: str, chart_type: str) -> List[Dict]:
        """验证Mermaid图表可读性"""
        issues = []
        
        # 检查节点标签长度
        if chart_type == 'flowchart':
            labels = re.findall(r'\[([^\]]+)\]', content)
            for label in labels:
                if len(label) > 30:
                    issues.append({
                        'type': 'mermaid_long_label',
                        'severity': 'warning',
                        'message': f'节点标签过长: "{label[:20]}..."，建议控制在30字符以内'
                    })
                elif len(label) < 3:
                    issues.append({
                        'type': 'mermaid_short_label',
                        'severity': 'info',
                        'message': f'节点标签过短: "{label}"，建议使用更描述性的标签'
                    })
        
        # 检查是否有方向定义
        if chart_type == 'flowchart' and not re.search(r'graph\s+(TB|TD|BT|RL|LR)', content):
            issues.append({
                'type': 'mermaid_no_direction',
                'severity': 'info',
                'message': '建议为流程图指定方向(TB/TD/BT/RL/LR)以提高可读性'
            })
        
        return issues
    
    def validate_table(self, table: Dict) -> List[Dict]:
        """验证表格质量"""
        issues = []
        lines = table['lines']
        
        if len(lines) < 2:
            issues.append({
                'type': 'table_too_few_rows',
                'severity': 'error',
                'message': '表格至少需要标题行和分隔行',
                'line': table['line'],
                'file': table['file']
            })
            return issues
        
        # 检查表格结构
        header_line = lines[0]
        separator_line = lines[1] if len(lines) > 1 else ''
        
        # 计算列数
        header_cols = len([col.strip() for col in header_line.split('|')[1:-1] if col.strip()])
        
        # 检查列数
        if header_cols < self.chart_standards['table_standards']['min_columns']:
            issues.append({
                'type': 'table_too_few_columns',
                'severity': 'warning',
                'message': f'表格列数过少({header_cols}列)，建议至少{self.chart_standards["table_standards"]["min_columns"]}列',
                'line': table['line'],
                'file': table['file']
            })
        elif header_cols > self.chart_standards['table_standards']['max_columns']:
            issues.append({
                'type': 'table_too_many_columns',
                'severity': 'warning',
                'message': f'表格列数过多({header_cols}列)，建议不超过{self.chart_standards["table_standards"]["max_columns"]}列',
                'line': table['line'],
                'file': table['file']
            })
        
        # 检查分隔行
        if not re.match(r'^\|(\s*:?-+:?\s*\|)+$', separator_line):
            issues.append({
                'type': 'table_invalid_separator',
                'severity': 'error',
                'message': '表格分隔行格式不正确',
                'line': table['line'] + 1,
                'file': table['file']
            })
        
        # 检查列对齐一致性
        separator_cols = [col.strip() for col in separator_line.split('|')[1:-1] if col.strip()]
        if len(separator_cols) != header_cols:
            issues.append({
                'type': 'table_column_mismatch',
                'severity': 'error',
                'message': '表格标题列数与分隔行列数不匹配',
                'line': table['line'],
                'file': table['file']
            })
        
        # 检查数据行
        for i, line in enumerate(lines[2:], start=2):
            data_cols = len([col.strip() for col in line.split('|')[1:-1] if col.strip()])
            if data_cols != header_cols:
                issues.append({
                    'type': 'table_row_column_mismatch',
                    'severity': 'warning',
                    'message': f'第{i+1}行列数({data_cols})与标题列数({header_cols})不匹配',
                    'line': table['line'] + i,
                    'file': table['file']
                })
        
        # 检查单元格内容
        for i, line in enumerate(lines):
            cells = line.split('|')[1:-1]
            for j, cell in enumerate(cells):
                cell_content = cell.strip()
                
                # 检查单元格是否为空
                if not cell_content and i > 1:  # 跳过分隔行
                    issues.append({
                        'type': 'table_empty_cell',
                        'severity': 'info',
                        'message': f'第{i+1}行第{j+1}列为空',
                        'line': table['line'] + i,
                        'file': table['file']
                    })
                
                # 检查单元格内容长度
                if len(cell_content) > 50:
                    issues.append({
                        'type': 'table_long_cell_content',
                        'severity': 'warning',
                        'message': f'第{i+1}行第{j+1}列内容过长，建议控制在50字符以内',
                        'line': table['line'] + i,
                        'file': table['file']
                    })
        
        return issues
    
    def validate_image(self, image: Dict) -> List[Dict]:
        """验证图片质量"""
        issues = []
        
        # 检查alt文本
        alt_text = image['alt']
        if not alt_text:
            issues.append({
                'type': 'image_no_alt_text',
                'severity': 'error',
                'message': '图片缺少alt文本，影响可访问性',
                'line': image['line'],
                'file': image['file']
            })
        else:
            alt_length = len(alt_text)
            if alt_length < self.chart_standards['accessibility_standards']['alt_text_min_length']:
                issues.append({
                    'type': 'image_alt_text_too_short',
                    'severity': 'warning',
                    'message': f'alt文本过短({alt_length}字符)，建议至少{self.chart_standards["accessibility_standards"]["alt_text_min_length"]}字符',
                    'line': image['line'],
                    'file': image['file']
                })
            elif alt_length > self.chart_standards['accessibility_standards']['alt_text_max_length']:
                issues.append({
                    'type': 'image_alt_text_too_long',
                    'severity': 'warning',
                    'message': f'alt文本过长({alt_length}字符)，建议不超过{self.chart_standards["accessibility_standards"]["alt_text_max_length"]}字符',
                    'line': image['line'],
                    'file': image['file']
                })
        
        # 检查图片文件
        src = image['src']
        if not src.startswith(('http://', 'https://', 'data:')):
            # 本地图片文件检查
            current_dir = Path(image['file']).parent
            image_path = self.base_path / current_dir / src
            
            if image_path.exists():
                # 检查文件格式
                file_ext = image_path.suffix.lower()
                if file_ext not in self.chart_standards['image_standards']['supported_formats']:
                    issues.append({
                        'type': 'image_unsupported_format',
                        'severity': 'warning',
                        'message': f'图片格式{file_ext}可能不被所有浏览器支持',
                        'line': image['line'],
                        'file': image['file']
                    })
                
                # 检查文件大小
                try:
                    file_size = image_path.stat().st_size
                    if file_size > self.chart_standards['image_standards']['max_file_size']:
                        size_mb = file_size / (1024 * 1024)
                        issues.append({
                            'type': 'image_file_too_large',
                            'severity': 'warning',
                            'message': f'图片文件过大({size_mb:.1f}MB)，建议压缩以提高加载速度',
                            'line': image['line'],
                            'file': image['file']
                        })
                except OSError:
                    pass
            else:
                issues.append({
                    'type': 'image_file_not_found',
                    'severity': 'error',
                    'message': f'图片文件不存在: {src}',
                    'line': image['line'],
                    'file': image['file']
                })
        
        return issues
    
    def validate_file(self, file_path: Path) -> Dict:
        """验证单个文件中的图表"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            all_issues = []
            chart_count = 0
            
            # 验证Mermaid图表
            mermaid_charts = self.extract_mermaid_charts(content, file_path)
            chart_count += len(mermaid_charts)
            for chart in mermaid_charts:
                issues = self.validate_mermaid_chart(chart)
                all_issues.extend(issues)
            
            # 验证表格
            tables = self.extract_tables(content, file_path)
            chart_count += len(tables)
            for table in tables:
                issues = self.validate_table(table)
                all_issues.extend(issues)
            
            # 验证图片
            images = self.extract_images(content, file_path)
            chart_count += len(images)
            for image in images:
                issues = self.validate_image(image)
                all_issues.extend(issues)
            
            return {
                'file': str(file_path),
                'status': 'success',
                'chart_count': chart_count,
                'mermaid_count': len(mermaid_charts),
                'table_count': len(tables),
                'image_count': len(images),
                'issues': all_issues,
                'issue_count': len(all_issues)
            }
            
        except Exception as e:
            return {
                'file': str(file_path),
                'status': 'error',
                'error': str(e),
                'chart_count': 0,
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
                'files_with_charts': 0,
                'total_charts': 0,
                'total_mermaid': 0,
                'total_tables': 0,
                'total_images': 0,
                'total_issues': 0,
                'files_with_issues': 0,
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
            if result['chart_count'] > 0:
                results['summary']['files_with_charts'] += 1
            results['summary']['total_charts'] += result['chart_count']
            results['summary']['total_mermaid'] += result.get('mermaid_count', 0)
            results['summary']['total_tables'] += result.get('table_count', 0)
            results['summary']['total_images'] += result.get('image_count', 0)
            results['summary']['total_issues'] += result['issue_count']
            if result['issue_count'] > 0:
                results['summary']['files_with_issues'] += 1
            
            # 统计问题类型
            for issue in result['issues']:
                issue_type = issue['type']
                if issue_type not in results['summary']['issue_types']:
                    results['summary']['issue_types'][issue_type] = 0
                results['summary']['issue_types'][issue_type] += 1
        
        return results
    
    def generate_report(self, results: Dict, output_path: Path = None) -> str:
        """生成图表质量报告"""
        if output_path is None:
            output_path = self.base_path / 'chart-quality-report.md'
        
        report_content = f"""# 图表质量验证报告

## 验证摘要

- **验证文件总数**: {results['summary']['total_files']}
- **包含图表的文件**: {results['summary']['files_with_charts']}
- **图表总数**: {results['summary']['total_charts']}
  - Mermaid图表: {results['summary']['total_mermaid']}
  - 表格: {results['summary']['total_tables']}
  - 图片: {results['summary']['total_images']}
- **问题总数**: {results['summary']['total_issues']}
- **有问题的文件**: {results['summary']['files_with_issues']}

## 问题类型统计

"""
        
        # 按严重程度分组问题
        severity_groups = {'error': [], 'warning': [], 'info': []}
        
        for issue_type, count in sorted(results['summary']['issue_types'].items()):
            # 根据问题类型确定严重程度
            if any(keyword in issue_type for keyword in ['error', 'not_found', 'invalid', 'mismatch']):
                severity = 'error'
            elif any(keyword in issue_type for keyword in ['warning', 'too_', 'long', 'short']):
                severity = 'warning'
            else:
                severity = 'info'
            
            severity_groups[severity].append((issue_type, count))
        
        for severity, issues in severity_groups.items():
            if issues:
                severity_names = {'error': '错误', 'warning': '警告', 'info': '建议'}
                report_content += f"### {severity_names[severity]}\n"
                for issue_type, count in issues:
                    issue_type_names = {
                        'mermaid_syntax_error': 'Mermaid语法错误',
                        'mermaid_too_few_nodes': 'Mermaid节点过少',
                        'mermaid_too_many_nodes': 'Mermaid节点过多',
                        'mermaid_no_styles': 'Mermaid缺少样式',
                        'mermaid_non_standard_color': 'Mermaid非标准颜色',
                        'mermaid_long_label': 'Mermaid标签过长',
                        'mermaid_short_label': 'Mermaid标签过短',
                        'mermaid_no_direction': 'Mermaid缺少方向定义',
                        'table_too_few_rows': '表格行数过少',
                        'table_too_few_columns': '表格列数过少',
                        'table_too_many_columns': '表格列数过多',
                        'table_invalid_separator': '表格分隔行无效',
                        'table_column_mismatch': '表格列数不匹配',
                        'table_row_column_mismatch': '表格行列数不匹配',
                        'table_empty_cell': '表格空单元格',
                        'table_long_cell_content': '表格单元格内容过长',
                        'image_no_alt_text': '图片缺少alt文本',
                        'image_alt_text_too_short': '图片alt文本过短',
                        'image_alt_text_too_long': '图片alt文本过长',
                        'image_unsupported_format': '图片格式不支持',
                        'image_file_too_large': '图片文件过大',
                        'image_file_not_found': '图片文件不存在'
                    }
                    type_name = issue_type_names.get(issue_type, issue_type)
                    report_content += f"- **{type_name}**: {count}个\n"
                report_content += "\n"
        
        report_content += "## 详细问题列表\n\n"
        
        # 按文件分组问题
        files_with_issues = [f for f in results['validated_files'] if f['issue_count'] > 0]
        
        for file_result in files_with_issues:
            report_content += f"### {file_result['file']}\n"
            report_content += f"**图表统计**: Mermaid {file_result.get('mermaid_count', 0)}个, "
            report_content += f"表格 {file_result.get('table_count', 0)}个, "
            report_content += f"图片 {file_result.get('image_count', 0)}个\n"
            report_content += f"**问题数量**: {file_result['issue_count']}\n\n"
            
            # 按类型分组问题
            issues_by_type = {}
            for issue in file_result['issues']:
                issue_type = issue['type']
                if issue_type not in issues_by_type:
                    issues_by_type[issue_type] = []
                issues_by_type[issue_type].append(issue)
            
            for issue_type, issues in issues_by_type.items():
                issue_type_names = {
                    'mermaid_syntax_error': 'Mermaid语法错误',
                    'mermaid_too_few_nodes': 'Mermaid节点过少',
                    'mermaid_too_many_nodes': 'Mermaid节点过多',
                    'mermaid_no_styles': 'Mermaid缺少样式',
                    'mermaid_non_standard_color': 'Mermaid非标准颜色',
                    'mermaid_long_label': 'Mermaid标签过长',
                    'mermaid_short_label': 'Mermaid标签过短',
                    'mermaid_no_direction': 'Mermaid缺少方向定义',
                    'table_too_few_rows': '表格行数过少',
                    'table_too_few_columns': '表格列数过少',
                    'table_too_many_columns': '表格列数过多',
                    'table_invalid_separator': '表格分隔行无效',
                    'table_column_mismatch': '表格列数不匹配',
                    'table_row_column_mismatch': '表格行列数不匹配',
                    'table_empty_cell': '表格空单元格',
                    'table_long_cell_content': '表格单元格内容过长',
                    'image_no_alt_text': '图片缺少alt文本',
                    'image_alt_text_too_short': '图片alt文本过短',
                    'image_alt_text_too_long': '图片alt文本过长',
                    'image_unsupported_format': '图片格式不支持',
                    'image_file_too_large': '图片文件过大',
                    'image_file_not_found': '图片文件不存在'
                }
                type_name = issue_type_names.get(issue_type, issue_type)
                report_content += f"#### {type_name}\n"
                
                for issue in issues:
                    severity_icon = {'error': '❌', 'warning': '⚠️', 'info': 'ℹ️'}
                    icon = severity_icon.get(issue.get('severity', 'info'), 'ℹ️')
                    report_content += f"- {icon} **行 {issue['line']}**: {issue['message']}\n"
                
                report_content += "\n"
        
        report_content += f"""
## 图表质量标准

### Mermaid图表标准
- 节点数量: {self.chart_standards['mermaid_standards']['min_nodes']}-{self.chart_standards['mermaid_standards']['max_nodes']}个
- 必须包含样式定义
- 使用标准配色方案
- 节点标签长度: 3-30字符
- 流程图应指定方向

### 表格标准
- 列数: {self.chart_standards['table_standards']['min_columns']}-{self.chart_standards['table_standards']['max_columns']}列
- 必须有标题行和分隔行
- 单元格内容长度不超过50字符
- 列数保持一致

### 图片标准
- 必须有alt文本
- Alt文本长度: {self.chart_standards['accessibility_standards']['alt_text_min_length']}-{self.chart_standards['accessibility_standards']['alt_text_max_length']}字符
- 支持的格式: {', '.join(self.chart_standards['image_standards']['supported_formats'])}
- 文件大小不超过{self.chart_standards['image_standards']['max_file_size'] // (1024*1024)}MB

## 改进建议

### 提高图表可读性
1. 为Mermaid图表添加样式定义和标准颜色
2. 控制图表复杂度，避免节点过多
3. 使用描述性的节点标签
4. 为流程图指定合适的方向

### 优化表格设计
1. 保持表格结构一致
2. 避免单元格内容过长
3. 使用合适的列数
4. 填充空单元格

### 改善图片质量
1. 为所有图片添加描述性alt文本
2. 优化图片文件大小
3. 使用标准图片格式
4. 确保图片文件存在

---

**报告生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(output_path)

def main():
    parser = argparse.ArgumentParser(description='AI IDE指南图表质量验证工具')
    parser.add_argument('--path', '-p', default='ai-ide-guide-v2', 
                       help='要验证的文档目录路径')
    parser.add_argument('--report', '-r', 
                       help='报告输出路径')
    
    args = parser.parse_args()
    
    validator = ChartQualityValidator(args.path)
    
    print("开始图表质量验证...")
    results = validator.validate_directory()
    
    print(f"\n验证完成!")
    print(f"- 验证文件: {results['summary']['total_files']}")
    print(f"- 包含图表文件: {results['summary']['files_with_charts']}")
    print(f"- 图表总数: {results['summary']['total_charts']}")
    print(f"  - Mermaid: {results['summary']['total_mermaid']}")
    print(f"  - 表格: {results['summary']['total_tables']}")
    print(f"  - 图片: {results['summary']['total_images']}")
    print(f"- 问题总数: {results['summary']['total_issues']}")
    
    if results['summary']['issue_types']:
        print("\n主要问题类型:")
        sorted_issues = sorted(results['summary']['issue_types'].items(), 
                             key=lambda x: x[1], reverse=True)[:5]
        for issue_type, count in sorted_issues:
            print(f"  - {issue_type}: {count}")
    
    # 生成报告
    report_path = validator.generate_report(results, 
                                          Path(args.report) if args.report else None)
    print(f"\n图表质量报告已生成: {report_path}")

if __name__ == '__main__':
    main()