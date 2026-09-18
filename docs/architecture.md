# Watcher service, clients and events

Watchers runs chokidar in a forked Node process and routes filtered file notifications over Beyond IPC. A main process starts and registers a named service; callers create WatcherClient references to monitored roots and listeners beneath those roots. It supplies filesystem events, not compiler invalidation, HMR or durable event replay.

## Public modules and dependencies

[package.json](../package.json) defines Beyond public modules beneath `modules` and includes `fork/fork.js` as a static asset. `@beyond-js/ipc` provides action/event routing; `@beyond-js/pending-promise` coordinates calls; chokidar is pinned to 4.0.2. Node process, filesystem and fork APIs make this a Node service, not a browser watcher.

| Import | Public API / implementation |
| --- | --- |
| `@beyond-js/watchers/service` | [WatchersService](../modules/service/main/index.ts), fork creation and registration |
| `@beyond-js/watchers/service/process` | [Service handlers](../modules/service/process/index.ts), startup side effects, no marked value export |
| `@beyond-js/watchers/client` | [WatcherClient](../modules/client/index.ts), ListenerType and ListenerSpec type exports from internal listener source |
| `@beyond-js/watchers/types` | [WatcherSpec, IListenerFilter, IListenerCreate, IListenerDelete, ListenerEventType, ListenerChangeEventType](../modules/types/index.ts) |

Internal Watcher and Listener classes are obtained through clients/factories, not separate public imports.

## Startup and readiness

`new WatchersService(name, options)` computes the child entrypoint as `join(process.cwd(), 'fork/fork.js')`, forks it with child cwd set to the service module's `__dirname`, and registers the fork under name in the **main** IPC handler. The optional `sourcemaps` value enables Node's source-map flag. Its type is currently string despite the boolean used by the test fixture. The fork receives an explicit execArgv array containing only the optional `--enable-source-maps`, so parent loader flags are not inherited through execArgv. Environment-based Node configuration is a separate mechanism; it is not prohibited by this code.

This entrypoint lookup depends on the caller's working directory containing the static fork file; installing the package somewhere else does not guarantee that layout. [fork.js](../fork/fork.js) checks for an adjacent `dev-mode.md`. If present it initializes legacy BEE against localhost:1110 and imports the service process. Otherwise it requires the built `@beyond-js/watchers/service/process`. The marker is a mode switch, not proof the absent-marker environment was actually built/published.

WatchersService does not await child initialization or register a ready/error handshake. `kill()` sends a kill signal and clears its local reference; it does not await child exit, unregister the IPC name, or gracefully drain listeners. No automatic child restart/replay is implemented. A modern BEE Node integration must deliberately replace or adapt the legacy child bootstrap; the service currently does not accept a loader/entrypoint option.

## Client and sharing model

```ts
import { WatcherClient } from '@beyond-js/watchers/client';

// The named service must already be registered and ready in the IPC topology.
const watcher = new WatcherClient(serviceName, {
    path: rootPath,
    is: 'application-sources',
    excludes: ['generated']
});
const listener = watcher.listeners.create(rootPath, { extname: ['.ts'] });
listener.on('change', file => invalidateSource(file));
await listener.listen();
```

`serviceName`, `rootPath` and the invalidation callback are application configuration. Register event callbacks before listen. `listen()` starts the shared watcher if needed, but neither that RPC nor listener registration waits for chokidar's ready event. Use a separate readiness contract when initial scan completion matters.

WatcherClient exposes service/spec/id/started, listeners, start and destroy. **It has no stop method.** `destroy()` releases one reference in the module-local [watchers cache](../modules/client/watchers/index.ts). Cache identity is only the exact path string, excluding service name and options; a second client on the same path reuses the first service/spec. Paths are not canonicalized. Repeated destroy has no guard and can decrement another client's reference. While multiple clients share a watcher, they also share its Listeners object.

The internal [Watcher](../modules/client/watchers/watcher.ts) manages start/stop promises and its service-issued UUID. Start requests `create`; subsequent start returns undefined if already started despite its UUID return annotation. Final cache release begins stop asynchronously. It destroys tracked listeners, requests delete, then clears the UUID if successful. There is no awaitable public release completion through WatcherClient.destroy.

## Listener API and filter semantics

`watcher.listeners.create(path, filter)` creates a Listener, whose public instance methods include EventEmitter on/off, listen, stop and destroy. ListenerType is the exported annotation; direct construction is internal. Filters use literal paths, not globs.

| Field | Service matching behavior |
| --- | --- |
| path | Only the exact path or descendants separated by the OS separator; trailing separator is removed once. |
| filename | Exact basename match at any depth under listener path. |
| extname | String or array normalized to array; exact extension membership including dot. |
| excludes | Relative literal file/directory paths joined beneath listener path; matching subtree is excluded. `*.md` has no wildcard meaning. |
| includes | Relative literal paths/subtrees. Omission accepts all otherwise matching paths; empty array accepts no descendants, but exact listener path still qualifies. |

