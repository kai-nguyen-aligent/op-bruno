import { Command, Interfaces } from '@oclif/core';
import { PrettyPrintableError } from '@oclif/core/interfaces';
import chalk from 'chalk';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
    (typeof BaseCommand)['baseFlags'] & T['flags']
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

type ErrorOptions = {
    code?: string;
    exit?: number | false;
} & PrettyPrintableError;

export abstract class BaseCommand<T extends typeof Command> extends Command {
    // add the --json flag
    static override enableJsonFlag = true;

    protected flags!: Flags<T>;
    protected args!: Args<T>;

    public override async init(): Promise<void> {
        await super.init();
        const { args, flags } = await this.parse({
            flags: this.ctor.flags,
            enableJsonFlag: this.ctor.enableJsonFlag,
            args: this.ctor.args,
            strict: this.ctor.strict,
        });
        this.flags = flags as Flags<T>;
        this.args = args as Args<T>;
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

    skipped(message: string): void {
        this.log(chalk.yellow(`⏭️  ${message}`));
    }

    success(message: string): void {
        this.log(chalk.green(`✅ ${message}`));
    }

    info(message: string): void {
        this.log(chalk.blue(`💡 ${message}`));
    }
}
