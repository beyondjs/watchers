import type {
	IListenerCreate,
	IListenerDelete,
	IListenerFilter,
	ListenerChangeEventType
} from '@beyond-js/watchers/types';
import type Watcher from '../watcher';
import type { UUID } from 'crypto';
import { ipc } from '@beyond-js/ipc/child';
import { PendingPromise } from '@beyond-js/pending-promise/main';
import { EventEmitter } from 'events';

export default class Listener extends EventEmitter {
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

	#change = (event: ListenerChangeEventType) => this.emit(event.event, event.file);

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
			ipc.events.on(this.#watcher.service, `listener:${this.#id}.change`, this.#change);
			promises.start.resolve(this.#id);
		} catch (exc) {
			promises.start.reject(exc);
			throw exc;
		} finally {
			delete promises.start;
		}

		return this.#id;
	}

	async stop() {
		const promises = this.#promises;
		const watcher = this.#watcher;

		// If stopping the watcher when it is already starting, wait the start be completed
		if (promises.stop) await promises.stop;

		if (promises.stop) return await promises.stop;
		promises.stop = new PendingPromise();

		if (!watcher.id) throw new Error('Watcher not started');

		// If stopping the listener when it is already starting, wait the start be completed
		if (promises.start) await promises.start;

		if (!this.#id) throw new Error('Listener not started');

		try {
			ipc.events.off(this.#watcher.service, `listener:${this.#id}.change`, this.#change);
			const message: IListenerDelete = { watcher: watcher.id, id: this.#id };
			await ipc.exec(this.#watcher.service, 'listeners.delete', message);
			this.#id = undefined;
		} catch (exc) {
			promises.stop.reject(exc);
			throw exc;
		} finally {
			delete promises.stop;
		}
	}

	destroy() {
		if (this.#destroyed) {
			console.warn(`FS listener "${this.#path}" already destroyed`);
			return;
		}
		this.#destroyed = true;

		this.emit('destroyed');
		this.removeAllListeners();
		if (!this.#id) return;
		this.stop().catch(exc => console.log(exc.stack));
	}
}
