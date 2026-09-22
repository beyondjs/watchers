import type {
	IListenerCreate,
	IListenerDelete,
	IListenerFilter,
	ListenerChangeEventType
} from '@beyond-js/watchers/types';
import type Watcher from '../watcher';
import type { UUID } from 'crypto';
import { ipc } from '@beyond-js/ipc/wrapper';
import { PendingPromise } from '@beyond-js/pending-promise/main';
import { EventEmitter } from 'events';

export /*bundle*/ interface ListenerSpec {
	watcher: UUID;
}

/**
 * The ListenerType is exported only for type annotations in other modules,
 * for example when a listener instance is received as a parameter.
 *
 * The Listener class itself is not exported to prevent direct usage;
 * listeners should be created and managed through the Watcher class.
 */
export /*bundle*/ type ListenerType = Listener;

export class Listener extends EventEmitter {
	#id: UUID;

	#watcher: Watcher;
	#path: string;
	get path() {
		return this.#path;
	}

	#filter: IListenerFilter;

	#destroyed = false;
	get destroyed() {
		return this.#destroyed;
	}

	constructor(watcher: Watcher, path: string, filter: IListenerFilter) {
		super();
		if (typeof path !== 'string') throw new Error('Invalid parameters');

		this.#watcher = watcher;
		this.#path = path;
		this.#filter = filter;
	}

	#promises: { start?: PendingPromise<UUID>; stop?: PendingPromise<void> } = {};

	/**
	 * A subscriber of one event must not keep the others from being notified: `all` and the event itself
	 * are independent announcements, and a listener that throws used to leave the specific event unemitted,
	 * so a file silently stopped being watched.
	 */
	#change = (event: ListenerChangeEventType) => {
		this.#announce('all', event.event, event.file);
		this.#announce(event.event, event.file);
	};

	#announce(event: string, ...params: unknown[]) {
		try {
			this.emit(event, ...params);
		} catch (exc) {
			console.warn(`Error announcing "${event}" of the FS listener on "${this.#path}"`, (<Error>exc).stack);
		}
	}

	async listen() {
		if (this.#id) return this.#id; // Listener already started

		const promises = this.#promises;
		const watcher = this.#watcher;

		if (promises.start) return await promises.start;
		promises.start = new PendingPromise();

		await watcher.start();
		if (!watcher.id) {
			const spec = watcher.spec;
			const message = `Watcher "${spec.is}" on "${spec.path}" not started`;
			console.error(message);
			promises.start.reject(new Error(message));
			return;
		}

		try {
			const specs: IListenerCreate = { watcher: watcher.id, path: this.#path, filter: this.#filter };
			this.#id = await ipc.exec(this.#watcher.service, 'listeners.create', specs);
			ipc.on(this.#watcher.service, `listener:${this.#id}.change`, this.#change);
			promises.start.resolve(this.#id);
		} catch (exc) {
			promises.start.reject(exc);
			throw exc;
		} finally {
			delete promises.start;
		}

		return this.#id;
	}

	/**
	 * Releases the listener in the service.
	 *
	 * The promise a concurrent call receives is the one of the release in progress, and it is settled
	 * exactly once: a release that fails used to reject a promise nobody was holding, which ended the
	 * process of the client with the failure of a listener it was already discarding.
	 */
	async stop() {
		const promises = this.#promises;
		const watcher = this.#watcher;

		if (promises.stop) return await promises.stop;

		const stopping: PendingPromise<void> = new PendingPromise();
		promises.stop = stopping;

		// The outcome is reported to whoever asked for it; this keeps the promise from being unobserved
		stopping.catch(() => void 0);

		try {
			// If stopping the listener while it is starting, wait for the start to be completed
			if (promises.start) await promises.start;

			if (!watcher.id) throw new Error('Watcher not started');
			if (!this.#id) throw new Error('Listener not started');

			// Remove the `change` event listener
			ipc.off(this.#watcher.service, `listener:${this.#id}.change`, this.#change);

			// Send the delete message to the IPC service to remove the listener from the service and stop it
			const message: IListenerDelete = { watcher: watcher.id, id: this.#id };
			await ipc.exec(this.#watcher.service, 'listeners.delete', message);
			this.#id = undefined;
			stopping.resolve();
		} catch (exc) {
			stopping.reject(exc);
			throw exc;
		} finally {
			delete promises.stop;
		}
	}

	/**
	 * Discards the listener and releases it in the service.
	 *
	 * It answers when the release has been attempted, so that whoever discards a watcher can release its
	 * listeners before the watcher itself: a watcher deleted first leaves its listeners naming something
	 * the service no longer has.
	 */
	async destroy() {
		if (this.#destroyed) {
			console.warn(`FS listener "${this.#path}" already destroyed`);
			return;
		}
		this.#destroyed = true;

		this.emit('destroyed');
		this.removeAllListeners();
		if (!this.#id) return;
		await this.stop().catch(exc => console.log(exc.stack));
	}
}
