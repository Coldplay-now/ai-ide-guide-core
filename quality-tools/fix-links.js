#!/usr/bin/env node

import { LinkFixer } from './src/fixers/link-fixer.js';
import { ReferenceValidator } from './src/fixers/reference-validator.js';
import { BackupManager } from './src/core/backup-manager.js';
import { glob } from 'glob';
import fs from 'fs-extra';
import chalk from 'chalk';

async function fixLinksAndReferences() {
  try {
    const linkFixer = new LinkFixer({ 
      dryRun: false,
      verbose: true,
      backup: false // We already created a backup
    });
    
    const referenceValidator = new ReferenceValidator({
      dryRun: false,
      verbose: true
    });
    
    // Get all markdown files
    const files = await glob('../**/*.md');
    
    if (files.length === 0) {
      console.log(chalk.yellow('No files found matching the patterns'));
      return;
    }
    
    console.log(chalk.blue(`Processing ${files.length} files for link and reference fixes...`));
    
    let totalIssues = 0;
    let totalFixed = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for link issues
      const linkIssues = linkFixer.detectIssues(content, file);
      
      // Check for reference issues
      const refIssues = referenceValidator.detectIssues(content, file);
      
      const allIssues = [...linkIssues, ...refIssues];
      
      if (allIssues.length === 0) {
        console.log(chalk.green(`✅ ${file}: No link/reference issues found`));
        continue;
      }
      
      totalIssues += allIssues.length;
      console.log(chalk.yellow(`🔍 ${file}: Found ${allIssues.length} link/reference issues`));
      
      // Show issues
      allIssues.forEach(issue => {
        console.log(`  - Line ${issue.line}: ${issue.description} (${issue.severity})`);
      });
      
      // Fix link issues
      if (linkIssues.length > 0) {
        const linkResult = linkFixer.fix(content, linkIssues);
        if (linkResult.changes.length > 0) {
          await fs.writeFile(file, linkResult.content);
          totalFixed += linkResult.changes.length;
          console.log(chalk.green(`✅ ${file}: Applied ${linkResult.changes.length} link fixes`));
          
          // Show changes
          linkResult.changes.forEach(change => {
            console.log(`  - ${change.reason}`);
          });
        }
      }
      
      // Fix reference issues
      if (refIssues.length > 0) {
        const refResult = referenceValidator.fix(content, refIssues);
        if (refResult.changes && refResult.changes.length > 0) {
          await fs.writeFile(file, refResult.content);
          totalFixed += refResult.changes.length;
          console.log(chalk.green(`✅ ${file}: Applied ${refResult.changes.length} reference fixes`));
          
          // Show changes
          refResult.changes.forEach(change => {
            console.log(`  - ${change.reason}`);
          });
        }
      }
    }
    
    console.log(chalk.blue('\n📊 Link and Reference Fix Summary:'));
    console.log(`Total issues found: ${totalIssues}`);
    console.log(`Total fixes applied: ${totalFixed}`);
    console.log(chalk.green('✅ Link and reference fixing completed'));
    
  } catch (error) {
    console.error(chalk.red(`❌ Link and reference fixing failed: ${error.message}`));
    console.error(error.stack);
    process.exit(1);
  }
}

fixLinksAndReferences();