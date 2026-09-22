# Watchers service

`WatchersService` starts the service process with the loader of the current process, waits for it to report its handlers installed, registers it in the main IPC router and stops it on request. The service process module installs the handlers as an effect of being imported. The retained `fork/fork.js` is the legacy BEE entry and is not used here.

Read [the service contract](../../docs/architecture.md#the-service) before extending or integrating this module. Internal source files are not separate public module identities.
