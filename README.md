# op-sync-bruno

A CLI tool to sync Bruno API client secrets with 1Password, enabling secure secret management for your API testing workflows.

## Features

- **Extract Secrets**: Automatically identifies and extracts secret variables from Bruno environment files
- **YAML Export**: Exports extracted secrets to a structured YAML file
- **1Password Integration**: Creates and manages secrets in 1Password vaults
- **Pre-request Scripts**: Generates Bruno pre-request scripts to fetch secrets from 1Password
- **Filesystem Access**: Automatically configures Bruno collections for filesystem access

## Installation

```bash
# Install the tool globally
npm install -g op-sync-bruno

# Execute without installation
npx op-sync-bruno
```

## Prerequisites

- Node.js >= 18.0.0
- [1Password CLI](https://developer.1password.com/docs/cli/get-started/)
- [Bruno API client](https://usebruno.com)

## Usage

<!-- TODO: This should come from oclif -->

## How It Works

1. **Secret Extraction**: The tool scans Bruno environment files (`.bru` files) in the `environments` directory and identifies secret variables.

2. **YAML Export**: Extracted secrets are exported to a YAML file with the following structure:

   ```yaml
   development:
     API_KEY: op://path/to/the/secret
     SECRET_TOKEN: op://path/to/the/secret
   production:
     API_KEY: op://path/to/the/secret
     SECRET_TOKEN: op://path/to/the/secret
   ```

3. **Bruno Configuration**: The tool modifies `bruno.json` to enable filesystem access, allowing pre-request scripts to execute system commands

4. **Pre-request Script Generation**: A pre-request script is added to `collection.bru` that:
   - Fetches secrets from 1Password based on the current environment
   - Sets Bruno environment variables with the fetched values
   - Provides fallback handling if 1Password is unavailable

5. **1Password Storage**: If enabled, creates a structured 1Password item with sections for each environment

## Pre-request Script

The generated pre-request script in `collection.bru` will:

1. Detect the current Bruno environment
2. Fetch corresponding secrets from 1Password
3. Set environment variables for use in requests
4. Handle errors gracefully with fallback to existing values

## Security Considerations

- Ensure 1Password CLI is properly configured and authenticated
- Use appropriate vault permissions in 1Password
- Review generated pre-request scripts before use

## Development

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

## Troubleshooting

### 1Password CLI Not Found

Install the 1Password CLI from [1Password Developer](https://developer.1password.com/docs/cli/get-started/)

### Vault Access Denied

Ensure you're signed in to 1Password CLI:

```bash
op signin
```

### Pre-request Script Already Exists

The tool will preserve existing scripts and add the secret management code. Review the modified `collection.bru` file to ensure compatibility.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
