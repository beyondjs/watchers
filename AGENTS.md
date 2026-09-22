# watchers agent instructions

Canonical instructions for this independent repository and its descendants. Read the local README and relevant guides before changing code. This utility is authored with Beyond and must preserve its public package and module boundaries.

Keep the contracts the tests establish: `WatchersService.start()` resolves only when the child reported its handlers installed and rejects otherwise; a client's `start()` and a listener's `listen()` resolve when the service reports the root ready, which is after its initial scan; `all` and the event itself are independent announcements, so one subscriber that throws does not keep the others from being notified; a watcher releases **its listeners before itself** and every release settles its promise exactly once and observed; a client releases its own reference only, and releases are awaitable. The service subscribes to chokidar's `error` so an emitter error cannot end the process. [Validation](docs/validation.md) maps each contract to its test; run the tests after a change.

**A repair here reaches a consumer only through sources that are served.** Packages resolves this package from the public registry in an ordinary installation; its bootstrap can serve these sources instead, selected with `BEYOND_LOCAL_PACKAGES`, and its `@beyond-js/packages-bootstrap` carries a copy of them. Delivering a change to an installation that does not do that still needs a new published version.

- Preserve the selected branch, existing changes and public identifiers. Do not commit, push, reset, deploy or publish without explicit authorization.
- Use English for first-party documentation, comments and explanatory text. Preserve functional strings and generated/vendor content.
- Keep documentation autonomous: relative links stay inside this repository; external packages are described as contracts with optional references.
- Preserve the existing module/object programming structure. Internal files are not automatically public modules. Keep bare public imports intact.
- The published package exposes the client and the types only. The service process is obtained from this checkout during development through the `node-esm` distribution, as the README explains; preserve that distribution and the fork entry while the service remains unpublished.
- Distinguish source behavior, known defects, proposed changes and executed validation. Documentation work does not authorize implementation changes, dependency installations or service startup.
- Validate links, anchors and formatting for documentation edits. Run tests appropriate to actual code changes only.
- Follow the [coding standards](docs/coding-standards.md); they are binding for new and modified code. Source files target 300 lines or fewer and must not exceed 400. Model each responsibility as a class that owns `#private` state and exposes simply named members, composed from collaborating objects. Avoid compound names in methods, properties, variables and parameters by giving the responsibility its own object: `client.register()`, not `registerClient()`. Compound names remain allowed in class definitions. Preserve public contracts, and do not rewrite untouched files only to comply.

Documentation follows [the local documentation standards](docs/AGENTS.md).

The coordinated working branch is `feature/next`. Its base preserves the selected TypeScript implementation; do not switch back to historical source branches for ordinary work.
