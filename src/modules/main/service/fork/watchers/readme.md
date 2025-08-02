# Watchers and Listeners

The `Watcher` is the main observer of a directory, while the `Listeners` are specialized subscribers that filter and act
on the events published by that `Watcher`. This model allows for efficient, single-instance monitoring of a directory
while providing the flexibility for a variety of granular, client-specific event handlers.

## Watcher

Each `Watcher` instance is exclusively linked to a single directory path. Its core function is to initiate and manage
the file system monitoring process for that entire directory using the `chokidar` library.

-   **Resource Optimization**: A key design principle is resource efficiency. If multiple clients request to monitor the
    same folder, a new `chokidar` instance is not created for each one. Instead, a single `Watcher` instance is reused,
    and all clients are associated with it. This approach significantly reduces system overhead.
-   **Event Publishing**: When a change is detected by `chokidar`, the `Watcher` acts as a publisher, broadcasting the
    event to all of its registered `Listeners` without performing any filtering.

## Listener

`Listeners` serve as event filters and processors for a specific `Watcher` instance. A developer can create multiple
`Listeners` for a single `Watcher`.

-   **Granular Filtering**: Each `Listener` can be configured with its own unique filtering rules, such as `includes`,
    `excludes`, and `extname`. These rules allow for fine-grained control over which file changes are considered
    relevant.
-   **Event Handling**: When a `Watcher` broadcasts an event, the `Listener` receives it, processes it against its
    configured filtering rules, and only if the file matches those rules does it emit a change event to the client's
    callback function.
