import { Command, Args, Flags } from '@oclif/core'
import * as path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'

import { BrunoParser } from '../services/brunoParser.js'
import { YamlExporter } from '../services/yamlExporter.js'
import { BrunoConfigManager } from '../services/brunoConfig.js'
import { CollectionGenerator } from '../services/collectionGen.js'
import { OnePasswordManager } from '../services/onePassword.js'

export default class Extract extends Command {
  static description = 'Extract secrets from Bruno environment files and sync with 1Password'

  static examples = [
    '<%= config.bin %> <%= command.id %> ./bruno-project -o secrets.yml',
    '<%= config.bin %> <%= command.id %> ./bruno-project -o secrets.yml --1password --vault Engineering --title "API Secrets" --category API',
  ]

  static args = {
    brunoDir: Args.string({
      description: 'Path to Bruno collection directory',
      required: true,
    }),
  }

  static flags = {
    output: Flags.string({
      char: 'o',
      description: 'Output YAML file path',
      required: true,
    }),
    '1password': Flags.boolean({
      description: 'Create/update 1Password item',
      default: false,
    }),
    vault: Flags.string({
      description: '1Password vault name (required with --1password)',
      dependsOn: ['1password'],
    }),
    title: Flags.string({
      description: '1Password item title',
      dependsOn: ['1password'],
      default: 'Bruno API Secrets',
    }),
    category: Flags.string({
      description: '1Password item category',
      dependsOn: ['1password'],
      default: 'API Credential',
    }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Extract)

    // Validate 1Password flags
    if (flags['1password'] && !flags.vault) {
      this.error('--vault is required when using --1password flag')
    }

    // Resolve Bruno directory path
    const brunoDir = path.resolve(args.brunoDir)
    
    // Validate Bruno directory
    if (!await fs.pathExists(brunoDir)) {
      this.error(`Bruno directory not found: ${brunoDir}`)
    }

    console.log(chalk.bold.cyan('\n🔐 Bruno Secrets Sync Tool\n'))
    console.log(chalk.blue(`📁 Bruno directory: ${brunoDir}`))
    console.log(chalk.blue(`📝 Output file: ${flags.output}\n`))

    try {
      // Step 1: Parse Bruno environment files and extract secrets
      console.log(chalk.bold('Step 1: Extracting secrets from Bruno environments...'))
      const parser = new BrunoParser(brunoDir)
      const secrets = await parser.extractSecrets()

      if (Object.keys(secrets).length === 0) {
        console.warn(chalk.yellow('⚠️  No secrets found in Bruno environment files'))
        console.log(chalk.gray('   Make sure your secret variables are marked with ~secret flag'))
        return
      }

      // Step 2: Export secrets to YAML
      console.log(chalk.bold('\nStep 2: Exporting secrets to YAML...'))
      const exporter = new YamlExporter()
      await exporter.export(secrets, flags.output)

      // Step 3: Update bruno.json to enable filesystem access
      console.log(chalk.bold('\nStep 3: Updating bruno.json...'))
      const configManager = new BrunoConfigManager(brunoDir)
      await configManager.updateConfig()

      // Step 4: Handle 1Password integration if requested
      let itemName = flags.title
      const vaultName = flags.vault || 'Personal'  // Default vault for collection.bru generation

      if (flags['1password'] && flags.vault) {
        console.log(chalk.bold('\nStep 4: Creating/updating 1Password item...'))
        const opManager = new OnePasswordManager()
        
        // Verify vault access
        if (await opManager.verifyAccess(flags.vault)) {
          const createdItemId = await opManager.createItem(secrets, {
            vault: flags.vault,
            title: flags.title,
            category: flags.category,
          })
          
          if (createdItemId) {
            itemName = createdItemId
          }
        }
      } else {
        console.log(chalk.gray('\nStep 4: Skipping 1Password item creation (use --1password flag to enable)'))
      }

      // Step 5: Generate/update collection.bru with pre-request script
      console.log(chalk.bold('\nStep 5: Updating collection.bru with pre-request script...'))
      const collectionGen = new CollectionGenerator(brunoDir)
      await collectionGen.updateCollection(secrets, itemName, vaultName)

      // Success summary
      console.log(chalk.bold.green('\n✅ Successfully completed Bruno secrets sync!\n'))
      console.log(chalk.green('Summary:'))
      console.log(chalk.green(`  • Extracted secrets from ${Object.keys(secrets).length} environment(s)`))
      console.log(chalk.green(`  • Exported secrets to ${flags.output}`))
      console.log(chalk.green(`  • Enabled filesystem access in bruno.json`))
      console.log(chalk.green(`  • Updated collection.bru with pre-request script`))
      
      if (flags['1password']) {
        console.log(chalk.green(`  • Created 1Password item "${flags.title}" in vault "${flags.vault}"`))
      }

      console.log(chalk.cyan('\n📌 Next steps:'))
      console.log(chalk.cyan('  1. Review the generated files'))
      console.log(chalk.cyan('  2. Test the pre-request script in Bruno'))
      if (!flags['1password']) {
        console.log(chalk.cyan('  3. Consider creating a 1Password item with --1password flag'))
      }

    } catch (error) {
      this.error(`Failed to extract secrets: ${error}`)
    }
  }
}