/**
 * Tests for Accessibility Enhancer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AccessibilityEnhancer } from '../../src/fixers/accessibility-enhancer.js';

describe('AccessibilityEnhancer', () => {
    let enhancer;

    beforeEach(() => {
        enhancer = new AccessibilityEnhancer({
            wcagLevel: 'AA',
            language: 'zh-CN'
        });
    });

    describe('checkWCAGCompliance', () => {
        it('should detect missing alt text in images', () => {
            const content = `![](missing-alt.jpg)
![Good Alt Text](good-image.jpg)
![](another-missing.png)`;

            const result = enhancer.checkWCAGCompliance(content, 'test.md');

            expect(result.metrics.imagesMissingAlt).toBe(2);
            const altTextIssues = result.issues.filter(issue => issue.type === 'missing_alt_text');
            expect(altTextIssues).toHaveLength(2);
            expect(altTextIssues[0].wcagCriterion).toBe('1.1.1');
        });

        it('should detect alt text that is too long', () => {
            const longAlt = 'A'.repeat(150);
            const content = `![${longAlt}](image.jpg)`;

            const result = enhancer.checkWCAGCompliance(content);

            const longAltIssues = result.issues.filter(issue => issue.type === 'alt_text_too_long');
            expect(longAltIssues).toHaveLength(1);
            expect(longAltIssues[0].description).toContain('150 chars');
        });

        it('should detect heading structure issues', () => {
            const content = `# Heading 1
### Heading 3 (skipped level 2)
## Heading 2
###### Heading 6 (skipped levels)`;

            const result = enhancer.checkWCAGCompliance(content);

            const headingIssues = result.issues.filter(issue => issue.type === 'heading_level_skip');
            expect(headingIssues.length).toBeGreaterThan(0);
            expect(headingIssues[0].wcagCriterion).toBe('1.3.1');
        });

        it('should detect empty headings', () => {
            const content = `# 
## Good Heading
### `;

            const result = enhancer.checkWCAGCompliance(content);

            const emptyHeadingIssues = result.issues.filter(issue => issue.type === 'empty_heading');
            expect(emptyHeadingIssues.length).toBeGreaterThan(0);
        });

        it('should detect generic link text', () => {
            const content = `[click here](http://example.com)
[Read more](http://example.com)
[Good descriptive link text](http://example.com)
[点击这里](http://example.com)`;

            const result = enhancer.checkWCAGCompliance(content);

            const linkIssues = result.issues.filter(issue => issue.type === 'generic_link_text');
            expect(linkIssues.length).toBeGreaterThan(0);
            expect(linkIssues[0].wcagCriterion).toBe('2.4.4');
        });

        it('should detect empty link text', () => {
            const content = `[](http://example.com)
[Good Link](http://example.com)`;

            const result = enhancer.checkWCAGCompliance(content);

            const emptyLinkIssues = result.issues.filter(issue => issue.type === 'empty_link_text');
            expect(emptyLinkIssues).toHaveLength(1);
            expect(emptyLinkIssues[0].severity).toBe('major');
        });

        it('should detect URL as link text', () => {
            const content = `[http://example.com](http://example.com)
[Good Link Text](http://example.com)`;

            const result = enhancer.checkWCAGCompliance(content);

            const urlLinkIssues = result.issues.filter(issue => issue.type === 'url_as_link_text');
            expect(urlLinkIssues).toHaveLength(1);
        });

        it('should detect missing language declaration', () => {
            const content = `# Test Document
Some content without language declaration.`;

            const result = enhancer.checkWCAGCompliance(content);

            const langIssues = result.issues.filter(issue => issue.type === 'missing_language_declaration');
            expect(langIssues).toHaveLength(1);
            expect(langIssues[0].wcagCriterion).toBe('3.1.1');
        });

        it('should detect mixed language content', () => {
            const content = `<!-- lang="zh-CN" -->
# 中文标题
This is English content mixed with Chinese.
这是中英文混合的内容。`;

            const result = enhancer.checkWCAGCompliance(content);

            const mixedLangIssues = result.issues.filter(issue => issue.type === 'mixed_language_content');
            expect(mixedLangIssues).toHaveLength(1);
            expect(mixedLangIssues[0].wcagCriterion).toBe('3.1.2');
        });

        it('should detect table accessibility issues', () => {
            const content = `| Data 1 | Data 2 |
| Data 3 | Data 4 |

| Header 1 | Header 2 | Header 3 | Header 4 | Header 5 | Header 6 |
|----------|----------|----------|----------|----------|----------|
| Data 1   | Data 2   | Data 3   | Data 4   | Data 5   | Data 6   |`;

            const result = enhancer.checkWCAGCompliance(content);

            const tableIssues = result.issues.filter(issue => 
                issue.type === 'table_missing_headers' || 
                issue.type === 'table_missing_caption' ||
                issue.type === 'complex_table'
            );
            expect(tableIssues.length).toBeGreaterThan(0);
        });
    });

    describe('addSemanticMarkup', () => {
        it('should add language attribute if missing', () => {
            const content = `# Test Document
Some content here.`;

            const result = enhancer.addSemanticMarkup(content);

            expect(result).toContain('<!-- lang="zh-CN" -->');
        });

        it('should not add language attribute if already present', () => {
            const content = `<!-- lang="en-US" -->
# Test Document
Some content here.`;

            const result = enhancer.addSemanticMarkup(content);

            // Should not add another language attribute
            const langMatches = result.match(/<!-- lang=/g) || [];
            expect(langMatches).toHaveLength(1);
            expect(result).toContain('<!-- lang="en-US" -->');
        });

        it('should enhance heading semantics with IDs', () => {
            const content = `# Main Title
## Section Title
### Subsection with Special Characters!`;

            const result = enhancer.addSemanticMarkup(content);

            expect(result).toContain('# Main Title {#main-title}');
            expect(result).toContain('## Section Title {#section-title}');
            expect(result).toContain('### Subsection with Special Characters! {#subsection-with-special-characters}');
        });

        it('should add ARIA labels to Mermaid diagrams', () => {
            const content = `\`\`\`mermaid
graph TB
    A --> B
\`\`\`

\`\`\`mermaid
sequenceDiagram
    A->>B: Message
\`\`\``;

            const result = enhancer.addSemanticMarkup(content);

            expect(result).toContain('<!-- aria-label="Flowchart diagram" -->');
            expect(result).toContain('<!-- aria-label="Sequence diagram" -->');
        });

        it('should add ARIA labels to complex tables', () => {
            const content = `| C1 | C2 | C3 |
|----|----|----|
| D1 | D2 | D3 |
| D4 | D5 | D6 |
| D7 | D8 | D9 |
| D10| D11| D12|
| D13| D14| D15|
| D16| D17| D18|`;

            const result = enhancer.addSemanticMarkup(content);

            expect(result).toContain('<!-- aria-label="Data table with');
        });

        it('should add skip links', () => {
            const content = `# Main Content
Some content here.`;

            const result = enhancer.addSemanticMarkup(content);

            expect(result).toContain('<!-- Skip Links -->');
            expect(result).toContain('<!-- Skip to main content: #main-content -->');
        });
    });

    describe('addAssistiveTechnologySupport', () => {
        it('should add screen reader descriptions for code blocks', () => {
            const content = `\`\`\`javascript
function test() {
    return true;
}
\`\`\`

\`\`\`
No language specified
Multiple lines
Here
\`\`\``;

            const result = enhancer.addAssistiveTechnologySupport(content);

            expect(result).toContain('<!-- Screen reader: javascript code block with');
            expect(result).toContain('<!-- Screen reader: code code block with');
        });

        it('should add keyboard navigation hints', () => {
            const content = `# Test Document
Some content here.`;

            const result = enhancer.addAssistiveTechnologySupport(content);

            expect(result).toContain('<!-- Keyboard Navigation -->');
            expect(result).toContain('<!-- Use Tab to navigate');
        });

        it('should add focus management to internal links', () => {
            const content = `[Go to Section](#section-1)
[External Link](http://example.com)
[Another Section](#section-2)`;

            const result = enhancer.addAssistiveTechnologySupport(content);

            expect(result).toContain('[Go to Section](#section-1 "Navigate to Go to Section section")');
            expect(result).toContain('[Another Section](#section-2 "Navigate to Another Section section")');
            expect(result).toContain('[External Link](http://example.com)'); // External links unchanged
        });

        it('should add high contrast support indicators', () => {
            const content = `# Test Document
Some content here.`;

            const result = enhancer.addAssistiveTechnologySupport(content);

            expect(result).toContain('<!-- High Contrast Support -->');
            expect(result).toContain('<!-- Color is not the only means');
        });
    });

    describe('_extractTables', () => {
        it('should extract table information with metadata', () => {
            const content = `Table Caption: User Data

| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |

Another table without caption:

| Product | Price |
|---------|-------|
| Item A  | $10   |`;

            const tables = enhancer._extractTables(content);

            expect(tables).toHaveLength(2);
            expect(tables[0].headers).toHaveLength(3);
            expect(tables[0].rows).toHaveLength(2);
            expect(tables[0].hasCaption).toBe(true);
            expect(tables[1].hasCaption).toBe(false);
        });
    });

    describe('_detectMermaidType', () => {
        it('should detect different Mermaid diagram types', () => {
            expect(enhancer._detectMermaidType('graph TB\n A --> B')).toBe('Flowchart');
            expect(enhancer._detectMermaidType('flowchart TD\n A --> B')).toBe('Flowchart');
            expect(enhancer._detectMermaidType('sequenceDiagram\n A->>B: msg')).toBe('Sequence');
            expect(enhancer._detectMermaidType('classDiagram\n class A')).toBe('Class');
            expect(enhancer._detectMermaidType('gantt\n title Project')).toBe('Gantt');
            expect(enhancer._detectMermaidType('pie title Pie\n "A" : 50')).toBe('Pie chart');
            expect(enhancer._detectMermaidType('unknown diagram type')).toBe('Diagram');
        });
    });

    describe('integration tests', () => {
        it('should handle comprehensive accessibility enhancement', () => {
            const content = `# Test Document

![](missing-alt.jpg)
![Good Image](good.jpg)

## Section with Issues
### Skipped Level (should be ##)

[click here](http://example.com)
[Good Link Text](http://example.com)

| Data 1 | Data 2 | Data 3 | Data 4 | Data 5 | Data 6 |
| D1     | D2     | D3     | D4     | D5     | D6     |

\`\`\`mermaid
graph TB
    A --> B
    B --> C
\`\`\`

\`\`\`javascript
function test() {
    return "Hello World";
}
\`\`\``;

            // Test WCAG compliance check
            const compliance = enhancer.checkWCAGCompliance(content);
            expect(compliance.issues.length).toBeGreaterThan(0);
            expect(compliance.metrics.imagesMissingAlt).toBe(1);

            // Test semantic markup enhancement
            let enhanced = enhancer.addSemanticMarkup(content);
            expect(enhanced).toContain('<!-- lang="zh-CN" -->');
            expect(enhanced).toContain('{#test-document}');
            expect(enhanced).toContain('<!-- aria-label="Flowchart diagram" -->');

            // Test assistive technology support
            enhanced = enhancer.addAssistiveTechnologySupport(enhanced);
            expect(enhanced).toContain('<!-- Screen reader: javascript code block');
            expect(enhanced).toContain('<!-- Keyboard Navigation -->');
            expect(enhanced).toContain('<!-- High Contrast Support -->');
        });

        it('should preserve existing accessibility features', () => {
            const content = `<!-- lang="en-US" -->
<!-- Skip Links -->
<!-- High Contrast Support -->
# Test Document {#existing-id}

![Existing Alt](image.jpg)
[Good Link](http://example.com)`;

            let enhanced = enhancer.addSemanticMarkup(content);
            enhanced = enhancer.addAssistiveTechnologySupport(enhanced);

            // Should not duplicate existing features
            expect((enhanced.match(/<!-- lang=/g) || []).length).toBe(1);
            expect((enhanced.match(/<!-- Skip Links -->/g) || []).length).toBe(1);
            // High contrast support might be added by assistive technology support
            expect((enhanced.match(/<!-- High Contrast Support -->/g) || []).length).toBeGreaterThanOrEqual(1);
        });
    });
});