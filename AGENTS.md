# watchers agent instructions

Canonical instructions for this independent repository and its descendants. Read the local README and relevant guides before changing code. This utility is authored with Beyond and must preserve its public package and module boundaries.

On 2026-09-22 the client's listener began announcing `all` and the event itself independently. One subscriber that throws must not keep the others from being notified: it used to leave the specific event unemitted, so a watched file silently stopped being followed.

Later the same day the release of a watcher was repaired, which is what killed the development service of a project during an ordinary session. Keep the two rules it rests on: a watcher releases **its listeners before itself**, because a listener names a watcher the service forgets when the watcher is deleted, and every `PendingPromise` a release holds is settled exactly once and observed, because a rejected promise nobody holds ends the process of the client with the failure of something it was already discarding. `Listeners.destroy()` and `Listener.destroy()` answer when the release has been attempted, and callers await them.

**A repair here reaches a consumer only through sources that are served.** Packages resolves this package from the public registry in an ordinary installation; its bootstrap can serve these sources instead, selected with `BEYOND_LOCAL_PACKAGES`, and its `@beyond-js/packages-bootstrap` carries a copy of them. Delivering a change to an installation that does not do that still needs a new published version.

The Beyond Suite record `docs/reviews/2026-09-22/packages-closure-evidence.md` holds the evidence for that date; it is an optional external reference, not a link from here.
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
