# CNR (Clear `node_modules` Recursively)

[en](./README.md) | [ko](./README_ko.md)

![The heaviest object in the universe; node_modules](./the_object_node_modules.png)

A utility that recursively finds and deletes node_modules directories. Useful for reclaiming disk space and cleaning up development environments.

## Installation

```bash
# Global installation
npm install -g @9vvin/cnr

# Or run with npx (without installation)
npx @9vvin/cnr
```

## Usage

### Command Line Usage

You can use it in various ways:

#### Node.js Script (cnr.js)

```bash
# Run in current directory
node cnr.js

# Specify a directory
node cnr.js /path/to/directory
```

#### Bash Shell Script (cnr.sh) - macOS/Linux

```bash
# Grant execution permission
chmod +x cnr.sh

# Run in current directory
./cnr.sh

# Specify a directory
./cnr.sh /path/to/directory
```

#### PowerShell Script (cnr.ps1) - Windows

```powershell
# Run in current directory
.\cnr.ps1

# Specify a directory
.\cnr.ps1 -RootPath C:\path\to\directory
```

#### Windows Batch Script (cnr.cmd)

```cmd
# Run in current directory
cnr

# Specify a directory
cnr C:\path\to\directory
```

### Using as npm Package

You can use it after installing the package:

```bash
# Run after global installation
npm install -g @9vvin/cnr
cnr [directory]

# Run with npx (without installation)
npx @9vvin/cnr [directory]
```

## Features

- Recursively search for node_modules directories
- Calculate and display the size of each directory
- Provide statistics on deleted directories and reclaimed space
- Support for various platforms (Windows, macOS, Linux)
- Support for various scripts (Node.js, Bash, PowerShell, Windows Batch)

## Development

```bash
# Clone repository
git clone https://github.com/im-9vvin/clear-node-modules-recursively.git
cd clear-node-modules-recursively

# Install dependencies
npm install

# Test locally
node cnr.js
```

## License

MIT

## Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Author

- [@im-9vvin](https://github.com/im-9vvin)