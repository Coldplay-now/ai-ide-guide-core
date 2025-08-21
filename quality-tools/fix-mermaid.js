#!/usr/bin/env node

import { MermaidFixer } from './src/fixers/mermaid-fixer.js';
import { BackupManager } from './src/core/backup-manager.js';
import { glob } from 'glob';
import fs from 'fs-extra';
import chalk from 'chalk';

async function fixMermaidDiagrams() {
  try {
    const fixer = new MermaidFixer({ 
      dryRun: false,
      verbose: true,
      backup: false // We already created a backup
    });
    
    // Get all markdown files
    const files = await glob('../**/*.md');
    
    if (files.length === 0) {
      console.log(chalk.yellow('No files found matching the patterns'));
      return;
    }
    
    console.log(chalk.blue(`Processing ${files.length} files for Mermaid optimization...`));
    
    let totalIssues = 0;
    let totalFixed = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const issues = fixer.detectIssues(content, file);
      
      if (issues.length === 0) {
        console.log(chalk.green(`✅ ${file}: No Mermaid issues found`));
        continue;
      }
      
      totalIssues += issues.length;
      console.log(chalk.yellow(`🔍 ${file}: Found ${issues.length} Mermaid issues`));
      
      // Show issues
      issues.forEach(issue => {
        console.log(`  - Line ${issue.line}: ${issue.description} (${issue.severity})`);
      });
      
      // Fix issues
      const result = fixer.fix(content, issues);
      await fs.writeFile(file, result.content);
      
      totalFixed += result.changes.length;
      console.log(chalk.green(`✅ ${file}: Applied ${result.changes.length} Mermaid fixes`));
      
      // Show changes
      result.changes.forEach(change => {
        console.log(`  - ${change.reason}`);
      });
    }
    
    console.log(chalk.blue('\n📊 Mermaid Optimization Summary:'));
    console.log(`Total issues found: ${totalIssues}`);
    console.log(`Total fixes applied: ${totalFixed}`);
    console.log(chalk.green('✅ Mermaid optimization completed'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Mermaid optimization failed: ${error.message}`));
    process.exit(1);
  }
}

fixMermaidDiagrams();