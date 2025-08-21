/**
 * Performance and Accessibility Validator
 * Provides comprehensive validation for performance benchmarks, accessibility compliance, and cross-device compatibility
 */

import { BaseFixer } from '../core/base-fixer.js';

export class PerformanceAccessibilityValidator extends BaseFixer {
    constructor(options = {}) {
        super(options);
        this.performanceThresholds = {
            maxLoadTime: options.maxLoadTime || 3000, // 3 seconds
            maxContentSize: options.maxContentSize || 500 * 1024, // 500KB
            maxImageSize: options.maxImageSize || 1024 * 1024, // 1MB
            maxTableRows: options.maxTableRows || 50,
            maxMermaidNodes: options.maxMermaidNodes || 20
        };
        
        this.deviceBreakpoints = {
            mobile: 320,
            tablet: 768,
            desktop: 1024,
            large: 1440
        };

        this.wcagLevels = ['A', 'AA', 'AAA'];
        this.supportedLanguages = ['zh-CN', 'en-US', 'zh-TW'];
    }

    /**
     * Run performance benchmark tests
     * @param {string} content - Document content
     * @param {string} filePath - File path for context
     * @returns {Object} Performance benchmark results
     */
    runPerformanceBenchmarks(content, filePath = '') {
        const startTime = Date.now();
        
        const results = {
            filePath,
            timestamp: new Date().toISOString(),
            metrics: {},
            benchmarks: {},
            issues: [],
            passed: true
        };

        // Content size benchmark
        results.metrics.contentSize = content.length;
        results.benchmarks.contentSize = {
            value: content.length,
            threshold: this.performanceThresholds.maxContentSize,
            passed: content.length <= this.performanceThresholds.maxContentSize,
            unit: 'bytes'
        };

        if (!results.benchmarks.contentSize.passed) {
            results.issues.push({
                type: 'content_size_exceeded',
                severity: 'major',
                description: `Content size (${content.length} bytes) exceeds threshold (${this.performanceThresholds.maxContentSize} bytes)`,
                suggestion: 'Consider splitting content or optimizing images'
            });
            results.passed = false;
        }

        // Image analysis benchmark
        const imageMetrics = this._analyzeImages(content);
        results.metrics.images = imageMetrics;
        results.benchmarks.images = {
            count: imageMetrics.count,
            totalSize: imageMetrics.estimatedSize,
            largeImages: imageMetrics.largeImages,
            passed: imageMetrics.largeImages === 0
        };

        if (imageMetrics.largeImages > 0) {
            results.issues.push({
                type: 'large_images_detected',
                severity: 'major',
                description: `${imageMetrics.largeImages} images may be too large`,
                suggestion: 'Optimize images for web delivery'
            });
            results.passed = false;
        }

        // Table complexity benchmark
        const tableMetrics = this._analyzeTables(content);
        results.metrics.tables = tableMetrics;
        results.benchmarks.tables = {
            count: tableMetrics.count,
            complexTables: tableMetrics.complexTables,
            passed: tableMetrics.complexTables === 0
        };

        if (tableMetrics.complexTables > 0) {
            results.issues.push({
                type: 'complex_tables_detected',
                severity: 'minor',
                description: `${tableMetrics.complexTables} tables are complex`,
                suggestion: 'Consider simplifying or splitting complex tables'
            });
        }

        // Mermaid complexity benchmark
        const mermaidMetrics = this._analyzeMermaidDiagrams(content);
        results.metrics.mermaid = mermaidMetrics;
        results.benchmarks.mermaid = {
            count: mermaidMetrics.count,
            complexDiagrams: mermaidMetrics.complexDiagrams,
            passed: mermaidMetrics.complexDiagrams === 0
        };

        if (mermaidMetrics.complexDiagrams > 0) {
            results.issues.push({
                type: 'complex_diagrams_detected',
                severity: 'minor',
                description: `${mermaidMetrics.complexDiagrams} diagrams are complex`,
                suggestion: 'Consider simplifying or splitting complex diagrams'
            });
        }

        // Processing time benchmark
        const processingTime = Date.now() - startTime;
        results.benchmarks.processingTime = {
            value: processingTime,
            threshold: 1000, // 1 second
            passed: processingTime <= 1000,
            unit: 'ms'
        };

        results.metrics.processingTime = processingTime;
        results.summary = {
            totalIssues: results.issues.length,
            criticalIssues: results.issues.filter(i => i.severity === 'critical').length,
            majorIssues: results.issues.filter(i => i.severity === 'major').length,
            minorIssues: results.issues.filter(i => i.severity === 'minor').length,
            overallScore: this._calculatePerformanceScore(results)
        };

        return results;
    }

