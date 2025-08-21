import { describe, it, expect, beforeEach } from 'vitest';
import { StructureFixer } from '../../src/fixers/structure-fixer.js';

describe('StructureFixer - Basic Functionality', () => {
  let fixer;

  beforeEach(() => {
    fixer = new StructureFixer({ verbose: false });
  });

  it('should create a fixer instance', () => {
    expect(fixer).toBeDefined();
    expect(fixer.detectIssues).toBeDefined();
    expect(fixer.fix).toBeDefined();
  });

  it('should detect basic heading issues', () => {
    const content = `# Title
### Skipped Level`;

    const issues = fixer.detectIssues(content, 'test.md');
    expect(issues.length).toBeGreaterThan(0);
    
    const skipIssues = issues.filter(i => i.type === 'heading_level_skip');
    expect(skipIssues.length).toBeGreaterThan(0);
  });

  it('should fix basic heading level skips', () => {
    const content = `# Title
### Skipped Level`;

    const issues = fixer.detectIssues(content, 'test.md');
    const result = fixer.fix(content, issues);
    
    expect(result.content).toContain('## Skipped Level');
  });

  it('should detect empty headings', () => {
    const content = `# Valid Title
## 
### Another Title`;

    const issues = fixer.detectIssues(content, 'test.md');
    const emptyIssues = issues.filter(i => i.type === 'empty_heading');
    expect(emptyIssues.length).toBeGreaterThan(0);
  });

  it('should analyze document structure', () => {
    const content = `# Title
## Section
- List item
- Another item`;

    const structure = fixer.analyzeDocumentStructure(content);
    
    expect(structure.headings.length).toBe(2);
    expect(structure.lists.length).toBe(1);
    expect(structure.lists[0].items.length).toBe(2);
  });
});