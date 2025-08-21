#!/usr/bin/env python3
"""
AI IDE开发指南用户可用性测试自动化脚本
用于自动化用户测试流程、数据收集和分析
"""

import json
import csv
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from pathlib import Path
import sqlite3
from typing import List, Dict, Any, Optional
import statistics

class UserTestingAutomation:
    """用户测试自动化管理类"""
    
    def __init__(self, config_file: str = "user_testing_config.json"):
        self.config = self.load_config(config_file)
        self.db_path = "quality/data/user_testing.db"
        self.init_database()
        
    def load_config(self, config_file: str) -> Dict[str, Any]:
        """加载配置文件"""
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return self.create_default_config(config_file)
    
    def create_default_config(self, config_file: str) -> Dict[str, Any]:
        """创建默认配置文件"""
        default_config = {
            "test_settings": {
                "session_duration_minutes": 90,
                "task_timeout_minutes": 30,
                "min_participants_per_group": 6,
                "max_participants_per_group": 8,
                "satisfaction_scale": 5
            },
            "user_groups": {
                "technical_decision_makers": {
                    "description": "技术决策者",
                    "target_chapters": ["2", "3", "4", "5"],
                    "key_tasks": ["tool_selection", "roi_analysis", "risk_assessment"]
                },
                "project_managers": {
                    "description": "项目管理者", 
                    "target_chapters": ["5", "6", "7", "8"],
                    "key_tasks": ["implementation_planning", "team_training", "progress_tracking"]
                },
                "development_leads": {
                    "description": "开发团队负责人",
                    "target_chapters": ["6", "7", "8", "9"],
                    "key_tasks": ["tool_integration", "workflow_optimization", "team_guidance"]
                },
                "developers": {
                    "description": "一线开发者",
                    "target_chapters": ["8", "9", "14", "15"],
                    "key_tasks": ["daily_usage", "problem_solving", "skill_improvement"]
                }
            },
            "tasks": {
                "tool_selection": {
                    "name": "AI IDE工具选型",
                    "description": "根据给定项目需求选择合适的AI IDE工具",
                    "expected_time_minutes": 25,
                    "success_criteria": ["找到对比表格", "做出合理选择", "提供选择理由"],
                    "difficulty": "medium"
                },
                "implementation_planning": {
                    "name": "实施计划制定",
                    "description": "为10人团队制定AI IDE实施计划",
                    "expected_time_minutes": 40,
                    "success_criteria": ["制定时间线", "分配资源", "识别风险点"],
                    "difficulty": "high"
                },
                "problem_solving": {
                    "name": "问题解决",
                    "description": "解决AI IDE使用中的常见问题",
                    "expected_time_minutes": 20,
                    "success_criteria": ["定位问题", "找到解决方案", "验证可行性"],
                    "difficulty": "low"
                }
            },
            "metrics": {
                "completion_rate_threshold": 0.8,
                "satisfaction_threshold": 4.0,
                "time_efficiency_threshold": 1.2,
                "recommendation_rate_threshold": 0.7
            }
        }
        
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        
        return default_config
    
    def init_database(self):
        """初始化数据库"""
        Path("quality/data").mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 创建参与者表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                user_group TEXT NOT NULL,
                experience_level TEXT,
                company_size TEXT,
                industry TEXT,
                ai_ide_experience_months INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 创建测试会话表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS test_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_id INTEGER,
                session_type TEXT,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                overall_satisfaction INTEGER,
                would_recommend BOOLEAN,
                notes TEXT,
                FOREIGN KEY (participant_id) REFERENCES participants (id)
            )
        ''')
        
        # 创建任务结果表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS task_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                task_name TEXT NOT NULL,
                chapter TEXT,
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                completed BOOLEAN,
                completion_time_minutes REAL,
                difficulty_rating INTEGER,
                satisfaction_rating INTEGER,
                errors_count INTEGER,
                help_requests INTEGER,
                notes TEXT,
                FOREIGN KEY (session_id) REFERENCES test_sessions (id)
            )
        ''')
        
        # 创建反馈表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                chapter TEXT,
                feedback_type TEXT,
                category TEXT,
                severity TEXT,
                description TEXT,
                suggestion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES test_sessions (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def register_participant(self, participant_data: Dict[str, Any]) -> int:
        """注册测试参与者"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO participants (name, email, user_group, experience_level, 
                                    company_size, industry, ai_ide_experience_months)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            participant_data['name'],
            participant_data.get('email', ''),
            participant_data['user_group'],
            participant_data.get('experience_level', ''),
            participant_data.get('company_size', ''),
            participant_data.get('industry', ''),
            participant_data.get('ai_ide_experience_months', 0)
        ))
        
        participant_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return participant_id
    
    def start_test_session(self, participant_id: int, session_type: str = "individual") -> int:
        """开始测试会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO test_sessions (participant_id, session_type, start_time)
            VALUES (?, ?, ?)
        ''', (participant_id, session_type, datetime.now()))
        
        session_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return session_id
    
    def record_task_result(self, task_result: Dict[str, Any]):
        """记录任务结果"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        completion_time = None
        if task_result.get('end_time') and task_result.get('start_time'):
            start = datetime.fromisoformat(task_result['start_time'])
            end = datetime.fromisoformat(task_result['end_time'])
            completion_time = (end - start).total_seconds() / 60  # 转换为分钟
        
        cursor.execute('''
            INSERT INTO task_results (session_id, task_name, chapter, start_time, end_time,
                                    completed, completion_time_minutes, difficulty_rating,
                                    satisfaction_rating, errors_count, help_requests, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            task_result['session_id'],
            task_result['task_name'],
            task_result.get('chapter', ''),
            task_result.get('start_time'),
            task_result.get('end_time'),
            task_result.get('completed', False),
            completion_time,
            task_result.get('difficulty_rating', 0),
            task_result.get('satisfaction_rating', 0),
            task_result.get('errors_count', 0),
            task_result.get('help_requests', 0),
            task_result.get('notes', '')
        ))
        
        conn.commit()
        conn.close()
    
    def end_test_session(self, session_id: int, overall_satisfaction: int, 
                        would_recommend: bool, notes: str = ""):
        """结束测试会话"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE test_sessions 
            SET end_time = ?, overall_satisfaction = ?, would_recommend = ?, notes = ?
            WHERE id = ?
        ''', (datetime.now(), overall_satisfaction, would_recommend, notes, session_id))
        
        conn.commit()
        conn.close()
    
    def record_feedback(self, feedback_data: Dict[str, Any]):
        """记录用户反馈"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO feedback (session_id, chapter, feedback_type, category,
                                severity, description, suggestion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            feedback_data['session_id'],
            feedback_data.get('chapter', ''),
            feedback_data.get('feedback_type', 'general'),
            feedback_data.get('category', 'other'),
            feedback_data.get('severity', 'medium'),
            feedback_data.get('description', ''),
            feedback_data.get('suggestion', '')
        ))
        
        conn.commit()
        conn.close()
    
    def analyze_test_results(self) -> Dict[str, Any]:
        """分析测试结果"""
        conn = sqlite3.connect(self.db_path)
        
        # 获取基本统计数据
        participants_df = pd.read_sql_query("SELECT * FROM participants", conn)
        sessions_df = pd.read_sql_query("SELECT * FROM test_sessions", conn)
        tasks_df = pd.read_sql_query("SELECT * FROM task_results", conn)
        feedback_df = pd.read_sql_query("SELECT * FROM feedback", conn)
        
        conn.close()
        
        analysis_results = {
            'summary': self._generate_summary_stats(participants_df, sessions_df, tasks_df),
            'task_performance': self._analyze_task_performance(tasks_df),
            'user_satisfaction': self._analyze_user_satisfaction(sessions_df, tasks_df),
            'feedback_analysis': self._analyze_feedback(feedback_df),
            'recommendations': self._generate_recommendations(tasks_df, sessions_df, feedback_df)
        }
        
        return analysis_results
    
    def _generate_summary_stats(self, participants_df: pd.DataFrame, 
                               sessions_df: pd.DataFrame, 
                               tasks_df: pd.DataFrame) -> Dict[str, Any]:
        """生成汇总统计"""
        return {
            'total_participants': len(participants_df),
            'total_sessions': len(sessions_df),
            'total_tasks': len(tasks_df),
            'completion_rate': tasks_df['completed'].mean() if not tasks_df.empty else 0,
            'avg_session_duration': self._calculate_avg_session_duration(sessions_df),
            'user_group_distribution': participants_df['user_group'].value_counts().to_dict() if not participants_df.empty else {}
        }
    
    def _analyze_task_performance(self, tasks_df: pd.DataFrame) -> Dict[str, Any]:
        """分析任务执行表现"""
        if tasks_df.empty:
            return {}
        
        task_stats = tasks_df.groupby('task_name').agg({
            'completed': ['count', 'sum', 'mean'],
            'completion_time_minutes': ['mean', 'std'],
            'difficulty_rating': 'mean',
            'satisfaction_rating': 'mean',
            'errors_count': 'mean',
            'help_requests': 'mean'
        }).round(2)
        
        # 识别问题任务
        problem_tasks = []
        for task_name in task_stats.index:
            completion_rate = task_stats.loc[task_name, ('completed', 'mean')]
            avg_time = task_stats.loc[task_name, ('completion_time_minutes', 'mean')]
            
            # 获取预期时间
            expected_time = self.config['tasks'].get(task_name, {}).get('expected_time_minutes', 30)
            
            if completion_rate < self.config['metrics']['completion_rate_threshold']:
                problem_tasks.append({
                    'task': task_name,
                    'issue': 'low_completion_rate',
                    'value': completion_rate,
                    'severity': 'high' if completion_rate < 0.6 else 'medium'
                })
            
            if avg_time > expected_time * self.config['metrics']['time_efficiency_threshold']:
                problem_tasks.append({
                    'task': task_name,
                    'issue': 'long_completion_time',
                    'value': avg_time,
                    'expected': expected_time,
                    'severity': 'medium'
                })
        
        return {
            'task_statistics': task_stats.to_dict(),
            'problem_tasks': problem_tasks
        }
    
    def _analyze_user_satisfaction(self, sessions_df: pd.DataFrame, 
                                  tasks_df: pd.DataFrame) -> Dict[str, Any]:
        """分析用户满意度"""
        if sessions_df.empty:
            return {}
        
        satisfaction_stats = {
            'overall_satisfaction': {
                'mean': sessions_df['overall_satisfaction'].mean(),
                'std': sessions_df['overall_satisfaction'].std(),
                'distribution': sessions_df['overall_satisfaction'].value_counts().to_dict()
            },
            'recommendation_rate': sessions_df['would_recommend'].mean() if 'would_recommend' in sessions_df.columns else 0
        }
        
        # 按任务分析满意度
        if not tasks_df.empty:
            task_satisfaction = tasks_df.groupby('task_name')['satisfaction_rating'].agg(['mean', 'std']).to_dict()
            satisfaction_stats['task_satisfaction'] = task_satisfaction
        
        return satisfaction_stats
    
    def _analyze_feedback(self, feedback_df: pd.DataFrame) -> Dict[str, Any]:
        """分析用户反馈"""
        if feedback_df.empty:
            return {}
        
        feedback_analysis = {
            'total_feedback_items': len(feedback_df),
            'feedback_by_category': feedback_df['category'].value_counts().to_dict(),
            'feedback_by_severity': feedback_df['severity'].value_counts().to_dict(),
            'feedback_by_chapter': feedback_df['chapter'].value_counts().to_dict()
        }
        
        # 提取关键主题
        if 'description' in feedback_df.columns:
            feedback_analysis['key_themes'] = self._extract_feedback_themes(feedback_df['description'].tolist())
        
        return feedback_analysis
    
    def _extract_feedback_themes(self, feedback_texts: List[str]) -> Dict[str, int]:
        """提取反馈主题（简化版本）"""
        theme_keywords = {
            '导航': ['导航', '查找', '目录', '索引', '搜索'],
            '内容': ['内容', '信息', '详细', '缺少', '不足'],
            '可读性': ['可读', '理解', '清晰', '复杂', '简单'],
            '实用性': ['实用', '有用', '实际', '操作', '指导'],
            '结构': ['结构', '组织', '章节', '顺序', '逻辑'],
            '视觉': ['图表', '表格', '格式', '排版', '设计']
        }
        
        theme_counts = {theme: 0 for theme in theme_keywords.keys()}
        
        for text in feedback_texts:
            if not text:
                continue
            text_lower = text.lower()
            for theme, keywords in theme_keywords.items():
                if any(keyword in text_lower for keyword in keywords):
                    theme_counts[theme] += 1
        
        return theme_counts
    
    def _generate_recommendations(self, tasks_df: pd.DataFrame, 
                                sessions_df: pd.DataFrame,
                                feedback_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """生成改进建议"""
        recommendations = []
        
        # 基于任务表现的建议
        if not tasks_df.empty:
            low_completion_tasks = tasks_df[tasks_df['completed'] == False]['task_name'].value_counts()
            for task, count in low_completion_tasks.items():
                if count >= 3:  # 如果有3个或更多失败案例
                    recommendations.append({
                        'priority': 'high',
                        'area': 'task_completion',
                        'issue': f'任务"{task}"完成率偏低',
                        'suggestion': '简化任务流程，增加操作指导',
                        'evidence': f'{count}个失败案例'
                    })
        
        # 基于满意度的建议
        if not sessions_df.empty:
            avg_satisfaction = sessions_df['overall_satisfaction'].mean()
            if avg_satisfaction < self.config['metrics']['satisfaction_threshold']:
                recommendations.append({
                    'priority': 'high',
                    'area': 'user_satisfaction',
                    'issue': f'整体满意度偏低 ({avg_satisfaction:.1f}/5.0)',
                    'suggestion': '优化内容表达和用户体验',
                    'evidence': f'平均满意度{avg_satisfaction:.1f}'
                })
        
        # 基于反馈的建议
        if not feedback_df.empty:
            high_severity_feedback = feedback_df[feedback_df['severity'] == 'high']
            if not high_severity_feedback.empty:
                for _, feedback in high_severity_feedback.iterrows():
                    recommendations.append({
                        'priority': 'high',
                        'area': feedback['category'],
                        'issue': feedback['description'],
                        'suggestion': feedback['suggestion'],
                        'evidence': '用户高优先级反馈'
                    })
        
        return recommendations
    
    def _calculate_avg_session_duration(self, sessions_df: pd.DataFrame) -> float:
        """计算平均会话时长"""
        if sessions_df.empty or 'start_time' not in sessions_df.columns or 'end_time' not in sessions_df.columns:
            return 0
        
        durations = []
        for _, session in sessions_df.iterrows():
            if session['start_time'] and session['end_time']:
                start = pd.to_datetime(session['start_time'])
                end = pd.to_datetime(session['end_time'])
                duration = (end - start).total_seconds() / 60  # 转换为分钟
                durations.append(duration)
        
        return statistics.mean(durations) if durations else 0
    
    def generate_test_report(self, output_file: str = "quality/reports/usability_test_report.md"):
        """生成测试报告"""
        analysis_results = self.analyze_test_results()
        
        report_content = self._format_test_report(analysis_results)
        
        # 确保输出目录存在
        Path(output_file).parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"测试报告已生成: {output_file}")
        return output_file
    
    def _format_test_report(self, analysis_results: Dict[str, Any]) -> str:
        """格式化测试报告"""
        report = f"""# AI IDE开发指南用户可用性测试报告

生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 执行摘要

### 测试概况
- 参与用户：{analysis_results['summary']['total_participants']}人
- 测试会话：{analysis_results['summary']['total_sessions']}场
- 完成任务：{analysis_results['summary']['total_tasks']}个
- 整体完成率：{analysis_results['summary']['completion_rate']:.1%}
- 平均会话时长：{analysis_results['summary']['avg_session_duration']:.1f}分钟

### 用户群体分布
"""
        
        for group, count in analysis_results['summary']['user_group_distribution'].items():
            report += f"- {group}: {count}人\n"
        
        report += "\n## 任务执行表现\n\n"
        
        if 'task_performance' in analysis_results and analysis_results['task_performance']:
            task_stats = analysis_results['task_performance'].get('task_statistics', {})
            for task_name, stats in task_stats.items():
                completion_rate = stats.get(('completed', 'mean'), 0)
                avg_time = stats.get(('completion_time_minutes', 'mean'), 0)
                satisfaction = stats.get(('satisfaction_rating', 'mean'), 0)
                
                report += f"### {task_name}\n"
                report += f"- 完成率：{completion_rate:.1%}\n"
                report += f"- 平均用时：{avg_time:.1f}分钟\n"
                report += f"- 满意度：{satisfaction:.1f}/5.0\n\n"
        
        report += "## 用户满意度分析\n\n"
        
        if 'user_satisfaction' in analysis_results:
            satisfaction = analysis_results['user_satisfaction']
            if 'overall_satisfaction' in satisfaction:
                overall = satisfaction['overall_satisfaction']
                report += f"- 整体满意度：{overall['mean']:.1f}/5.0 (标准差: {overall['std']:.1f})\n"
            
            if 'recommendation_rate' in satisfaction:
                report += f"- 推荐意愿：{satisfaction['recommendation_rate']:.1%}\n"
        
        report += "\n## 问题识别\n\n"
        
        if 'task_performance' in analysis_results and 'problem_tasks' in analysis_results['task_performance']:
            problem_tasks = analysis_results['task_performance']['problem_tasks']
            if problem_tasks:
                for problem in problem_tasks:
                    report += f"- **{problem['task']}**: {problem['issue']} (严重程度: {problem['severity']})\n"
            else:
                report += "- 未发现重大问题\n"
        
        report += "\n## 改进建议\n\n"
        
        if 'recommendations' in analysis_results:
            recommendations = analysis_results['recommendations']
            high_priority = [r for r in recommendations if r['priority'] == 'high']
            medium_priority = [r for r in recommendations if r['priority'] == 'medium']
            
            if high_priority:
                report += "### 高优先级改进项\n"
                for i, rec in enumerate(high_priority, 1):
                    report += f"{i}. **{rec['issue']}**\n"
                    report += f"   - 建议：{rec['suggestion']}\n"
                    report += f"   - 依据：{rec['evidence']}\n\n"
            
            if medium_priority:
                report += "### 中优先级改进项\n"
                for i, rec in enumerate(medium_priority, 1):
                    report += f"{i}. **{rec['issue']}**\n"
                    report += f"   - 建议：{rec['suggestion']}\n"
                    report += f"   - 依据：{rec['evidence']}\n\n"
        
        report += "\n## 反馈分析\n\n"
        
        if 'feedback_analysis' in analysis_results:
            feedback = analysis_results['feedback_analysis']
            if 'key_themes' in feedback:
                report += "### 主要反馈主题\n"
                for theme, count in feedback['key_themes'].items():
                    if count > 0:
                        report += f"- {theme}: {count}次提及\n"
        
        return report
    
    def export_data_to_csv(self, output_dir: str = "quality/data/exports/"):
        """导出数据到CSV文件"""
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        
        # 导出各个表的数据
        tables = ['participants', 'test_sessions', 'task_results', 'feedback']
        
        for table in tables:
            df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
            output_file = f"{output_dir}{table}.csv"
            df.to_csv(output_file, index=False, encoding='utf-8-sig')
            print(f"已导出 {table} 数据到: {output_file}")
        
        conn.close()

