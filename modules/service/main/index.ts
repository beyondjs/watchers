import type { ChildProcess } from 'child_process';
import { fork } from 'child_process';
import { ipc } from '@beyond-js/ipc/main';
import { join } from 'path';

export /*bundle*/ class WatchersService {
	#process: ChildProcess;

	constructor(name: string, options: { sourcemaps?: string } = {}) {
		const argv: string[] = [];

		// Used by tests to run the service with source maps enabled
		options.sourcemaps && argv.push('--enable-source-maps');

		const path = join(process.cwd(), 'fork/fork.js');
		this.#process = fork(path, [], { cwd: __dirname, execArgv: argv });
		ipc.register(name, this.#process);
	}

	async kill() {
		this.#process?.kill();
		this.#process = null;
	}
}
