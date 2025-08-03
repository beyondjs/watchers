import type { WatcherSpec } from '@beyond-js/watchers/types';
import watchers from './watchers';

export /*bundle*/ class Watchers {
	#spec;
	get spec() {
		return this.#spec;
	}

	#watcher;

	get id() {
		return this.#watcher.id;
	}

	get started() {
		return this.#watcher.started;
	}

	get listeners() {
		return this.#watcher.listeners;
	}

	constructor(spec: WatcherSpec) {
		if (typeof spec !== 'object') throw new Error('Invalid parameter spec');
		this.#spec = spec;

		const { path } = spec;
		if (typeof path !== 'string') throw new Error('Non-string provided as watch path');
		if (!path) throw new Error('Empty string provided as watch path');

		this.#watcher = watchers.get(spec);
	}

	start() {
		this.#watcher.start();
	}

	destroy() {
		watchers.unregister(this.#spec.path);
	}
}
