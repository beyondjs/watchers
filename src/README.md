# @beyond-js/watchers

A powerful and flexible utility for monitoring files in Node.js applications. Unlike using libraries like `chokidar`
directly, this tool operates with a client-server architecture, performing file monitoring in a separate process. This
design ensures that the file monitoring operation does not block your application's main thread.

## Installation

```bash
npm install @beyond-js/watchers
```

## Usage

The package is divided into a service and a client.

### 1\. The Service

The `watchers` service is started with `WatchersService`. This service runs in a separate process and can manage
multiple watchers, with each watcher dedicated to a specific folder.

```javascript
import { WatchersService } from '@beyond-js/watchers/service';

const service = new WatchersService('name-of-watchers-service');
```

---

### 2\. The Client: Creating and Managing Watchers

The client is the interface used to interact with the service. The `WatcherClient` is responsible for creating and
managing the connection to a folder being watched. When a `Watcher` is configured to listen to a folder, it recursively
monitors all files and subfolders within that path.

```javascript
import { WatcherClient } from '@beyond-js/watchers/client';

const spec = {
	path: '/path/to/watch',
	excludes: ['node_modules'],
	is: 'name-of-the-watcher'
};

const watcher = new WatcherClient('name-of-watchers-service', spec);
await watcher.start();
```

---

### 3\. Creating and Managing Listeners

After starting the watcher, you can create one or more `listeners` to filter and handle specific events from the
monitored folder. This decoupled design allows you to have multiple listeners for the same folder, each with its own
filtering rules, providing great flexibility. A `listener` configured with a `filename` will receive events for that
specific file, regardless of which subfolder it is in.

#### Example: Listening for all JS files

```javascript
const listener = watcher.listeners.create('/path/to/watch/src', {
	extname: ['.js']
});
await listener.listen();

listener.on('change', file => {
	console.log(`JS file changed: ${file}`);
});
```

#### Example: Listening for a specific file in any subfolder

```javascript
const listener = watcher.listeners.create('/path/to/watch', {
	filename: 'config.json'
});
await listener.listen();

listener.on('change', file => {
	console.log(`Config file changed: ${file}`);
});
```

#### Stopping the `Watcher` and `Listeners`

When `listeners` are no longer needed, they can be stopped individually.

```javascript
// Stop a single listener
await listener.stop();

// Once all listeners are stopped, you can stop the watcher.
await watcher.stop();

// Finally, close the service when all watchers are shut down.
service.kill();
```

---

## API

### WatchersService

-   `constructor(name: string)`: Creates a new instance of `WatchersService`.

### WatcherClient

-   `constructor(serviceName: string, spec: WatcherSpec)`: Creates a new instance of `WatcherClient`. `WatcherSpec` is
    an object that must contain a `path` property for the folder to be monitored and an `is` property to identify the
    watcher.
-   `start(): Promise<void>`: Starts the watcher asynchronously.
-   `stop(): Promise<void>`: Stops the watcher asynchronously.
-   `listeners`: A property that contains the methods for managing the watcher's listeners.

---

### Listener

-   `create(path: string, filter?: IListenerFilter): Listener`: Creates a new `Listener` instance for a specific
    watcher. It accepts a file or directory path and, optionally, a filter object (`IListenerFilter`).
-   `listen(): Promise<UUID>`: Registers the listener with the service process, enabling it to receive events.
-   `stop(): Promise<void>`: Stops the listener asynchronously.
-   `on(event: string, callback: Function): void`: Attaches an event handler. The available events are `'add'`,
    `'change'`, and `'unlink'`.

#### Filter Object (`IListenerFilter`)

The `Listener` can be configured with a filter object to control which events are relevant.

-   `includes?: string[]`: A list of patterns to include files or directories.
-   `excludes?: string[]`: A list of patterns to exclude files or directories.
-   `extname?: string[]`: A list of file extensions to include.
-   `filename?: string`: A specific file name to include.

---

### Listener Events

Once the listener has started, it will emit the following events via IPC:

-   `'add'`: Emitted when a new file or directory is added.
-   `'change'`: Emitted when an existing file is modified.
-   `'unlink'`: Emitted when a file or directory is deleted.

---

## Features

-   Efficient file watching using `chokidar`.
-   Support for multiple watchers and listeners.
-   Configurable file filters (`includes`, `excludes`, `extname`).
-   Event-based architecture.
-   Inter-process communication (IPC) for cross-process management.

---

## Implementation Details

-   Uses `chokidar` for file watching.
-   Implements a client-server architecture for distributed watching.
-   Supports chained exceptions for better error handling.
-   Utilizes `Promises` for asynchronous operations.

---

## License

MIT © [[BeyondJS](https://beyondjs.com)]