    /**
     * Run accessibility automated tests
     * @param {string} content - Document content
     * @param {string} filePath - File path for context
     * @param {string} wcagLevel - WCAG compliance level (A, AA, AAA)
     * @returns {Object} Accessibility test results
     */
    runAccessibilityTests(content, filePath = '', wcagLevel = 'AA') {
        const results = {
            filePath,
            wcagLevel,
            timestamp: new Date().toISOString(),
            tests: {},
            issues: [],
            passed: true,
            compliance: {}
        };

        // WCAG 1.1.1 - Non-text Content
        results.tests.nonTextContent = this._testNonTextContent(content);
        if (!results.tests.nonTextContent.passed) {
            results.passed = false;
            results.issues.push(...results.tests.nonTextContent.issues);
        }

        // WCAG 1.3.1 - Info and Relationships
        results.tests.infoAndRelationships = this._testInfoAndRelationships(content);
        if (!results.tests.infoAndRelationships.passed) {
            results.passed = false;
            results.issues.push(...results.tests.infoAndRelationships.issues);
        }

        // WCAG 2.4.4 - Link Purpose
        results.tests.linkPurpose = this._testLinkPurpose(content);
        if (!results.tests.linkPurpose.passed) {
            results.passed = false;
            results.issues.push(...results.tests.linkPurpose.issues);
        }

        // WCAG 3.1.1 - Language of Page
        results.tests.languageOfPage = this._testLanguageOfPage(content);
        if (!results.tests.languageOfPage.passed) {
            results.passed = false;
            results.issues.push(...results.tests.languageOfPage.issues);
        }

        // Additional AA level tests
        if (wcagLevel === 'AA' || wcagLevel === 'AAA') {
            // WCAG 1.4.3 - Contrast (Minimum)
            results.tests.contrastMinimum = this._testContrastMinimum(content);
            if (!results.tests.contrastMinimum.passed) {
                results.issues.push(...results.tests.contrastMinimum.issues);
            }

            // WCAG 2.4.6 - Headings and Labels
            results.tests.headingsAndLabels = this._testHeadingsAndLabels(content);
            if (!results.tests.headingsAndLabels.passed) {
                results.issues.push(...results.tests.headingsAndLabels.issues);
            }
        }

        // Calculate compliance score
        results.compliance = this._calculateComplianceScore(results);
        results.summary = {
            totalTests: Object.keys(results.tests).length,
            passedTests: Object.values(results.tests).filter(t => t.passed).length,
            totalIssues: results.issues.length,
            criticalIssues: results.issues.filter(i => i.severity === 'critical').length,
            majorIssues: results.issues.filter(i => i.severity === 'major').length,
            minorIssues: results.issues.filter(i => i.severity === 'minor').length,
            complianceScore: results.compliance.score
        };

        return results;
    }

