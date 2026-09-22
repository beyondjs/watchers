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

	async delete(id: UUID) {
		const listeners = this.#listeners;
		if (!listeners.has(id)) throw new Error(`Listener with id "${id}" is not registered`);

		const listener = listeners.get(id);
		!listener.destroyed && (await listener.destroy());
		listeners.delete(id);
	}

	/**
	 * Releases every listener of the watcher and answers when all of them have been released, which is what
	 * lets the watcher be deleted afterwards: deleting it first leaves these releases naming a watcher the
	 * service no longer has, and each of them fails
	 */
	async destroy() {
		const listeners = [...this.#listeners.values()].filter(listener => !listener.destroyed);
		await Promise.all(listeners.map(listener => listener.destroy()));
		this.#listeners.clear();
	}
}
