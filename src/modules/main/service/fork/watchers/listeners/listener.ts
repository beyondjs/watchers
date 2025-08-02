import type { UUID } from 'crypto';
import type { IListenerFilter } from '@beyond-js/watchers/types';
import type { Stats } from 'fs';
import { ipc } from '@beyond-js/ipc/main';
import { sep } from 'path';
import { randomUUID } from 'crypto';

export /*bundle*/ type ListenerEventType = 'add' | 'change' | 'unlink';

/**
 * Emit change events about files changes
 */
export default class Listener {
	#id: UUID;
	get id() {
		return this.#id;
	}

	#client: UUID;
	get client() {
		return this.#client;
	}

	#path;
	#filter;

	/**
	 * Listener constructor
	 *
	 * @param client {number} The client id of the watcher being used
	 * @param path {string} The path to listen for changes, can be a directory or a file
	 * @param filter {object}
	 */
	constructor(client: UUID, path: string, filter: IListenerFilter) {
		this.#id = randomUUID();

		path = path.replace(/[\\/]$/, '');

		filter = filter ? filter : {};
		if (filter.includes && !(filter.includes instanceof Array)) throw new Error('Invalid "includes" specification');
		if (filter.excludes && !(filter.excludes instanceof Array)) throw new Error('Invalid "excludes" specification');

		typeof filter.extname === 'string' ? (filter.extname = [filter.extname]) : null;
		if (filter.extname && !(filter.extname instanceof Array)) throw new Error('Invalid "extname" specification');

		this.#path = path;
		this.#filter = filter;
	}

	#emit(file: string, event: ListenerEventType) {
		ipc.events.emit(`listener:${this.#id}.change`, { file: file, event: event });
	}

	// Called by the watcher when a change is fired
	change(event: ListenerEventType, file: string, stats: Stats) {
		const path = this.#path;
		const filter = this.#filter;
		if (file !== path && !file.startsWith(`${path}${sep}`)) return;

		if (filter.extname && !filter.extname.includes(require('path').extname(file))) return;
		if (filter.filename && require('path').basename(file) !== filter.filename) return;

		// Check if file or folder is excluded
		const excludes = filter.excludes ? filter.excludes : [];
		for (let exclude of excludes) {
			exclude = require('path').join(path, exclude);
			if (file === exclude || file.startsWith(`${exclude}${sep}`)) return;
		}

		if (path === file || !filter.includes) {
			this.#emit(file, event);
			return;
		}

		// Check if file or folder is included
		for (let include of filter.includes) {
			include = require('path').join(path, include);
			if (file === include || file.startsWith(`${include}${sep}`)) {
				this.#emit(file, event);
				return;
			}
		}
	}
}
