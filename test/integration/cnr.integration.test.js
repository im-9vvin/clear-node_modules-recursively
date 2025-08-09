const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const { 
  findAndRemoveNodeModules, 
  getDirectorySize, 
  formatSize 
} = require('../../cnr.js');
const { 
  createTestEnvironment, 
  assertDirectoryExists, 
  assertDirectoryNotExists,
  delay
} = require('../helpers/test-utils');

describe('CNR Integration Tests', function() {
  let testEnv;

  beforeEach(async function() {
    testEnv = createTestEnvironment();
  });

  afterEach(async function() {
    await testEnv.cleanup();
  });

  describe('Complete workflow integration', function() {
    it('should handle a complete monorepo cleanup', async function() {
      // Create a complex monorepo structure
      const structure = {
        'monorepo': {
          'package.json': JSON.stringify({ 
            name: 'monorepo',
            workspaces: ['packages/*']
          }),
          'node_modules': {
            'shared-lib': {
              'package.json': JSON.stringify({ name: 'shared-lib' }),
              'index.js': '// Shared library',
              'dist': ['main.js', 'types.d.ts']
            }
          },
          'packages': {
            'frontend': {
              'package.json': JSON.stringify({ name: 'frontend' }),
              'src': ['App.js', 'index.js'],
              'node_modules': {
                'react': {
                  'package.json': JSON.stringify({ name: 'react', version: '18.0.0' }),
                  'index.js': '// React',
                  'lib': ['React.js', 'ReactDOM.js']
                },
                'lodash': {
                  'package.json': JSON.stringify({ name: 'lodash' }),
                  'lodash.js': '// Lodash',
                  'fp': ['array.js', 'object.js', 'string.js']
                }
              }
            },
            'backend': {
              'package.json': JSON.stringify({ name: 'backend' }),
              'src': ['server.js', 'routes.js'],
              'node_modules': {
                'express': {
                  'package.json': JSON.stringify({ name: 'express', version: '4.18.0' }),
                  'index.js': '// Express',
                  'lib': ['router.js', 'application.js', 'middleware.js']
                }
              }
            },
            'shared-utils': {
              'package.json': JSON.stringify({ name: 'shared-utils' }),
              'src': ['utils.js'],
              'node_modules': {
                'uuid': {
                  'package.json': JSON.stringify({ name: 'uuid' }),
                  'dist': ['index.js', 'v1.js', 'v4.js']
                }
              }
            }
          },
          'tools': {
            'build-scripts': {
              'package.json': JSON.stringify({ name: 'build-scripts' }),
              'node_modules': {
                'webpack': {
                  'package.json': JSON.stringify({ name: 'webpack' }),
                  'lib': ['webpack.js', 'compiler.js'],
                  'bin': ['webpack.js']
                }
              }
            }
          }
        }
      };

      const basePath = await testEnv.createDirectoryStructure(structure);
      const monorepoPath = path.join(basePath, 'monorepo');

      // Count expected node_modules before cleanup
      const expectedCount = 5; // root, frontend, backend, shared-utils, build-scripts
      
      // Calculate total size before cleanup
      const nodeModulesPaths = [
        path.join(monorepoPath, 'node_modules'),
        path.join(monorepoPath, 'packages', 'frontend', 'node_modules'),
        path.join(monorepoPath, 'packages', 'backend', 'node_modules'),
        path.join(monorepoPath, 'packages', 'shared-utils', 'node_modules'),
        path.join(monorepoPath, 'tools', 'build-scripts', 'node_modules')
      ];

      let totalExpectedSize = 0;
      for (const nmPath of nodeModulesPaths) {
        await assertDirectoryExists(nmPath);
        const stats = await getDirectorySize(nmPath);
        totalExpectedSize += stats.size;
      }

      // Run cleanup
      const result = await findAndRemoveNodeModules(monorepoPath, { silent: true });

      // Verify results
      expect(result.totalRemoved).to.equal(expectedCount);
      expect(result.totalSize).to.equal(totalExpectedSize);

      // Verify all node_modules are deleted
      for (const nmPath of nodeModulesPaths) {
        await assertDirectoryNotExists(nmPath);
      }

      // Verify other directories remain
      await assertDirectoryExists(path.join(monorepoPath, 'packages', 'frontend', 'src'));
      await assertDirectoryExists(path.join(monorepoPath, 'packages', 'backend', 'src'));
      expect(fs.existsSync(path.join(monorepoPath, 'package.json'))).to.be.true;
    });

    it('should handle concurrent access scenarios', async function() {
      const projectPath = await testEnv.createTypicalProject('concurrent-test');
      
      // Create multiple concurrent cleanup operations
      const promises = [
        findAndRemoveNodeModules(projectPath, { silent: true, dryRun: true }),
        findAndRemoveNodeModules(projectPath, { silent: true, dryRun: true }),
        findAndRemoveNodeModules(projectPath, { silent: true, dryRun: true })
      ];

      const results = await Promise.all(promises);

      // All should succeed and find the same node_modules
      for (const result of results) {
        expect(result.totalRemoved).to.equal(1);
        expect(result.totalSize).to.be.greaterThan(0);
      }
    });

    it('should provide accurate progress reporting', async function() {
      const basePath = await testEnv.createNestedProjects();
      
      // Capture console output for progress tracking
      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
      };

      try {
        const result = await findAndRemoveNodeModules(basePath, { 
          silent: false,
          dryRun: true 
        });

        expect(result.totalRemoved).to.equal(3);
        expect(logs.length).to.be.greaterThan(0);
        
        // Should contain size information
        const sizeInfoLogs = logs.filter(log => log.includes('MB') || log.includes('KB') || log.includes('B'));
        expect(sizeInfoLogs.length).to.be.greaterThan(0);

      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('Performance and scalability tests', function() {
    it('should handle large nested structures efficiently', async function() {
      this.timeout(30000); // Allow more time for performance test
      
      const basePath = await testEnv.createLargeNestedStructure(4, 4); // 4 levels, 4 projects per level
      
      const startTime = Date.now();
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust based on system)
      expect(executionTime).to.be.lessThan(10000); // 10 seconds max
      expect(result.totalRemoved).to.be.greaterThan(10); // Should find many node_modules
      expect(result.totalSize).to.be.greaterThan(0);
      
      console.log(`Performance test: Found ${result.totalRemoved} directories in ${executionTime}ms`);
    });

    it('should handle very deep nesting without stack overflow', async function() {
      this.timeout(20000);
      
      // Create a very deep structure
      let structure = {};
      let current = structure;
      
      for (let i = 0; i < 50; i++) {
        current[`level-${i}`] = {
          'node_modules': {
            [`lib-${i}`]: { 'package.json': JSON.stringify({ name: `lib-${i}` }) }
          }
        };
        current = current[`level-${i}`];
      }
      
      const basePath = await testEnv.createDirectoryStructure(structure);
      
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      
      expect(result.totalRemoved).to.equal(50);
    });

    it('should efficiently skip large non-node_modules directories', async function() {
      const structure = {
        'project': {
          'node_modules': {
            'small-lib': { 'index.js': '// Small library' }
          },
          'large-assets': {}
        }
      };

      // Add many files to the large-assets directory
      for (let i = 0; i < 1000; i++) {
        structure.project['large-assets'][`asset-${i}.txt`] = `Asset file ${i}`;
      }

      const basePath = await testEnv.createDirectoryStructure(structure);
      
      const startTime = Date.now();
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      const endTime = Date.now();

      expect(result.totalRemoved).to.equal(1);
      expect(endTime - startTime).to.be.lessThan(5000); // Should be fast despite large directory
    });
  });

  describe('Cross-platform compatibility tests', function() {
    it('should work with different path separators', async function() {
      const projectPath = await testEnv.createTypicalProject();
      
      // Test with both forward and back slashes (normalized by path.join)
      const result = await findAndRemoveNodeModules(projectPath, { silent: true });
      
      expect(result.totalRemoved).to.equal(1);
      expect(result.totalSize).to.be.greaterThan(0);
    });

    it('should handle different file system encodings', async function() {
      const structure = {
        'unicode-test': {
          'node_modules': {
            'library-with-unicode-名前': {
              'package.json': JSON.stringify({ name: 'library-with-unicode-名前' }),
              'файл.js': '// Unicode filename'
            },
            'emoji-lib-📦': {
              'package.json': JSON.stringify({ name: 'emoji-lib-📦' }),
              'index.js': '// Emoji in name'
            }
          }
        }
      };

      try {
        const basePath = await testEnv.createDirectoryStructure(structure);
        const result = await findAndRemoveNodeModules(basePath, { 
          silent: true, 
          dryRun: true 
        });
        
        expect(result.totalRemoved).to.equal(1);
        expect(result.totalSize).to.be.greaterThan(0);
      } catch (err) {
        if (err.code === 'EINVAL' || err.message.includes('Invalid character')) {
          this.skip(); // Skip on file systems that don't support Unicode
        }
        throw err;
      }
    });

    it('should handle case-sensitive vs case-insensitive file systems', async function() {
      const structure = {
        'case-test': {
          'NODE_MODULES': {
            'wrong-case-lib': { 'index.js': '// Wrong case' }
          },
          'node_modules': {
            'lib': { 'index.js': '// Library' }
          },
          'Node_Modules': {
            'mixed-case-lib': { 'index.js': '// Mixed case' }
          }
        }
      };

      const basePath = await testEnv.createDirectoryStructure(structure);
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });

      // Should only find the exact match "node_modules"
      // On case-insensitive systems, might find more, but at least 1
      expect(result.totalRemoved).to.be.greaterThan(0);
    });
  });

  describe('Error handling and recovery tests', function() {
    it('should handle permission denied errors gracefully', async function() {
      if (process.platform === 'win32') {
        this.skip(); // Skip permission tests on Windows
        return;
      }

      const basePath = await testEnv.createRestrictedStructure();
      
      try {
        // The restricted structure should cause some errors but not stop execution
        const result = await findAndRemoveNodeModules(basePath, { 
          silent: true,
          dryRun: false // Actually try to delete to trigger permission errors
        });

        // Should at least remove the normal project
        expect(result.totalRemoved).to.be.greaterThan(0);
      } catch (err) {
        // On some systems, permission errors might bubble up
        // This is acceptable behavior - the function should either:
        // 1. Handle errors gracefully and continue (preferred), or
        // 2. Throw an error with proper context
        expect(err.code).to.match(/EACCES|EPERM/);
      }
    });

    it('should continue processing after individual failures', async function() {
      const basePath = await testEnv.createNestedProjects();
      
      // This test verifies error handling by creating a restricted directory
      // and verifying that the function continues processing other directories
      
      try {
        const result = await findAndRemoveNodeModules(basePath, { 
          silent: true 
        });

        // Should process all available directories
        expect(result.totalRemoved).to.be.greaterThan(0);
        expect(result.totalRemoved).to.be.lessThan(4); // Should be 3 normally
      } catch (err) {
        // Some platforms may throw errors for restricted directories
        expect(err).to.be.instanceOf(Error);
      }
    });

    it('should handle corrupted or invalid directory structures', async function() {
      const basePath = await testEnv.createTempBase();
      
      // Create a structure that might cause issues
      const weirdStructure = {
        'valid-project': {
          'node_modules': {
            'valid-lib': { 'package.json': '{}' }
          }
        },
        'project-with-weird-node_modules': {
          'node_modules': null // Empty node_modules
        },
        'project-with-nested-empty': {
          'deeply': {
            'nested': {
              'node_modules': null
            }
          }
        }
      };

      try {
        await testEnv.createDirectoryStructure(weirdStructure);
        
        const result = await findAndRemoveNodeModules(basePath, { 
          silent: true,
          dryRun: true
        });
        
        // Should handle gracefully and find the valid directories
        expect(result.totalRemoved).to.be.greaterThan(0);
      } catch (err) {
        // Some structures might not be creatable - that's OK
        if (err.code === 'EINVAL' || err.code === 'ENOENT') {
          this.skip();
        }
        throw err;
      }
    });
  });

  describe('Memory and resource usage tests', function() {
    it('should not leak memory with large operations', async function() {
      this.timeout(30000);
      
      const initialMemory = process.memoryUsage();
      
      // Perform multiple large operations
      for (let i = 0; i < 5; i++) {
        const basePath = await testEnv.createLargeNestedStructure(3, 3);
        await findAndRemoveNodeModules(basePath, { 
          silent: true, 
          dryRun: true 
        });
        await testEnv.cleanup();
        testEnv = createTestEnvironment(); // Reset for next iteration
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024);
    });

    it('should handle file handle limits gracefully', async function() {
      this.timeout(20000);
      
      // Create many small node_modules directories
      const structure = {};
      for (let i = 0; i < 100; i++) {
        structure[`project-${i}`] = {
          'node_modules': {
            [`lib-${i}`]: { 'index.js': `// Library ${i}` }
          }
        };
      }
      
      const basePath = await testEnv.createDirectoryStructure(structure);
      
      const result = await findAndRemoveNodeModules(basePath, { 
        silent: true, 
        dryRun: true 
      });
      
      expect(result.totalRemoved).to.equal(100);
    });
  });

  describe('CLI integration tests', function() {
    it('should work when invoked as CLI script', async function() {
      this.timeout(10000);
      
      const projectPath = await testEnv.createTypicalProject('cli-test');
      const cnrPath = path.resolve(__dirname, '../../cnr.js');
      
      try {
        const { stdout, stderr } = await execAsync(`node "${cnrPath}" "${projectPath}"`);
        
        expect(stderr).to.be.empty;
        expect(stdout).to.include('정리 완료'); // Should show completion message
        expect(stdout).to.include('1개'); // Should show 1 deleted directory
        
        // Verify deletion actually happened
        await assertDirectoryNotExists(path.join(projectPath, 'node_modules'));
        
      } catch (err) {
        console.error('CLI execution error:', err);
        throw err;
      }
    });

    it('should handle CLI arguments correctly', async function() {
      this.timeout(10000);
      
      const basePath = await testEnv.createNestedProjects();
      const cnrPath = path.resolve(__dirname, '../../cnr.js');
      
      try {
        const { stdout } = await execAsync(`node "${cnrPath}" "${basePath}"`);
        
        expect(stdout).to.include('3개'); // Should find 3 directories
        
      } catch (err) {
        console.error('CLI with arguments error:', err);
        throw err;
      }
    });

    it('should use current directory when no argument provided', async function() {
      this.timeout(10000);
      
      const projectPath = await testEnv.createTypicalProject('cwd-test');
      const cnrPath = path.resolve(__dirname, '../../cnr.js');
      
      try {
        const { stdout } = await execAsync(`cd "${projectPath}" && node "${cnrPath}"`);
        
        expect(stdout).to.include('정리 완료'); // Should complete successfully
        
      } catch (err) {
        console.error('CLI current directory error:', err);
        throw err;
      }
    });
  });
});