import type { WatcherSpec } from '@beyond-js/watchers/types';
import type Watcher from './watchers/watcher';
import type Listeners from './watchers/listeners';
import { watchers } from './watchers';

/**
 * A reference to a watched root in the named service. Clients on one path share one watcher; the watcher is
 * released in the service when the last client is destroyed.
 */
export /*bundle*/ class WatcherClient {
	#service: string;
	get service() {
		return this.#service;
	}

	#spec: WatcherSpec;
	get spec() {
		return this.#spec;
	}

	#watcher: Watcher;

	get id() {
		return this.#watcher.id;
	}

	get started() {
		return this.#watcher.started;
	}

	get listeners(): Listeners {
		return this.#watcher.listeners;
	}

	#destroyed = false;
	get destroyed() {
		return this.#destroyed;
	}

	constructor(service: string, spec: WatcherSpec) {
		if (typeof spec !== 'object') throw new Error('Invalid parameter spec');
		this.#spec = spec;

		const { path } = spec;
		if (typeof path !== 'string') throw new Error('Non-string provided as watch path');
		if (!path) throw new Error('Empty string provided as watch path');

		this.#service = service;
		this.#watcher = watchers.get(service, spec);
	}

	/**
	 * Starts the shared watcher in the service, once. It resolves when the service reports the watcher
	 * ready, which is when its initial scan completed and events are being delivered.
	 */
	async start() {
		if (this.#destroyed) throw new Error(`Watcher client of "${this.#spec.path}" is destroyed`);
		return await this.#watcher.start();
	}

	/**
	 * Releases this client's reference. The watcher is stopped in the service when no client holds it, and
	 * the promise answers when that release has been attempted. A second call is ignored, so one client
	 * never releases a reference held by another.
	 */
	async destroy(): Promise<void> {
		if (this.#destroyed) {
			console.warn(`Watcher client of "${this.#spec.path}" is already destroyed`);
			return;
		}
		this.#destroyed = true;
		await watchers.unregister(this.#spec.path);
	}
}