def main():
    """主函数 - 演示脚本使用"""
    # 初始化测试自动化系统
    testing = UserTestingAutomation()
    
    # 示例：注册测试参与者
    sample_participants = [
        {
            'name': '张三',
            'email': 'zhangsan@example.com',
            'user_group': 'technical_decision_makers',
            'experience_level': 'senior',
            'company_size': 'large',
            'industry': 'internet',
            'ai_ide_experience_months': 6
        },
        {
            'name': '李四',
            'email': 'lisi@example.com',
            'user_group': 'project_managers',
            'experience_level': 'intermediate',
            'company_size': 'medium',
            'industry': 'traditional_it',
            'ai_ide_experience_months': 3
        }
    ]
    
    participant_ids = []
    for participant in sample_participants:
        participant_id = testing.register_participant(participant)
        participant_ids.append(participant_id)
        print(f"注册参与者: {participant['name']} (ID: {participant_id})")
    
    # 示例：模拟测试会话
    for participant_id in participant_ids:
        session_id = testing.start_test_session(participant_id)
        
        # 模拟任务结果
        sample_task_result = {
            'session_id': session_id,
            'task_name': 'tool_selection',
            'chapter': '3',
            'start_time': datetime.now().isoformat(),
            'end_time': (datetime.now() + timedelta(minutes=22)).isoformat(),
            'completed': True,
            'difficulty_rating': 3,
            'satisfaction_rating': 4,
            'errors_count': 1,
            'help_requests': 0,
            'notes': '任务完成顺利，但在查找对比表格时遇到一些困难'
        }
        
        testing.record_task_result(sample_task_result)
        
        # 结束会话
        testing.end_test_session(session_id, 4, True, "整体体验良好")
        
        print(f"完成测试会话: {session_id}")
    
    # 生成分析报告
    report_file = testing.generate_test_report()
    print(f"测试报告已生成: {report_file}")
    
    # 导出数据
    testing.export_data_to_csv()
    print("数据导出完成")

if __name__ == "__main__":
    main()