    /**
     * Validate cross-device compatibility
     * @param {string} content - Document content
     * @param {string} filePath - File path for context
     * @returns {Object} Cross-device compatibility results
     */
    validateCrossDeviceCompatibility(content, filePath = '') {
        const results = {
            filePath,
            timestamp: new Date().toISOString(),
            devices: {},
            issues: [],
            passed: true
        };

        // Test for each device category
        Object.entries(this.deviceBreakpoints).forEach(([device, width]) => {
            results.devices[device] = this._testDeviceCompatibility(content, device, width);
            if (!results.devices[device].passed) {
                results.passed = false;
                results.issues.push(...results.devices[device].issues);
            }
        });

        // Overall compatibility assessment
        results.summary = {
            testedDevices: Object.keys(this.deviceBreakpoints).length,
            compatibleDevices: Object.values(results.devices).filter(d => d.passed).length,
            totalIssues: results.issues.length,
            criticalIssues: results.issues.filter(i => i.severity === 'critical').length,
            majorIssues: results.issues.filter(i => i.severity === 'major').length,
            minorIssues: results.issues.filter(i => i.severity === 'minor').length,
            compatibilityScore: this._calculateCompatibilityScore(results)
        };

        return results;
    }

    /**
     * Generate comprehensive validation report
     * @param {string} content - Document content
     * @param {string} filePath - File path for context
     * @param {Object} options - Validation options
     * @returns {Object} Comprehensive validation report
     */
    generateValidationReport(content, filePath = '', options = {}) {
        const report = {
            filePath,
            timestamp: new Date().toISOString(),
            options: {
                wcagLevel: options.wcagLevel || 'AA',
                includePerformance: options.includePerformance !== false,
                includeAccessibility: options.includeAccessibility !== false,
                includeCrossDevice: options.includeCrossDevice !== false
            },
            results: {},
            summary: {},
            recommendations: []
        };

        // Run performance benchmarks
        if (report.options.includePerformance) {
            report.results.performance = this.runPerformanceBenchmarks(content, filePath);
        }

        // Run accessibility tests
        if (report.options.includeAccessibility) {
            report.results.accessibility = this.runAccessibilityTests(content, filePath, report.options.wcagLevel);
        }

        // Run cross-device compatibility tests
        if (report.options.includeCrossDevice) {
            report.results.crossDevice = this.validateCrossDeviceCompatibility(content, filePath);
        }

        // Generate summary and recommendations
        report.summary = this._generateOverallSummary(report.results);
        report.recommendations = this._generateRecommendations(report.results);

        return report;
    }

    /**
     * Analyze images in content
     * @private
     */
    _analyzeImages(content) {
        const imageMatches = content.match(/!\[.*?\]\(.*?\)/g) || [];
        let estimatedSize = 0;
        let largeImages = 0;

        imageMatches.forEach(match => {
            // Estimate size based on URL patterns (rough estimation)
            if (match.includes('.png') || match.includes('.jpg') || match.includes('.jpeg')) {
                estimatedSize += 100 * 1024; // Assume 100KB average
                if (match.includes('large') || match.includes('full') || match.includes('original')) {
                    largeImages++;
                    estimatedSize += 500 * 1024; // Add extra for large images
                }
            }
        });

        return {
            count: imageMatches.length,
            estimatedSize,
            largeImages
        };
    }

    /**
     * Analyze tables in content
     * @private
     */
    _analyzeTables(content) {
        const tables = [];
        const lines = content.split('\n');
        let currentTable = null;
        let complexTables = 0;

        for (const line of lines) {
            if (line.includes('|') && line.trim().length > 0) {
                if (!currentTable) {
                    currentTable = {
                        headers: line.split('|').filter(cell => cell.trim().length > 0),
                        rows: []
                    };
                } else {
                    const cells = line.split('|').filter(cell => cell.trim().length > 0);
                    if (!line.includes('---')) {
                        currentTable.rows.push(cells);
                    }
                }
            } else if (currentTable) {
                if (currentTable.headers.length > 6 || currentTable.rows.length > this.performanceThresholds.maxTableRows) {
                    complexTables++;
                }
                tables.push(currentTable);
                currentTable = null;
            }
        }

        if (currentTable) {
            if (currentTable.headers.length > 6 || currentTable.rows.length > this.performanceThresholds.maxTableRows) {
                complexTables++;
            }
            tables.push(currentTable);
        }

        return {
            count: tables.length,
            complexTables
        };
    }

