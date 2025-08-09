const fs = require('fs');
const path = require('path');
const os = require('os');
const { rimraf } = require('rimraf');

/**
 * Test utilities for creating temporary directory structures
 * and managing test environments
 */

class TestEnvironment {
  constructor() {
    this.tempDirs = [];
    this.baseDir = null;
  }

  /**
   * Create a temporary base directory for tests
   */
  async createTempBase() {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'cnr-test-'));
    this.baseDir = tempDir;
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Create a directory structure with node_modules
   * @param {Object} structure - Directory structure definition
   * @param {string} basePath - Base path to create structure in
   */
  async createDirectoryStructure(structure, basePath = null) {
    if (!basePath) {
      basePath = this.baseDir || await this.createTempBase();
    }

    await this._createStructure(structure, basePath);
    return basePath;
  }

  async _createStructure(structure, currentPath) {
    if (!structure || typeof structure !== 'object') {
      return;
    }
    
    for (const [name, content] of Object.entries(structure)) {
      // Skip empty names
      if (!name || name.trim() === '') {
        continue;
      }
      
      const itemPath = path.join(currentPath, name);
      
      if (content === null || content === undefined) {
        // Empty directory
        await fs.promises.mkdir(itemPath, { recursive: true });
      } else if (Array.isArray(content)) {
        // Directory with files
        await fs.promises.mkdir(itemPath, { recursive: true });
        for (const fileName of content) {
          if (fileName && typeof fileName === 'string') {
            const filePath = path.join(itemPath, fileName);
            await fs.promises.writeFile(filePath, `// Test file: ${fileName}\n`);
          }
        }
      } else if (typeof content === 'string') {
        // File with content
        await fs.promises.writeFile(itemPath, content);
      } else if (typeof content === 'object') {
        // Directory with nested structure
        await fs.promises.mkdir(itemPath, { recursive: true });
        await this._createStructure(content, itemPath);
      }
    }
  }

  /**
   * Create a typical project structure with node_modules
   */
  async createTypicalProject(projectName = 'test-project') {
    const projectPath = path.join(this.baseDir || await this.createTempBase(), projectName);
    
    const structure = {
      'package.json': JSON.stringify({ name: projectName, version: '1.0.0' }, null, 2),
      'src': {
        'index.js': 'console.log("Hello World");',
        'utils.js': 'module.exports = {};'
      },
      'node_modules': {
        'express': {
          'package.json': JSON.stringify({ name: 'express', version: '4.18.0' }),
          'index.js': '// Express main file',
          'lib': ['router.js', 'application.js']
        },
        'lodash': {
          'package.json': JSON.stringify({ name: 'lodash', version: '4.17.21' }),
          'lodash.js': '// Lodash main file',
          'fp': ['array.js', 'object.js']
        },
        '.bin': ['express', 'lodash']
      }
    };

    await this.createDirectoryStructure({ [projectName]: structure });
    return projectPath;
  }

  /**
   * Create nested projects with multiple node_modules
   */
  async createNestedProjects() {
    const basePath = this.baseDir || await this.createTempBase();
    
    const structure = {
      'project-a': {
        'package.json': JSON.stringify({ name: 'project-a' }),
        'node_modules': {
          'react': {
            'package.json': JSON.stringify({ name: 'react', version: '18.0.0' }),
            'index.js': '// React'
          }
        },
        'subproject': {
          'package.json': JSON.stringify({ name: 'subproject' }),
          'node_modules': {
            'vue': {
              'package.json': JSON.stringify({ name: 'vue', version: '3.0.0' }),
              'dist': ['vue.js', 'vue.min.js']
            }
          }
        }
      },
      'project-b': {
        'package.json': JSON.stringify({ name: 'project-b' }),
        'node_modules': {
          'angular': {
            'package.json': JSON.stringify({ name: 'angular', version: '15.0.0' }),
            'bundles': ['core.js', 'common.js']
          }
        }
      },
      '.hidden-project': {
        'node_modules': {
          'should-be-ignored': {
            'package.json': JSON.stringify({ name: 'should-be-ignored' })
          }
        }
      }
    };

    await this.createDirectoryStructure(structure);
    return basePath;
  }

  /**
   * Create a large nested structure for performance testing
   */
  async createLargeNestedStructure(depth = 5, breadth = 3) {
    const basePath = this.baseDir || await this.createTempBase();
    
    const createLevel = (currentDepth) => {
      const structure = {};
      
      for (let i = 0; i < breadth; i++) {
        const projectName = `project-${currentDepth}-${i}`;
        structure[projectName] = {
          'package.json': JSON.stringify({ name: projectName }),
          'node_modules': {
            [`lib-${currentDepth}-${i}`]: {
              'package.json': JSON.stringify({ name: `lib-${currentDepth}-${i}` }),
              'index.js': `// Library ${currentDepth}-${i}`,
              'dist': ['main.js', 'main.min.js']
            }
          }
        };
        
        if (currentDepth > 1) {
          Object.assign(structure[projectName], createLevel(currentDepth - 1));
        }
      }
      
      return structure;
    };

    await this.createDirectoryStructure(createLevel(depth));
    return basePath;
  }

  /**
   * Create a structure with permission issues (for error testing)
   */
  async createRestrictedStructure() {
    const basePath = this.baseDir || await this.createTempBase();
    
    const structure = {
      'normal-project': {
        'node_modules': {
          'normal-lib': {
            'package.json': JSON.stringify({ name: 'normal-lib' })
          }
        }
      },
      'restricted-project': {
        'node_modules': {
          'restricted-lib': {
            'package.json': JSON.stringify({ name: 'restricted-lib' }),
            'readonly-file.txt': 'This file will be made readonly'
          }
        }
      }
    };

    await this.createDirectoryStructure(structure);
    
    // Make the restricted directory read-only (Unix-like systems)
    if (process.platform !== 'win32') {
      const restrictedPath = path.join(basePath, 'restricted-project', 'node_modules', 'restricted-lib');
      await fs.promises.chmod(restrictedPath, 0o444);
    }
    
    return basePath;
  }

  /**
   * Get directory statistics for verification
   */
  async getDirectoryStats(dirPath) {
    const stats = {
      exists: false,
      isDirectory: false,
      files: [],
      directories: [],
      totalSize: 0
    };

    try {
      const stat = await fs.promises.stat(dirPath);
      stats.exists = true;
      stats.isDirectory = stat.isDirectory();

      if (stats.isDirectory) {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            stats.directories.push(entry.name);
          } else if (entry.isFile()) {
            stats.files.push(entry.name);
            const fileStat = await fs.promises.stat(fullPath);
            stats.totalSize += fileStat.size;
          }
        }
      }
    } catch (err) {
      // Directory doesn't exist or permission denied
    }

    return stats;
  }

  /**
   * Count node_modules directories recursively
   */
  async countNodeModules(dirPath) {
    let count = 0;
    
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.name === 'node_modules') {
            count++;
          } else if (!entry.name.startsWith('.')) {
            count += await this.countNodeModules(fullPath);
          }
        }
      }
    } catch (err) {
      // Handle permission errors or non-existent directories
    }
    
    return count;
  }

  /**
   * Clean up all temporary directories created during tests
   */
  async cleanup() {
    for (const tempDir of this.tempDirs) {
      try {
        await rimraf(tempDir);
      } catch (err) {
        console.warn(`Failed to clean up temp directory ${tempDir}:`, err.message);
      }
    }
    this.tempDirs = [];
    this.baseDir = null;
  }
}

/**
 * Helper function to create isolated test environment
 */
function createTestEnvironment() {
  return new TestEnvironment();
}

/**
 * Delay utility for async tests
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that directory exists
 */
async function assertDirectoryExists(dirPath) {
  try {
    const stat = await fs.promises.stat(dirPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${dirPath}`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }
    throw err;
  }
}

/**
 * Assert that directory does not exist
 */
async function assertDirectoryNotExists(dirPath) {
  try {
    await fs.promises.stat(dirPath);
    throw new Error(`Directory should not exist but does: ${dirPath}`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    // Expected - directory doesn't exist
  }
}

module.exports = {
  TestEnvironment,
  createTestEnvironment,
  delay,
  assertDirectoryExists,
  assertDirectoryNotExists
};