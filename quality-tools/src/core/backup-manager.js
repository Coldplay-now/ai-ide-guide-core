import fs from 'fs-extra';
import path from 'path';

/**
 * Backup and rollback manager for quality fixing operations
 * Ensures safe operations with ability to restore original state
 */
export class BackupManager {
  constructor(options = {}) {
    this.options = {
      backupDir: '.quality-backups',
      maxBackups: 10,
      timestampFormat: 'YYYY-MM-DD_HH-mm-ss',
      ...options
    };
    this.backupId = this.generateBackupId();
  }

  /**
   * Generate a unique backup ID based on timestamp
   * @returns {string} Backup ID
   */
  generateBackupId() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }

  /**
   * Create backup of files before modification
   * @param {Array|string} filePaths - File paths to backup
   * @returns {Promise<string>} Backup directory path
   */
  async createBackup(filePaths) {
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const backupPath = path.join(this.options.backupDir, this.backupId);
    
    await fs.ensureDir(backupPath);
    
    const backupManifest = {
      id: this.backupId,
      timestamp: new Date().toISOString(),
      files: [],
      originalPaths: []
    };

    for (const filePath of paths) {
      if (await fs.pathExists(filePath)) {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupFilePath = path.join(backupPath, relativePath);
        
        await fs.ensureDir(path.dirname(backupFilePath));
        await fs.copy(filePath, backupFilePath);
        
        backupManifest.files.push(relativePath);
        backupManifest.originalPaths.push(filePath);
      }
    }

    // Save backup manifest
    await fs.writeJson(path.join(backupPath, 'manifest.json'), backupManifest, { spaces: 2 });
    
    // Clean up old backups
    await this.cleanupOldBackups();
    
    console.log(`✅ Created backup: ${this.backupId}`);
    return backupPath;
  }

  /**
   * Restore files from backup
   * @param {string} backupId - Backup ID to restore from
   * @returns {Promise<boolean>} Success status
   */
  async rollback(backupId = this.backupId) {
    const backupPath = path.join(this.options.backupDir, backupId);
    const manifestPath = path.join(backupPath, 'manifest.json');
    
    if (!await fs.pathExists(manifestPath)) {
      throw new Error(`Backup manifest not found: ${manifestPath}`);
    }

    const manifest = await fs.readJson(manifestPath);
    
    for (let i = 0; i < manifest.files.length; i++) {
      const relativePath = manifest.files[i];
      const originalPath = manifest.originalPaths[i];
      const backupFilePath = path.join(backupPath, relativePath);
      
      if (await fs.pathExists(backupFilePath)) {
        await fs.ensureDir(path.dirname(originalPath));
        await fs.copy(backupFilePath, originalPath);
      }
    }
    
    console.log(`✅ Restored from backup: ${backupId}`);
    return true;
  }

  /**
   * List available backups
   * @returns {Promise<Array>} Array of backup information
   */
  async listBackups() {
    const backupDir = this.options.backupDir;
    
    if (!await fs.pathExists(backupDir)) {
      return [];
    }

    const backupDirs = await fs.readdir(backupDir);
    const backups = [];

    for (const dir of backupDirs) {
      const manifestPath = path.join(backupDir, dir, 'manifest.json');
      if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath);
        backups.push({
          id: manifest.id,
          timestamp: manifest.timestamp,
          fileCount: manifest.files.length,
          path: path.join(backupDir, dir)
        });
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Clean up old backups beyond the maximum limit
   * @returns {Promise<void>}
   */
  async cleanupOldBackups() {
    const backups = await this.listBackups();
    
    if (backups.length > this.options.maxBackups) {
      const toDelete = backups.slice(this.options.maxBackups);
      
      for (const backup of toDelete) {
        await fs.remove(backup.path);
        console.log(`🗑️ Removed old backup: ${backup.id}`);
      }
    }
  }

  /**
   * Verify backup integrity
   * @param {string} backupId - Backup ID to verify
   * @returns {Promise<Object>} Verification result
   */
  async verifyBackup(backupId) {
    const backupPath = path.join(this.options.backupDir, backupId);
    const manifestPath = path.join(backupPath, 'manifest.json');
    
    const result = {
      isValid: true,
      missingFiles: [],
      errors: []
    };

    try {
      if (!await fs.pathExists(manifestPath)) {
        result.isValid = false;
        result.errors.push('Manifest file not found');
        return result;
      }

      const manifest = await fs.readJson(manifestPath);
      
      for (const relativePath of manifest.files) {
        const backupFilePath = path.join(backupPath, relativePath);
        if (!await fs.pathExists(backupFilePath)) {
          result.isValid = false;
          result.missingFiles.push(relativePath);
        }
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(error.message);
    }

    return result;
  }
}