# op-bruno

A CLI tool to sync Bruno API client secrets with 1Password, enabling secure secret management for your API testing workflows.

[![Version](https://img.shields.io/npm/v/op-bruno.svg)](https://npmjs.org/package/op-bruno)
[![Downloads/week](https://img.shields.io/npm/dw/op-bruno.svg)](https://npmjs.org/package/op-bruno)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Support%20Me-orange)](https://coff.ee/kai.nguyen)

<!-- toc -->
* [op-bruno](#op-bruno)
* [Features](#features)
* [Installation](#installation)
* [Install the tool globally](#install-the-tool-globally)
* [Execute without installation](#execute-without-installation)
* [Prerequisites](#prerequisites)
* [Usage](#usage)
* [Commands](#commands)
* [How It Works](#how-it-works)
* [Security Considerations](#security-considerations)
* [Development](#development)
* [Run in development mode](#run-in-development-mode)
* [Build the project](#build-the-project)
* [Run tests](#run-tests)
* [Lint code](#lint-code)
* [Troubleshooting](#troubleshooting)
* [License](#license)
* [Contributing](#contributing)
<!-- tocstop -->

# Features

- **Extract Secrets**: Automatically identifies and extracts secret variables from Bruno environment files
- **JSON Export**: Exports extracted secrets to a structured JSON file
- **1Password Integration**: Creates and manages secrets in 1Password vaults
- **Pre-request Scripts**: Generates Bruno pre-request scripts to fetch secrets from 1Password
- **Filesystem Access**: Automatically configures Bruno collections for filesystem access

# Installation

```bash
# Install the tool globally
npm install -g op-bruno

# Execute without installation
npx op-bruno
```

# Prerequisites

- Node.js >= 18.0.0
- [1Password CLI](https://developer.1password.com/docs/cli/get-started/)
- [Bruno API client](https://usebruno.com)

# Usage

<!-- usage -->
```sh-session
$ npm install -g op-bruno
$ op-bruno COMMAND
running command...
$ op-bruno (--version)
op-bruno/0.0.4 linux-x64 node-v20.19.5
$ op-bruno --help [COMMAND]
USAGE
  $ op-bruno COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`op-bruno help [COMMAND]`](#op-bruno-help-command)
* [`op-bruno sync COLLECTION`](#op-bruno-sync-collection)

## `op-bruno help [COMMAND]`

Display help for op-bruno.

```
USAGE
  $ op-bruno help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for op-bruno.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.33/src/commands/help.ts)_

## `op-bruno sync COLLECTION`

Extract secrets from Bruno environment files and sync with 1Password

```
USAGE
  $ op-bruno sync COLLECTION [--json] [--vault <value>] [--title <value>] [--outName <value>] [--1password]

ARGUMENTS
  COLLECTION  Path to Bruno collection directory

FLAGS
  --1password        Create or Update 1Password item
  --outName=<value>  [default: op-secrets.json] JSON output file name
  --title=<value>    1Password item title
  --vault=<value>    [default: Employee] 1Password vault name

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Extract secrets from Bruno environment files and sync with 1Password

EXAMPLES
  $ op-bruno sync ./bruno-project -o secrets.json

  $ op-bruno sync ./bruno-project -o secrets.json --vault Engineering --title "API Secrets" --1password
```

_See code: [src/commands/sync.ts](https://github.com/kai-nguyen-aligent/op-bruno/blob/v0.0.4/src/commands/sync.ts)_
<!-- commandsstop -->

# How It Works

1. **Secret Extraction**: The tool scans Bruno environment files (`.bru` files) in the `environments` directory and identifies secret variables.

2. **JSON Export**: Extracted secrets are exported to a JSON file with the following structure:

   ```json
   {
     "development": {
       "API_KEY": "op://path/to/the/secret",
       "SECRET_TOKEN": "op://path/to/the/secret"
     },
     "production": {
       "API_KEY": "op://path/to/the/secret",
       "SECRET_TOKEN": "op://path/to/the/secret"
     }
   }
   ```

3. **Bruno Configuration**: The tool modifies `bruno.json` to enable filesystem access, allowing pre-request scripts to execute system commands

4. **Pre-request Script Generation**: A pre-request script is added to `collection.bru` that:
   - Fetches secrets from 1Password based on the current environment
   - Sets Bruno environment variables with the fetched values

5. **1Password Storage**: If enabled, creates/updates a structured 1Password item with sections for each environment

### Pre-request Script

The generated pre-request script in `collection.bru` will:

1. Detect the current Bruno environment
2. Fetch corresponding secrets from 1Password
3. Set environment variables for use in requests

# Security Considerations

- Ensure 1Password CLI is properly configured and authenticated
- Use appropriate vault permissions in 1Password
- Review generated pre-request scripts before use

# Development

```bash
# Run in development mode
yarn dev

# Build the project
yarn build

# Run tests
yarn test

# Lint code
yarn lint
```

# Troubleshooting

### 1Password CLI Not Found

Install the 1Password CLI from [1Password Developer](https://developer.1password.com/docs/cli/get-started/)

### Vault Access Denied

Ensure you're signed in to 1Password CLI:

```bash
op signin
```

### Pre-request Script Already Exists

The tool will preserve existing scripts and add the secret management code. Review the modified `collection.bru` file to ensure compatibility.

# License

MIT

# Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
