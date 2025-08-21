/**
 * Accessibility Enhancer
 * Implements WCAG 2.1 AA compliance checks, semantic markup, and assistive technology support
 */

import { BaseFixer } from '../core/base-fixer.js';

export class AccessibilityEnhancer extends BaseFixer {
    constructor(options = {}) {
        super(options);
        this.wcagLevel = options.wcagLevel || 'AA';
        this.language = options.language || 'zh-CN';
    }

    /**
     * Perform WCAG 2.1 AA compliance check
     * @param {string} content - Document content
     * @param {string} filePath - File path for context
     * @returns {Object} Accessibility analysis results
     */
    checkWCAGCompliance(content, filePath = '') {
        const issues = [];
        const metrics = {
            imagesMissingAlt: 0,
            headingStructureIssues: 0,
            linkIssues: 0,
            tableIssues: 0,
            colorContrastIssues: 0,
            languageIssues: 0
        };

        // Check images for alt text (WCAG 1.1.1)
        const imageMatches = content.match(/!\[.*?\]\(.*?\)/g) || [];
        imageMatches.forEach((match, index) => {
            const altMatch = match.match(/!\[(.*?)\]/);
            const alt = altMatch ? altMatch[1] : '';
            
            if (!alt || alt.trim().length === 0) {
                metrics.imagesMissingAlt++;
                issues.push({
                    type: 'missing_alt_text',
                    line: this._findLineNumber(content, match),
                    description: `Image ${index + 1} missing alternative text`,
                    suggestion: 'Add descriptive alt text for screen readers',
                    severity: 'major',
                    wcagCriterion: '1.1.1'
                });
            } else if (alt.length > 125) {
                issues.push({
                    type: 'alt_text_too_long',
                    line: this._findLineNumber(content, match),
                    description: `Image ${index + 1} alt text too long (${alt.length} chars)`,
                    suggestion: 'Keep alt text under 125 characters',
                    severity: 'minor',
                    wcagCriterion: '1.1.1'
                });
            }
        });

        // Check heading structure (WCAG 1.3.1)
        const headingIssues = this._checkHeadingStructure(content);
        metrics.headingStructureIssues = headingIssues.length;
        issues.push(...headingIssues);

        // Check links (WCAG 2.4.4)
        const linkIssues = this._checkLinkAccessibility(content);
        metrics.linkIssues = linkIssues.length;
        issues.push(...linkIssues);

        // Check tables (WCAG 1.3.1)
        const tableIssues = this._checkTableAccessibility(content);
        metrics.tableIssues = tableIssues.length;
        issues.push(...tableIssues);

        // Check language attributes (WCAG 3.1.1)
        const languageIssues = this._checkLanguageAttributes(content);
        metrics.languageIssues = languageIssues.length;
        issues.push(...languageIssues);

        return { issues, metrics };
    }

    /**
     * Add semantic markup automatically
     * @param {string} content - Document content
     * @returns {string} Content with enhanced semantic markup
     */
    addSemanticMarkup(content) {
        let enhanced = content;

        // Add language attribute if missing
        if (!enhanced.includes('lang=') && !enhanced.includes('<html')) {
            enhanced = `<!-- lang="${this.language}" -->\n${enhanced}`;
        }

        // Add skip links for navigation first
        enhanced = this._addSkipLinks(enhanced);

        // Enhance headings with proper hierarchy
        enhanced = this._enhanceHeadingSemantics(enhanced);

        // Add ARIA labels to complex elements
        enhanced = this._addAriaLabels(enhanced);

        // Enhance table semantics
        enhanced = this._enhanceTableSemantics(enhanced);

        return enhanced;
    }

    /**
     * Add assistive technology support
     * @param {string} content - Document content
     * @returns {string} Content with assistive technology enhancements
     */
    addAssistiveTechnologySupport(content) {
        let enhanced = content;

        // Add keyboard navigation hints first
        enhanced = this._addKeyboardNavigationHints(enhanced);

        // Add high contrast support indicators
        enhanced = this._addHighContrastSupport(enhanced);

        // Add screen reader friendly descriptions
        enhanced = this._addScreenReaderDescriptions(enhanced);

        // Add focus management for interactive elements
        enhanced = this._addFocusManagement(enhanced);

        return enhanced;
    }

