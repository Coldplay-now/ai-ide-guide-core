/**
 * Performance Optimizer
 * Optimizes document loading performance, chart/table rendering, and mobile device adaptation
 */

import { BaseFixer } from '../core/base-fixer.js';

export class PerformanceOptimizer extends BaseFixer {
    constructor(options = {}) {
        super(options);
        this.maxImageSize = options.maxImageSize || 1024 * 1024; // 1MB
        this.maxTableColumns = options.maxTableColumns || 8;
        this.maxMermaidNodes = options.maxMermaidNodes || 20;
        this.mobileBreakpoint = options.mobileBreakpoint || 768;
    }

    /**
     * Analyze document for performance issues
     * @param {string} content - Document content
     * @param {string} filePath - File path for context
     * @returns {Object} Performance analysis results
     */
    analyzePerformance(content, filePath = '') {
        const issues = [];
        const metrics = {
            contentSize: content.length,
            imageCount: 0,
            tableCount: 0,
            mermaidCount: 0,
            complexTables: 0,
            complexMermaid: 0,
            loadingOptimizations: []
        };

        // Analyze images
        const imageMatches = content.match(/!\[.*?\]\(.*?\)/g) || [];
        metrics.imageCount = imageMatches.length;
        
        imageMatches.forEach((match, index) => {
            const urlMatch = match.match(/\((.*?)\)/);
            if (urlMatch && urlMatch[1]) {
                const url = urlMatch[1];
                if (!url.includes('loading=') && !url.includes('lazy')) {
                    issues.push({
                        type: 'image_loading',
                        line: this._findLineNumber(content, match),
                        description: `Image ${index + 1} missing lazy loading optimization`,
                        suggestion: 'Add lazy loading attributes for better performance',
                        severity: 'minor'
                    });
                }
            }
        });

        // Analyze tables
        const tableMatches = content.match(/\|.*\|/g) || [];
        const tables = this._extractTables(content);
        metrics.tableCount = tables.length;

        tables.forEach((table, index) => {
            const columns = table.headers.length;
            if (columns > this.maxTableColumns) {
                metrics.complexTables++;
                issues.push({
                    type: 'table_complexity',
                    line: table.line,
                    description: `Table ${index + 1} has ${columns} columns (max recommended: ${this.maxTableColumns})`,
                    suggestion: 'Consider splitting into multiple tables or using responsive design',
                    severity: 'major'
                });
            }
        });

        // Analyze Mermaid diagrams
        const mermaidMatches = content.match(/```mermaid\n([\s\S]*?)\n```/g) || [];
        metrics.mermaidCount = mermaidMatches.length;

        mermaidMatches.forEach((match, index) => {
            const diagramContent = match.replace(/```mermaid\n|\n```/g, '');
            const nodeCount = this._countMermaidNodes(diagramContent);
            
            if (nodeCount > this.maxMermaidNodes) {
                metrics.complexMermaid++;
                issues.push({
                    type: 'mermaid_complexity',
                    line: this._findLineNumber(content, match),
                    description: `Mermaid diagram ${index + 1} has ${nodeCount} nodes (max recommended: ${this.maxMermaidNodes})`,
                    suggestion: 'Consider breaking into smaller diagrams or using progressive disclosure',
                    severity: 'major'
                });
            }
        });

        // Check for mobile optimization
        if (!content.includes('viewport') && !content.includes('responsive')) {
            issues.push({
                type: 'mobile_optimization',
                line: 1,
                description: 'Document lacks mobile optimization indicators',
                suggestion: 'Add responsive design considerations',
                severity: 'minor'
            });
        }

        return { issues, metrics };
    }

    /**
     * Optimize document loading performance
     * @param {string} content - Document content
     * @returns {string} Optimized content
     */
    optimizeLoading(content) {
        let optimized = content;

        // Add lazy loading to images
        optimized = optimized.replace(
            /!\[(.*?)\]\((.*?)\)/g,
            (match, alt, src) => {
                if (!src.includes('loading=') && !src.includes('data:')) {
                    return `![${alt}](${src} "loading=lazy")`;
                }
                return match;
            }
        );

        // Optimize large tables for progressive loading
        optimized = this._optimizeTableLoading(optimized);

        // Add performance hints for Mermaid diagrams
        optimized = this._optimizeMermaidLoading(optimized);

        return optimized;
    }

