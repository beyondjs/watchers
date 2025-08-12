import type { WatcherSpec, IListenerCreate } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import { PendingPromise } from '@beyond-js/pending-promise/main';
import { ipc } from '@beyond-js/ipc/wrapper';
import ChainedException from './chained-exception';
import Listeners from './listeners';

export default class Watcher {
	#service: string;
	get service() {
		return this.#service;
	}

	#id: UUID;
	get id() {
		return this.#id;
	}

	get started(): boolean {
		return !!this.#id;
	}

	#promises: { start?: PendingPromise<UUID>; stop?: PendingPromise<void> } = {};

	#listeners = new Listeners(this);
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

	constructor(service: string, spec: WatcherSpec) {
		this.#service = service;
		this.#spec = spec;

		if (typeof service !== 'string' || !service.trim().length) {
			throw new Error('Invalid service name');
		}
		if (!spec || typeof spec.path !== 'string' || typeof spec.is !== 'string') {
			throw new Error(`Invalid watcher spec, expected { path: string, is: string }`);
		}
	}

	async start(): Promise<UUID> {
		if (this.#id) return; // Watcher already started

		const promises = this.#promises;
		if (promises.start) return await promises.start;
		const promise: PendingPromise<UUID> = new PendingPromise();
		promises.start = promise;

		if (promises.stop) await promises.stop;

		try {
			const spec: IListenerCreate = Object.assign({ watcher: this.#id }, this.#spec);
			const promise = ipc.exec(this.#service, 'create', spec);
			this.#id = await promise;
			promises.start.resolve(this.#id);
		} catch (exc) {
			const error = new Error('Error starting watcher');
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

		try {
			this.#listeners.destroy();
			await ipc.exec(this.#service, 'delete', { id: this.#id });
			this.#id = undefined;
			promises.stop.resolve();
		} catch (exc) {
			const error = new Error('Error stopping watcher');
			exc = new ChainedException(error, exc);
			promises.stop.reject(exc);
			throw exc;
		} finally {
			delete promises.stop;
		}
	}
}
