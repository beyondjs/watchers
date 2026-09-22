import type { WatcherSpec } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import Watcher from './watcher';
import { randomUUID } from 'crypto';

export default class Watchers {
	#watchers: {
		paths: Map<string, Watcher>;
		specs: Map<string, WatcherSpec>;
		clients: Map<Watcher, Set<UUID>>;
		client: Map<UUID, Watcher>;
	} = {
		paths: new Map(),
		specs: new Map(),
		clients: new Map(),
		client: new Map()
	};

	has = (id: UUID) => this.#watchers.client.has(id);
	get = (id: UUID) => this.#watchers.client.get(id);

	/**
	 * Registers a client of the watcher of a path, creating the watcher when the path has none. It answers
	 * with the identifier of the client once the watcher is ready: its initial scan completed and events
	 * are being delivered, so a change made after this answer is observed.
	 *
	 * @throws When the specification is invalid, or when the filesystem watcher fails before it is ready
	 */
	async create(spec: WatcherSpec): Promise<UUID> {
		if (typeof spec !== 'object' || !spec.is || !spec.path) {
			const message =
				`Invalid watcher spec: ${JSON.stringify(spec)}. ` +
				'It must be an object with `is` and `path` properties';
			throw new Error(message);
		}

		const watchers = this.#watchers;
		const { path } = spec;

		/**
		 * Get a previously created watcher or set a new one
		 */
		let watcher: Watcher;
		if (watchers.paths.has(path)) {
			watcher = watchers.paths.get(path);
		} else {
			const check = function (lower: string, higher: string) {
				if (higher.startsWith(`${lower}${sep}`)) {
					const specs = { lower: watchers.specs.get(lower), higher: watchers.specs.get(higher) };
					console.warn(
						`Watcher of "${specs.higher.is}" with path "${specs.higher.path}" ` +
							`could be using the watcher of "${specs.lower.is}" with path "${specs.lower.path}"`
					);
				}
			};

			watcher = new Watcher(spec);
			watchers.paths.set(path, watcher);
			watchers.specs.set(path, spec);

			// Check if a watcher is being created on a path that another watcher is already working
			const sep = require('path').sep;
			for (const previous of watchers.paths.keys()) {
				previous.length < path.length ? check(previous, path) : check(path, previous);
			}
		}

		/**
		 * Set the client id
		 */
		let ids: Set<UUID>; // array of clients ids attached to the same watcher
		if (watchers.clients.has(watcher)) {
			ids = watchers.clients.get(watcher);
		} else {
			ids = new Set();
			watchers.clients.set(watcher, ids);
		}

		const uuid = randomUUID();
		ids.add(uuid);
		watchers.client.set(uuid, watcher);

		try {
			await watcher.ready;
		} catch (error) {
			await this.delete(uuid).catch(() => void 0);
			throw error;
		}
		return uuid;
	}

	/**
	 * Unregisters a watcher
	 *
	 * @param id {UUID} The client id of the consumer of the watcher
	 */
	async delete(id: UUID) {
		const watchers = this.#watchers;
		if (!watchers.client.has(id)) throw new Error(`Client "${id}" is not registered`);

		const watcher: Watcher = watchers.client.get(id);
		const ids = watchers.clients.get(watcher);
		ids.delete(id);
		watcher.unregister(id);

		watchers.client.delete(id);
		if (!ids.size) {
			watchers.clients.delete(watcher);
			watchers.paths.delete(watcher.path);
			watchers.specs.delete(watcher.path);
			await watcher.destroy();
		}
	}

	/** How many watchers, clients and listeners this process holds, for diagnostics */
	get size() {
		let listeners = 0;
		this.#watchers.paths.forEach(watcher => (listeners += watcher.listeners.size));
		return { watchers: this.#watchers.paths.size, clients: this.#watchers.client.size, listeners };
	}
}
