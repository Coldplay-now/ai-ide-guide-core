#!/usr/bin/env python3
"""
设备兼容性测试脚本
测试AI IDE指南v2.0项目中图表在不同设备上的显示效果
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Set, Tuple
import argparse

class DeviceCompatibilityTester:
    """设备兼容性测试器"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.device_profiles = self.load_device_profiles()
        self.compatibility_rules = self.load_compatibility_rules()
        
    def load_device_profiles(self) -> Dict:
        """加载设备配置文件"""
        return {
            "mobile": {
                "screen_width": 375,
                "screen_height": 667,
                "viewport_width": 375,
                "dpr": 2,
                "touch": True,
                "name": "移动设备"
            },
            "tablet": {
                "screen_width": 768,
                "screen_height": 1024,
                "viewport_width": 768,
                "dpr": 2,
                "touch": True,
                "name": "平板设备"
            },
            "desktop": {
                "screen_width": 1920,
                "screen_height": 1080,
                "viewport_width": 1200,
                "dpr": 1,
                "touch": False,
                "name": "桌面设备"
            },
            "large_desktop": {
                "screen_width": 2560,
                "screen_height": 1440,
                "viewport_width": 1600,
                "dpr": 1,
                "touch": False,
                "name": "大屏桌面"
            }
        }
    
    def load_compatibility_rules(self) -> Dict:
        """加载兼容性规则"""
        return {
            "mermaid_rules": {
                "mobile": {
                    "max_nodes": 8,
                    "max_label_length": 15,
                    "recommended_direction": ["TB", "TD"],
                    "avoid_direction": ["LR", "RL"]
                },
                "tablet": {
                    "max_nodes": 15,
                    "max_label_length": 25,
                    "recommended_direction": ["TB", "TD", "LR"],
                    "avoid_direction": []
                },
                "desktop": {
                    "max_nodes": 25,
                    "max_label_length": 40,
                    "recommended_direction": ["TB", "TD", "LR", "RL"],
                    "avoid_direction": []
                }
            },
            "table_rules": {
                "mobile": {
                    "max_columns": 3,
                    "max_cell_length": 20,
                    "scroll_required": True
                },
                "tablet": {
                    "max_columns": 5,
                    "max_cell_length": 30,
                    "scroll_required": False
                },
                "desktop": {
                    "max_columns": 8,
                    "max_cell_length": 50,
                    "scroll_required": False
                }
            },
            "image_rules": {
                "mobile": {
                    "max_width": 375,
                    "responsive_required": True,
                    "alt_text_critical": True
                },
                "tablet": {
                    "max_width": 768,
                    "responsive_required": True,
                    "alt_text_critical": True
                },
                "desktop": {
                    "max_width": 1200,
                    "responsive_required": False,
                    "alt_text_critical": False
                }
            }
        }
    
    def extract_charts_from_file(self, file_path: Path) -> Dict:
        """从文件中提取图表信息"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            charts = {
                'mermaid': [],
                'tables': [],
                'images': []
            }
            
            # 提取Mermaid图表
            mermaid_pattern = r'```mermaid\s*\n(.*?)\n```'
            for match in re.finditer(mermaid_pattern, content, re.DOTALL):
                chart_content = match.group(1).strip()
                line_num = content[:match.start()].count('\n') + 1
                
                charts['mermaid'].append({
                    'content': chart_content,
                    'line': line_num,
                    'type': self.detect_mermaid_type(chart_content),
                    'nodes': self.count_mermaid_nodes(chart_content),
                    'direction': self.extract_mermaid_direction(chart_content),
                    'labels': self.extract_mermaid_labels(chart_content)
                })
            
            # 提取表格
            lines = content.split('\n')
            i = 0
            while i < len(lines):
                line = lines[i].strip()
                if '|' in line and line.startswith('|') and line.endswith('|'):
                    table_lines = []
                    table_start = i + 1
                    
                    while i < len(lines) and '|' in lines[i] and lines[i].strip().startswith('|'):
                        table_lines.append(lines[i])
                        i += 1
                    
                    if len(table_lines) >= 2:
                        header_cols = len([col.strip() for col in table_lines[0].split('|')[1:-1] if col.strip()])
                        max_cell_length = 0
                        
                        for table_line in table_lines:
                            cells = [col.strip() for col in table_line.split('|')[1:-1]]
                            for cell in cells:
                                max_cell_length = max(max_cell_length, len(cell))
                        
                        charts['tables'].append({
                            'lines': table_lines,
                            'line': table_start,
                            'columns': header_cols,
                            'rows': len(table_lines) - 2,  # 减去标题和分隔行
                            'max_cell_length': max_cell_length
                        })
                    continue
                i += 1
            
            # 提取图片
            for match in re.finditer(r'!\[([^\]]*)\]\(([^)]+)\)', content):
                alt_text = match.group(1)
                src = match.group(2)
                line_num = content[:match.start()].count('\n') + 1
                
                charts['images'].append({
                    'alt': alt_text,
                    'src': src,
                    'line': line_num,
                    'is_local': not src.startswith(('http://', 'https://', 'data:'))
                })
            
            return charts
            
        except Exception as e:
            return {'mermaid': [], 'tables': [], 'images': [], 'error': str(e)}
    
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
        elif 'flowchart' in content_lower:
            return 'flowchart'
        else:
            return 'unknown'
    
    def count_mermaid_nodes(self, content: str) -> int:
        """计算Mermaid图表节点数"""
        if 'graph' in content.lower() or 'flowchart' in content.lower():
            nodes = set()
            lines = content.split('\n')
            
            for line in lines:
                line = line.strip()
                if '-->' in line:
                    parts = re.split(r'-->', line)
                    for part in parts:
                        node = re.sub(r'\[.*?\]|\(.*?\)|\{.*?\}', '', part).strip()
                        if node and not node.startswith('style'):
                            nodes.add(node)
                elif re.match(r'^[A-Za-z0-9_]+(\[.*?\])?', line):
                    node = re.match(r'^([A-Za-z0-9_]+)', line).group(1)
                    nodes.add(node)
            
            return len(nodes)
        
        return len([line for line in content.split('\n') if line.strip() and not line.strip().startswith('style')])
    
    def extract_mermaid_direction(self, content: str) -> str:
        """提取Mermaid图表方向"""
        match = re.search(r'graph\s+(TB|TD|BT|RL|LR)', content, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        
        match = re.search(r'flowchart\s+(TB|TD|BT|RL|LR)', content, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        
        return 'TB'  # 默认方向
    
    def extract_mermaid_labels(self, content: str) -> List[str]:
        """提取Mermaid图表标签"""
        labels = re.findall(r'\[([^\]]+)\]', content)
        return labels
    
    def test_mermaid_compatibility(self, chart: Dict, device: str) -> List[Dict]:
        """测试Mermaid图表设备兼容性"""
        issues = []
        rules = self.compatibility_rules['mermaid_rules'].get(device, {})
        device_name = self.device_profiles[device]['name']
        
        # 检查节点数量
        if 'max_nodes' in rules and chart['nodes'] > rules['max_nodes']:
            issues.append({
                'type': 'mermaid_too_many_nodes_for_device',
                'severity': 'warning',
                'device': device,
                'message': f'在{device_name}上节点过多({chart["nodes"]}个)，建议不超过{rules["max_nodes"]}个',
                'line': chart['line']
            })
        
        # 检查标签长度
        if 'max_label_length' in rules:
            for label in chart['labels']:
                if len(label) > rules['max_label_length']:
                    issues.append({
                        'type': 'mermaid_label_too_long_for_device',
                        'severity': 'warning',
                        'device': device,
                        'message': f'在{device_name}上标签过长: "{label[:20]}..."，建议不超过{rules["max_label_length"]}字符',
                        'line': chart['line']
                    })
        
        # 检查方向适配
        if chart['direction'] in rules.get('avoid_direction', []):
            recommended = ', '.join(rules.get('recommended_direction', []))
            issues.append({
                'type': 'mermaid_direction_not_suitable_for_device',
                'severity': 'info',
                'device': device,
                'message': f'在{device_name}上方向{chart["direction"]}可能不适合，建议使用: {recommended}',
                'line': chart['line']
            })
        
        return issues
    
    def test_table_compatibility(self, table: Dict, device: str) -> List[Dict]:
        """测试表格设备兼容性"""
        issues = []
        rules = self.compatibility_rules['table_rules'].get(device, {})
        device_name = self.device_profiles[device]['name']
        
        # 检查列数
        if 'max_columns' in rules and table['columns'] > rules['max_columns']:
            issues.append({
                'type': 'table_too_many_columns_for_device',
                'severity': 'warning',
                'device': device,
                'message': f'在{device_name}上列数过多({table["columns"]}列)，建议不超过{rules["max_columns"]}列',
                'line': table['line']
            })
        
        # 检查单元格内容长度
        if 'max_cell_length' in rules and table['max_cell_length'] > rules['max_cell_length']:
            issues.append({
                'type': 'table_cell_too_long_for_device',
                'severity': 'warning',
                'device': device,
                'message': f'在{device_name}上单元格内容过长({table["max_cell_length"]}字符)，建议不超过{rules["max_cell_length"]}字符',
                'line': table['line']
            })
        
        # 检查是否需要滚动
        if rules.get('scroll_required') and table['columns'] > 2:
            issues.append({
                'type': 'table_may_need_scroll_on_device',
                'severity': 'info',
                'device': device,
                'message': f'在{device_name}上可能需要横向滚动查看完整表格',
                'line': table['line']
            })
        
        return issues
    
    def test_image_compatibility(self, image: Dict, device: str) -> List[Dict]:
        """测试图片设备兼容性"""
        issues = []
        rules = self.compatibility_rules['image_rules'].get(device, {})
        device_name = self.device_profiles[device]['name']
        
        # 检查响应式需求
        if rules.get('responsive_required') and image['is_local']:
            issues.append({
                'type': 'image_needs_responsive_design',
                'severity': 'info',
                'device': device,
                'message': f'在{device_name}上建议为图片添加响应式设计',
                'line': image['line']
            })
        
        # 检查alt文本重要性
        if rules.get('alt_text_critical') and not image['alt']:
            issues.append({
                'type': 'image_alt_text_critical_for_device',
                'severity': 'error',
                'device': device,
                'message': f'在{device_name}上alt文本非常重要，必须提供',
                'line': image['line']
            })
        
        return issues
    
    def test_file_compatibility(self, file_path: Path) -> Dict:
        """测试文件的设备兼容性"""
        charts = self.extract_charts_from_file(file_path)
        
        if 'error' in charts:
            return {
                'file': str(file_path),
                'status': 'error',
                'error': charts['error'],
                'device_issues': {}
            }
        
        device_issues = {}
        
        for device in self.device_profiles.keys():
            device_issues[device] = []
            
            # 测试Mermaid图表
            for chart in charts['mermaid']:
                issues = self.test_mermaid_compatibility(chart, device)
                device_issues[device].extend(issues)
            
            # 测试表格
            for table in charts['tables']:
                issues = self.test_table_compatibility(table, device)
                device_issues[device].extend(issues)
            
            # 测试图片
            for image in charts['images']:
                issues = self.test_image_compatibility(image, device)
                device_issues[device].extend(issues)
        
        return {
            'file': str(file_path),
            'status': 'success',
            'chart_counts': {
                'mermaid': len(charts['mermaid']),
                'tables': len(charts['tables']),
                'images': len(charts['images'])
            },
            'device_issues': device_issues
        }
    
    def test_directory_compatibility(self, directory: Path = None) -> Dict:
        """测试整个目录的设备兼容性"""
        if directory is None:
            directory = self.base_path
        
        results = {
            'tested_files': [],
            'summary': {
                'total_files': 0,
                'files_with_charts': 0,
                'total_charts': 0,
                'device_compatibility': {}
            }
        }
        
        # 初始化设备兼容性统计
        for device in self.device_profiles.keys():
            results['summary']['device_compatibility'][device] = {
                'total_issues': 0,
                'issue_types': {},
                'files_with_issues': 0
            }
        
        # 查找所有Markdown文件
        md_files = list(directory.rglob('*.md'))
        
        for file_path in md_files:
            if any(skip in str(file_path) for skip in ['.git', 'node_modules', 'temp']):
                continue
            
            result = self.test_file_compatibility(file_path)
            results['tested_files'].append(result)
            
            results['summary']['total_files'] += 1
            
            if result['status'] == 'success':
                chart_count = sum(result['chart_counts'].values())
                if chart_count > 0:
                    results['summary']['files_with_charts'] += 1
                results['summary']['total_charts'] += chart_count
                
                # 统计各设备的问题
                for device, issues in result['device_issues'].items():
                    device_stats = results['summary']['device_compatibility'][device]
                    device_stats['total_issues'] += len(issues)
                    
                    if issues:
                        device_stats['files_with_issues'] += 1
                    
                    for issue in issues:
                        issue_type = issue['type']
                        if issue_type not in device_stats['issue_types']:
                            device_stats['issue_types'][issue_type] = 0
                        device_stats['issue_types'][issue_type] += 1
        
        return results
    
    def generate_compatibility_report(self, results: Dict, output_path: Path = None) -> str:
        """生成设备兼容性报告"""
        if output_path is None:
            output_path = self.base_path / 'device-compatibility-report.md'
        
        report_content = f"""# 设备兼容性测试报告

