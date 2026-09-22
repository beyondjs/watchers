# @beyond-js/watchers

Watch filesystem roots in a child Node process and deliver filtered file events to clients through Beyond IPC.

```ts
import { WatchersService } from '@beyond-js/watchers/service';   // the parent process
import { WatcherClient } from '@beyond-js/watchers/client';

const service = new WatchersService('watchers');
await service.start();                                             // the child reports its handlers installed

const client = new WatcherClient('watchers', { path: root, is: 'application' });
const listener = client.listeners.create(root, { extname: ['.ts'] });
listener.on('change', file => rebuild(file));
await listener.listen();                                           // the root's initial scan is complete

await listener.destroy();
await client.destroy();                                            // the last client releases the watcher
await service.stop();
```

Public Beyond modules are **client**, **types**, **service** and **service/process**. The published package carries the client and the types; the service is compiled from this checkout, which the Beyond compiler's bootstrap does. [Architecture, APIs and lifecycle](docs/architecture.md) explains the service, the sharing of watchers by path, listeners and their literal filters, event order, readiness and release; [validation](docs/validation.md) maps each contract to its test against the real service process.

What a consumer relies on: `start()` of the service resolves when its handlers are installed and rejects when the child fails or stays silent; `start()` of a client and `listen()` of a listener resolve when the service reports the root ready, so a change made right after is observed; `all` and the specific event are independent announcements; a destroyed client releases its own reference only; releases are awaitable.

This checkout is authored with Beyond: [beyond.json](beyond.json) selects [package.json](package.json), whose module root is `modules`. Compiled public modules and their dependencies must be available through a Beyond loader.

MIT; see [LICENSE](LICENSE).
