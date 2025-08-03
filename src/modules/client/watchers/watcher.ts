import type { WatcherSpec } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import { PendingPromise } from '@beyond-js/pending-promise/main';
import { ipc } from '@beyond-js/ipc/child';
import ChainedException from './chained-exception';

export default class Watcher {
	#id: UUID;
	get id() {
		return this.#id;
	}

	get started(): boolean {
		return !!this.#id;
	}

	#promises: { start?: PendingPromise<UUID>; stop?: PendingPromise<void> } = {};
	#listeners = new (require('./listeners'))(this);
	get listeners() {
		return this.#listeners;
	}

	get starting(): boolean {
		return !!this.#promises.start;
	}

	get stopping(): boolean {
		return !!this.#promises.stop;
	}

	#spec: WatcherSpec;
	get spec() {
		return this.#spec;
	}

	constructor(spec: WatcherSpec) {
		this.#spec = spec;
	}

	async start() {
		if (this.#id) return; // Watcher already started

		const promises = this.#promises;
		if (promises.start) return await promises.start;
		const promise: PendingPromise<UUID> = new PendingPromise();
		promises.start = promise;

		if (promises.stop) await promises.stop;

		const error = new Error('Error starting watcher');
		try {
			const promise = ipc.exec('watchers', 'create', { spec: this.#spec });
			this.#id = await promise;
			promises.start.resolve(this.#id);
		} catch (exc) {
			promises.start.reject(new ChainedException(error, exc));
		} finally {
			delete promises.start;
		}

		return await promise;
	}

	async stop() {
		if (!this.#id) return; // Watcher already stopped

		// If stopping the watcher when it is already starting, wait the start be completed
		const promises = this.#promises;
		if (promises.start) await promises.start;

		if (promises.stop) return await promises.stop;
		promises.stop = new PendingPromise();

		const error = new Error('Error stopping watcher');
		try {
			await this.#listeners.destroy();
			await ipc.exec('watchers', 'delete', { id: this.#id });
			this.#id = undefined;
			promises.stop.resolve();
		} catch (exc) {
			exc = new ChainedException(error, exc);
			promises.stop.reject(exc);
			throw exc;
		} finally {
			delete promises.stop;
		}
	}
}
