import type { WatcherSpec } from '@beyond-js/watchers/types';
import type Watcher from './watchers/watcher';
import type Listeners from './watchers/listeners';
import { watchers } from './watchers';

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

	constructor(service: string, spec: WatcherSpec) {
		if (typeof spec !== 'object') throw new Error('Invalid parameter spec');
		this.#spec = spec;

		const { path } = spec;
		if (typeof path !== 'string') throw new Error('Non-string provided as watch path');
		if (!path) throw new Error('Empty string provided as watch path');

		this.#watcher = watchers.get(this.#service, spec);
	}

	async start() {
		return await this.#watcher.start();
	}

	destroy() {
		watchers.unregister(this.#spec.path);
	}
}
