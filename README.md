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
# Clone the repository
git clone https://github.com/yourusername/op-sync-bruno.git
cd op-sync-bruno

# Install dependencies with Yarn v2
yarn install

# Build the project
yarn build

# Link globally for CLI usage
yarn link
```

## Prerequisites

- Node.js >= 18.0.0
- Yarn v2 (Berry)
- [1Password CLI](https://developer.1password.com/docs/cli/get-started/) (optional, for 1Password integration)
- Bruno API client

## Usage

### Basic Usage

Extract secrets from Bruno environment files and export to YAML:

```bash
op-sync-bruno extract ./path/to/bruno/collection -o secrets.yml
```

### With 1Password Integration

Create a 1Password item with extracted secrets:

```bash
op-sync-bruno extract ./bruno-project \
  --output secrets.yml \
  --1password \
  --vault "Engineering" \
  --title "My API Secrets" \
  --category "API Credential"
```

### Command Options

```
ARGUMENTS
  BRUNODIR  Path to Bruno collection directory

FLAGS
  -o, --output=<value>      (required) Output YAML file path
  --1password               Create/update 1Password item
  --vault=<value>           1Password vault name (required with --1password)
  --title=<value>           1Password item title (default: "Bruno API Secrets")
  --category=<value>        1Password item category (default: "API Credential")
  --help                    Show CLI help
```

## How It Works

1. **Secret Extraction**: The tool scans Bruno environment files (`.bru` files) in the `environments` directory and identifies variables marked as secrets (with `~secret` flag)

2. **YAML Export**: Extracted secrets are exported to a YAML file with the following structure:
   ```yaml
   development:
     API_KEY: your-dev-api-key
     SECRET_TOKEN: your-dev-token
   production:
     API_KEY: your-prod-api-key
     SECRET_TOKEN: your-prod-token
   ```

3. **Bruno Configuration**: The tool modifies `bruno.json` to enable filesystem access, allowing pre-request scripts to execute system commands

4. **Pre-request Script Generation**: A pre-request script is added to `collection.bru` that:
   - Fetches secrets from 1Password based on the current environment
   - Sets Bruno environment variables with the fetched values
   - Provides fallback handling if 1Password is unavailable

5. **1Password Storage**: If enabled, creates a structured 1Password item with sections for each environment

## Bruno Environment File Format

Mark your secret variables with the `~secret` flag in Bruno environment files:

```bru
vars {
  BASE_URL: https://api.example.com
  API_KEY: sk_test_1234567890 ~secret
  SECRET_TOKEN: secret_token_value ~secret
  PUBLIC_KEY: pk_test_1234567890
}
```

## Pre-request Script

The generated pre-request script in `collection.bru` will:

1. Detect the current Bruno environment
2. Fetch corresponding secrets from 1Password
3. Set environment variables for use in requests
4. Handle errors gracefully with fallback to existing values

## Security Considerations

- Never commit `secrets.yml` to version control
- Add `secrets.yml` to `.gitignore`
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

### No Secrets Found
Make sure your Bruno environment variables are marked with the `~secret` flag

### Pre-request Script Already Exists
The tool will preserve existing scripts and add the secret management code. Review the modified `collection.bru` file to ensure compatibility.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
