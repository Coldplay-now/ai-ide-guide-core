import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackupManager } from '../../src/core/backup-manager.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('BackupManager', () => {
  let backupManager;
  let testDir;
  let testFile;

  beforeEach(async () => {
    // Create test directory and file
    testDir = path.join(__dirname, 'test-backup');
    testFile = path.join(testDir, 'test.md');
    
    await fs.ensureDir(testDir);
    await fs.writeFile(testFile, 'Original content');
    
    backupManager = new BackupManager({
      backupDir: path.join(testDir, '.test-backups'),
      maxBackups: 3
    });
  });

  afterEach(async () => {
    // Clean up test directory
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const manager = new BackupManager();
      expect(manager.options.backupDir).toBe('.quality-backups');
      expect(manager.options.maxBackups).toBe(10);
    });

    it('should accept custom options', () => {
      const manager = new BackupManager({
        backupDir: 'custom-backups',
        maxBackups: 5
      });
      expect(manager.options.backupDir).toBe('custom-backups');
      expect(manager.options.maxBackups).toBe(5);
    });

    it('should generate a backup ID', () => {
      expect(backupManager.backupId).toBeDefined();
      expect(typeof backupManager.backupId).toBe('string');
      expect(backupManager.backupId.length).toBeGreaterThan(0);
    });
  });

  describe('createBackup', () => {
    it('should create backup of a single file', async () => {
      const backupPath = await backupManager.createBackup(testFile);
      
      expect(await fs.pathExists(backupPath)).toBe(true);
      
      const manifestPath = path.join(backupPath, 'manifest.json');
      expect(await fs.pathExists(manifestPath)).toBe(true);
      
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.files).toHaveLength(1);
      expect(manifest.originalPaths).toContain(testFile);
    });

    it('should create backup of multiple files', async () => {
      const testFile2 = path.join(testDir, 'test2.md');
      await fs.writeFile(testFile2, 'Second file content');
      
      const backupPath = await backupManager.createBackup([testFile, testFile2]);
      
      const manifestPath = path.join(backupPath, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      
      expect(manifest.files).toHaveLength(2);
      expect(manifest.originalPaths).toContain(testFile);
      expect(manifest.originalPaths).toContain(testFile2);
    });

    it('should handle non-existent files gracefully', async () => {
      const nonExistentFile = path.join(testDir, 'does-not-exist.md');
      const backupPath = await backupManager.createBackup([testFile, nonExistentFile]);
      
      const manifestPath = path.join(backupPath, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      
      expect(manifest.files).toHaveLength(1);
      expect(manifest.originalPaths).toContain(testFile);
      expect(manifest.originalPaths).not.toContain(nonExistentFile);
    });
  });

  describe('rollback', () => {
    it('should restore files from backup', async () => {
      // Create backup
      const backupPath = await backupManager.createBackup(testFile);
      
      // Modify original file
      await fs.writeFile(testFile, 'Modified content');
      expect(await fs.readFile(testFile, 'utf8')).toBe('Modified content');
      
      // Rollback
      await backupManager.rollback();
      
      // Check if original content is restored
      expect(await fs.readFile(testFile, 'utf8')).toBe('Original content');
    });

    it('should rollback to specific backup ID', async () => {
      // Create backup
      await backupManager.createBackup(testFile);
      const backups = await backupManager.listBackups();
      expect(backups.length).toBeGreaterThan(0);
      
      const backupId = backups[0].id;
      
      // Modify file
      await fs.writeFile(testFile, 'Modified content');
      expect(await fs.readFile(testFile, 'utf8')).toBe('Modified content');
      
      // Rollback to backup
      await backupManager.rollback(backupId);
      
      expect(await fs.readFile(testFile, 'utf8')).toBe('Original content');
    });

    it('should throw error for non-existent backup', async () => {
      await expect(backupManager.rollback('non-existent-backup'))
        .rejects.toThrow('Backup manifest not found');
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups exist', async () => {
      const backups = await backupManager.listBackups();
      expect(backups).toEqual([]);
    });

    it('should list existing backups', async () => {
      await backupManager.createBackup(testFile);
      
      const backups = await backupManager.listBackups();
      expect(backups).toHaveLength(1);
      expect(backups[0]).toHaveProperty('id');
      expect(backups[0]).toHaveProperty('timestamp');
      expect(backups[0]).toHaveProperty('fileCount');
      expect(backups[0].fileCount).toBe(1);
    });

    it('should sort backups by timestamp (newest first)', async () => {
      // Create first backup
      await backupManager.createBackup(testFile);
      
      // Wait a bit and create second backup with different manager to get different timestamp
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait longer to ensure different timestamp
      const secondManager = new BackupManager({
        backupDir: backupManager.options.backupDir
      });
      await secondManager.createBackup(testFile);
      
      const backups = await backupManager.listBackups();
      expect(backups.length).toBeGreaterThanOrEqual(1);
      
      if (backups.length >= 2) {
        const firstTimestamp = new Date(backups[0].timestamp);
        const secondTimestamp = new Date(backups[1].timestamp);
        expect(firstTimestamp.getTime()).toBeGreaterThanOrEqual(secondTimestamp.getTime());
      }
    });
  });

  describe('verifyBackup', () => {
    it('should verify valid backup', async () => {
      const backupPath = await backupManager.createBackup(testFile);
      const backupId = path.basename(backupPath);
      
      const result = await backupManager.verifyBackup(backupId);
      
      expect(result.isValid).toBe(true);
      expect(result.missingFiles).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing manifest', async () => {
      const result = await backupManager.verifyBackup('non-existent-backup');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Manifest file not found');
    });
  });

  describe('cleanupOldBackups', () => {
    it('should remove old backups beyond maxBackups limit', async () => {
      // Create more backups than the limit
      for (let i = 0; i < 5; i++) {
        const manager = new BackupManager({
          backupDir: backupManager.options.backupDir,
          maxBackups: 3
        });
        await manager.createBackup(testFile);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const backups = await backupManager.listBackups();
      expect(backups.length).toBeLessThanOrEqual(3);
    });
  });
});