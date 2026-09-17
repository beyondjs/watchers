# Service watchers and listeners

The service shares chokidar instances by exact root path and issues client UUIDs. Listener objects filter file events and publish listener-specific IPC messages. Root exclusions and listener path filters have different semantics; neither is a glob parser.

Read the [complete behavior and lifecycle contract](../../../../docs/architecture.md#service-flow) before extending or integrating this module. Internal source files are not separate public module identities.