Listener filters narrow emitted events; they do not start separate chokidar watchers. The root Watcher has its own exclusion layer: built-in `node_modules`, `builds`, `.builds`, `.beyond` plus spec.excludes are tested with string `endsWith`, not the listener's path-containment semantics.

`all` receives `(eventName, filePath)` before the specific `add`, `change` or `unlink` event receives filePath. Only those chokidar file events are connected; `addDir`/`unlinkDir` are not forwarded as directory events. Initial adds before chokidar ready are suppressed. Stats is accepted internally but omitted from the wire message. Events are asynchronous observations, not a lossless operation log.

## Service flow

The [service registry](../modules/service/process/watchers/index.ts) caches one chokidar Watcher per exact path and returns a fresh client UUID for each create RPC. It records path/spec, watcher-to-client-ID Set and ID-to-watcher mappings. The first spec determines root exclusions. Nested roots produce warnings rather than automatic ancestor reuse.

The [filesystem Watcher](../modules/service/process/watchers/watcher.ts) starts chokidar immediately, suppresses file events until ready, then passes each event to [Listeners](../modules/service/process/watchers/listeners/index.ts). [Listener](../modules/service/process/watchers/listeners/listener.ts) filters and emits `listener:<listener UUID>.change` through child IPC with `{file, event}`. Client Listener subscribes using the named service as event origin, then re-emits through EventEmitter.

| IPC action | Intended payload and current service handling |
| --- | --- |
| create | WatcherSpec → client UUID |
| delete | The service accepts the client identifier directly or wrapped as `{id}`, which is what the published client (1.0.7) sends. Earlier service source accepted only the bare identifier, so every final release failed with `Client "[object Object]" is not registered`. |
| listeners.create | `{watcher, path, filter}` → listener UUID |
| listeners.delete | `{watcher, id}` removes one service listener |

These actions are internal trusted-process contracts, not authenticated network APIs. Registration/name ownership and IPC lifecycle must be managed by the application.

## Lifecycle limitations requiring repair

- Client [Listeners](../modules/client/watchers/listeners/index.ts) stores by path, but delete accepts UUID and looks up that UUID. Creating multiple listeners at one path overwrites ownership tracking without stopping previous listeners; destroying either can remove the tracked newer one.
- Service Listener receives client UUID but never assigns its private client field. Consequently unregister-by-client does not remove those listeners as intended when a shared root retains other clients.
- Listener.stop creates a PendingPromise but never resolves it on success. A concurrent stop can wait forever. Preconditions and watcher.start failures occur outside protective settlement blocks and can strand pending state.
- Listener.destroy during listen can find no ID and return while the start later registers a listener. The callback has no destroyed-state rejection after awaited work. There is no full cancellation protocol.
- Internal Watcher.stop checks absence of ID before awaiting in-progress startup; releasing during start can return without stopping the eventual service watcher. Listener destruction and watcher delete are not awaited as one ordered cleanup.
- Service Watcher.destroy calls chokidar.close but does not return its promise. The registry's await therefore does not await actual closure. Specs map entries are retained after deletion.
- No chokidar error subscription propagates watch failure to the client. Create/listen completion is not filesystem-ready success. IPC disconnect or failed child startup can leave requests unresolved because the dependency dispatcher has no timeout.
- WatchersService.kill leaves the IPC registration behind. A repeated service name can fail duplicate registration, and pending callers are not explicitly rejected.

These are current source-level limitations, not recommended lifecycle patterns. Before promising safe shutdown, add explicit start/readiness/error/stop contracts and verify shared ownership under failure and cancellation.

## Consumers and verification

Finder consumes a WatcherClient rather than creating a service. It uses add/unlink to update file membership and change to notify DynamicFile/content consumers. Packages can supply one watcher for a package's processor inputs. Neither consuming package creates a complete event service simply by importing the client; the application must bootstrap the named IPC service.

[beyond.json](../beyond.json) selects the source package. node/node-ts distributions serve implementation modules on 1110/1111; no root scripts or test runner config are supplied. The [publish workflow](../.github/workflows/publish.yml) requests an npm distribution absent from this manifest, so release configuration must be reconciled. Static packaging must include fork.js and deliberately exclude the development marker.

The [test harness](../tests/test-watchers/index.js) changes files under its fixture, uses legacy BEE, waits a fixed delay for startup and does not retain/kill its service. Its event handlers log but never push to Recorders; positive assertions log failures without throwing and can print OK. Its `*.md` exclusion expectation conflicts with literal matching. These gaps must be repaired before treating the harness as a passing watcher proof.

Acceptance should cover service startup failure, explicit chokidar readiness, add/change/unlink, literal filters, two services on one path, multiple listeners per path, concurrent start/stop, destroy-during-start, exact final refcount release, child exit, event unsubscription and actual process/filesystem-handle shutdown. Event delivery alone does not establish HMR acceptance.
