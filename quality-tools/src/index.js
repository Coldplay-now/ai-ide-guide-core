/**
 * Main entry point for AI IDE Guide Quality Tools
 * Exports all core components and utilities
 */

// Core components
export { BaseFixer } from './core/base-fixer.js';
export { BackupManager } from './core/backup-manager.js';
export { Validator } from './core/validator.js';
export { QualityChecker } from './core/quality-checker.js';
export { QualityMonitor } from './core/quality-monitor.js';
export { FixVerifier } from './core/fix-verifier.js';
export { MaintenanceFlowManager } from './core/maintenance-flow-manager.js';
export { UpdateVerificationSystem } from './core/update-verification-system.js';
export { MaintenanceTrainingSystem } from './core/maintenance-training-system.js';

// Fixers
export { CodeBlockFixer } from './fixers/code-block-fixer.js';
export { TableFixer } from './fixers/table-fixer.js';
export { MermaidFixer } from './fixers/mermaid-fixer.js';
export { StructureFixer } from './fixers/structure-fixer.js';
export { LinkAnalyzer } from './fixers/link-analyzer.js';
export { LinkFixer } from './fixers/link-fixer.js';
export { ReferenceValidator } from './fixers/reference-validator.js';
export { TerminologyAnalyzer } from './fixers/terminology-analyzer.js';
export { TerminologyStandardizer } from './fixers/terminology-standardizer.js';
export { TerminologyValidator } from './fixers/terminology-validator.js';
export { FormatDetector } from './fixers/format-detector.js';
export { FormatStandardizer } from './fixers/format-standardizer.js';
export { FormatValidator } from './fixers/format-validator.js';
export { PerformanceOptimizer } from './fixers/performance-optimizer.js';
export { AccessibilityEnhancer } from './fixers/accessibility-enhancer.js';
export { PerformanceAccessibilityValidator } from './fixers/performance-accessibility-validator.js';

// Re-export for convenience
export * from './core/base-fixer.js';
export * from './core/backup-manager.js';
export * from './core/validator.js';
export * from './core/quality-checker.js';
export * from './core/quality-monitor.js';
export * from './core/fix-verifier.js';
export * from './core/maintenance-flow-manager.js';
export * from './core/update-verification-system.js';
export * from './core/maintenance-training-system.js';
export * from './fixers/code-block-fixer.js';
export * from './fixers/table-fixer.js';
export * from './fixers/mermaid-fixer.js';
export * from './fixers/structure-fixer.js';
export * from './fixers/link-analyzer.js';
export * from './fixers/link-fixer.js';
export * from './fixers/reference-validator.js';
export * from './fixers/terminology-analyzer.js';
export * from './fixers/terminology-standardizer.js';
export * from './fixers/terminology-validator.js';
export * from './fixers/format-detector.js';
export * from './fixers/format-standardizer.js';
export * from './fixers/format-validator.js';
export * from './fixers/performance-optimizer.js';
export * from './fixers/accessibility-enhancer.js';
export * from './fixers/performance-accessibility-validator.js';