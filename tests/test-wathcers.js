const fs = require('fs');
const fsp = fs.promises;
const { join } = require('path');

// Start the BEE runtime in local mode (DevServer)
// Adjust URL/port if needed for your local setup
const BEE = require('@beyond-js/bee');
BEE('http://localhost:1110', { inspect: 4000 });

// Directory used for watcher test files
const root = join(__dirname, 'files');

// Simple delay helper for sequential test steps
const wait = ms => new Promise(res => setTimeout(res, ms));

// Steps that will trigger file changes to be detected by watchers
const steps = [
	{
		name: 'add txt file',
		run: async () => {
			await fsp.writeFile(join(root, 'test-1.txt'), 'Hello TXT\n', 'utf8');
		}
	},
	{
		name: 'add js file',
		run: async () => {
			await fsp.writeFile(join(root, 'test-2.js'), 'console.log("Hello JS");\n', 'utf8');
		}
	},
	{
		name: 'add md file',
		run: async () => {
			await fsp.writeFile(join(root, 'notes.md'), '# Hello Markdown\n', 'utf8');
		}
	},
	{
		name: 'modify txt file',
		run: async () => {
			await fsp.appendFile(join(root, 'test-1.txt'), 'Appended TXT\n', 'utf8');
		}
	},
	{
		name: 'delete js file',
		run: async () => {
			await fsp.unlink(join(root, 'test-2.js'));
		}
	}
];

// Ensure the test directory exists and is empty of previous test files
async function setup() {
	await fsp.mkdir(root, { recursive: true });
	for (const f of ['test-1.txt', 'test-2.js', 'notes.md']) {
		try {
			await fsp.unlink(join(root, f));
		} catch (_) {}
	}
}

(async () => {
	await setup();

	// Start watchers service
	const { WatchersService } = await bimport('@beyond-js/watchers/service');
	new WatchersService('my-watchers', { sourcemaps: true });

	console.log('[test] Waiting for watchers service to initialize...');
	await wait(1000); // Allow service to initialize
	console.log('[test] Watchers service started.');

	// Create the watcher client for the test directory
	const { WatcherClient } = await bimport('@beyond-js/watchers/client');
	const client = new WatcherClient('my-watchers', { path: root });

	// Create listeners with different filters
	// IListenerFilter: { includes?: string[]; excludes?: string[]; extname?: string | string[]; filename?: string; }
	/** @type {Record<string, any>} */
	const listeners = {
		all: client.listeners.create(root, {}), // no filter, receives all events
		txt: client.listeners.create(root, { extname: '.txt' }), // only .txt files
		nomd: client.listeners.create(root, { excludes: ['*.md'] }), // exclude .md files
		notes: client.listeners.create(root, { filename: 'notes.md' }) // only the notes.md file
	};

	// Subscribe a listener to all supported watcher events
	const wire = (label, listener) => {
		['all', 'add', 'change', 'unlink'].forEach(eventName => {
			listener.on(eventName, payload => {
				console.log(`[${label}] ${eventName}:`, payload);
			});
		});
	};

	// Attach event subscriptions to each listener
	for (const [name, listener] of Object.entries(listeners)) {
		wire(name, listener);
	}

	// Start all listeners
	await Promise.all(Object.values(listeners).map(listener => listener.listen()));

	try {
		// Execute each test step with a small delay so events can be processed
		for (const step of steps) {
			console.log(`[test] step: ${step.name}`);
			await step.run();
			await wait(300);
		}
		console.log('[test] done.');
	} catch (err) {
		console.error('[test] error:', err?.stack || err);
	} finally {
		// Stop all listeners when tests are finished
		await Promise.allSettled(Object.values(listeners).map(listener => listener.stop()));
		console.log('[test] stopped.');
	}
})().catch(err => console.error('[bootstrap] error:', err?.stack || err));
