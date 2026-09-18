import type { WatcherSpec, IListenerCreate, IListenerDelete } from '@beyond-js/watchers/types';
import type { UUID } from 'crypto';
import { ipc } from '@beyond-js/ipc/child';
import Watchers from './watchers';

process.title = 'BeyondJS files watchers monitor';

const watchers = new Watchers();
ipc.handle('create', (spec: WatcherSpec) => watchers.create(spec));

/**
 * The action was specified with the identifier of the client, and the published client (1.0.7) sends it
 * wrapped as `{ id }`. Both are accepted: rejecting the wrapped form made every final release of a watcher
 * fail with `Client "[object Object]" is not registered`, surfacing in the client process as an uncaught
 * "Error stopping watcher" and leaving the watcher running in this process.
 */
ipc.handle('delete', async (params: UUID | { id: UUID }) => {
	const id = typeof params === 'string' ? params : params?.id;
	if (!id) throw new Error(`Client identifier not defined`);
	await watchers.delete(id);
});

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
