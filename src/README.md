# @beyond-js/watchers

A powerful and flexible file watching utility for Node.js applications, designed to work seamlessly with BeyondJS
projects.

## Installation

```bash
npm install @beyond-js/watchers
```

## Usage

```javascript
const Watcher = require('@beyond-js/watchers');

const container = {
	path: '/path/to/watch'
	// other container properties
};

const watcher = new Watcher(container);

watcher.start().then(() => {
	console.log('Watcher started');

	const listener = watcher.listeners.create('/path/to/watch', {
		includes: ['*.js'],
		excludes: ['node_modules'],
		extname: ['.js', '.ts']
	});

	listener.on('change', file => {
		console.log(`File changed: ${file}`);
	});
});

// Later, when you're done watching
watcher.destroy();
```

## API

### Watcher

-   `constructor(container: object)`: Creates a new watcher instance
-   `start(): Promise<void>`: Starts the watcher
-   `destroy(): void`: Stops the watcher and cleans up resources

### Listener

-   `create(path: string, filter: object): Listener`: Creates a new listener
-   `on(event: string, callback: Function): void`: Attaches an event listener
-   `destroy(): void`: Removes the listener

## Features

-   Efficient file watching using chokidar
-   Support for multiple watchers and listeners
-   Configurable file filters (includes, excludes, extensions)
-   Event-based architecture
-   Integrated with BeyondJS IPC for cross-process communication

## Implementation Details

-   Uses chokidar for file watching
-   Implements a client-server architecture for distributed watching
-   Supports chained exceptions for better error handling
-   Utilizes Promises for asynchronous operations

## License

MIT © [[BeyondJS](https://beyondjs.com)]
