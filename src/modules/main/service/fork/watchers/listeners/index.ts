import type { UUID } from 'crypto';
import type { Stats } from 'fs';
import type { IListenerFilter } from '@beyond-js/watchers/types';
import type { ListenerEventType } from './listener';
import Listener from './listener';

export default class Listeners {
	#listeners: Map<string, Listener> = new Map();

	/**
	 *  Creates a new listener
	 *
	 * @param client {number} The client id of the watcher being used
	 * @param path {string} The folder to be listening
	 * @param filter {object} The filter being applied to the listener
	 */
	create(client: UUID, path: string, filter: IListenerFilter): Listener {
		const listener = new Listener(client, path, filter);
		this.#listeners.set(listener.id, listener);
		return listener;
	}

	unregister(client: UUID): void {
		const listeners = this.#listeners;
		listeners.forEach((listener, key) => listener.client === client && listeners.delete(key));
	}

	stop(id: UUID): void {
		const listeners = this.#listeners;
		if (!listeners.has(id)) throw new Error(`Listener "${id}" is not registered`);
		listeners.delete(id);
	}

	// Called by the watcher when a change is fired
	change(event: ListenerEventType, file: string, stats: Stats): void {
		this.#listeners.forEach(listener => listener.change(event, file, stats));
	}
}
