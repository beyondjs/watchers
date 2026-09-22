import type Watcher from '../watcher';
import type { IListenerFilter } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import { Listener } from './listener';

/**
 * The listeners of a watcher: filtered subscriptions beneath its root. Several listeners may share one
 * path, each with its own filter and its own identifier in the service.
 */
export default class Listeners {
	#listeners: Set<Listener> = new Set();
	#watcher: Watcher;

	constructor(watcher: Watcher) {
		this.#watcher = watcher;
	}

	/** How many listeners the watcher holds, released or not yet */
	get size() {
		return this.#listeners.size;
	}

	create(path: string, filter: IListenerFilter): Listener {
		const listener = new Listener(this.#watcher, path, filter);
		listener.on('destroyed', () => this.#listeners.delete(listener));
		this.#listeners.add(listener);
		return listener;
	}

	/**
	 * Releases the listener the service knows by that identifier
	 */
	async delete(id: UUID) {
		const listener = [...this.#listeners].find(listener => listener.id === id);
		if (!listener) throw new Error(`Listener with id "${id}" is not registered`);
		await listener.destroy();
	}

	/**
	 * Releases every listener of the watcher and answers when all of them have been released, which is what
	 * lets the watcher be deleted afterwards: deleting it first leaves these releases naming a watcher the
	 * service no longer has, and each of them fails
	 */
	async destroy() {
		const listeners = [...this.#listeners].filter(listener => !listener.destroyed);
		await Promise.all(listeners.map(listener => listener.destroy()));
		this.#listeners.clear();
	}
}
