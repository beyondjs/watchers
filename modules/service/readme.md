# Watchers service

WatchersService forks the static fork/fork.js entrypoint and registers the child with the main IPC handler. The entrypoint path is currently resolved from process.cwd(), and fork mode depends on the adjacent development marker. There is no awaitable ready handshake.

Read the [complete behavior and lifecycle contract](../../docs/architecture.md#startup-and-readiness) before extending or integrating this module. Internal source files are not separate public module identities.
