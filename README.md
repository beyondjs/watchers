# @beyond-js/watchers

Monitor filesystem roots in a forked Node service and deliver filtered file events through Beyond IPC.

Read [architecture, APIs and lifecycle](docs/architecture.md) before integrating the package. The guide explains configuration, execution flow, source limitations and verification cases. Public Beyond modules are **service, service/process, client and types**; their module manifests and marked bundle exports define the API.

This checkout is authored with Beyond. [beyond.json](beyond.json) selects [package.json](package.json), whose module root is `modules`. Source module directories are not plain Node entrypoints; compiled public modules and their dependencies must be available to the consumer.

Start/register the service separately from creating clients. WatcherClient exposes `start()` and reference-releasing `destroy()`, not `stop()`. A listener has `listen()`, `stop()` and `destroy()`. Startup/shutdown have known protocol and promise gaps; [lifecycle requirements](docs/architecture.md#lifecycle-limitations-requiring-repair) must be addressed before relying on cleanup.

The build/test prerequisites and gaps are documented in the guide. No generic npm test/build command is supplied by the source manifest.

## Serving the service to another project (development)

The published package exposes only the client and types (`./service` and `./service/process` are empty exports), so a project that needs the watchers service process during development must obtain it from this checkout. The `node-esm` distribution (port 1120, ESM bundles, development tools disabled) serves the compiled modules through the Beyond Engine so that a modern BEE Node process can import `@beyond-js/watchers/service/process`:

```sh
cd /absolute/path/to/watchers
npm install --no-audit --no-fund     # Engine validates the dependencies of the served modules
node /absolute/path/to/engine/index.js
```

The Packages `@beyond-js/packages/watchers` module spawns the child process with the loader's `execArgv` and `BEE_URL=http://localhost:1120`, awaits its readiness through the IPC channel and registers it as the named service. This is a development arrangement; the service is still not published.

MIT; see [LICENSE](LICENSE).
