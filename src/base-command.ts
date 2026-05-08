import { Command, Interfaces } from '@oclif/core';
import chalk from 'chalk';

export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;
export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
    (typeof BaseCommand)['baseFlags'] & T['flags']
>;

export type ErrorOptions = {
    code?: string;
    exit?: number | false;
} & Interfaces.PrettyPrintableError;

export abstract class BaseCommand<T extends typeof Command> extends Command {
    // add the --json flag
    static override enableJsonFlag = true;

    protected flags!: Flags<T>;
    protected args!: Args<T>;
    private flagsMetadata!: Interfaces.ParserOutput['metadata']['flags'];

    public override async init(): Promise<void> {
        await super.init();
        const { args, flags, metadata } = await this.parse({
            flags: this.ctor.flags,
            enableJsonFlag: this.ctor.enableJsonFlag,
            args: this.ctor.args,
            strict: this.ctor.strict,
        });
        this.flags = flags as Flags<T>;
        this.args = args as Args<T>;
        this.flagsMetadata = metadata?.flags ?? {};
    }

    protected isFlagDefault(name: string): boolean {
        return this.flagsMetadata[name]?.setFromDefault !== false;
    }

    protected override async catch(err: Error & { exitCode?: number }): Promise<unknown> {
        // add any custom logic to handle errors from the command
        // or simply return the parent class error handling
        return super.catch(err);
    }

    protected override async finally(result: Error | undefined): Promise<unknown> {
        // called after run and catch regardless of whether or not the command errored
        return super.finally(result);
    }

    override warn(input: string) {
        process.stderr.write(chalk.yellow(`⚠️  ${input}\n`));
        return input;
    }

    override error(input: string, options: ErrorOptions = {}) {
        process.stderr.write(chalk.red(`🚫 ${input}\n`));
        // Create a "silent" error by passing an empty string to super.error
        // This preserves oclif's exit behavior without double printing
        return super.error('', { ...options, exit: options.exit || 2 });
    }

    failed(message: string) {
        this.log(chalk.red(`💥 ${message}`));
    }

    skipped(message: string): void {
        this.log(chalk.yellow(`⏭️  ${message}`));
    }

    info(message: string): void {
        this.log(chalk.blue(`💡 ${message}`));
    }

    success(message: string): void {
        this.log(chalk.green(`✅ ${message}`));
    }
}
