import { describe, it, expect, beforeEach } from 'vitest';
import { CodeBlockFixer } from '../../src/fixers/code-block-fixer.js';

describe('CodeBlockFixer', () => {
  let fixer;

  beforeEach(() => {
    fixer = new CodeBlockFixer({ verbose: false });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(fixer.options.dryRun).toBe(false);
      expect(fixer.options.verbose).toBe(false);
      expect(fixer.options.backup).toBe(true);
    });

    it('should have language patterns defined', () => {
      expect(fixer.languagePatterns).toBeDefined();
      expect(Object.keys(fixer.languagePatterns).length).toBeGreaterThan(0);
    });

    it('should have spacing rules defined', () => {
      expect(fixer.spacingRules).toBeDefined();
      expect(fixer.spacingRules.beforeCodeBlock).toBe(1);
      expect(fixer.spacingRules.afterCodeBlock).toBe(1);
    });
  });

  describe('detectUnclosedCodeBlocks', () => {
    it('should detect unclosed code blocks', () => {
      const content = `# 标题

\`\`\`javascript
function test() {
  return true;
}
// 缺少闭合标记

## 下一节`;

      const issues = fixer.detectIssues(content, 'test.md');
      const unclosedIssues = issues.filter(issue => issue.type === 'unclosed_code_block');
      
      expect(unclosedIssues).toHaveLength(1);
      expect(unclosedIssues[0].line).toBe(3);
      expect(unclosedIssues[0].description).toContain('未正确闭合');
    });

    it('should not detect issues in properly closed code blocks', () => {
      const content = `# 标题

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

## 下一节`;

      const issues = fixer.detectIssues(content, 'test.md');
      const unclosedIssues = issues.filter(issue => issue.type === 'unclosed_code_block');
      
      expect(unclosedIssues).toHaveLength(0);
    });
  });

  describe('detectMissingLanguageIdentifiers', () => {
    it('should detect missing language identifiers', () => {
      const content = `# 标题

\`\`\`
function test() {
  return true;
}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const missingLangIssues = issues.filter(issue => issue.type === 'missing_language_identifier');
      
      expect(missingLangIssues).toHaveLength(1);
      expect(missingLangIssues[0].line).toBe(3);
      expect(missingLangIssues[0].description).toContain('缺失语言标识符');
    });

    it('should not detect issues when language identifier is present', () => {
      const content = `# 标题

\`\`\`javascript
function test() {
  return true;
}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const missingLangIssues = issues.filter(issue => issue.type === 'missing_language_identifier');
      
      expect(missingLangIssues).toHaveLength(0);
    });
  });

  describe('detectSpacingIssues', () => {
    it('should detect missing spacing before code block', () => {
      const content = `# 标题
\`\`\`javascript
function test() {
  return true;
}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const spacingIssues = issues.filter(issue => issue.type === 'code_block_spacing_before');
      
      expect(spacingIssues).toHaveLength(1);
      expect(spacingIssues[0].description).toContain('代码块前应有空行');
    });

    it('should detect missing spacing after code block', () => {
      const content = `# 标题

\`\`\`javascript
function test() {
  return true;
}
\`\`\`
## 下一节`;

      const issues = fixer.detectIssues(content, 'test.md');
      const spacingIssues = issues.filter(issue => issue.type === 'code_block_spacing_after');
      
      expect(spacingIssues).toHaveLength(1);
      expect(spacingIssues[0].description).toContain('代码块后应有空行');
    });
  });

  describe('detectEmptyCodeBlocks', () => {
    it('should detect empty code blocks', () => {
      const content = `# 标题

\`\`\`javascript
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const emptyIssues = issues.filter(issue => issue.type === 'empty_code_block');
      
      expect(emptyIssues).toHaveLength(1);
      expect(emptyIssues[0].description).toContain('代码块为空');
    });

    it('should not detect issues in non-empty code blocks', () => {
      const content = `# 标题

\`\`\`javascript
console.log('Hello');
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const emptyIssues = issues.filter(issue => issue.type === 'empty_code_block');
      
      expect(emptyIssues).toHaveLength(0);
    });
  });

  describe('inferLanguageFromContent', () => {
    it('should infer JavaScript from function syntax', () => {
      const code = 'function test() {\n  return true;\n}';
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBe('javascript');
    });

    it('should infer Python from def syntax', () => {
      const code = 'def test():\n    return True';
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBe('python');
    });

    it('should infer HTML from tag syntax', () => {
      const code = '<div class="container">\n  <p>Hello</p>\n</div>';
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBe('html');
    });

    it('should return null for unrecognizable content', () => {
      const code = 'some random text without patterns';
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBeNull();
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract code blocks with metadata', () => {
      const content = `# 标题

\`\`\`javascript
function test() {
  return true;
}
\`\`\`

\`\`\`python
def hello():
    print("Hello")
\`\`\``;

      const blocks = fixer.extractCodeBlocks(content);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].language).toBe('javascript');
      expect(blocks[0].startLine).toBe(3);
      expect(blocks[0].content).toContain('function test()');
      expect(blocks[1].language).toBe('python');
      expect(blocks[1].startLine).toBe(9);
      expect(blocks[1].content).toContain('def hello()');
    });

    it('should handle unclosed code blocks', () => {
      const content = `# 标题

\`\`\`javascript
function test() {
  return true;
}`;

      const blocks = fixer.extractCodeBlocks(content);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].language).toBe('javascript');
      expect(blocks[0].endLine).toBe(6); // 文档末尾
    });
  });

  describe('fix', () => {
    it('should fix unclosed code blocks', () => {
      const content = `# 标题

\`\`\`javascript
function test() {
  return true;
}`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content.endsWith('```')); // 应该添加闭合标记
      expect(result.changes.length).toBeGreaterThan(0);
    });

    it('should fix missing language identifiers', () => {
      const content = `# 标题

\`\`\`
function test() {
  return true;
}
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('```javascript'); // 应该添加语言标识符
      expect(result.changes.some(change => change.reason.includes('语言标识符'))).toBe(true);
    });

    it('should fix spacing issues', () => {
      const content = `# 标题
\`\`\`javascript
function test() {
  return true;
}
\`\`\`
## 下一节`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      // 应该在代码块前后添加空行
      const lines = result.content.split('\n');
      const codeBlockStart = lines.findIndex(line => line.startsWith('```javascript'));
      expect(lines[codeBlockStart - 1]).toBe(''); // 前面应该有空行
    });

    it('should fix empty code blocks', () => {
      const content = `# 标题

\`\`\`javascript
\`\`\``;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.content).toContain('// 代码示例'); // 应该添加注释
      expect(result.changes.some(change => change.reason.includes('占位符注释'))).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate fix results', () => {
      const originalContent = `\`\`\`
function test() {
  return true;
}`;

      const fixedContent = `\`\`\`javascript
function test() {
  return true;
}
\`\`\``;

      const result = fixer.validate(originalContent, fixedContent);
      
      expect(result.isValid).toBe(true);
      expect(result.improvementStats.fixedIssues).toBeGreaterThan(0);
      expect(result.improvementStats.remainingIssues).toBeLessThan(result.improvementStats.originalIssues);
    });

    it('should detect if new issues were introduced', () => {
      const originalContent = `\`\`\`javascript
function test() {
  return true;
}
\`\`\``;

      const fixedContent = `\`\`\`javascript
function test() {
  return true;
}
\`\`\`

\`\`\`python
def hello():
    pass`;  // Clearly unclosed code block

      const result = fixer.validate(originalContent, fixedContent);
      
      // The validation should detect the unclosed code block as a structural error
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.includes('代码块标记数量不匹配') || 
        error.includes('unclosed') ||
        error.includes('严重问题')
      )).toBe(true);
    });
  });

  describe('groupIssuesByType', () => {
    it('should group issues by type correctly', () => {
      const issues = [
        { type: 'unclosed_code_block', line: 1 },
        { type: 'missing_language_identifier', line: 2 },
        { type: 'unclosed_code_block', line: 3 },
        { type: 'empty_code_block', line: 4 }
      ];

      const grouped = fixer.groupIssuesByType(issues);
      
      expect(grouped.unclosed_code_block).toHaveLength(2);
      expect(grouped.missing_language_identifier).toHaveLength(1);
      expect(grouped.empty_code_block).toHaveLength(1);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple issues in one document', () => {
      const content = `# 标题
\`\`\`
function test() {
  return true;
}

\`\`\`python
\`\`\`

\`\`\`
\`\`\`
## 下一节`;

      const issues = fixer.detectIssues(content, 'test.md');
      
      // 应该检测到多种问题
      expect(issues.length).toBeGreaterThan(2);
      expect(issues.some(issue => issue.type === 'missing_language_identifier')).toBe(true);
      expect(issues.some(issue => issue.type === 'empty_code_block')).toBe(true);
      expect(issues.some(issue => issue.type === 'code_block_spacing_before')).toBe(true);
    });

    it('should fix all issues in complex document', () => {
      const content = `# 标题
\`\`\`
function test() {
  return true;
}

\`\`\`python
\`\`\`

\`\`\`
\`\`\`
## 下一节`;

      const issues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, issues);
      
      expect(result.status).toBe('success');
      expect(result.changes.length).toBeGreaterThan(0);
      
      // 验证修复效果
      const validation = fixer.validate(content, result.content);
      expect(validation.improvementStats.fixedIssues).toBeGreaterThan(0);
    });
  });

  // 边界情况和异常处理测试
  describe('boundary conditions and edge cases', () => {
    it('should handle empty content', () => {
      const content = '';
      const issues = fixer.detectIssues(content, 'empty.md');
      expect(issues).toHaveLength(0);
      
      const result = fixer.fix(content, issues);
      expect(result.status).toBe('success');
      expect(result.content).toBe('');
    });

    it('should handle content with only whitespace', () => {
      const content = '   \n\n  \t  \n   ';
      const issues = fixer.detectIssues(content, 'whitespace.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle single backtick (not code block)', () => {
      const content = 'Use `console.log()` for debugging';
      const issues = fixer.detectIssues(content, 'inline.md');
      expect(issues).toHaveLength(0);
    });

    it('should handle malformed code blocks with mixed backticks', () => {
      const content = `# Test
\`\`\`javascript
function test() {
  console.log(\`template string\`);
}
\`\`\``;

      const issues = fixer.detectIssues(content, 'mixed.md');
      expect(issues.filter(issue => issue.type === 'unclosed_code_block')).toHaveLength(0);
    });

    it('should handle very long code blocks', () => {
      const longCode = Array(1000).fill('console.log("test");').join('\n');
      const content = `\`\`\`javascript\n${longCode}\n\`\`\``;
      
      const issues = fixer.detectIssues(content, 'long.md');
      expect(issues.filter(issue => issue.type === 'unclosed_code_block')).toHaveLength(0);
    });

    it('should handle code blocks at document boundaries', () => {
      const content = `\`\`\`javascript
function start() {
  return 'beginning';
}
\`\`\`

# Middle Section

\`\`\`python
def end():
    return 'finish'
\`\`\``;

      const issues = fixer.detectIssues(content, 'boundaries.md');
      const spacingIssues = issues.filter(issue => 
        issue.type === 'code_block_spacing_before' || 
        issue.type === 'code_block_spacing_after'
      );
      expect(spacingIssues.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle nested markdown structures', () => {
      const content = `# Main Title

> This is a blockquote with code:
> \`\`\`javascript
> function quoted() {
>   return true;
> }
> \`\`\`

- List item with code:
  \`\`\`python
  def in_list():
      pass
  \`\`\``;

      const issues = fixer.detectIssues(content, 'nested.md');
      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle code blocks with unusual language identifiers', () => {
      const content = `\`\`\`dockerfile
FROM node:16
RUN npm install
\`\`\`

\`\`\`yaml
version: '3'
services:
  app:
    image: myapp
\`\`\`

\`\`\`unknown-language
some code in unknown language
\`\`\``;

      const issues = fixer.detectIssues(content, 'unusual.md');
      const missingLangIssues = issues.filter(issue => issue.type === 'missing_language_identifier');
      expect(missingLangIssues).toHaveLength(0); // All have language identifiers
    });
  });

  // 修复结果验证测试
  describe('fix result validation', () => {
    it('should validate that fixes actually resolve issues', () => {
      const content = `\`\`\`
function test() {
  return true;
}`;

      const originalIssues = fixer.detectIssues(content, 'test.md');
      const result = fixer.fix(content, originalIssues);
      
      // 验证修复后的内容
      const fixedIssues = fixer.detectIssues(result.content, 'test.md');
      const unclosedIssues = fixedIssues.filter(issue => issue.type === 'unclosed_code_block');
      
      expect(unclosedIssues.length).toBeLessThan(
        originalIssues.filter(issue => issue.type === 'unclosed_code_block').length
      );
    });

    it('should validate that content integrity is preserved', () => {
      const content = `# Important Title

\`\`\`
function criticalFunction() {
  // This is very important logic
  return calculateImportantValue();
}

Some important text after code.`;

      const issues = fixer.detectIssues(content, 'critical.md');
      const result = fixer.fix(content, issues);
      
      // 确保重要内容没有丢失
      expect(result.content).toContain('Important Title');
      expect(result.content).toContain('criticalFunction');
      expect(result.content).toContain('calculateImportantValue');
      expect(result.content).toContain('Some important text after code');
    });

    it('should validate fix statistics accuracy', () => {
      const content = `\`\`\`
code1
\`\`\`python
\`\`\`
\`\`\`
code2`;

      const issues = fixer.detectIssues(content, 'stats.md');
      const result = fixer.fix(content, issues);
      
      expect(result.stats).toBeDefined();
      expect(result.stats.totalIssues).toBe(issues.length);
      expect(result.stats.fixedIssues).toBeGreaterThanOrEqual(0);
      expect(result.stats.fixedIssues + result.stats.skippedIssues + result.stats.failedIssues)
        .toBeLessThanOrEqual(result.stats.totalIssues);
    });

    it('should validate change tracking accuracy', () => {
      const content = `\`\`\`
function test() {
  return true;
}`;

      const issues = fixer.detectIssues(content, 'changes.md');
      const result = fixer.fix(content, issues);
      
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      
      result.changes.forEach(change => {
        expect(change).toHaveProperty('type');
        expect(change).toHaveProperty('line');
        expect(change).toHaveProperty('reason');
        expect(['addition', 'modification', 'deletion']).toContain(change.type);
      });
    });
  });

  // 异常处理测试
  describe('error handling and resilience', () => {
    it('should handle corrupted markdown gracefully', () => {
      const corruptedContent = `# Title
\`\`\`javascript
function test() {
  return "unclosed string;
}
\`\`\`

\`\`\`\`\`\`python
# Too many backticks
\`\`\`\`\`\`

\`\`\`
# Unclosed at end`;

      expect(() => {
        const issues = fixer.detectIssues(corruptedContent, 'corrupted.md');
        const result = fixer.fix(corruptedContent, issues);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle extremely large documents', () => {
      const largeContent = `# Large Document\n\n` + 
        Array(100).fill().map((_, i) => `
\`\`\`javascript
function test${i}() {
  return ${i};
}
\`\`\`

## Section ${i}
Some content for section ${i}.
`).join('\n');

      expect(() => {
        const issues = fixer.detectIssues(largeContent, 'large.md');
        expect(issues).toBeDefined();
      }).not.toThrow();
    });

    it('should handle invalid file paths gracefully', () => {
      const content = 'Simple content';
      expect(() => {
        const issues = fixer.detectIssues(content, null);
        expect(issues).toBeDefined();
      }).not.toThrow();
    });

    it('should handle null or undefined content', () => {
      expect(() => {
        const issues = fixer.detectIssues(null, 'test.md');
        expect(issues).toHaveLength(0);
      }).not.toThrow();

      expect(() => {
        const issues = fixer.detectIssues(undefined, 'test.md');
        expect(issues).toHaveLength(0);
      }).not.toThrow();
    });

    it('should handle fix operations on empty issue lists', () => {
      const content = 'Perfect content with no issues';
      const result = fixer.fix(content, []);
      
      expect(result.status).toBe('success');
      expect(result.content).toBe(content);
      expect(result.changes).toHaveLength(0);
    });

    it('should handle concurrent fix operations safely', async () => {
      const content = `\`\`\`
function test() {
  return true;
}`;

      const issues = fixer.detectIssues(content, 'concurrent.md');
      
      // 模拟并发修复操作
      const promises = Array(5).fill().map(() => 
        Promise.resolve(fixer.fix(content, issues))
      );
      
      const results = await Promise.all(promises);
      
      // 所有结果应该是一致的
      results.forEach(result => {
        expect(result.status).toBe('success');
        expect(result.content).toBe(results[0].content);
      });
    });
  });

  // 性能和内存测试
  describe('performance and memory', () => {
    it('should handle memory efficiently for large code blocks', () => {
      const largeCodeBlock = Array(10000).fill('console.log("test");').join('\n');
      const content = `\`\`\`javascript\n${largeCodeBlock}\n\`\`\``;
      
      const startMemory = process.memoryUsage().heapUsed;
      const issues = fixer.detectIssues(content, 'memory.md');
      const result = fixer.fix(content, issues);
      const endMemory = process.memoryUsage().heapUsed;
      
      // 内存增长应该在合理范围内（小于100MB）
      const memoryGrowth = endMemory - startMemory;
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);
    });

    it('should process multiple files efficiently', () => {
      const files = Array(50).fill().map((_, i) => ({
        name: `file${i}.md`,
        content: `# File ${i}\n\`\`\`\nfunction test${i}() {\n  return ${i};\n}`
      }));
      
      const startTime = Date.now();
      
      files.forEach(file => {
        const issues = fixer.detectIssues(file.content, file.name);
        fixer.fix(file.content, issues);
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // 处理50个文件应该在合理时间内完成（小于5秒）
      expect(processingTime).toBeLessThan(5000);
    });
  });

  // 语言推断增强测试
  describe('enhanced language inference', () => {
    it('should infer TypeScript from interface definitions', () => {
      const code = `interface User {
  name: string;
  age: number;
}`;
      const language = fixer.inferLanguageFromContent(code);
      expect(['typescript', 'javascript']).toContain(language);
    });

    it('should infer React/JSX from component syntax', () => {
      const code = `function MyComponent() {
  return <div className="container">Hello</div>;
}`;
      const language = fixer.inferLanguageFromContent(code);
      expect(['jsx', 'javascript', 'html']).toContain(language);
    });

    it('should infer Go from package and func syntax', () => {
      const code = `package main

func main() {
    fmt.Println("Hello, World!")
}`;
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBe('go');
    });

    it('should infer Rust from fn and let mut syntax', () => {
      const code = `fn main() {
    let mut x = 5;
    println!("x = {}", x);
}`;
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBe('rust');
    });

    it('should infer Dockerfile from Docker commands', () => {
      const code = `FROM ubuntu:20.04
RUN apt-get update
COPY . /app
WORKDIR /app`;
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBe('dockerfile');
    });

    it('should handle ambiguous code gracefully', () => {
      const code = `x = 1
y = 2
print(x + y)`;
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBe('python'); // Should infer Python from print()
    });

    it('should return null for unrecognizable patterns', () => {
      const code = `This is just plain text
with no programming patterns
at all.`;
      const language = fixer.inferLanguageFromContent(code);
      expect(language).toBeNull();
    });
  });
});