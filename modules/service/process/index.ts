import type { WatcherSpec, IListenerCreate, IListenerDelete } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import { ipc } from '@beyond-js/ipc/child';
import Watchers from './watchers';

process.title = 'BeyondJS files watchers monitor';

const watchers = new Watchers();
ipc.handle('create', (spec: WatcherSpec) => watchers.create(spec));
ipc.handle('delete', async (id: UUID) => await watchers.delete(id));

ipc.handle('listeners.create', (params: IListenerCreate) => {
	if (!params) throw new Error(`Invalid parameters`);
	if (!params.watcher) throw new Error(`Watcher parameter not defined`);
	if (!watchers.has(params.watcher)) throw new Error(`Watcher ${params.watcher} is not registered`);

	const watcher = watchers.get(params.watcher);
	const listener = watcher.listeners.create(params.watcher, params.path, params.filter);

	return listener.id;
});

ipc.handle('listeners.delete', (params: IListenerDelete) => {
	if (!params) throw new Error(`Invalid parameters`);
	if (!params.watcher) throw new Error(`Watcher parameter not defined`);
	if (!params.id) throw new Error(`Listener parameter not defined`);
	if (!watchers.has(params.watcher)) throw new Error(`Watcher ${params.watcher} is not registered`);

	const watcher = watchers.get(params.watcher);
	watcher.listeners.stop(params.id);
});
