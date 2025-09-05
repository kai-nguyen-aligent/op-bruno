import { SecretMap } from '../types/index.js'

export function generatePreRequestScript(
  secrets: SecretMap, 
  itemName: string,
  vaultName: string
): string {
  const environmentNames = Object.keys(secrets)
  const secretVarNames = new Set<string>()
  
  // Collect all unique secret variable names
  for (const env of environmentNames) {
    for (const varName of Object.keys(secrets[env])) {
      secretVarNames.add(varName)
    }
  }
  
  return `// === START: 1Password Secret Management ===
// Auto-generated script to fetch secrets from 1Password
// Item: ${itemName}
// Vault: ${vaultName}

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Get current environment name from Bruno
const currentEnv = bru.getEnvName();

async function fetchSecretsFrom1Password() {
  try {
    console.log(\`Fetching secrets for \${currentEnv} environment from 1Password...\`);
    
    // Construct the 1Password CLI command
    const command = \`op item get "${itemName}" --vault="${vaultName}" --format=json\`;
    
    // Execute the command
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('1Password CLI error:', stderr);
      throw new Error(stderr);
    }
    
    // Parse the response
    const item = JSON.parse(stdout);
    
    // Find the section for current environment
    const section = item.fields?.find(field => 
      field.section?.label === \`\${currentEnv} Environment\`
    );
    
    if (!section) {
      console.warn(\`No secrets found for \${currentEnv} environment in 1Password\`);
      return;
    }
    
    // Set Bruno environment variables from 1Password
${Array.from(secretVarNames).map(varName => `    if (section.${varName}) {
      bru.setEnvVar("${varName}", section.${varName});
      console.log(\`  ✓ Set ${varName}\`);
    }`).join('\n')}
    
    console.log('Successfully loaded secrets from 1Password');
    
  } catch (error) {
    console.warn('⚠️  Could not fetch secrets from 1Password:', error.message);
    console.warn('   Using existing environment variable values');
    
    // Optional: You can set default values here if needed
    // bru.setEnvVar("API_KEY", process.env.DEFAULT_API_KEY || "");
  }
}

// Execute the function
await fetchSecretsFrom1Password();

// === END: 1Password Secret Management ===
`
}