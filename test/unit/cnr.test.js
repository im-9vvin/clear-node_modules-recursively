const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { 
  findAndRemoveNodeModules, 
  getDirectorySize, 
  formatSize 
} = require('../../cnr.js');
const { 
  createTestEnvironment, 
  assertDirectoryExists, 
  assertDirectoryNotExists 
} = require('../helpers/test-utils');

describe('CNR Unit Tests', function() {
  let testEnv;

  beforeEach(async function() {
    testEnv = createTestEnvironment();
  });

  afterEach(async function() {
    await testEnv.cleanup();
  });

  describe('formatSize function', function() {
    it('should format bytes correctly', function() {
      expect(formatSize(0)).to.equal('0.00 B');
      expect(formatSize(512)).to.equal('512.00 B');
      expect(formatSize(1023)).to.equal('1023.00 B');
    });

    it('should format kilobytes correctly', function() {
      expect(formatSize(1024)).to.equal('1.00 KB');
      expect(formatSize(1536)).to.equal('1.50 KB');
      expect(formatSize(2048)).to.equal('2.00 KB');
    });

    it('should format megabytes correctly', function() {
      expect(formatSize(1024 * 1024)).to.equal('1.00 MB');
      expect(formatSize(1.5 * 1024 * 1024)).to.equal('1.50 MB');
      expect(formatSize(100 * 1024 * 1024)).to.equal('100.00 MB');
    });

    it('should format gigabytes correctly', function() {
      expect(formatSize(1024 * 1024 * 1024)).to.equal('1.00 GB');
      expect(formatSize(2.5 * 1024 * 1024 * 1024)).to.equal('2.50 GB');
    });

    it('should format terabytes correctly', function() {
      expect(formatSize(1024 * 1024 * 1024 * 1024)).to.equal('1.00 TB');
      expect(formatSize(1.5 * 1024 * 1024 * 1024 * 1024)).to.equal('1.50 TB');
    });

    it('should handle edge cases', function() {
      expect(formatSize(null)).to.equal('0.00 B');
      expect(formatSize(undefined)).to.equal('0.00 B');
      expect(formatSize(-100)).to.equal('-100.00 B');
    });

    it('should handle very large numbers', function() {
      const veryLarge = 10 * 1024 * 1024 * 1024 * 1024; // 10 TB
      expect(formatSize(veryLarge)).to.equal('10.00 TB');
    });

    it('should maintain precision for decimal values', function() {
      expect(formatSize(1536.7)).to.equal('1.50 KB'); // Should round appropriately
      expect(formatSize(1024.1)).to.equal('1.00 KB'); // Should handle small decimals
    });
  });

  describe('getDirectorySize function', function() {
    it('should calculate size of empty directory', async function() {
      const emptyDir = await testEnv.createDirectoryStructure({ 'empty': null });
      const emptyPath = path.join(emptyDir, 'empty');
      
      const result = await getDirectorySize(emptyPath);
      expect(result.size).to.equal(0);
      expect(result.fileCount).to.equal(0);
    });

    it('should calculate size of directory with files', async function() {
      const testContent = 'Hello World!'; // 12 bytes
      const structure = {
        'test-dir': {
          'file1.txt': testContent,
          'file2.txt': testContent
        }
      };
      
      const basePath = await testEnv.createDirectoryStructure(structure);
      const testDirPath = path.join(basePath, 'test-dir');
      
      const result = await getDirectorySize(testDirPath);
      expect(result.size).to.equal(24); // 12 bytes * 2 files
      expect(result.fileCount).to.equal(2);
    });

    it('should calculate size recursively', async function() {
      const testContent = 'Test'; // 4 bytes
      const structure = {
        'root': {
          'file1.txt': testContent,
          'subdir': {
            'file2.txt': testContent,
            'nested': {
              'file3.txt': testContent
            }
          }
        }
      };
      
      const basePath = await testEnv.createDirectoryStructure(structure);
      const rootPath = path.join(basePath, 'root');
      
      const result = await getDirectorySize(rootPath);
      expect(result.size).to.equal(12); // 4 bytes * 3 files
      expect(result.fileCount).to.equal(3);
    });

    it('should handle non-existent directory', async function() {
      const nonExistentPath = path.join(testEnv.baseDir || await testEnv.createTempBase(), 'does-not-exist');
      
      const result = await getDirectorySize(nonExistentPath);
      expect(result.size).to.equal(0);
      expect(result.fileCount).to.equal(0);
    });

    it('should handle permission errors gracefully', async function() {
      // Create a directory structure
      const structure = { 'test': { 'file.txt': 'content' } };
      const basePath = await testEnv.createDirectoryStructure(structure);
      const testPath = path.join(basePath, 'test');
      
      // On Unix systems, test with restricted permissions
      if (process.platform !== 'win32') {
        try {
          await fs.promises.chmod(testPath, 0o000); // No permissions
          const result = await getDirectorySize(testPath);
          // Should handle gracefully and return 0
          expect(result.size).to.equal(0);
          expect(result.fileCount).to.equal(0);
          
          // Restore permissions for cleanup
          await fs.promises.chmod(testPath, 0o755);
        } catch (err) {
          // Skip this test on systems where chmod doesn't work as expected
          this.skip();
        }
      } else {
        this.skip(); // Skip on Windows
      }
    });

    it('should count only files, not directories', async function() {
      const structure = {
        'root': {
          'file.txt': 'content', // 7 bytes
          'empty-dir': null,
          'subdir': {
            'nested-file.txt': 'test' // 4 bytes
          }
        }
      };
      
      const basePath = await testEnv.createDirectoryStructure(structure);
      const rootPath = path.join(basePath, 'root');
      
      const result = await getDirectorySize(rootPath);
      expect(result.size).to.equal(11); // 7 + 4 bytes
      expect(result.fileCount).to.equal(2); // Only files counted
    });
  });

  describe('findAndRemoveNodeModules function - dry run mode', function() {
    it('should find node_modules without deleting in dry run', async function() {
      const projectPath = await testEnv.createTypicalProject('test-project');
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      
      // Verify node_modules exists before
      await assertDirectoryExists(nodeModulesPath);
      
      const result = await findAndRemoveNodeModules(projectPath, { 
        silent: true, 
        dryRun: true 
      });
      
      // Should find 1 node_modules
      expect(result.totalRemoved).to.equal(1);
      expect(result.totalSize).to.be.greaterThan(0);
      
      // node_modules should still exist (dry run)
      await assertDirectoryExists(nodeModulesPath);
    });

    it('should find multiple node_modules directories in dry run', async function() {
      const basePath = await testEnv.createNestedProjects();
      const nodeModulesCount = await testEnv.countNodeModules(basePath);
      
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      
      // Should find 3 node_modules (project-a, subproject, project-b)
      // but not the hidden one (.hidden-project should be ignored)
      expect(result.totalRemoved).to.equal(3);
      expect(result.totalSize).to.be.greaterThan(0);
    });

    it('should ignore hidden directories', async function() {
      const structure = {
        'normal-project': {
          'node_modules': { 'lib': { 'index.js': '// lib' } }
        },
        '.hidden-project': {
          'node_modules': { 'hidden-lib': { 'index.js': '// hidden' } }
        },
        '.git': {
          'node_modules': { 'git-lib': { 'index.js': '// git' } }
        }
      };
      
      const basePath = await testEnv.createDirectoryStructure(structure);
      
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      
      // Should only find 1 node_modules (normal-project)
      expect(result.totalRemoved).to.equal(1);
    });

    it('should handle empty directories', async function() {
      const basePath = await testEnv.createTempBase();
      await fs.promises.mkdir(path.join(basePath, 'empty-project'));
      
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      
      expect(result.totalRemoved).to.equal(0);
      expect(result.totalSize).to.equal(0);
    });

    it('should calculate total size correctly', async function() {
      const projectPath = await testEnv.createTypicalProject();
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      
      // Get expected size
      const expectedStats = await getDirectorySize(nodeModulesPath);
      
      const result = await findAndRemoveNodeModules(projectPath, { 
        silent: true, 
        dryRun: true 
      });
      
      expect(result.totalSize).to.equal(expectedStats.size);
    });
  });

  describe('findAndRemoveNodeModules function - actual deletion', function() {
    it('should actually delete node_modules directories', async function() {
      const projectPath = await testEnv.createTypicalProject('delete-test');
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      
      // Verify exists before
      await assertDirectoryExists(nodeModulesPath);
      
      const result = await findAndRemoveNodeModules(projectPath, { silent: true });
      
      expect(result.totalRemoved).to.equal(1);
      expect(result.totalSize).to.be.greaterThan(0);
      
      // Should be deleted
      await assertDirectoryNotExists(nodeModulesPath);
    });

    it('should delete multiple node_modules directories', async function() {
      const basePath = await testEnv.createNestedProjects();
      
      // Verify all exist before
      await assertDirectoryExists(path.join(basePath, 'project-a', 'node_modules'));
      await assertDirectoryExists(path.join(basePath, 'project-a', 'subproject', 'node_modules'));
      await assertDirectoryExists(path.join(basePath, 'project-b', 'node_modules'));
      
      const result = await findAndRemoveNodeModules(basePath, { silent: true });
      
      expect(result.totalRemoved).to.equal(3);
      
      // All should be deleted
      await assertDirectoryNotExists(path.join(basePath, 'project-a', 'node_modules'));
      await assertDirectoryNotExists(path.join(basePath, 'project-a', 'subproject', 'node_modules'));
      await assertDirectoryNotExists(path.join(basePath, 'project-b', 'node_modules'));
    });

    it('should preserve other directories and files', async function() {
      const projectPath = await testEnv.createTypicalProject('preserve-test');
      
      // Verify other directories exist before
      await assertDirectoryExists(path.join(projectPath, 'src'));
      
      await findAndRemoveNodeModules(projectPath, { silent: true });
      
      // Other directories should still exist
      await assertDirectoryExists(path.join(projectPath, 'src'));
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).to.be.true;
    });

    it('should handle non-existent directory', async function() {
      const nonExistentPath = path.join(await testEnv.createTempBase(), 'does-not-exist');
      
      try {
        const result = await findAndRemoveNodeModules(nonExistentPath, { silent: true });
        // Should handle gracefully
        expect(result.totalRemoved).to.equal(0);
        expect(result.totalSize).to.equal(0);
      } catch (err) {
        // Alternatively, might throw an error - both behaviors are acceptable
        expect(err.code).to.match(/ENOENT/);
      }
    });
  });

  describe('findAndRemoveNodeModules function - options', function() {
    it('should respect silent option', async function() {
      const projectPath = await testEnv.createTypicalProject();
      
      // Capture console output
      const originalLog = console.log;
      const originalError = console.error;
      let logCalls = 0;
      let errorCalls = 0;
      
      console.log = () => logCalls++;
      console.error = () => errorCalls++;
      
      try {
        await findAndRemoveNodeModules(projectPath, { silent: true });
        expect(logCalls).to.equal(0);
        expect(errorCalls).to.equal(0);
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    });

    it('should log when not in silent mode', async function() {
      const projectPath = await testEnv.createTypicalProject();
      
      // Capture console output
      const originalLog = console.log;
      let logCalls = 0;
      
      console.log = () => logCalls++;
      
      try {
        await findAndRemoveNodeModules(projectPath, { silent: false });
        expect(logCalls).to.be.greaterThan(0);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Edge cases and error handling', function() {
    it('should handle very deep nesting', async function() {
      const basePath = await testEnv.createLargeNestedStructure(3, 2);
      
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      
      expect(result.totalRemoved).to.be.greaterThan(0);
      expect(result.totalSize).to.be.greaterThan(0);
    });

    it('should handle symlinks gracefully', async function() {
      if (process.platform === 'win32') {
        this.skip(); // Skip on Windows where symlinks require special permissions
        return;
      }
      
      const basePath = await testEnv.createTempBase();
      const realDir = path.join(basePath, 'real-dir');
      const linkDir = path.join(basePath, 'link-dir');
      
      await fs.promises.mkdir(realDir, { recursive: true });
      await fs.promises.mkdir(path.join(realDir, 'node_modules'), { recursive: true });
      
      try {
        await fs.promises.symlink(realDir, linkDir);
        
        const result = await findAndRemoveNodeModules(basePath, { 
          silent: true, 
          dryRun: true 
        });
        
        // Should handle symlinks without infinite loops
        expect(result.totalRemoved).to.be.greaterThan(0);
      } catch (err) {
        if (err.code === 'EPERM') {
          this.skip(); // Skip if no permission to create symlinks
        }
        throw err;
      }
    });

    it('should handle files named node_modules', async function() {
      const structure = {
        'project': {
          'node_modules': 'This is a file, not a directory',
          'real-dir': {
            'node_modules': {
              'lib': { 'index.js': '// lib' }
            }
          }
        }
      };
      
      const basePath = await testEnv.createDirectoryStructure(structure);
      
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      
      // Should only find the directory, not the file
      expect(result.totalRemoved).to.equal(1);
    });
  });
});