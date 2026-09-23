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
| A file written again inside chokidar's 50 ms change window is announced again | `service` 7 | the second write, made as soon as the first change was heard, is heard as a second `change` (without the recheck it was never heard: the test timed out) |
| A listener destroyed while it starts is released in the service; nothing stays registered | `service` 8 | `listen()` rejects; `size` reports zero watchers, clients and listeners |
| A stopped service is refused by name, observably | `service` 9 | `start()` of a client rejects naming the target |

## Not established

- A chokidar error after readiness: it is recorded and printed by the service; no test provokes one.
- Windows: paths and process groups were exercised on macOS only.
- Nested roots: the warning is read from source.
- Directory events, which are not forwarded by design.
- Throughput under bursts.

## A second change within 50 ms

chokidar 4 reports a change of a path at most once per 50 ms and drops a change inside that window without reporting it when the window ends (its `_throttle('change', path, 50)`); it also drops a raw event of a file within 5 ms of the previous one. A file saved twice within the window (a formatter writing after an editor's save, or a correction written as soon as a failed build was reported) reached a listener once, and a consumer that read the file between the two writes kept the older content until an unrelated later edit. Reproduced on 2026-09-22 with chokidar alone, and on 2026-09-23 as the lost correction of the Packages development service.

The service examines every file it announced as added or changed again 75 ms after the announcement, once the window is over, and announces `change` when the stats differ from the ones chokidar reported ([architecture](architecture.md#listeners-and-filters)); `service` 7 establishes it. What remains:

- A write that changes neither the modification time, the change time, the size nor the inode is not seen by the recheck. On filesystems whose timestamps are coarse (one or two seconds), two writes of equal size within one tick are indistinguishable.
- A change chokidar drops without having announced anything before it has nothing to be rechecked against: its 5 ms raw-event throttle after an event it did not announce (an access-time change only). No run has shown it.
- Each announced file costs one `stat` 75 ms later, and a second write inside the window arrives up to about 75 ms after the first instead of never.
