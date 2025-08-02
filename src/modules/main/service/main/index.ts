import { fork } from 'child_process';
import { ipc } from '@beyond-js/ipc/main';

export /*bundle*/ class WatchersService {
	#process;

	constructor(name: string) {
		this.#process = fork('fork.js', [], { cwd: __dirname });
		ipc.register(name, this.#process);
	}
}
