import type { WatcherSpec } from '@beyond-js/watchers/types';
import Watcher from './watcher';

export default new (class {
	#watchers: Map<string, { instances: number; value: Watcher }> = new Map();

	get(spec: WatcherSpec): Watcher {
		const { path } = spec;
		const watchers = this.#watchers;

		if (watchers.has(path)) {
			const watcher = watchers.get(path);
			watcher.instances++;
			return watcher.value;
		}

		const watcher = new Watcher(spec);
		watchers.set(path, { instances: 1, value: watcher });
		return watcher;
	}

	unregister(path: string): void {
		const watchers = this.#watchers;

		if (!watchers.has(path)) {
			console.log(`Watcher "${path}" is already unregistered`);
			return;
		}

		const watcher = watchers.get(path);
		watcher.instances--;
		if (!watcher.instances) {
			watcher.value.stop().catch(exc => console.log(exc.stack));
			watchers.delete(path);
		}
	}
})();
