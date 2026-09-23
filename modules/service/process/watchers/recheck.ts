import type { Stats } from 'fs';
import * as fs from 'fs';

type Announce = (file: string, stats: Stats) => void;

/**
 * The check of a file once chokidar's change window has passed.
 *
 * chokidar reports a change of a path at most once per 50 ms and drops a change it observes inside that
 * window without reporting it when the window ends (`_throttle('change', path, 50)`), and it drops a raw
 * event within 5 ms of the previous one of the same file. A file written twice within the window — an
 * editor's save followed by a formatter, or a correction written as soon as a failed build was reported —
 * reached a listener once, and a consumer that read the file between the two writes kept the older content
 * until an unrelated later edit.
 *
 * Every addition or change the service announces is recorded with the stats chokidar reported for it, and
 * the file is examined again once the window is over. When what it holds then differs from what was
 * announced (modification or change time, size, inode), the change is announced at that moment. A file that
 * was written once is examined once and announced once; a file removed meanwhile is left to chokidar, which
 * announces the removal.
 */
export default class Recheck {
	/** chokidar's change window, in milliseconds */
	static WINDOW = 50;

	/** How long after the window a file is examined, so that a change chokidar dropped is already on disk */
	static MARGIN = 25;

	#announce: Announce;
	#pending: Map<string, { stats: Stats | undefined; timer: NodeJS.Timeout }> = new Map();
	#closed = false;

	/** How many files wait for their check, for diagnostics */
	get size() {
		return this.#pending.size;
	}

	/**
	 * @param announce Announces a change of a file to the listeners of the watcher
	 */
	constructor(announce: Announce) {
		this.#announce = announce;
	}

	/**
	 * Records what was announced for a file and schedules its check after the window, replacing an earlier
	 * one: the window of chokidar begins again with every change it reports
	 */
	observe(file: string, stats?: Stats) {
		if (this.#closed) return;
		this.forget(file);

		const timer = setTimeout(() => this.#check(file), Recheck.WINDOW + Recheck.MARGIN);
		timer.unref();
		this.#pending.set(file, { stats, timer });
	}

	/**
	 * Cancels the check of a file, when it was removed
	 */
	forget(file: string) {
		const pending = this.#pending.get(file);
		if (!pending) return;
		clearTimeout(pending.timer);
		this.#pending.delete(file);
	}

	async #check(file: string) {
		const pending = this.#pending.get(file);
		this.#pending.delete(file);

		let current: Stats;
		try {
			current = await fs.promises.stat(file);
		} catch {
			// Removed or unreadable since: chokidar reports the removal
			return;
		}

		// A later announcement of the same file replaced this check while the file was being examined
		if (this.#closed || this.#pending.has(file)) return;
		if (Recheck.same(pending?.stats, current)) return;

		this.#announce(file, current);
	}

	/**
	 * Whether a file still holds what was announced. Without the stats of the announcement nothing can be
	 * compared, so the file is announced again: a redundant announcement costs a consumer a read, a missing
	 * one leaves it with older content.
	 */
	static same(announced: Stats | undefined, current: Stats) {
		if (!announced) return false;
		const { mtimeMs, ctimeMs, size, ino } = announced;
		return mtimeMs === current.mtimeMs && ctimeMs === current.ctimeMs && size === current.size && ino === current.ino;
	}

	/**
	 * Cancels every pending check; nothing is announced after it
	 */
	destroy() {
		this.#closed = true;
		this.#pending.forEach(({ timer }) => clearTimeout(timer));
		this.#pending.clear();
	}
}