    /**
     * Analyze Mermaid diagrams in content
     * @private
     */
    _analyzeMermaidDiagrams(content) {
        const mermaidMatches = content.match(/```mermaid\n([\s\S]*?)\n```/g) || [];
        let complexDiagrams = 0;

        mermaidMatches.forEach(match => {
            const diagramContent = match.replace(/```mermaid\n|\n```/g, '');
            const nodeCount = this._countMermaidNodes(diagramContent);
            
            if (nodeCount > this.performanceThresholds.maxMermaidNodes) {
                complexDiagrams++;
            }
        });

        return {
            count: mermaidMatches.length,
            complexDiagrams
        };
    }

    /**
     * Count nodes in Mermaid diagram
     * @private
     */
    _countMermaidNodes(diagramContent) {
        const nodePattern = /\b[A-Za-z][A-Za-z0-9]*\b/g;
        const matches = diagramContent.match(nodePattern) || [];
        const uniqueNodes = new Set(matches.filter(match => 
            !['graph', 'flowchart', 'TB', 'TD', 'BT', 'RL', 'LR', 'subgraph', 'end'].includes(match)
        ));
        return uniqueNodes.size;
    }

    /**
     * Test non-text content (WCAG 1.1.1)
     * @private
     */
    _testNonTextContent(content) {
        const issues = [];
        const imageMatches = content.match(/!\[.*?\]\(.*?\)/g) || [];
        
        imageMatches.forEach((match, index) => {
            const altMatch = match.match(/!\[(.*?)\]/);
            const alt = altMatch ? altMatch[1] : '';
            
            if (!alt || alt.trim().length === 0) {
                issues.push({
                    type: 'missing_alt_text',
                    severity: 'major',
                    wcagCriterion: '1.1.1',
                    description: `Image ${index + 1} missing alternative text`,
                    suggestion: 'Add descriptive alt text for screen readers'
                });
            }
        });

        return {
            passed: issues.length === 0,
            issues,
            testedElements: imageMatches.length
        };
    }