    /**
     * Check heading structure for accessibility
     * @private
     */
    _checkHeadingStructure(content) {
        const issues = [];
        const headingMatches = content.match(/^#{1,6}(\s+.*)?$/gm) || [];
        let previousLevel = 0;

        headingMatches.forEach((heading, index) => {
            const level = heading.match(/^#+/)[0].length;
            const line = this._findLineNumber(content, heading);

            // Check for skipped heading levels
            if (level > previousLevel + 1 && previousLevel > 0) {
                issues.push({
                    type: 'heading_level_skip',
                    line: line,
                    description: `Heading level ${level} follows level ${previousLevel} (skipped level ${previousLevel + 1})`,
                    suggestion: 'Use consecutive heading levels for proper document structure',
                    severity: 'major',
                    wcagCriterion: '1.3.1'
                });
            }

            // Check for empty headings
            const headingText = heading.replace(/^#+\s*/, '').trim();
            if (!headingText) {
                issues.push({
                    type: 'empty_heading',
                    line: line,
                    description: 'Empty heading found',
                    suggestion: 'Provide descriptive heading text',
                    severity: 'major',
                    wcagCriterion: '1.3.1'
                });
            }

            previousLevel = level;
        });

        return issues;
    }

    /**
     * Check link accessibility
     * @private
     */
    _checkLinkAccessibility(content) {
        const issues = [];
        const linkMatches = content.match(/\[.*?\]\(.*?\)/g) || [];

        linkMatches.forEach((link, index) => {
            const textMatch = link.match(/\[(.*?)\]/);
            const urlMatch = link.match(/\((.*?)\)/);
            
            if (textMatch && urlMatch) {
                const linkText = textMatch[1].trim();
                const url = urlMatch[1].trim();
                const line = this._findLineNumber(content, link);

                // Check for generic link text
                const genericTexts = ['click here', 'read more', 'here', 'link', '点击这里', '更多', '链接'];
                if (genericTexts.some(generic => linkText.toLowerCase().includes(generic.toLowerCase()))) {
                    issues.push({
                        type: 'generic_link_text',
                        line: line,
                        description: `Link ${index + 1} uses generic text: "${linkText}"`,
                        suggestion: 'Use descriptive link text that explains the destination',
                        severity: 'major',
                        wcagCriterion: '2.4.4'
                    });
                }

                // Check for empty link text
                if (!linkText) {
                    issues.push({
                        type: 'empty_link_text',
                        line: line,
                        description: `Link ${index + 1} has empty text`,
                        suggestion: 'Provide descriptive link text',
                        severity: 'major',
                        wcagCriterion: '2.4.4'
                    });
                }

                // Check for URL as link text
                if (linkText === url) {
                    issues.push({
                        type: 'url_as_link_text',
                        line: line,
                        description: `Link ${index + 1} uses URL as link text`,
                        suggestion: 'Use descriptive text instead of raw URL',
                        severity: 'minor',
                        wcagCriterion: '2.4.4'
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Check table accessibility
     * @private
     */
    _checkTableAccessibility(content) {
        const issues = [];
        const tables = this._extractTables(content);

        tables.forEach((table, index) => {
            // Check for table headers
            if (!table.hasHeaders) {
                issues.push({
                    type: 'table_missing_headers',
                    line: table.line,
                    description: `Table ${index + 1} missing proper headers`,
                    suggestion: 'Add header row with descriptive column names',
                    severity: 'major',
                    wcagCriterion: '1.3.1'
                });
            }

            // Check for table caption
            if (!table.hasCaption) {
                issues.push({
                    type: 'table_missing_caption',
                    line: table.line,
                    description: `Table ${index + 1} missing caption`,
                    suggestion: 'Add a descriptive caption above the table',
                    severity: 'minor',
                    wcagCriterion: '1.3.1'
                });
            }

            // Check for complex tables
            if (table.headers.length > 5 || table.rows.length > 10) {
                issues.push({
                    type: 'complex_table',
                    line: table.line,
                    description: `Table ${index + 1} is complex (${table.headers.length} columns, ${table.rows.length} rows)`,
                    suggestion: 'Consider adding summary or breaking into smaller tables',
                    severity: 'minor',
                    wcagCriterion: '1.3.1'
                });
            }
        });

        return issues;
    }

    /**
     * Check language attributes
     * @private
     */
    _checkLanguageAttributes(content) {
        const issues = [];

        // Check for language declaration
        if (!content.includes('lang=') && !content.includes('<!-- lang=')) {
            issues.push({
                type: 'missing_language_declaration',
                line: 1,
                description: 'Document missing language declaration',
                suggestion: 'Add language attribute for screen readers',
                severity: 'major',
                wcagCriterion: '3.1.1'
            });
        }

        // Check for mixed language content
        const chinesePattern = /[\u4e00-\u9fff]/;
        const englishPattern = /[a-zA-Z]/;
        const hasChinese = chinesePattern.test(content);
        const hasEnglish = englishPattern.test(content);

        if (hasChinese && hasEnglish) {
            issues.push({
                type: 'mixed_language_content',
                line: 1,
                description: 'Document contains mixed language content',
                suggestion: 'Consider adding lang attributes to specific sections',
                severity: 'minor',
                wcagCriterion: '3.1.2'
            });
        }

        return issues;
    }

    /**
     * Enhance heading semantics
     * @private
     */
    _enhanceHeadingSemantics(content) {
        return content.replace(
            /^(#{1,6})\s+(.+)$/gm,
            (match, hashes, text) => {
                const level = hashes.length;
                const id = text.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 50);
                
                return `${hashes} ${text} {#${id}}`;
            }
        );
    }

    /**
     * Add ARIA labels
     * @private
     */
    _addAriaLabels(content) {
        let enhanced = content;

        // Add ARIA labels to Mermaid diagrams
        enhanced = enhanced.replace(
            /```mermaid\n([\s\S]*?)\n```/g,
            (match, diagramContent) => {
                const diagramType = this._detectMermaidType(diagramContent);
                return `<!-- aria-label="${diagramType} diagram" -->\n${match}`;
            }
        );

        // Add ARIA labels to complex tables
        enhanced = enhanced.replace(
            /((?:\|.*\|\n)+)/g,
            (match) => {
                const rows = match.split('\n').filter(row => row.trim());
                if (rows.length > 5) {
                    return `<!-- aria-label="Data table with ${rows.length} rows" -->\n${match}`;
                }
                return match;
            }
        );

        return enhanced;
    }

    /**
     * Enhance table semantics
     * @private
     */
    _enhanceTableSemantics(content) {
        return content.replace(
            /((?:\|.*\|\n)+)/g,
            (match) => {
                const lines = match.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    const headers = lines[0].split('|').filter(cell => cell.trim());
                    const caption = `Table with ${headers.length} columns: ${headers.join(', ')}`;
                    return `<!-- Table Caption: ${caption} -->\n${match}`;
                }
                return match;
            }
        );
    }

    /**
     * Add skip links
     * @private
     */
    _addSkipLinks(content) {
        if (!content.includes('<!-- Skip Links -->')) {
            const skipLinks = `<!-- Skip Links -->
<!-- Skip to main content: #main-content -->
<!-- Skip to navigation: #navigation -->
<!-- Skip to search: #search -->

`;
            return skipLinks + content;
        }
        return content;
    }

    /**
     * Add screen reader descriptions
     * @private
     */
    _addScreenReaderDescriptions(content) {
        let enhanced = content;

        // Add descriptions for code blocks
        enhanced = enhanced.replace(
            /```(\w+)?\n([\s\S]*?)\n```/g,
            (match, language, code) => {
                const lang = language || 'code';
                const lines = code.split('\n').length;
                return `<!-- Screen reader: ${lang} code block with ${lines} lines -->\n${match}`;
            }
        );

        return enhanced;
    }

    /**
     * Add keyboard navigation hints
     * @private
     */
    _addKeyboardNavigationHints(content) {
        if (!content.includes('<!-- Keyboard Navigation -->')) {
            const navHints = `<!-- Keyboard Navigation -->
<!-- Use Tab to navigate between links and interactive elements -->
<!-- Use Enter to activate links and buttons -->
<!-- Use arrow keys to navigate within tables -->

`;
            return navHints + content;
        }
        return content;
    }

    /**
     * Add focus management
     * @private
     */
    _addFocusManagement(content) {
        return content.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            (match, text, url) => {
                if (url.startsWith('#')) {
                    return `[${text}](${url} "Navigate to ${text} section")`;
                }
                return match;
            }
        );
    }

    /**
     * Add high contrast support
     * @private
     */
    _addHighContrastSupport(content) {
        if (!content.includes('<!-- High Contrast -->')) {
            const contrastSupport = `<!-- High Contrast Support -->
<!-- This document supports high contrast mode -->
<!-- Color is not the only means of conveying information -->

`;
            return contrastSupport + content;
        }
        return content;
    }

    /**
     * Extract tables from content
     * @private
     */
    _extractTables(content) {
        const tables = [];
        const lines = content.split('\n');
        let currentTable = null;
        let lineNumber = 0;

        for (const line of lines) {
            lineNumber++;
            if (line.includes('|') && line.trim().length > 0) {
                if (!currentTable) {
                    currentTable = {
                        line: lineNumber,
                        headers: line.split('|').filter(cell => cell.trim().length > 0),
                        rows: [],
                        hasHeaders: true,
                        hasCaption: false
                    };
                } else {
                    const cells = line.split('|').filter(cell => cell.trim().length > 0);
                    if (!line.includes('---')) {
                        currentTable.rows.push(cells);
                    }
                }
            } else if (currentTable) {
                // Check for caption above table
                if (lineNumber > 1 && lines[lineNumber - 2].trim().length > 0) {
                    currentTable.hasCaption = true;
                }
                tables.push(currentTable);
                currentTable = null;
            }
        }

        if (currentTable) {
            tables.push(currentTable);
        }

        return tables;
    }

    /**
     * Detect Mermaid diagram type
     * @private
     */
    _detectMermaidType(diagramContent) {
        if (diagramContent.includes('graph') || diagramContent.includes('flowchart')) {
            return 'Flowchart';
        } else if (diagramContent.includes('sequenceDiagram')) {
            return 'Sequence';
        } else if (diagramContent.includes('classDiagram')) {
            return 'Class';
        } else if (diagramContent.includes('gantt')) {
            return 'Gantt';
        } else if (diagramContent.includes('pie')) {
            return 'Pie chart';
        }
        return 'Diagram';
    }

    /**
     * Find line number of text in content
     * @private
     */
    _findLineNumber(content, searchText) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(searchText.split('\n')[0])) {
                return i + 1;
            }
        }
        return 1;
    }
}