## 测试摘要

- **测试文件总数**: {results['summary']['total_files']}
- **包含图表的文件**: {results['summary']['files_with_charts']}
- **图表总数**: {results['summary']['total_charts']}

## 设备兼容性概览

"""
        
        for device, device_info in self.device_profiles.items():
            stats = results['summary']['device_compatibility'][device]
            report_content += f"### {device_info['name']} ({device_info['viewport_width']}px)\n"
            report_content += f"- **问题总数**: {stats['total_issues']}\n"
            report_content += f"- **有问题的文件**: {stats['files_with_issues']}\n"
            
            if stats['issue_types']:
                report_content += "- **主要问题类型**:\n"
                sorted_issues = sorted(stats['issue_types'].items(), 
                                     key=lambda x: x[1], reverse=True)[:3]
                for issue_type, count in sorted_issues:
                    issue_type_names = {
                        'mermaid_too_many_nodes_for_device': '图表节点过多',
                        'mermaid_label_too_long_for_device': '图表标签过长',
                        'mermaid_direction_not_suitable_for_device': '图表方向不适合',
                        'table_too_many_columns_for_device': '表格列数过多',
                        'table_cell_too_long_for_device': '表格单元格过长',
                        'table_may_need_scroll_on_device': '表格需要滚动',
                        'image_needs_responsive_design': '图片需要响应式设计',
                        'image_alt_text_critical_for_device': '图片缺少关键alt文本'
                    }
                    type_name = issue_type_names.get(issue_type, issue_type)
                    report_content += f"  - {type_name}: {count}个\n"
            
            report_content += "\n"
        
        report_content += "## 详细兼容性问题\n\n"
        
        # 按设备分组显示问题
        for device, device_info in self.device_profiles.items():
            device_stats = results['summary']['device_compatibility'][device]
            if device_stats['total_issues'] == 0:
                continue
            
            report_content += f"### {device_info['name']}兼容性问题\n\n"
            
            # 收集该设备的所有问题
            device_issues_by_file = {}
            for file_result in results['tested_files']:
                if file_result['status'] == 'success' and device in file_result['device_issues']:
                    issues = file_result['device_issues'][device]
                    if issues:
                        device_issues_by_file[file_result['file']] = issues
            
            for file_path, issues in device_issues_by_file.items():
                report_content += f"#### {file_path}\n"
                
                # 按类型分组问题
                issues_by_type = {}
                for issue in issues:
                    issue_type = issue['type']
                    if issue_type not in issues_by_type:
                        issues_by_type[issue_type] = []
                    issues_by_type[issue_type].append(issue)
                
                for issue_type, type_issues in issues_by_type.items():
                    issue_type_names = {
                        'mermaid_too_many_nodes_for_device': '图表节点过多',
                        'mermaid_label_too_long_for_device': '图表标签过长',
                        'mermaid_direction_not_suitable_for_device': '图表方向不适合',
                        'table_too_many_columns_for_device': '表格列数过多',
                        'table_cell_too_long_for_device': '表格单元格过长',
                        'table_may_need_scroll_on_device': '表格需要滚动',
                        'image_needs_responsive_design': '图片需要响应式设计',
                        'image_alt_text_critical_for_device': '图片缺少关键alt文本'
                    }
                    type_name = issue_type_names.get(issue_type, issue_type)
                    report_content += f"**{type_name}**\n"
                    
                    for issue in type_issues:
                        severity_icon = {'error': '❌', 'warning': '⚠️', 'info': 'ℹ️'}
                        icon = severity_icon.get(issue.get('severity', 'info'), 'ℹ️')
                        report_content += f"- {icon} 行 {issue['line']}: {issue['message']}\n"
                    
                    report_content += "\n"
        
        report_content += f"""
