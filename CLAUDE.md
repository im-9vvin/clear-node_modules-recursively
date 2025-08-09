# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a utility package (`@9vvin/cnr`) that recursively finds and deletes `node_modules` directories to free up disk space. It provides multiple implementations for different platforms and environments.

## Commands

### Development

```bash
# Install dependencies
npm install

# Run the utility locally
npm start
# or
node cnr.js [directory]

# Run from specific directory
node cnr.js /path/to/directory
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

Tests include unit tests and integration tests with code coverage using Mocha, Chai, and c8.

## Architecture

The project provides the same functionality through multiple implementations:

1. **cnr.js** - Main Node.js implementation using `rimraf` for cross-platform directory deletion
2. **cnr.sh** - Bash shell script for macOS/Linux
3. **cnr.ps1** - PowerShell script for Windows
4. **cnr.cmd** - Windows batch script

### Core Logic (cnr.js)

The main implementation follows this pattern:
- Recursively traverses directories starting from a root (default: current working directory)
- Identifies `node_modules` directories while skipping hidden directories (starting with `.`)
- Calculates directory size before deletion
- Uses `rimraf` for safe cross-platform directory removal
- Tracks and reports total directories removed and space reclaimed

Key functions:
- `findAndRemoveNodeModules()` - Main orchestrator function
- `getDirectorySize()` - Calculates directory size recursively
- `formatSize()` - Converts bytes to human-readable format (B, KB, MB, GB, TB)

### Dependencies

- **rimraf** (^6.0.1) - Cross-platform directory deletion

## Publishing

This is a public npm package published under `@9vvin/cnr`. The package is configured with:
- Global CLI installation support via bin configuration
- Node.js >=10.0.0 requirement
- MIT license

## Localization

The code contains Korean language strings in console output messages. When modifying user-facing strings, maintain consistency with the existing Korean text or consider adding internationalization support.