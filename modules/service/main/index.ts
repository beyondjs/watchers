import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { ipc } from '@beyond-js/ipc/main';
import { PendingPromise } from '@beyond-js/pending-promise/main';

/**
 * The public module that implements the service handlers in the child process
 */
const SPECIFIER = '@beyond-js/watchers/service/process';

export /*bundle*/ interface IWatchersServiceOptions {
	/**
	 * The Node arguments of the child, which carry the registration of the module loader. They default to
	 * the arguments of the current process, so the child resolves public modules exactly like its parent.
	 */
	execArgv?: string[];

	/** Environment values added to the ones of the current process */
	env?: Record<string, string>;

	/** The working directory of the child, from which its installed dependencies resolve */
	cwd?: string;

	/** The public module the child imports, which defaults to the service process of this package */
	specifier?: string;

	/** Milliseconds to wait for the child to report that its handlers are installed. 15000 by default */
	timeout?: number;

	/** Enables Node's source maps in the child */
	sourcemaps?: boolean;
}

/**
 * The filesystem watchers service, run in a child Node process and registered in the IPC router of this
 * process under a name that watcher clients address.
 *
 * The child is started with the module loader of the current process and imports the service process as
 * an ordinary public module; installing its handlers is the whole startup, and the child reports it.
 * `start()` resolves once the handlers are installed and rejects when the child fails, exits or stays
 * silent, so a watching setup that is broken is observable instead of a workspace that never rebuilds.
 */
export /*bundle*/ class WatchersService {
	#name: string;
	get name() {
		return this.#name;
	}

	#options: IWatchersServiceOptions;
	#process: ChildProcess | undefined;

	/** The process identifier of the child while the service runs */
	get pid() {
		return this.#process?.pid;
	}

	#started = false;
	get started() {
		return this.#started;
	}

	/** Resolves with the exit code of the child, which lets stop() await its termination */
	#stopped: PendingPromise<number | null> | undefined;

	constructor(name = 'watchers', options: IWatchersServiceOptions = {}) {
		this.#name = name;
		this.#options = options;
	}

	/**
	 * Starts the child and registers it once it reports that its handlers are installed
	 *
	 * @throws When the service is already started, or when the child fails to install its handlers
	 */
	async start(): Promise<void> {
		if (this.#process) throw new Error(`Watchers service "${this.#name}" is already started`);

		const options = this.#options;
		const specifier = options.specifier ?? SPECIFIER;
		const timeout = options.timeout ?? 15000;

		const entry =
			`import(${JSON.stringify(specifier)})` +
			`.then(() => process.send({ type: 'watchers:ready' }))` +
			`.catch(error => { process.send({ type: 'watchers:error', message: error.stack ?? String(error) }); process.exit(1); });`;

		const argv = [...(options.execArgv ?? process.execArgv)];
		options.sourcemaps && argv.push('--enable-source-maps');
		argv.push('--input-type=module', '-e', entry);

		const child = spawn(process.execPath, argv, {
			cwd: options.cwd ?? process.cwd(),
			env: { ...process.env, ...(options.env ?? {}) },
			stdio: ['ignore', 'inherit', 'inherit', 'ipc']
		});
		this.#process = child;

		const stopped: PendingPromise<number | null> = new PendingPromise();
		this.#stopped = stopped;
		child.once('exit', code => stopped.resolve(code));

		const ready: PendingPromise<void> = new PendingPromise();
		const onmessage = (message: { type?: string; message?: string }) => {
			if (!message || typeof message !== 'object') return;
			if (message.type === 'watchers:ready') ready.resolve();
			if (message.type === 'watchers:error') ready.reject(new Error(`Watchers service failed to start:\n${message.message}`));
		};
		child.on('message', onmessage);
		child.once('error', error => ready.reject(error));
		child.once('exit', (code, signal) => ready.reject(new Error(`Watchers service exited before it was ready (${signal ?? code})`)));

		const timer = setTimeout(() => ready.reject(new Error(`Watchers service did not report readiness within ${timeout} ms`)), timeout);
		try {
			await ready;
		} catch (error) {
			child.removeListener('message', onmessage);
			this.#process = void 0;
			child.kill('SIGKILL');
			throw error;
		} finally {
			clearTimeout(timer);
		}
		child.removeListener('message', onmessage);

		ipc.register(this.#name, child);
		this.#started = true;
	}

	/**
	 * Unregisters the service, ends the child and waits for it to exit
	 */
	async stop(): Promise<void> {
		const child = this.#process;
		if (!child) return;
		this.#process = void 0;

		this.#started && ipc.unregister(this.#name);
		this.#started = false;

		child.kill();
		const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
		await this.#stopped;
		clearTimeout(timer);
	}

	/** Ends the child. Kept for compatibility: stop() is the awaitable form. */
	async kill() {
		await this.stop();
	}
}
