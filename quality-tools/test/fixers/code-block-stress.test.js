import { describe, it, expect, beforeEach } from 'vitest';
import { CodeBlockFixer } from '../../src/fixers/code-block-fixer.js';

describe('CodeBlockFixer - Stress Testing and Edge Cases', () => {
  let fixer;

  beforeEach(() => {
    fixer = new CodeBlockFixer({ verbose: false });
  });

  describe('stress testing', () => {
    it('should handle extremely large documents efficiently', () => {
      // Create a large document with 1000 code blocks
      const largeContent = Array(1000).fill().map((_, i) => `
## Section ${i}

Some text before code block ${i}.

\`\`\`
function test${i}() {
  return ${i};
}

More text after code block ${i}.
`).join('\n');

      const startTime = Date.now();
      const issues = fixer.detectIssues(largeContent, 'large.md');
      const result = fixer.fix(largeContent, issues);
      const endTime = Date.now();

      // Should complete within reasonable time (10 seconds for 1000 blocks)
      expect(endTime - startTime).toBeLessThan(10000);
      
      // Should still produce valid results
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.status).toBe('success');
    });

    it('should handle documents with very long code blocks', () => {
      const veryLongCode = Array(5000).fill('console.log("This is a very long line of code that repeats many times");').join('\n');
      const content = `# Test Document

\`\`\`javascript
${veryLongCode}
\`\`\`

End of document.`;

      const startTime = Date.now();
      const issues = fixer.detectIssues(content, 'long-code.md');
      const result = fixer.fix(content, issues);
      const endTime = Date.now();

      // Should handle large code blocks efficiently
      expect(endTime - startTime).toBeLessThan(5000);
      expect(result.content).toContain('```javascript');
      expect(result.content).toContain('End of document');
    });

    it('should handle documents with many small issues', () => {
      // Create document with 500 small issues
      const manyIssuesContent = Array(500).fill().map((_, i) => `
\`\`\`
small code ${i}
\`\`\`python
\`\`\`
`).join('\n');

      const issues = fixer.detectIssues(manyIssuesContent, 'many-issues.md');
      expect(issues.length).toBeGreaterThan(1000); // Should detect many issues

      const startTime = Date.now();
      const result = fixer.fix(manyIssuesContent, issues);
      const endTime = Date.now();

      // Should handle many issues efficiently
      expect(endTime - startTime).toBeLessThan(15000);
      expect(result.stats.fixedIssues).toBeGreaterThan(0);
    });

    it('should handle concurrent processing safely', async () => {
      const content = `\`\`\`
function concurrent() {
  return 'test';
}`;

      // Simulate concurrent processing
      const promises = Array(20).fill().map(async (_, i) => {
        const issues = fixer.detectIssues(content, `concurrent-${i}.md`);
        return fixer.fix(content, issues);
      });

      const results = await Promise.all(promises);

      // All results should be consistent
      results.forEach((result, i) => {
        expect(result.status).toBe('success');
        expect(result.content).toBe(results[0].content);
      });
    });
  });

  describe('memory management', () => {
    it('should not leak memory with repeated operations', () => {
      const content = `\`\`\`
function memoryTest() {
  return 'test';
}`;

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const issues = fixer.detectIssues(content, `memory-${i}.md`);
        const result = fixer.fix(content, issues);
        fixer.validate(content, result.content);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle garbage collection efficiently', () => {
      const largeContent = Array(100).fill().map((_, i) => `
\`\`\`javascript
function test${i}() {
  const data = new Array(1000).fill('data');
  return data.length;
}
\`\`\`
`).join('\n');

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const beforeMemory = process.memoryUsage().heapUsed;

      const issues = fixer.detectIssues(largeContent, 'gc-test.md');
      const result = fixer.fix(largeContent, issues);

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const memoryDiff = afterMemory - beforeMemory;

      // Memory usage should be reasonable
      expect(memoryDiff).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('extreme edge cases', () => {
    it('should handle malformed Unicode characters', () => {
      const unicodeContent = `# Unicode Test

\`\`\`javascript
function test() {
  const emoji = '🚀💻🔥';
  const chinese = '测试代码';
  const arabic = 'اختبار';
  return emoji + chinese + arabic;
}`;

      expect(() => {
        const issues = fixer.detectIssues(unicodeContent, 'unicode.md');
        const result = fixer.fix(unicodeContent, issues);
        expect(result.content).toContain('🚀💻🔥');
        expect(result.content).toContain('测试代码');
        expect(result.content).toContain('اختبار');
      }).not.toThrow();
    });

    it('should handle extremely nested markdown structures', () => {
      const nestedContent = `
> Quote level 1
> > Quote level 2
> > > Quote level 3
> > > \`\`\`javascript
> > > function nested() {
> > >   return 'deep';
> > > }
> > > \`\`\`
> > Back to level 2
> Back to level 1

- List level 1
  - List level 2
    - List level 3
      \`\`\`python
      def deeply_nested():
          return True
      \`\`\`
    - Back to level 3
  - Back to level 2
- Back to level 1`;

      expect(() => {
        const issues = fixer.detectIssues(nestedContent, 'nested.md');
        const result = fixer.fix(nestedContent, issues);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle code blocks with unusual content', () => {
      const unusualContent = `
\`\`\`binary
01001000 01100101 01101100 01101100 01101111
\`\`\`

\`\`\`regex
^(?:[a-z0-9!#$%&'*+/=?^_\`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_\`{|}~-]+)*|"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*")@
\`\`\`

\`\`\`ascii-art
    /\\_/\\  
   ( o.o ) 
    > ^ <
\`\`\`

\`\`\`
<!-- This is HTML inside a code block -->
<script>alert('xss');</script>
\`\`\``;

      const issues = fixer.detectIssues(unusualContent, 'unusual.md');
      const result = fixer.fix(unusualContent, issues);

      expect(result.content).toContain('01001000');
      expect(result.content).toContain('regex');
      expect(result.content).toContain('/\\_/\\');
      expect(result.content).toContain('<script>');
    });

    it('should handle code blocks with mixed line endings', () => {
      const mixedLineEndings = `# Mixed Line Endings\r\n\r\n\`\`\`javascript\r\nfunction windows() {\r\n  return 'CRLF';\r\n}\n\`\`\`\n\n\`\`\`python\ndef unix():\n    return 'LF'\n\`\`\`\r\n`;

      const issues = fixer.detectIssues(mixedLineEndings, 'mixed-endings.md');
      const result = fixer.fix(mixedLineEndings, issues);

      expect(result.content).toContain('function windows');
      expect(result.content).toContain('def unix');
    });

    it('should handle extremely long lines', () => {
      const veryLongLine = 'a'.repeat(10000);
      const content = `# Long Line Test

\`\`\`javascript
const veryLongString = "${veryLongLine}";
function processLongString() {
  return veryLongString.length;
}
\`\`\``;

      expect(() => {
        const issues = fixer.detectIssues(content, 'long-line.md');
        const result = fixer.fix(content, issues);
        expect(result.content).toContain(veryLongLine);
      }).not.toThrow();
    });
  });

  describe('error recovery and resilience', () => {
    it('should recover from parsing errors gracefully', () => {
      const corruptedContent = `# Corrupted Document

\`\`\`javascript
function broken() {
  // Intentionally broken syntax
  return "unclosed string;
  const x = {
    broken: object
  // missing closing brace
}
\`\`\`

\`\`\`\`\`\`python
# Too many backticks at start
def test():
    pass
\`\`\`

\`\`\`
# No language, no closing
function orphaned() {
  return 'lost';
}

## Heading in middle of code block?

More code here...`;

      expect(() => {
        const issues = fixer.detectIssues(corruptedContent, 'corrupted.md');
        const result = fixer.fix(corruptedContent, issues);
        
        // Should not crash and should produce some result
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(typeof result.content).toBe('string');
      }).not.toThrow();
    });

    it('should handle circular references in content', () => {
      const circularContent = `# Circular References

\`\`\`javascript
const obj = {};
obj.self = obj;
obj.toString = function() { return this.self.toString(); };
\`\`\`

[Link to self](#circular-references)

\`\`\`
Recursive content that references itself
See: Recursive content that references itself
\`\`\``;

      expect(() => {
        const issues = fixer.detectIssues(circularContent, 'circular.md');
        const result = fixer.fix(circularContent, issues);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle stack overflow scenarios', () => {
      // Create deeply nested structure that might cause stack overflow
      const deepNesting = Array(1000).fill().reduce((acc, _, i) => {
        return `> Level ${i}\n${acc}`;
      }, `\`\`\`javascript
function deepFunction() {
  return 'deep';
}
\`\`\``);

      expect(() => {
        const issues = fixer.detectIssues(deepNesting, 'deep.md');
        const result = fixer.fix(deepNesting, issues);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle infinite loop prevention', () => {
      // Content that might cause infinite loops in regex
      const problematicContent = `
\`\`\`javascript
// This pattern might cause regex issues
const pattern = /^(a+)+$/;
const input = 'a'.repeat(100) + 'b';
pattern.test(input); // Potential catastrophic backtracking
\`\`\`

\`\`\`
${'```'.repeat(100)}
Nested backticks that might confuse parser
${'```'.repeat(100)}
\`\`\``;

      const startTime = Date.now();
      
      expect(() => {
        const issues = fixer.detectIssues(problematicContent, 'problematic.md');
        const result = fixer.fix(problematicContent, issues);
        
        const endTime = Date.now();
        // Should not take too long (prevent infinite loops)
        expect(endTime - startTime).toBeLessThan(5000);
        
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('boundary value testing', () => {
    it('should handle minimum valid input', () => {
      const minimalContent = '```\n```';
      
      const issues = fixer.detectIssues(minimalContent, 'minimal.md');
      const result = fixer.fix(minimalContent, issues);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle maximum reasonable input size', () => {
      // Create a document at the upper limit of reasonable size (10MB)
      const maxContent = Array(100000).fill('```javascript\nfunction test() { return true; }\n```\n\n').join('');
      
      expect(() => {
        const issues = fixer.detectIssues(maxContent, 'max.md');
        // Don't actually fix this large content in tests, just ensure detection works
        expect(issues).toBeDefined();
        expect(Array.isArray(issues)).toBe(true);
      }).not.toThrow();
    });

    it('should handle edge cases in line counting', () => {
      const edgeCaseContent = `\n\n\n\`\`\`\n\n\ncode\n\n\n\`\`\`\n\n\n`;
      
      const issues = fixer.detectIssues(edgeCaseContent, 'edge-lines.md');
      const result = fixer.fix(edgeCaseContent, issues);
      
      // Should handle empty lines correctly
      expect(result).toBeDefined();
      expect(result.content).toContain('code');
    });

    it('should handle zero-width characters and invisible content', () => {
      const invisibleContent = `# Title with zero-width space\u200B

\`\`\`javascript\u200C
function\u200Dtest() {
  return\u2060'invisible';
}
\`\`\`\uFEFF`;

      expect(() => {
        const issues = fixer.detectIssues(invisibleContent, 'invisible.md');
        const result = fixer.fix(invisibleContent, issues);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('performance benchmarking', () => {
    it('should maintain consistent performance across different document types', () => {
      const testCases = [
        {
          name: 'simple',
          content: '```\ncode\n```'
        },
        {
          name: 'complex',
          content: Array(50).fill().map((_, i) => `
# Section ${i}
\`\`\`javascript
function test${i}() {
  return ${i};
}
\`\`\`
`).join('\n')
        },
        {
          name: 'mixed-issues',
          content: Array(20).fill().map((_, i) => `
\`\`\`
code ${i}
\`\`\`python
\`\`\`
`).join('\n')
        }
      ];

      const results = testCases.map(testCase => {
        const startTime = Date.now();
        const issues = fixer.detectIssues(testCase.content, `${testCase.name}.md`);
        const result = fixer.fix(testCase.content, issues);
        const endTime = Date.now();

        return {
          name: testCase.name,
          time: endTime - startTime,
          issues: issues.length,
          fixed: result.stats?.fixedIssues || 0
        };
      });

      // Performance should be reasonable for all cases
      results.forEach(result => {
        expect(result.time).toBeLessThan(2000); // Less than 2 seconds
      });

      // Log performance results for analysis
      if (process.env.VERBOSE_TESTS) {
        console.log('Performance Results:', results);
      }
    });
  });
});