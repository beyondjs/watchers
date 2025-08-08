import type Watcher from '../watcher';
import type { IListenerFilter } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import { Listener } from './listener';

export default class Listeners {
	#listeners = new Map();
	#watcher: Watcher;

	constructor(watcher: Watcher) {
		this.#watcher = watcher;
	}

	create(path: string, filter: IListenerFilter): Listener {
		const listeners = this.#listeners;
		const listener = new Listener(this.#watcher, path, filter);
		listener.on('destroyed', () => this.#listeners.delete(path));
		listeners.set(path, listener);
		return listener;
	}

	delete(id: UUID) {
		const listeners = this.#listeners;
		if (!listeners.has(id)) throw new Error(`Listener with id "${id}" is not registered`);

		const listener = listeners.get(id);
		!listener.destroyed && listener.destroy();
		listeners.delete(id);
	}

	destroy() {
		const listeners = this.#listeners;
		listeners.forEach(listener => !listener.destroyed && listener.destroy());
		listeners.clear();
	}
}
