# Validation

The contracts of Watchers and the tests that establish them, all executed with the real service process started by `WatchersService` under the loader of the test process. Inside the Beyond Suite, `node utils/validation/run.mjs watchers` prepares the servers; [the tests guide](../tests/README.md) states the prerequisites.

| Contract or risk | Test | Observed |
| --- | --- | --- |
| Readiness of the service; a second start refused; a broken specifier fails the start and keeps no child | `service` 1 | `started`, `pid`; `already started`; rejection naming the failure; `pid` undefined |
| A write right after `listen()` is observed: readiness means the scan completed | `service` 2 | `add`, `change`, `unlink` in order; `all` carries the event and the file |
| Literal filters: extname, filename, includes, excludes | `service` 3 | each listener hears exactly the documented subset of four files |
| `all` and the specific event are independent; a throwing subscriber of `all` does not silence `add` | `service` 4 | order `all:add`, `add` |
| Two listeners on one path; release by identifier; a released listener hears nothing and cannot listen again | `service` 5 | distinct identifiers; `size` 2 then 1; refusal after release |
| Clients share a watcher; a destroyed client releases its reference only; twice is once | `service` 6 | equal `id`; the surviving client's listener still hears; `start()` after destroy refused |
| A listener destroyed while it starts is released in the service; nothing stays registered | `service` 7 | `listen()` rejects; `size` reports zero watchers, clients and listeners |
| A stopped service is refused by name, observably | `service` 8 | `start()` of a client rejects naming the target |

## Not established

- A chokidar error after readiness: it is recorded and printed by the service; no test provokes one.
- Windows: paths and process groups were exercised on macOS only.
- Nested roots: the warning is read from source.
- Directory events, which are not forwarded by design.
- Throughput under bursts.

## Known limit: a second change within 50 ms is lost

chokidar 4 reports a change of a path at most once per 50 ms and drops a change inside that window without reporting it when the window ends (its `_throttle('change', path, 50)`). The service forwards what chokidar reports, so a file saved twice within 50 ms (a formatter writing after an editor's save, for instance) reaches a listener once, and a consumer that read the file between the two writes keeps the older content until the next change. Reproduced on 2026-09-22 with chokidar alone: a write made inside the handler of a change produced no second event. Whether the service should check a path again when the window ends is a policy decision for the owner, not a repair made by assumption; File's live test waits the period out.
