import type { WatcherSpec } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import type { Stats } from 'fs';
import * as chokidar from 'chokidar';
import { PendingPromise } from '@beyond-js/pending-promise/main';
import Listeners from './listeners';
import Recheck from './recheck';

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

	/** Examines an announced file again once chokidar's change window has passed: see Recheck */
	#recheck: Recheck;

	/** Resolves when the initial scan of the root completed and events are being delivered */
	#ready: PendingPromise<void> = new PendingPromise();
	get ready(): Promise<void> {
		return this.#ready;
	}

	#scanned = false;
	get scanned() {
		return this.#scanned;
	}

	/** The errors the filesystem watcher reported, kept so a client can be told what went wrong */
	#errors: string[] = [];
	get errors() {
		return this.#errors;
	}

	constructor(spec: WatcherSpec) {
		if (!spec || typeof spec.path !== 'string' || typeof spec.is !== 'string') {
			throw new Error(`Invalid watcher spec, expected { path: string, is: string }`);
		}

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

		const change = (file: string, stats: Stats) => {
			if (!this.#scanned) return;
			this.#recheck.observe(file, stats);
			listeners.change('change', file, stats);
		};
		this.#recheck = new Recheck(change);

		const add = (file: string, stats: Stats) => {
			if (!this.#scanned) return;
			this.#recheck.observe(file, stats);
			listeners.change('add', file, stats);
		};
		const unlink = (file: string, stats: Stats) => {
			if (!this.#scanned) return;
			this.#recheck.forget(file);
			listeners.change('unlink', file, stats);
		};

		watcher.on('ready', () => {
			this.#scanned = true;
			this.#ready.resolve();
		});
		watcher.on('add', add);
		watcher.on('unlink', unlink);
		watcher.on('change', change);

		// An error event with no subscriber would end this process; it is recorded and reported instead
		watcher.on('error', (error: Error) => {
			const message = `Filesystem watcher of "${path}" reported: ${error?.message ?? error}`;
			this.#errors.push(message);
			console.error(message);
			this.#scanned || this.#ready.reject(new Error(message));
		});
	}

	/**
	 * Unregister all the listeners of a client id
	 *
	 * @param client {number} The client id
	 */
	unregister(client: UUID) {
		this.#listeners.unregister(client);
	}

	/**
	 * Closes the filesystem watcher and answers when it is closed
	 */
	async destroy(): Promise<void> {
		this.#recheck.destroy();
		await this.#watcher.close();
	}
}
