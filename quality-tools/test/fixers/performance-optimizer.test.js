/**
 * Tests for Performance Optimizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceOptimizer } from '../../src/fixers/performance-optimizer.js';

describe('PerformanceOptimizer', () => {
    let optimizer;

    beforeEach(() => {
        optimizer = new PerformanceOptimizer({
            maxImageSize: 1024 * 1024,
            maxTableColumns: 8,
            maxMermaidNodes: 20,
            mobileBreakpoint: 768
        });
    });

    describe('analyzePerformance', () => {
        it('should analyze document performance metrics', () => {
            const content = `# Test Document

![Test Image](test.jpg)
![Another Image](large-image.png)

| Col1 | Col2 | Col3 | Col4 | Col5 | Col6 | Col7 | Col8 | Col9 |
|------|------|------|------|------|------|------|------|------|
| Data | Data | Data | Data | Data | Data | Data | Data | Data |

\`\`\`mermaid
graph TB
    A --> B
    B --> C
    C --> D
\`\`\`
`;

            const result = optimizer.analyzePerformance(content, 'test.md');

            expect(result.issues).toBeDefined();
            expect(result.metrics).toBeDefined();
            expect(result.metrics.imageCount).toBe(2);
            expect(result.metrics.tableCount).toBe(1);
            expect(result.metrics.mermaidCount).toBe(1);
            expect(result.metrics.complexTables).toBe(1); // 9 columns > 8
        });

        it('should detect images missing lazy loading', () => {
            const content = `![Test Image](test.jpg)
![Lazy Image](test2.jpg "loading=lazy")`;

            const result = optimizer.analyzePerformance(content);

            const lazyLoadingIssues = result.issues.filter(issue => issue.type === 'image_loading');
            expect(lazyLoadingIssues).toHaveLength(1);
            expect(lazyLoadingIssues[0].description).toContain('Image 1 missing lazy loading');
        });

        it('should detect complex tables', () => {
            const content = `| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 |
|----|----|----|----|----|----|----|----|----|----|
| D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 |`;

            const result = optimizer.analyzePerformance(content);

            const tableIssues = result.issues.filter(issue => issue.type === 'table_complexity');
            expect(tableIssues).toHaveLength(1);
            expect(tableIssues[0].description).toContain('10 columns');
        });

        it('should detect complex Mermaid diagrams', () => {
            const content = `\`\`\`mermaid
graph TB
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5
    A6 --> B6
    A7 --> B7
    A8 --> B8
    A9 --> B9
    A10 --> B10
    A11 --> B11
    A12 --> B12
    A13 --> B13
    A14 --> B14
    A15 --> B15
    A16 --> B16
    A17 --> B17
    A18 --> B18
    A19 --> B19
    A20 --> B20
    A21 --> B21
\`\`\``;

            const result = optimizer.analyzePerformance(content);

            const mermaidIssues = result.issues.filter(issue => issue.type === 'mermaid_complexity');
            expect(mermaidIssues).toHaveLength(1);
            expect(mermaidIssues[0].description).toContain('nodes');
        });

        it('should detect missing mobile optimization', () => {
            const content = `# Simple Document
Just some text without mobile optimization indicators.`;

            const result = optimizer.analyzePerformance(content);

            const mobileIssues = result.issues.filter(issue => issue.type === 'mobile_optimization');
            expect(mobileIssues).toHaveLength(1);
            expect(mobileIssues[0].description).toContain('mobile optimization');
        });
    });

    describe('optimizeLoading', () => {
        it('should add lazy loading to images', () => {
            const content = `![Test Image](test.jpg)
![Already Lazy](test2.jpg "loading=lazy")
![Data Image](data:image/png;base64,abc)`;

            const result = optimizer.optimizeLoading(content);

            expect(result).toContain('![Test Image](test.jpg "loading=lazy")');
            expect(result).toContain('![Already Lazy](test2.jpg "loading=lazy")'); // Should remain unchanged
            expect(result).toContain('![Data Image](data:image/png;base64,abc)'); // Data URLs should not be modified
        });

        it('should add performance hints for large tables', () => {
            const content = `| C1 | C2 |
|----|----|
${'| D1 | D2 |\n'.repeat(15)}`;

            const result = optimizer.optimizeLoading(content);

            expect(result).toContain('<!-- Large table - consider pagination -->');
        });

        it('should add performance hints for complex Mermaid diagrams', () => {
            const content = `\`\`\`mermaid
graph TB
${'    A' + Array.from({length: 20}, (_, i) => i + 1).join(' --> A') + '\n'}
\`\`\``;

            const result = optimizer.optimizeLoading(content);

            expect(result).toContain('<!-- Complex diagram -');
        });
    });

    describe('optimizeRendering', () => {
        it('should add responsive wrappers to wide tables', () => {
            const content = `| C1 | C2 | C3 | C4 | C5 | C6 | C7 |
|----|----|----|----|----|----|----| 
| D1 | D2 | D3 | D4 | D5 | D6 | D7 |`;

            const result = optimizer.optimizeRendering(content);

            expect(result).toContain('<div class="table-responsive">');
            expect(result).toContain('</div>');
        });

        it('should add Mermaid rendering configuration', () => {
            const content = `\`\`\`mermaid
graph TB
    A --> B
\`\`\``;

            const result = optimizer.optimizeRendering(content);

            expect(result).toContain('%%{init:');
            expect(result).toContain('"theme": "default"');
        });

        it('should not modify Mermaid diagrams that already have configuration', () => {
            const content = `\`\`\`mermaid
%%{init: {"theme": "dark"}}%%
graph TB
    A --> B
\`\`\``;

            const result = optimizer.optimizeRendering(content);

            expect(result).toBe(content); // Should remain unchanged
        });
    });

    describe('optimizeForMobile', () => {
        it('should add responsive table wrappers', () => {
            const content = `| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |`;

            const result = optimizer.optimizeForMobile(content);

            expect(result).toContain('<div class="table-responsive">');
            expect(result).toContain('</div>');
        });

        it('should add mobile Mermaid configuration', () => {
            const content = `\`\`\`mermaid
graph TB
    A --> B
\`\`\``;

            const result = optimizer.optimizeForMobile(content);

            expect(result).toContain('%%{init:');
            expect(result).toContain('"useMaxWidth": true');
        });

        it('should add mobile optimization marker', () => {
            const content = `# Test Document
Some content here.`;

            const result = optimizer.optimizeForMobile(content);

            expect(result).toContain('<!-- Mobile Optimized -->');
        });

        it('should not add mobile optimization marker if already present', () => {
            const content = `<!-- Mobile Optimized -->
# Test Document
Some content here.`;

            const result = optimizer.optimizeForMobile(content);

            // Should only appear once
            const matches = result.match(/<!-- Mobile Optimized -->/g);
            expect(matches).toHaveLength(1);
        });
    });

    describe('_extractTables', () => {
        it('should extract table information correctly', () => {
            const content = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

Some text

| Another | Table |
|---------|-------|
| More    | Data  |`;

            const tables = optimizer._extractTables(content);

            expect(tables).toHaveLength(2);
            expect(tables[0].headers).toHaveLength(3);
            expect(tables[0].rows).toHaveLength(2);
            expect(tables[1].headers).toHaveLength(2);
            expect(tables[1].rows).toHaveLength(1);
        });

        it('should handle tables at the end of content', () => {
            const content = `# Title

| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |`;

            const tables = optimizer._extractTables(content);

            expect(tables).toHaveLength(1);
            expect(tables[0].headers).toHaveLength(2);
            expect(tables[0].rows).toHaveLength(1);
        });
    });

    describe('_countMermaidNodes', () => {
        it('should count unique nodes correctly', () => {
            const diagramContent = `graph TB
    A --> B
    B --> C
    C --> D
    A --> D`;

            const nodeCount = optimizer._countMermaidNodes(diagramContent);

            expect(nodeCount).toBe(4); // A, B, C, D
        });

        it('should exclude Mermaid keywords from node count', () => {
            const diagramContent = `flowchart TD
    Start --> Process
    Process --> End
    subgraph "Subprocess"
        Sub1 --> Sub2
    end`;

            const nodeCount = optimizer._countMermaidNodes(diagramContent);

            // Should not count: flowchart, TD, subgraph, end
            // Should count: Start, Process, End, Subprocess, Sub1, Sub2
            expect(nodeCount).toBeGreaterThan(4);
        });
    });

    describe('_findLineNumber', () => {
        it('should find correct line number for text', () => {
            const content = `Line 1
Line 2
Line 3 with search text
Line 4`;

            const lineNumber = optimizer._findLineNumber(content, 'search text');

            expect(lineNumber).toBe(3);
        });

        it('should return 1 if text not found', () => {
            const content = `Line 1
Line 2
Line 3`;

            const lineNumber = optimizer._findLineNumber(content, 'not found');

            expect(lineNumber).toBe(1);
        });
    });

    describe('integration tests', () => {
        it('should handle complex document with all optimization types', () => {
            const content = `# Performance Test Document

![Large Image](large-image.jpg)
![Optimized Image](small.jpg "loading=lazy")

## Complex Table

| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 |
|----|----|----|----|----|----|----|----|----|
| D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 |

## Complex Diagram

\`\`\`mermaid
graph TB
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    A5 --> B5
    A6 --> B6
    A7 --> B7
    A8 --> B8
    A9 --> B9
    A10 --> B10
    A11 --> B11
    A12 --> B12
    A13 --> B13
    A14 --> B14
    A15 --> B15
    A16 --> B16
    A17 --> B17
    A18 --> B18
    A19 --> B19
    A20 --> B20
    A21 --> B21
\`\`\``;

            // Test analysis
            const analysis = optimizer.analyzePerformance(content);
            expect(analysis.issues.length).toBeGreaterThan(0);
            expect(analysis.metrics.complexTables).toBe(1);
            expect(analysis.metrics.complexMermaid).toBe(1);

            // Test optimizations
            let optimized = optimizer.optimizeLoading(content);
            optimized = optimizer.optimizeRendering(optimized);
            optimized = optimizer.optimizeForMobile(optimized);

            expect(optimized).toContain('loading=lazy');
            expect(optimized).toContain('table-responsive');
            expect(optimized).toContain('Mobile Optimized');
            expect(optimized).toContain('%%{init:');
        });
    });
});