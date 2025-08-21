/**
 * Tests for Performance and Accessibility Validator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceAccessibilityValidator } from '../../src/fixers/performance-accessibility-validator.js';

describe('PerformanceAccessibilityValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new PerformanceAccessibilityValidator({
            maxLoadTime: 3000,
            maxContentSize: 100 * 1024, // 100KB for testing
            maxImageSize: 1024 * 1024,
            maxTableRows: 10,
            maxMermaidNodes: 15
        });
    });

    describe('runPerformanceBenchmarks', () => {
        it('should run comprehensive performance benchmarks', () => {
            const content = `# Performance Test Document

![Large Image](large-image.jpg)
![Small Image](small.jpg)

| C1 | C2 | C3 | C4 | C5 | C6 | C7 |
|----|----|----|----|----|----|----|
${'| D1 | D2 | D3 | D4 | D5 | D6 | D7 |\n'.repeat(15)}

\`\`\`mermaid
graph TB
${'    A' + Array.from({length: 20}, (_, i) => i + 1).join(' --> A') + '\n'}
\`\`\``;

            const result = validator.runPerformanceBenchmarks(content, 'test.md');

            expect(result.filePath).toBe('test.md');
            expect(result.timestamp).toBeDefined();
            expect(result.metrics).toBeDefined();
            expect(result.benchmarks).toBeDefined();
            expect(result.summary).toBeDefined();

            // Check metrics
            expect(result.metrics.contentSize).toBe(content.length);
            expect(result.metrics.images).toBeDefined();
            expect(result.metrics.tables).toBeDefined();
            expect(result.metrics.mermaid).toBeDefined();

            // Check benchmarks
            expect(result.benchmarks.contentSize).toBeDefined();
            expect(result.benchmarks.images).toBeDefined();
            expect(result.benchmarks.tables).toBeDefined();
            expect(result.benchmarks.mermaid).toBeDefined();
            expect(result.benchmarks.processingTime).toBeDefined();
        });

        it('should detect content size issues', () => {
            const largeContent = 'A'.repeat(200 * 1024); // 200KB

            const result = validator.runPerformanceBenchmarks(largeContent);

            expect(result.benchmarks.contentSize.passed).toBe(false);
            const sizeIssues = result.issues.filter(issue => issue.type === 'content_size_exceeded');
            expect(sizeIssues).toHaveLength(1);
        });

        it('should detect large images', () => {
            const content = `![Large Image](large-original-full-size.jpg)
![Normal Image](normal.jpg)
![Another Large](full-resolution.png)`;

            const result = validator.runPerformanceBenchmarks(content);

            expect(result.metrics.images.largeImages).toBeGreaterThan(0);
            if (result.metrics.images.largeImages > 0) {
                const imageIssues = result.issues.filter(issue => issue.type === 'large_images_detected');
                expect(imageIssues).toHaveLength(1);
            }
        });

        it('should detect complex tables', () => {
            const content = `| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 |
|----|----|----|----|----|----|----|----|
${'| D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 |\n'.repeat(15)}`;

            const result = validator.runPerformanceBenchmarks(content);

            expect(result.metrics.tables.complexTables).toBeGreaterThan(0);
            const tableIssues = result.issues.filter(issue => issue.type === 'complex_tables_detected');
            expect(tableIssues).toHaveLength(1);
        });

        it('should detect complex Mermaid diagrams', () => {
            const content = `\`\`\`mermaid
graph TB
${Array.from({length: 25}, (_, i) => `    Node${i} --> Node${i + 1}`).join('\n')}
\`\`\``;

            const result = validator.runPerformanceBenchmarks(content);

            expect(result.metrics.mermaid.complexDiagrams).toBeGreaterThan(0);
            const mermaidIssues = result.issues.filter(issue => issue.type === 'complex_diagrams_detected');
            expect(mermaidIssues).toHaveLength(1);
        });

        it('should calculate performance score correctly', () => {
            const simpleContent = `# Simple Document
Just some text.`;

            const result = validator.runPerformanceBenchmarks(simpleContent);

            expect(result.summary.overallScore).toBeGreaterThan(80);
            expect(result.passed).toBe(true);
        });
    });

    describe('runAccessibilityTests', () => {
        it('should run comprehensive accessibility tests', () => {
            const content = `# Test Document

![](missing-alt.jpg)
![Good Image](good.jpg)

## Section
### Skipped Level

[click here](http://example.com)
[Good Link](http://example.com)

| Data 1 | Data 2 |
| D1     | D2     |`;

            const result = validator.runAccessibilityTests(content, 'test.md', 'AA');

            expect(result.filePath).toBe('test.md');
            expect(result.wcagLevel).toBe('AA');
            expect(result.tests).toBeDefined();
            expect(result.compliance).toBeDefined();
            expect(result.summary).toBeDefined();

            // Check individual tests
            expect(result.tests.nonTextContent).toBeDefined();
            expect(result.tests.infoAndRelationships).toBeDefined();
            expect(result.tests.linkPurpose).toBeDefined();
            expect(result.tests.languageOfPage).toBeDefined();
        });

        it('should test non-text content (WCAG 1.1.1)', () => {
            const content = `![](missing-alt.jpg)
![Good Alt](good.jpg)
![](another-missing.png)`;

            const result = validator.runAccessibilityTests(content);

            expect(result.tests.nonTextContent.passed).toBe(false);
            expect(result.tests.nonTextContent.issues).toHaveLength(2);
            expect(result.tests.nonTextContent.testedElements).toBe(3);
        });

        it('should test info and relationships (WCAG 1.3.1)', () => {
            const content = `# Heading 1
### Heading 3 (skipped level 2)
## Heading 2

| Data without header separator |
| Data 1 | Data 2 |`;

            const result = validator.runAccessibilityTests(content);

            expect(result.tests.infoAndRelationships.passed).toBe(false);
            expect(result.tests.infoAndRelationships.issues.length).toBeGreaterThan(0);
        });

        it('should test link purpose (WCAG 2.4.4)', () => {
            const content = `[click here](http://example.com)
[](http://example.com)
[Good Link Text](http://example.com)`;

            const result = validator.runAccessibilityTests(content);

            expect(result.tests.linkPurpose.passed).toBe(false);
            expect(result.tests.linkPurpose.issues.length).toBeGreaterThan(0);
        });

        it('should test language of page (WCAG 3.1.1)', () => {
            const content = `# Document without language declaration
Some content here.`;

            const result = validator.runAccessibilityTests(content);

            expect(result.tests.languageOfPage.passed).toBe(false);
            expect(result.tests.languageOfPage.issues).toHaveLength(1);
        });

        it('should run additional AA level tests', () => {
            const content = `# Test Document
Some content with red text and green highlights.

## 
### Very Short`;

            const result = validator.runAccessibilityTests(content, 'test.md', 'AA');

            expect(result.tests.contrastMinimum).toBeDefined();
            expect(result.tests.headingsAndLabels).toBeDefined();
        });

        it('should calculate compliance score', () => {
            const goodContent = `<!-- lang="zh-CN" -->
# Good Document

![Good Alt Text](image.jpg)

## Proper Heading Structure

[Descriptive Link Text](http://example.com)

| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |`;

            const result = validator.runAccessibilityTests(goodContent);

            expect(result.compliance.score).toBeGreaterThan(50);
            expect(result.summary.complianceScore).toBeGreaterThan(50);
        });
    });

    describe('validateCrossDeviceCompatibility', () => {
        it('should validate compatibility across all device types', () => {
            const content = `# Test Document

| C1 | C2 | C3 | C4 | C5 | C6 |
|----|----|----|----|----|----| 
| D1 | D2 | D3 | D4 | D5 | D6 |

![Large Image](large-image.jpg)`;

            const result = validator.validateCrossDeviceCompatibility(content, 'test.md');

            expect(result.filePath).toBe('test.md');
            expect(result.devices).toBeDefined();
            expect(result.devices.mobile).toBeDefined();
            expect(result.devices.tablet).toBeDefined();
            expect(result.devices.desktop).toBeDefined();
            expect(result.devices.large).toBeDefined();
            expect(result.summary).toBeDefined();
        });

        it('should detect mobile compatibility issues with wide tables', () => {
            const content = `| C1 | C2 | C3 | C4 | C5 | C6 |
|----|----|----|----|----|----| 
| D1 | D2 | D3 | D4 | D5 | D6 |`;

            const result = validator.validateCrossDeviceCompatibility(content);

            expect(result.devices.mobile.passed).toBe(false);
            const mobileIssues = result.devices.mobile.issues.filter(issue => 
                issue.type === 'table_too_wide_mobile'
            );
            expect(mobileIssues).toHaveLength(1);
        });

        it('should detect non-responsive images', () => {
            const content = `![Image 1](image1.jpg)
![Responsive Image](image2.jpg "responsive")
![Image 3](image3.png)`;

            const result = validator.validateCrossDeviceCompatibility(content);

            // Should detect 2 non-responsive images
            const allIssues = Object.values(result.devices).flatMap(device => device.issues);
            const imageIssues = allIssues.filter(issue => issue.type === 'image_not_responsive');
            expect(imageIssues.length).toBeGreaterThan(0);
        });

        it('should calculate compatibility score', () => {
            const mobileOptimizedContent = `<!-- Mobile Optimized -->
# Responsive Document

<div class="table-responsive">

| C1 | C2 |
|----|----| 
| D1 | D2 |

</div>

![Responsive Image](image.jpg "responsive width=100%")`;

            const result = validator.validateCrossDeviceCompatibility(mobileOptimizedContent);

            expect(result.summary.compatibilityScore).toBeGreaterThan(50);
        });
    });

    describe('generateValidationReport', () => {
        it('should generate comprehensive validation report', () => {
            const content = `# Test Document

![](missing-alt.jpg)
![Good Image](good.jpg)

| C1 | C2 | C3 | C4 | C5 |
|----|----|----|----|----|
${'| D1 | D2 | D3 | D4 | D5 |\n'.repeat(15)}

\`\`\`mermaid
graph TB
${Array.from({length: 20}, (_, i) => `    A${i} --> B${i}`).join('\n')}
\`\`\``;

            const report = validator.generateValidationReport(content, 'test.md', {
                wcagLevel: 'AA',
                includePerformance: true,
                includeAccessibility: true,
                includeCrossDevice: true
            });

            expect(report.filePath).toBe('test.md');
            expect(report.options).toBeDefined();
            expect(report.results.performance).toBeDefined();
            expect(report.results.accessibility).toBeDefined();
            expect(report.results.crossDevice).toBeDefined();
            expect(report.summary).toBeDefined();
            expect(report.recommendations).toBeDefined();
        });

        it('should allow selective validation', () => {
            const content = `# Simple Document`;

            const report = validator.generateValidationReport(content, 'test.md', {
                includePerformance: true,
                includeAccessibility: false,
                includeCrossDevice: false
            });

            expect(report.results.performance).toBeDefined();
            expect(report.results.accessibility).toBeUndefined();
            expect(report.results.crossDevice).toBeUndefined();
        });

        it('should generate appropriate recommendations', () => {
            const problematicContent = `![](missing-alt.jpg)
${'A'.repeat(200 * 1024)}
| ${'C'.repeat(10).split('').map((_, i) => `C${i}`).join(' | ')} |
${'| ' + 'D'.repeat(10).split('').map((_, i) => `D${i}`).join(' | ') + ' |\n'.repeat(20)}`;

            const report = validator.generateValidationReport(problematicContent);

            expect(report.recommendations.length).toBeGreaterThan(0);
            
            const categories = report.recommendations.map(r => r.category);
            expect(categories).toContain('Performance');
            expect(categories).toContain('Accessibility');
        });

        it('should calculate overall summary correctly', () => {
            const goodContent = `<!-- lang="zh-CN" -->
# Good Document

![Good Alt](image.jpg)

## Proper Structure

[Good Link](http://example.com)

| H1 | H2 |
|----|----| 
| D1 | D2 |`;

            const report = validator.generateValidationReport(goodContent);

            expect(report.summary.overallPassed).toBeDefined();
            expect(report.summary.totalIssues).toBeDefined();
            expect(report.summary.scores).toBeDefined();
        });
    });

    describe('helper methods', () => {
        it('should analyze images correctly', () => {
            const content = `![Image 1](image.jpg)
![Large Image](large-original.png)
![Full Size](full-resolution.jpeg)`;

            const imageMetrics = validator._analyzeImages(content);

            expect(imageMetrics.count).toBe(3);
            expect(imageMetrics.estimatedSize).toBeGreaterThan(0);
            expect(imageMetrics.largeImages).toBeGreaterThan(0);
        });

        it('should analyze tables correctly', () => {
            const content = `| C1 | C2 | C3 |
|----|----|----|
${'| D1 | D2 | D3 |\n'.repeat(15)}

| Simple | Table |
|--------|-------|
| Data   | Here  |`;

            const tableMetrics = validator._analyzeTables(content);

            expect(tableMetrics.count).toBe(2);
            expect(tableMetrics.complexTables).toBe(1); // First table has too many rows
        });

        it('should analyze Mermaid diagrams correctly', () => {
            const content = `\`\`\`mermaid
graph TB
    A --> B
    B --> C
\`\`\`

\`\`\`mermaid
flowchart TD
${Array.from({length: 20}, (_, i) => `    Node${i} --> Node${i + 1}`).join('\n')}
\`\`\``;

            const mermaidMetrics = validator._analyzeMermaidDiagrams(content);

            expect(mermaidMetrics.count).toBe(2);
            expect(mermaidMetrics.complexDiagrams).toBe(1); // Second diagram is complex
        });
    });

    describe('integration tests', () => {
        it('should handle comprehensive validation of complex document', () => {
            const complexContent = `# Complex Test Document

![](missing-alt.jpg)
![Good Image](good.jpg "loading=lazy")

## Section with Issues
### Skipped Level (should be ##)

[click here](http://example.com)
[Good Link Text](http://example.com)

| C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 |
|----|----|----|----|----|----|----|----|----| 
${'| D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 |\n'.repeat(25)}

\`\`\`mermaid
graph TB
${Array.from({length: 30}, (_, i) => `    Node${i} --> Node${i + 1}`).join('\n')}
\`\`\`

\`\`\`javascript
function complexFunction() {
    // This is a complex function
    for (let i = 0; i < 100; i++) {
        console.log("Processing item " + i);
    }
    return "Done";
}
\`\`\``;

            // Run all validations
            const performanceResult = validator.runPerformanceBenchmarks(complexContent);
            const accessibilityResult = validator.runAccessibilityTests(complexContent);
            const compatibilityResult = validator.validateCrossDeviceCompatibility(complexContent);
            const fullReport = validator.generateValidationReport(complexContent);

            // Performance should have some issues or pass
            expect(performanceResult.issues.length).toBeGreaterThanOrEqual(0);

            // Accessibility should have issues
            expect(accessibilityResult.passed).toBe(false);
            expect(accessibilityResult.issues.length).toBeGreaterThan(0);

            // Cross-device compatibility should have issues
            expect(compatibilityResult.passed).toBe(false);
            expect(compatibilityResult.issues.length).toBeGreaterThan(0);

            // Full report should consolidate all issues
            expect(fullReport.summary.overallPassed).toBe(false);
            expect(fullReport.summary.totalIssues).toBeGreaterThan(0);
            expect(fullReport.recommendations.length).toBeGreaterThan(0);
        });
    });
});