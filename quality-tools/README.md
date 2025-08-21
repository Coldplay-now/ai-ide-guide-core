# AI IDE Guide Quality Tools

A comprehensive toolkit for detecting, fixing, and validating quality issues in the AI IDE Guide documentation.

## Features

- **Code Block Fixing**: Detect and fix unclosed code blocks, missing language identifiers, and spacing issues
- **Table Validation**: Check table structure, column alignment, and cell consistency
- **Mermaid Optimization**: Validate and optimize Mermaid diagrams for better rendering
- **Document Structure**: Ensure proper heading hierarchy and formatting consistency
- **Backup & Rollback**: Safe operations with automatic backup and rollback capabilities
- **Automated Testing**: Comprehensive test suite with coverage reporting

## Installation

```bash
cd ai-ide-guide-v2/quality-tools
npm install
```

## Usage

### Command Line Interface

The toolkit provides a CLI for common operations:

```bash
# Create backup of files
npm run backup "docs/**/*.md"

# Validate files for quality issues
npm run validate "docs/**/*.md"

# List available backups
node src/cli.js list-backups

# Rollback to a previous backup
npm run rollback [backup-id]
```

### Programmatic Usage

```javascript
import { BackupManager, Validator, BaseFixer } from './src/index.js';

// Create backup before making changes
const backupManager = new BackupManager();
await backupManager.createBackup(['docs/chapter1.md', 'docs/chapter2.md']);

// Validate files
const validator = new Validator();
const results = await validator.validateFiles(['docs/**/*.md']);

// Custom fixer implementation
class MyFixer extends BaseFixer {
  detectIssues(content, filePath) {
    // Implement issue detection logic
    return [];
  }
  
  fix(content, issues) {
    // Implement fixing logic
    return { content, changes: [], status: 'success' };
  }
}
```

## Architecture

### Core Components

1. **BaseFixer**: Abstract base class for all quality fixing components
2. **BackupManager**: Handles file backup and rollback operations
3. **Validator**: Validates content against quality rules

### Quality Rules

The validator includes built-in rules for:

- **code-block-closed**: Ensures all code blocks are properly closed
- **table-structure**: Validates table column consistency
- **mermaid-syntax**: Checks Mermaid diagram syntax and structure
- **heading-hierarchy**: Validates heading level progression

### Custom Rules

You can add custom validation rules:

```javascript
const validator = new Validator();

validator.addRule('custom-rule', (content) => {
  // Your validation logic here
  return {
    isValid: true,
    message: 'All checks passed',
    issues: []
  };
});
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Configuration

### Backup Options

```javascript
const backupManager = new BackupManager({
  backupDir: '.quality-backups',  // Backup directory
  maxBackups: 10,                 // Maximum number of backups to keep
  timestampFormat: 'YYYY-MM-DD_HH-mm-ss'
});
```

### Validator Options

```javascript
const validator = new Validator({
  strictMode: false,      // Enable strict validation
  checkSyntax: true,      // Check syntax validity
  checkRendering: true    // Check rendering compatibility
});
```

## Development

### Project Structure

```javascript
quality-tools/
├── src/
│   ├── core/
│   │   ├── base-fixer.js      # Base fixer class
│   │   ├── backup-manager.js  # Backup and rollback
│   │   └── validator.js       # Validation engine
│   ├── cli.js                 # Command line interface
│   └── index.js              # Main exports
├── test/
│   └── core/                 # Test files
├── package.json
├── vitest.config.js
└── README.md
```

### Adding New Fixers

1. Extend the `BaseFixer` class
2. Implement `detectIssues()` and `fix()` methods
3. Add validation logic in `validate()` if needed
4. Write comprehensive tests

### Contributing

1. Follow the existing code style (ESLint configuration provided)
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT License - see LICENSE file for details.