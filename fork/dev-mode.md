# Development fork marker

The presence of this file beside `fork.js` selects legacy BEE loading from localhost:1110 in that retained entry. `WatchersService` no longer forks that file: it starts the service by importing `@beyond-js/watchers/service/process` under the loader of the parent, with a readiness report. The entry and this marker are kept for the legacy bootstrap only.

The package static entry selects only `fork/fork.js`; adding the whole directory would also copy this marker.
