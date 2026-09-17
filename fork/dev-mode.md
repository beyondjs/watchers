# Development fork marker

The presence of this file beside fork.js selects legacy BEE loading from localhost:1110. Without the marker, fork.js requires the built `@beyond-js/watchers/service/process` module. Absence of the marker does not prove a build or publication exists.

The package static entry selects only `fork/fork.js`; adding the whole directory would also copy this marker and select the development bootstrap in a built package. See [startup and readiness](../docs/architecture.md#startup-and-readiness) for path, IPC and lifecycle prerequisites.