    /**
     * Optimize charts and tables for better rendering
     * @param {string} content - Document content
     * @returns {string} Optimized content
     */
    optimizeRendering(content) {
        let optimized = content;

        // Optimize table rendering
        optimized = this._optimizeTableRendering(optimized);

        // Optimize Mermaid rendering
        optimized = this._optimizeMermaidRendering(optimized);

        return optimized;
    }

    /**
     * Add mobile device adaptations
     * @param {string} content - Document content
     * @returns {string} Mobile-optimized content
     */
    optimizeForMobile(content) {
        let optimized = content;

        // Add responsive table wrappers
        optimized = this._addResponsiveTableWrappers(optimized);

        // Add mobile-friendly Mermaid configurations
        optimized = this._addMobileMermaidConfig(optimized);

        // Add mobile optimization comments
        if (!optimized.includes('<!-- Mobile Optimized -->')) {
            optimized = '<!-- Mobile Optimized -->\n' + optimized;
        }

        return optimized;
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
                        rows: []
                    };
                } else {
                    const cells = line.split('|').filter(cell => cell.trim().length > 0);
                    if (!line.includes('---')) {
                        currentTable.rows.push(cells);
                    }
                }
            } else if (currentTable) {
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
     * Count nodes in Mermaid diagram
     * @private
     */
    _countMermaidNodes(diagramContent) {
        // Simple node counting - count unique identifiers
        const nodePattern = /\b[A-Za-z][A-Za-z0-9]*\b/g;
        const matches = diagramContent.match(nodePattern) || [];
        const uniqueNodes = new Set(matches.filter(match => 
            !['graph', 'flowchart', 'TB', 'TD', 'BT', 'RL', 'LR', 'subgraph', 'end'].includes(match)
        ));
        return uniqueNodes.size;
    }

    /**
     * Optimize table loading
     * @private
     */
    _optimizeTableLoading(content) {
        return content.replace(
            /((?:\|.*\|\n)+)/g,
            (match) => {
                const rows = match.split('\n').filter(row => row.trim());
                if (rows.length > 10) {
                    return `<!-- Large table - consider pagination -->\n${match}`;
                }
                return match;
            }
        );
    }

    /**
     * Optimize Mermaid loading
     * @private
     */
    _optimizeMermaidLoading(content) {
        return content.replace(
            /```mermaid\n([\s\S]*?)\n```/g,
            (match, diagramContent) => {
                const nodeCount = this._countMermaidNodes(diagramContent);
                if (nodeCount > 15) {
                    return `<!-- Complex diagram - ${nodeCount} nodes -->\n${match}`;
                }
                return match;
            }
        );
    }

    /**
     * Optimize table rendering
     * @private
     */
    _optimizeTableRendering(content) {
        return content.replace(
            /((?:\|.*\|\n)+)/g,
            (match) => {
                const lines = match.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    const columns = lines[0].split('|').filter(cell => cell.trim()).length;
                    if (columns > 6) {
                        return `<div class="table-responsive">\n\n${match}\n</div>\n`;
                    }
                }
                return match;
            }
        );
    }

    /**
     * Optimize Mermaid rendering
     * @private
     */
    _optimizeMermaidRendering(content) {
        return content.replace(
            /```mermaid\n([\s\S]*?)\n```/g,
            (match, diagramContent) => {
                if (!diagramContent.includes('%%{init:')) {
                    const config = '%%{init: {"theme": "default", "themeVariables": {"primaryColor": "#ff0000"}}}%%\n';
                    return match.replace('```mermaid\n', `\`\`\`mermaid\n${config}`);
                }
                return match;
            }
        );
    }

    /**
     * Add responsive table wrappers
     * @private
     */
    _addResponsiveTableWrappers(content) {
        return content.replace(
            /((?:\|.*\|\n)+)/g,
            (match) => {
                if (!match.includes('table-responsive')) {
                    return `<div class="table-responsive">\n\n${match}\n</div>\n`;
                }
                return match;
            }
        );
    }

    /**
     * Add mobile Mermaid configuration
     * @private
     */
    _addMobileMermaidConfig(content) {
        return content.replace(
            /```mermaid\n([\s\S]*?)\n```/g,
            (match, diagramContent) => {
                if (!diagramContent.includes('%%{init:')) {
                    const mobileConfig = '%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%\n';
                    return match.replace('```mermaid\n', `\`\`\`mermaid\n${mobileConfig}`);
                }
                return match;
            }
        );
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