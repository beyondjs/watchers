# Watcher service, clients and events

Watchers runs chokidar in a child Node process and routes filtered file notifications over Beyond IPC. A parent starts and registers the named service; callers hold `WatcherClient` references to watched roots and create listeners beneath them. The package supplies filesystem events: compiler invalidation and update application belong to its consumers.

## Public modules and dependencies

[package.json](../package.json) declares the public modules beneath `modules`, `@beyond-js/ipc` for action and event routing, `@beyond-js/pending-promise` for settlement, `@beyond-js/kernel` as the legacy runtime dependency and `chokidar` 4.0.2. `fork/fork.js` is a retained static entry for the legacy BEE bootstrap and is not used by `WatchersService`.

| Import | Public API |
| --- | --- |
| `@beyond-js/watchers/service` | [WatchersService](../modules/service/main/index.ts) and `IWatchersServiceOptions`: starts the child, registers it, stops it |
| `@beyond-js/watchers/service/process` | [The handlers](../modules/service/process/index.ts) installed by importing the module in the child: `create`, `delete`, `listeners.create`, `listeners.delete`, `size` |
| `@beyond-js/watchers/client` | [WatcherClient](../modules/client/index.ts); `ListenerType` and `ListenerSpec` types |
| `@beyond-js/watchers/types` | [WatcherSpec, IListenerFilter, IListenerCreate, IListenerDelete, ListenerEventType, ListenerChangeEventType](../modules/types/index.ts) |

The published package's exports map answers `./service` and `./service/process` with empty objects: only the client half is published. A consumer that needs the service compiles it from these sources, which the Beyond compiler's bootstrap does by serving this checkout.

## The service

`new WatchersService(name = 'watchers', options?)` does nothing until `start()`. `start()` spawns a Node child with the arguments of the current process (`execArgv`, so the child registers the same module loader), an inline module that imports `@beyond-js/watchers/service/process` and sends `{ type: 'watchers:ready' }`, or `{ type: 'watchers:error', message }` and exits when the import fails. The parent resolves once ready arrives, registers the child in the main IPC router under the name, and rejects when the child reports an error, exits, or stays silent for `timeout` (15 s), killing the child in that case. Options: `execArgv`, `env` (added to the parent's), `cwd` (where the child resolves installed dependencies), `specifier` (the module to import), `timeout`, `sourcemaps`.

`stop()` unregisters the name, ends the child and waits for it to exit, forcing it after three seconds. `kill()` is `stop()` kept for compatibility. `pid` and `started` describe the running child. A second `start()` throws.

The child installs its handlers as an effect of importing the process module; its `size` action answers how many watchers, clients and listeners it holds, which is what a consumer checks after releasing everything.

## Clients and the sharing of watchers

`new WatcherClient(service, { path, is, excludes? })` obtains the watcher of `path` from a process-wide registry: clients of one exact path string share one watcher, whose first specification decides its root exclusions. `start()` creates the watcher in the service when it is not created yet and resolves with its identifier once the service reports it ready: the initial scan of the root is complete and events are being delivered, so a write made right after is observed. `id` and `started` follow that.

`destroy()` releases this client's reference and resolves when the release was attempted; the watcher is deleted in the service when the last reference is released, its listeners first. A second `destroy()` of the same client is ignored with a warning, so it never releases another client's reference. `start()` after `destroy()` is refused.

The service registry keeps one chokidar watcher per path with the set of client identifiers attached to it, and removes the watcher, its specification and its clients when the last client is deleted, awaiting the close of the filesystem watcher. A path nested under another watched path is a warning in the service, not an automatic reuse.

## Listeners and filters

`client.listeners.create(path, filter)` creates a listener under the root; `listen()` starts the shared watcher if needed, registers the listener in the service and subscribes to its events, resolving with the identifier the service gave it (`id`). Filters are literal:

| Field | Matching in the service |
| --- | --- |
| `path` | The listener's path itself, or a descendant separated by the platform separator |
| `filename` | Exact basename at any depth |
| `extname` | Exact extension including the dot, one or several |
| `excludes` | Relative literal paths joined under the listener path; the entry and its subtree are excluded |
| `includes` | Relative literal paths; when given, only the entries and their subtrees pass |

A listener emits `all` with `(event, file)` and then the specific `add`, `change` or `unlink` with `file`, as two independent announcements: a subscriber of one that throws is reported and does not keep the other from being announced. Only those three chokidar events are forwarded; directory events are not. Events before the root's initial scan completes are suppressed, which is what the readiness of `start()` answers. Two writes of one file within chokidar's throttle window arrive as one event.

`stop()` removes the listener from the service and its subscription; `destroy()` discards it, releases it when it was registered, and answers when the release was attempted. A listener destroyed while it is registering is released by that registration when it completes, and its `listen()` rejects. `listeners.delete(id)` destroys the listener with that identifier; `listeners.size` counts the listeners held. Every release settles the promise a concurrent caller receives exactly once, and a release that fails is reported rather than left as an unhandled rejection.

## Errors and readiness of the filesystem watcher

The service subscribes to chokidar's `error` event: an error is recorded on the watcher, printed, and rejects the watcher's readiness when it happens before the initial scan completes, so a client's `start()` fails instead of the service process ending on an unhandled emitter error. After readiness, an error is recorded and printed; it is not delivered to clients.

A client cannot reach a service that stopped: `start()` and `listen()` reject with the IPC error naming the missing target.

## Consumers

The Beyond compiler starts the service from its own wrapper with the same readiness protocol (`watchers:ready`), gives each package a client, and creates listeners for its inputs; Finder creates one listener per finder and File one per file or shares a listener. None of them creates the service by importing the client.

## Build and validation

[beyond.json](../beyond.json) selects the package; the `node-esm` distribution serves the service to another project during development. The tests under [tests/](../tests/README.md) start the real service process; [validation](validation.md) maps each contract to its test and states what is not established.