## 设备适配建议

### 移动设备适配 (375px)
- Mermaid图表节点控制在8个以内
- 标签长度不超过15字符
- 优先使用垂直方向(TB/TD)
- 表格列数不超过3列
- 考虑横向滚动或折叠显示
- 图片必须有alt文本

### 平板设备适配 (768px)
- Mermaid图表节点控制在15个以内
- 标签长度不超过25字符
- 可使用垂直或水平方向
- 表格列数不超过5列
- 单元格内容控制在30字符以内
- 图片建议响应式设计

### 桌面设备适配 (1200px+)
- Mermaid图表节点可达25个
- 标签长度可达40字符
- 支持所有方向
- 表格列数可达8列
- 单元格内容可达50字符
- 图片可使用固定尺寸

## 优化建议

### 响应式图表设计
1. 使用CSS媒体查询适配不同屏幕
2. 为移动设备简化图表内容
3. 考虑使用可折叠的表格
4. 提供图表的文字描述

### 可访问性优化
1. 为所有图片提供描述性alt文本
2. 使用语义化的表格标题
3. 确保图表在屏幕阅读器中可理解
4. 提供键盘导航支持

### 性能优化
1. 压缩图片文件大小
2. 使用适当的图片格式
3. 考虑懒加载大型图表
4. 优化Mermaid图表渲染性能

---

**报告生成时间**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return str(output_path)

def main():
    parser = argparse.ArgumentParser(description='AI IDE指南设备兼容性测试工具')
    parser.add_argument('--path', '-p', default='ai-ide-guide-v2', 
                       help='要测试的文档目录路径')
    parser.add_argument('--report', '-r', 
                       help='报告输出路径')
    
    args = parser.parse_args()
    
    tester = DeviceCompatibilityTester(args.path)
    
    print("开始设备兼容性测试...")
    results = tester.test_directory_compatibility()
    
    print(f"\n测试完成!")
    print(f"- 测试文件: {results['summary']['total_files']}")
    print(f"- 包含图表文件: {results['summary']['files_with_charts']}")
    print(f"- 图表总数: {results['summary']['total_charts']}")
    
    print("\n各设备兼容性问题:")
    for device, device_info in tester.device_profiles.items():
        stats = results['summary']['device_compatibility'][device]
        print(f"- {device_info['name']}: {stats['total_issues']}个问题")
    
    # 生成报告
    report_path = tester.generate_compatibility_report(results, 
                                                     Path(args.report) if args.report else None)
    print(f"\n设备兼容性报告已生成: {report_path}")

if __name__ == '__main__':
    main()