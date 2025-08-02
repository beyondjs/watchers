import type { WatcherSpec } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import type { Stats } from 'fs';
import * as chokidar from 'chokidar';
import Listeners from './listeners';

/**
 * Recursive fs watcher to listen for file changes
 */
export default class Watcher {
	#spec: WatcherSpec;
	#watcher;

	get path() {
		return this.#spec.path;
	}

	#listeners = new Listeners();
	get listeners() {
		return this.#listeners;
	}

	#ready = false;
	get ready() {
		return this.#ready;
	}

	constructor(spec: WatcherSpec) {
		this.#spec = spec;

		const { path } = spec;

		spec.excludes = spec.excludes || [];
		const excludes = ['node_modules', 'builds', '.builds', '.beyond', ...spec.excludes];

		const options = {
			ignored: (path: string) => excludes.some(exclude => path.endsWith(exclude))
		};
		const watcher = chokidar.watch([path], options);

		this.#watcher = watcher;
		const listeners = this.#listeners;

		const add = (file: string, stats: Stats) => this.#ready && listeners.change('add', file, stats);
		const unlink = (file: string, stats: Stats) => this.#ready && listeners.change('unlink', file, stats);
		const change = (file: string, stats: Stats) => this.#ready && listeners.change('change', file, stats);

		watcher.on('ready', () => (this.#ready = true));
		watcher.on('add', add);
		watcher.on('unlink', unlink);
		watcher.on('change', change);
	}

	/**
	 * Unregister all the listeners of a client id
	 *
	 * @param client {number} The client id
	 */
	unregister(client: UUID) {
		this.#listeners.unregister(client);
	}

	// Chokidar watcher .close method is async
	destroy() {
		this.#watcher.close().catch(exc => console.log(exc.stack));
	}
}
