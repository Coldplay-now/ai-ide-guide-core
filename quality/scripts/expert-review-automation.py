#!/usr/bin/env python3
"""
AI IDE开发指南专家评审自动化脚本
用于自动化专家评审流程的各个环节
"""

import json
import csv
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
import pandas as pd
from typing import List, Dict, Any

class ExpertReviewAutomation:
    """专家评审自动化管理类"""
    
    def __init__(self, config_file: str = "review_config.json"):
        self.config = self.load_config(config_file)
        self.experts_db = self.load_experts_database()
        self.review_tasks = []
        
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
            "email": {
                "smtp_server": "smtp.gmail.com",
                "smtp_port": 587,
                "sender_email": "your-email@example.com",
                "sender_password": "your-app-password"
            },
            "review_settings": {
                "default_deadline_days": 14,
                "reminder_days_before": [7, 3, 1],
                "max_experts_per_chapter": 3,
                "min_expert_rating": 4.0
            },
            "document_paths": {
                "chapters_dir": "docs/chapters/",
                "output_dir": "quality/reviews/",
                "templates_dir": "quality/templates/"
            }
        }
        
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=2, ensure_ascii=False)
        
        return default_config
    
    def load_experts_database(self) -> List[Dict[str, Any]]:
        """加载专家数据库"""
        experts_file = "quality/data/experts_database.json"
        try:
            with open(experts_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return self.create_sample_experts_database(experts_file)
    
    def create_sample_experts_database(self, experts_file: str) -> List[Dict[str, Any]]:
        """创建示例专家数据库"""
        sample_experts = [
            {
                "id": "expert_001",
                "name": "张三",
                "email": "zhangsan@example.com",
                "expertise_areas": ["AI/ML", "代码生成", "智能补全"],
                "experience_years": 8,
                "rating": 4.5,
                "availability": "high",
                "preferred_chapters": ["2", "3"],
                "language": "zh-CN",
                "timezone": "Asia/Shanghai"
            },
            {
                "id": "expert_002", 
                "name": "李四",
                "email": "lisi@example.com",
                "expertise_areas": ["软件开发管理", "项目实施", "团队协作"],
                "experience_years": 12,
                "rating": 4.8,
                "availability": "medium",
                "preferred_chapters": ["5", "6", "7", "8"],
                "language": "zh-CN",
                "timezone": "Asia/Shanghai"
            },
            {
                "id": "expert_003",
                "name": "王五",
                "email": "wangwu@example.com", 
                "expertise_areas": ["用户体验", "技术写作", "文档设计"],
                "experience_years": 6,
                "rating": 4.3,
                "availability": "high",
                "preferred_chapters": ["1", "14", "15"],
                "language": "zh-CN",
                "timezone": "Asia/Shanghai"
            }
        ]
        
        # 确保目录存在
        Path("quality/data").mkdir(parents=True, exist_ok=True)
        
        with open(experts_file, 'w', encoding='utf-8') as f:
            json.dump(sample_experts, f, indent=2, ensure_ascii=False)
        
        return sample_experts
    
    def recommend_experts_for_chapter(self, chapter: str, expertise_required: List[str]) -> List[Dict[str, Any]]:
        """为特定章节推荐专家"""
        suitable_experts = []
        
        for expert in self.experts_db:
            # 检查专业领域匹配度
            expertise_match = len(set(expert["expertise_areas"]) & set(expertise_required))
            
            # 检查章节偏好
            chapter_preference = chapter in expert.get("preferred_chapters", [])
            
            # 检查评分和可用性
            rating_ok = expert["rating"] >= self.config["review_settings"]["min_expert_rating"]
            availability_ok = expert["availability"] in ["high", "medium"]
            
            if expertise_match > 0 and rating_ok and availability_ok:
                score = expertise_match * 2
                if chapter_preference:
                    score += 1
                if expert["availability"] == "high":
                    score += 0.5
                
                suitable_experts.append({
                    **expert,
                    "match_score": score
                })
        
        # 按匹配分数排序
        suitable_experts.sort(key=lambda x: x["match_score"], reverse=True)
        
        # 返回前N个专家
        max_experts = self.config["review_settings"]["max_experts_per_chapter"]
        return suitable_experts[:max_experts]
    
    def create_review_assignment(self, chapter_assignments: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """创建评审任务分配"""
        assignments = []
        
        for chapter, expertise_areas in chapter_assignments.items():
            recommended_experts = self.recommend_experts_for_chapter(chapter, expertise_areas)
            
            deadline = datetime.now() + timedelta(days=self.config["review_settings"]["default_deadline_days"])
            
            for expert in recommended_experts:
                assignment = {
                    "assignment_id": f"review_{chapter}_{expert['id']}_{datetime.now().strftime('%Y%m%d')}",
                    "chapter": chapter,
                    "expert_id": expert["id"],
                    "expert_name": expert["name"],
                    "expert_email": expert["email"],
                    "expertise_areas": expertise_areas,
                    "deadline": deadline.isoformat(),
                    "status": "assigned",
                    "created_at": datetime.now().isoformat()
                }
                assignments.append(assignment)
        
        return assignments
    
    def generate_invitation_email(self, assignment: Dict[str, Any]) -> str:
        """生成邀请邮件内容"""
        template = """
尊敬的{expert_name}，

您好！

我们正在完善《AI IDE开发指南》，希望邀请您作为{expertise_areas}领域的专家，参与第{chapter}章的内容评审。

评审详情：
- 评审章节：第{chapter}章
- 专业领域：{expertise_areas}
- 评审截止日期：{deadline}
- 预计评审时间：2-4小时

评审内容包括：
1. 技术准确性检查
2. 内容完整性评估
3. 实用性和可操作性验证
4. 改进建议提供

您可以通过以下链接访问评审系统：
{review_link}

评审任务ID：{assignment_id}

如有任何问题，请随时联系我们。

感谢您的宝贵时间和专业意见！

此致
敬礼！

AI IDE开发指南编写团队
联系邮箱：{contact_email}
""".strip()
        
        return template.format(
            expert_name=assignment["expert_name"],
            chapter=assignment["chapter"],
            expertise_areas="、".join(assignment["expertise_areas"]),
            deadline=assignment["deadline"][:10],  # 只显示日期部分
            assignment_id=assignment["assignment_id"],
            review_link=f"https://review.example.com/assignment/{assignment['assignment_id']}",
            contact_email=self.config["email"]["sender_email"]
        )
    
    def send_invitation_emails(self, assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """发送邀请邮件"""
        results = {"sent": 0, "failed": 0, "errors": []}
        
        try:
            # 设置SMTP服务器
            server = smtplib.SMTP(
                self.config["email"]["smtp_server"],
                self.config["email"]["smtp_port"]
            )
            server.starttls()
            server.login(
                self.config["email"]["sender_email"],
                self.config["email"]["sender_password"]
            )
            
            for assignment in assignments:
                try:
                    # 创建邮件
                    msg = MIMEMultipart()
                    msg['From'] = self.config["email"]["sender_email"]
                    msg['To'] = assignment["expert_email"]
                    msg['Subject'] = f"邀请参与《AI IDE开发指南》第{assignment['chapter']}章专家评审"
                    
                    # 邮件正文
                    body = self.generate_invitation_email(assignment)
                    msg.attach(MIMEText(body, 'plain', 'utf-8'))
                    
                    # 发送邮件
                    server.send_message(msg)
                    results["sent"] += 1
                    
                    # 更新任务状态
                    assignment["status"] = "invited"
                    assignment["invited_at"] = datetime.now().isoformat()
                    
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append(f"发送给 {assignment['expert_email']} 失败: {str(e)}")
            
            server.quit()
            
        except Exception as e:
            results["errors"].append(f"SMTP连接失败: {str(e)}")
        
        return results
    
    def generate_review_progress_report(self, assignments: List[Dict[str, Any]]) -> str:
        """生成评审进度报告"""
        total_assignments = len(assignments)
        status_counts = {}
        
        for assignment in assignments:
            status = assignment["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # 计算完成率
        completed = status_counts.get("completed", 0)
        in_progress = status_counts.get("in_progress", 0)
        completion_rate = (completed / total_assignments * 100) if total_assignments > 0 else 0
        
        # 检查逾期任务
        overdue_assignments = []
        current_time = datetime.now()
        
        for assignment in assignments:
            deadline = datetime.fromisoformat(assignment["deadline"])
            if current_time > deadline and assignment["status"] not in ["completed", "cancelled"]:
                overdue_assignments.append(assignment)
        
        # 生成报告
        report = f"""
# 专家评审进度报告

生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 总体进度
- 总任务数：{total_assignments}
- 完成任务数：{completed}
- 进行中任务数：{in_progress}
- 完成率：{completion_rate:.1f}%

## 任务状态分布
"""
        
        for status, count in status_counts.items():
            percentage = (count / total_assignments * 100) if total_assignments > 0 else 0
            report += f"- {status}: {count} ({percentage:.1f}%)\n"
        
        if overdue_assignments:
            report += f"\n## 逾期任务 ({len(overdue_assignments)}个)\n"
            for assignment in overdue_assignments:
                report += f"- 第{assignment['chapter']}章 - {assignment['expert_name']} (截止日期: {assignment['deadline'][:10]})\n"
        
        # 按章节统计
        chapter_stats = {}
        for assignment in assignments:
            chapter = assignment["chapter"]
            if chapter not in chapter_stats:
                chapter_stats[chapter] = {"total": 0, "completed": 0}
            chapter_stats[chapter]["total"] += 1
            if assignment["status"] == "completed":
                chapter_stats[chapter]["completed"] += 1
        
        report += "\n## 章节完成情况\n"
        for chapter, stats in sorted(chapter_stats.items()):
            completion = (stats["completed"] / stats["total"] * 100) if stats["total"] > 0 else 0
            report += f"- 第{chapter}章: {stats['completed']}/{stats['total']} ({completion:.1f}%)\n"
        
        return report
    
    def export_assignments_to_csv(self, assignments: List[Dict[str, Any]], filename: str):
        """导出任务分配到CSV文件"""
        df = pd.DataFrame(assignments)
        df.to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"任务分配已导出到: {filename}")
    
    def send_reminder_emails(self, assignments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """发送提醒邮件"""
        results = {"sent": 0, "failed": 0, "errors": []}
        current_time = datetime.now()
        reminder_days = self.config["review_settings"]["reminder_days_before"]
        
        for assignment in assignments:
            if assignment["status"] in ["invited", "in_progress"]:
                deadline = datetime.fromisoformat(assignment["deadline"])
                days_until_deadline = (deadline - current_time).days
                
                if days_until_deadline in reminder_days:
                    try:
                        # 发送提醒邮件的逻辑
                        # 这里简化处理，实际应该调用邮件发送功能
                        print(f"发送提醒邮件给 {assignment['expert_name']} - 还有 {days_until_deadline} 天截止")
                        results["sent"] += 1
                    except Exception as e:
                        results["failed"] += 1
                        results["errors"].append(f"提醒邮件发送失败: {str(e)}")
        
        return results

def main():
    """主函数 - 演示脚本使用"""
    # 初始化自动化系统
    automation = ExpertReviewAutomation()
    
    # 定义章节和所需专业领域
    chapter_assignments = {
        "2": ["AI/ML", "代码生成", "技术原理"],
        "3": ["工具评估", "产品分析", "市场调研"],
        "4": ["投资分析", "ROI计算", "成本效益"],
        "5": ["项目管理", "实施规划", "风险管控"],
        "6": ["需求分析", "软件工程", "最佳实践"],
        "7": ["设计管理", "架构设计", "系统设计"],
        "8": ["开发管理", "代码管理", "版本控制"],
        "9": ["测试管理", "质量保证", "自动化测试"]
    }
    
    # 创建评审任务分配
    assignments = automation.create_review_assignment(chapter_assignments)
    
    # 导出任务分配
    automation.export_assignments_to_csv(assignments, "quality/data/expert_assignments.csv")
    
    # 生成进度报告
    progress_report = automation.generate_review_progress_report(assignments)
    
    # 保存进度报告
    with open("quality/reports/review_progress.md", "w", encoding="utf-8") as f:
        f.write(progress_report)
    
    print("专家评审自动化脚本执行完成！")
    print(f"- 创建了 {len(assignments)} 个评审任务")
    print("- 任务分配已导出到 quality/data/expert_assignments.csv")
    print("- 进度报告已保存到 quality/reports/review_progress.md")
    
    # 可选：发送邀请邮件（需要配置SMTP设置）
    # email_results = automation.send_invitation_emails(assignments)
    # print(f"邮件发送结果: 成功 {email_results['sent']}, 失败 {email_results['failed']}")

if __name__ == "__main__":
    main()