    /**
     * Test info and relationships (WCAG 1.3.1)
     * @private
     */
    _testInfoAndRelationships(content) {
        const issues = [];
        
        // Test heading structure
        const headingMatches = content.match(/^#{1,6}\s+.+$/gm) || [];
        let previousLevel = 0;

        headingMatches.forEach((heading, index) => {
            const level = heading.match(/^#+/)[0].length;
            
            if (level > previousLevel + 1 && previousLevel > 0) {
                issues.push({
                    type: 'heading_level_skip',
                    severity: 'major',
                    wcagCriterion: '1.3.1',
                    description: `Heading level ${level} follows level ${previousLevel}`,
                    suggestion: 'Use consecutive heading levels'
                });
            }
            
            previousLevel = level;
        });

        // Test table structure
        const tables = this._analyzeTables(content);
        if (tables.count > 0) {
            // Simple check - assume tables without proper markdown structure are problematic
            const tableMatches = content.match(/\|.*\|/g) || [];
            const separatorMatches = content.match(/\|[-:]+\|/g) || [];
            
            if (tableMatches.length > 0 && separatorMatches.length === 0) {
                issues.push({
                    type: 'table_structure_missing',
                    severity: 'major',
                    wcagCriterion: '1.3.1',
                    description: 'Tables missing proper header structure',
                    suggestion: 'Add header separator rows to tables'
                });
            }
        }

        return {
            passed: issues.length === 0,
            issues,
            testedElements: headingMatches.length + tables.count
        };
    }

    /**
     * Test link purpose (WCAG 2.4.4)
     * @private
     */
    _testLinkPurpose(content) {
        const issues = [];
        const linkMatches = content.match(/\[.*?\]\(.*?\)/g) || [];

        linkMatches.forEach((link, index) => {
            const textMatch = link.match(/\[(.*?)\]/);
            const linkText = textMatch ? textMatch[1].trim() : '';

            const genericTexts = ['click here', 'read more', 'here', 'link', '点击这里', '更多', '链接'];
            if (genericTexts.some(generic => linkText.toLowerCase().includes(generic.toLowerCase()))) {
                issues.push({
                    type: 'generic_link_text',
                    severity: 'major',
                    wcagCriterion: '2.4.4',
                    description: `Link ${index + 1} uses generic text: "${linkText}"`,
                    suggestion: 'Use descriptive link text'
                });
            }

            if (!linkText) {
                issues.push({
                    type: 'empty_link_text',
                    severity: 'critical',
                    wcagCriterion: '2.4.4',
                    description: `Link ${index + 1} has empty text`,
                    suggestion: 'Provide descriptive link text'
                });
            }
        });

        return {
            passed: issues.length === 0,
            issues,
            testedElements: linkMatches.length
        };
    }

    /**
     * Test language of page (WCAG 3.1.1)
     * @private
     */
    _testLanguageOfPage(content) {
        const issues = [];

        if (!content.includes('lang=') && !content.includes('<!-- lang=')) {
            issues.push({
                type: 'missing_language_declaration',
                severity: 'major',
                wcagCriterion: '3.1.1',
                description: 'Document missing language declaration',
                suggestion: 'Add language attribute'
            });
        }

        return {
            passed: issues.length === 0,
            issues,
            testedElements: 1
        };
    }

    /**
     * Test contrast minimum (WCAG 1.4.3)
     * @private
     */
    _testContrastMinimum(content) {
        const issues = [];
        
        // Check for color-only information
        const colorPatterns = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', '#[0-9a-fA-F]{6}', '#[0-9a-fA-F]{3}'];
        let colorReferences = 0;

        colorPatterns.forEach(pattern => {
            const regex = new RegExp(pattern, 'gi');
            const matches = content.match(regex) || [];
            colorReferences += matches.length;
        });

        if (colorReferences > 0) {
            issues.push({
                type: 'color_only_information',
                severity: 'minor',
                wcagCriterion: '1.4.3',
                description: `Found ${colorReferences} color references`,
                suggestion: 'Ensure color is not the only means of conveying information'
            });
        }

        return {
            passed: issues.length === 0,
            issues,
            testedElements: colorReferences
        };
    }

    /**
     * Test headings and labels (WCAG 2.4.6)
     * @private
     */
    _testHeadingsAndLabels(content) {
        const issues = [];
        const headingMatches = content.match(/^#{1,6}\s+.+$/gm) || [];

        headingMatches.forEach((heading, index) => {
            const headingText = heading.replace(/^#+\s*/, '').trim();
            
            if (!headingText) {
                issues.push({
                    type: 'empty_heading',
                    severity: 'major',
                    wcagCriterion: '2.4.6',
                    description: `Heading ${index + 1} is empty`,
                    suggestion: 'Provide descriptive heading text'
                });
            } else if (headingText.length < 3) {
                issues.push({
                    type: 'heading_too_short',
                    severity: 'minor',
                    wcagCriterion: '2.4.6',
                    description: `Heading ${index + 1} is very short: "${headingText}"`,
                    suggestion: 'Use more descriptive heading text'
                });
            }
        });

        return {
            passed: issues.length === 0,
            issues,
            testedElements: headingMatches.length
        };
    }

    /**
     * Test device compatibility
     * @private
     */
    _testDeviceCompatibility(content, device, width) {
        const issues = [];
        
        // Test table width for mobile devices
        if (device === 'mobile') {
            const tables = this._analyzeTables(content);
            if (tables.count > 0) {
                // Check for tables with many columns
                const tableMatches = content.match(/((?:\|.*\|\n)+)/g) || [];
                tableMatches.forEach((table, index) => {
                    const lines = table.split('\n').filter(line => line.trim());
                    if (lines.length > 0) {
                        const columns = lines[0].split('|').filter(cell => cell.trim()).length;
                        if (columns > 4) {
                            issues.push({
                                type: 'table_too_wide_mobile',
                                severity: 'major',
                                description: `Table ${index + 1} has ${columns} columns, may not fit on mobile`,
                                suggestion: 'Consider responsive table design or fewer columns'
                            });
                        }
                    }
                });
            }
        }

        // Test image responsiveness
        const imageMatches = content.match(/!\[.*?\]\(.*?\)/g) || [];
        imageMatches.forEach((image, index) => {
            if (!image.includes('responsive') && !image.includes('width') && !image.includes('max-width')) {
                issues.push({
                    type: 'image_not_responsive',
                    severity: 'minor',
                    description: `Image ${index + 1} may not be responsive on ${device}`,
                    suggestion: 'Add responsive image attributes'
                });
            }
        });

        return {
            device,
            width,
            passed: issues.length === 0,
            issues
        };
    }

    /**
     * Calculate performance score
     * @private
     */
    _calculatePerformanceScore(results) {
        let score = 100;
        
        results.issues.forEach(issue => {
            switch (issue.severity) {
                case 'critical':
                    score -= 25;
                    break;
                case 'major':
                    score -= 15;
                    break;
                case 'minor':
                    score -= 5;
                    break;
            }
        });

        return Math.max(0, score);
    }

    /**
     * Calculate compliance score
     * @private
     */
    _calculateComplianceScore(results) {
        const totalTests = Object.keys(results.tests).length;
        const passedTests = Object.values(results.tests).filter(t => t.passed).length;
        
        return {
            score: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
            level: passedTests === totalTests ? 'Full' : passedTests > totalTests * 0.8 ? 'Partial' : 'Limited'
        };
    }

    /**
     * Calculate compatibility score
     * @private
     */
    _calculateCompatibilityScore(results) {
        const totalDevices = Object.keys(results.devices).length;
        const compatibleDevices = Object.values(results.devices).filter(d => d.passed).length;
        
        return totalDevices > 0 ? Math.round((compatibleDevices / totalDevices) * 100) : 0;
    }

    /**
     * Generate overall summary
     * @private
     */
    _generateOverallSummary(results) {
        const summary = {
            overallPassed: true,
            totalIssues: 0,
            scores: {}
        };

        if (results.performance) {
            summary.overallPassed = summary.overallPassed && results.performance.passed;
            summary.totalIssues += results.performance.issues.length;
            summary.scores.performance = results.performance.summary.overallScore;
        }

        if (results.accessibility) {
            summary.overallPassed = summary.overallPassed && results.accessibility.passed;
            summary.totalIssues += results.accessibility.issues.length;
            summary.scores.accessibility = results.accessibility.summary.complianceScore;
        }

        if (results.crossDevice) {
            summary.overallPassed = summary.overallPassed && results.crossDevice.passed;
            summary.totalIssues += results.crossDevice.issues.length;
            summary.scores.crossDevice = results.crossDevice.summary.compatibilityScore;
        }

        return summary;
    }

    /**
     * Generate recommendations
     * @private
     */
    _generateRecommendations(results) {
        const recommendations = [];

        if (results.performance && !results.performance.passed) {
            recommendations.push({
                category: 'Performance',
                priority: 'High',
                description: 'Optimize content size and image loading',
                actions: [
                    'Compress images and use appropriate formats',
                    'Split large documents into smaller sections',
                    'Implement lazy loading for images'
                ]
            });
        }

        if (results.accessibility && !results.accessibility.passed) {
            recommendations.push({
                category: 'Accessibility',
                priority: 'High',
                description: 'Improve WCAG compliance',
                actions: [
                    'Add alt text to all images',
                    'Fix heading structure hierarchy',
                    'Use descriptive link text',
                    'Add language declarations'
                ]
            });
        }

        if (results.crossDevice && !results.crossDevice.passed) {
            recommendations.push({
                category: 'Cross-Device Compatibility',
                priority: 'Medium',
                description: 'Enhance mobile and tablet experience',
                actions: [
                    'Make tables responsive',
                    'Optimize images for different screen sizes',
                    'Test on various devices and screen sizes'
                ]
            });
        }

        return recommendations;
    }
}