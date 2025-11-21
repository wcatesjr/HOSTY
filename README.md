# HOSTY - HOSTS File Manager

A fast and seamless desktop application for switching between multiple HOSTS file configurations tailored for different test environments on Windows.

## Features

- **Environment Management**: Store multiple test environments, each with unique names and associated address mappings
- **Bulk Import**: Add multiple IP addresses and hostnames at once using bulk import
- **Quick Switching**: Instantly switch between environments with a single click
- **Current Profile Display**: Always see which environment is currently active
- **Automatic Dassault Systemes Lines**: Required lines are automatically appended to every HOSTS file
- **Default Configuration**: Easy revert to default Windows HOSTS file

## Requirements

- Windows 10/11
- Node.js 18+ and npm
- Administrator privileges (required to modify HOSTS file)

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To run in development mode:

```bash
npm run dev
```

This will:
- Compile TypeScript files
- Start the webpack dev server
- Launch Electron

## Building

To build the application:

```bash
npm run build
```

To create a distributable package:

```bash
npm run package
```

## Usage

1. **Launch the application** (requires administrator privileges)
2. **Create environments**: Click "Add New" to create a new environment with a unique name
3. **Add entries**: Use individual entry fields or "Bulk Import" to add multiple IP/hostname pairs at once
4. **Activate environment**: Click on an environment name in the sidebar to activate it
5. **View current profile**: Click "View Profile" to see the current HOSTS file content
6. **Revert to default**: Click "Revert to DEFAULT" to restore the default Windows HOSTS file

## Bulk Import Format

When using bulk import, paste entries in the following format (one per line):

```
192.168.1.100    server1.example.com    # Server 1
192.168.1.101    server2.example.com    # Server 2
10.0.0.1         api.example.com
```

Each line should contain:
- IP address
- Hostname
- Optional comment (prefixed with #)

## Technical Details

- **Framework**: Electron + React + TypeScript
- **HOSTS File Location**: `C:\Windows\System32\drivers\etc\HOSTS`
- **Data Storage**: Environments are stored in `%APPDATA%\HOSTY\data\environments.json`
- **Required Lines**: The following lines are always appended to every HOSTS file:
  - `127.0.0.1       dslauncher.3ds.com # Added by Dassault Systemes. Do not modify this line.`
  - `::1             dslauncher.3ds.com # Added by Dassault Systemes. Do not modify this line.`

## License

MIT

