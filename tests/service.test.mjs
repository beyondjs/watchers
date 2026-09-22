/**
 * The watchers service and its client, exercised with the real service process: readiness, filters, event
 * order and isolation, shared watchers, listener release, and what a stopped service looks like to a client.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ipc } from '@beyond-js/ipc/main';
import { WatchersService } from '@beyond-js/watchers/service';
import { WatcherClient } from '@beyond-js/watchers/client';

const NAME = 'watchers-test';
const service = new WatchersService(NAME);

/**
 * Resolves once the observed state holds, or fails naming what did not happen: a bounded wait over state
 * the objects expose, checked every few milliseconds, never a wait for time
 */
async function until(condition, what, ms = 8000) {
	const deadline = Date.now() + ms;
	while (!condition()) {
		if (Date.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
		await new Promise(resolve => setTimeout(resolve, 10));
	}
}

/** A temporary directory of one test, removed when the test ends, on failure as well */
async function temporary(t) {
	const dir = await realpath(await mkdtemp(join(tmpdir(), 'beyond-watchers-')));
	t.after(() => rm(dir, { recursive: true, force: true }));
	return dir;
}

/** Records every event a listener announces, by event name */
function record(listener) {
	const heard = { all: [], add: [], change: [], unlink: [] };
	listener.on('all', (event, file) => heard.all.push(`${event} ${file}`));
	for (const event of ['add', 'change', 'unlink']) listener.on(event, file => heard[event].push(file));
	return heard;
}

before(async () => {
	await service.start();
});

after(async () => {
	await service.stop();
});

test('the service reports readiness, refuses a second start, and a broken specifier fails its start', async () => {
	assert.equal(service.started, true);
	assert.equal(typeof service.pid, 'number');
	await assert.rejects(service.start(), /already started/);

	const broken = new WatchersService('watchers-broken', { specifier: '@beyond-js/watchers/does-not-exist', timeout: 20000 });
	await assert.rejects(broken.start(), /failed to start|does-not-exist/);
	assert.equal(broken.started, false);
	assert.equal(broken.pid, undefined, 'a child that failed to start is not kept');
});

test('a change made right after listen() resolves is observed: readiness means the scan is complete', async t => {
	const path = await temporary(t);
	const client = new WatcherClient(NAME, { is: 'test', path });
	const listener = client.listeners.create(path, {});
	const heard = record(listener);

	await listener.listen();
	assert.equal(client.started, true);
	assert.equal(typeof listener.id, 'string', 'the listener has the identifier the service gave it');

	await writeFile(join(path, 'immediate.txt'), 'one\n');
	await until(() => heard.add.length, 'the add of a file written right after listening');
	assert.equal(heard.add[0], join(path, 'immediate.txt'));

	await writeFile(join(path, 'immediate.txt'), 'two\n');
	await until(() => heard.change.length, 'the change');
	await rm(join(path, 'immediate.txt'));
	await until(() => heard.unlink.length, 'the unlink');

	assert.equal(heard.all[0], `add ${join(path, 'immediate.txt')}`, '"all" carries the event name and the file');
	await listener.destroy();
	await client.destroy();
});

test('filters are literal: extname, filename, includes and excludes narrow what each listener hears', async t => {
	const path = await temporary(t);
	await mkdir(join(path, 'sub'));
	const client = new WatcherClient(NAME, { is: 'test', path });
	const listeners = {
		all: client.listeners.create(path, {}),
		txt: client.listeners.create(path, { extname: '.txt' }),
		notes: client.listeners.create(path, { filename: 'notes.md' }),
		inside: client.listeners.create(path, { includes: ['sub'] }),
		outside: client.listeners.create(path, { excludes: ['sub'] })
	};
	const heard = Object.fromEntries(Object.entries(listeners).map(([name, listener]) => [name, record(listener)]));
	await Promise.all(Object.values(listeners).map(listener => listener.listen()));

	const files = ['a.txt', 'notes.md', 'sub/b.txt', 'c.js'].map(file => join(path, file));
	for (const file of files) await writeFile(file, 'x\n');
	await until(() => heard.all.add.length === 4, 'the four additions');
	// Every listener of this client receives the events of the service over one channel, in the order the
	// service handled them: once the unfiltered listener has heard the four, the filtered ones were answered

	const names = list => list.map(file => file.slice(path.length + 1)).sort();
	assert.deepEqual(names(heard.all.add), ['a.txt', 'c.js', 'notes.md', 'sub/b.txt']);
	assert.deepEqual(names(heard.txt.add), ['a.txt', 'sub/b.txt']);
	assert.deepEqual(names(heard.notes.add), ['notes.md']);
	assert.deepEqual(names(heard.inside.add), ['sub/b.txt']);
	assert.deepEqual(names(heard.outside.add), ['a.txt', 'c.js', 'notes.md']);

	await Promise.all(Object.values(listeners).map(listener => listener.destroy()));
	await client.destroy();
});

test('"all" and the event are independent announcements: a subscriber of "all" that throws does not silence "add"', async t => {
	const path = await temporary(t);
	const client = new WatcherClient(NAME, { is: 'test', path });
	const listener = client.listeners.create(path, {});
	const order = [];
	listener.on('all', event => {
		order.push(`all:${event}`);
		throw new Error('a subscriber of "all" that throws');
	});
	listener.on('add', () => order.push('add'));
	await listener.listen();

	await writeFile(join(path, 'one.txt'), 'x\n');
	await until(() => order.includes('add'), 'the specific event after "all" threw');
	assert.deepEqual(order, ['all:add', 'add'], '"all" is announced first, and the throw did not stop "add"');
	await listener.destroy();
	await client.destroy();
});

test('two listeners on one path both hear; releasing one by its identifier stops it alone', async t => {
	const path = await temporary(t);
	const client = new WatcherClient(NAME, { is: 'test', path });
	const first = client.listeners.create(path, {});
	const second = client.listeners.create(path, {});
	const heard = { first: record(first), second: record(second) };
	await Promise.all([first.listen(), second.listen()]);
	assert.notEqual(first.id, second.id);
	assert.equal(client.listeners.size, 2);

	await writeFile(join(path, 'one.txt'), 'x\n');
	await until(() => heard.first.add.length && heard.second.add.length, 'both listeners');

	await client.listeners.delete(first.id);
	assert.equal(first.destroyed, true);
	assert.equal(client.listeners.size, 1);
	await assert.rejects(client.listeners.delete(first.id), /not registered/);

	await writeFile(join(path, 'two.txt'), 'x\n');
	await until(() => heard.second.add.length === 2, 'the remaining listener');
	// Both listeners receive over one channel: an event for the released one would have arrived first
	assert.equal(heard.first.add.length, 1, 'the released listener heard nothing more');
	await assert.rejects(first.listen(), /destroyed/, 'a released listener cannot listen again');

	await second.destroy();
	await client.destroy();
});

test('clients on one path share a watcher, a destroyed client releases its reference only, and twice is once', async t => {
	const path = await temporary(t);
	const one = new WatcherClient(NAME, { is: 'test', path });
	const two = new WatcherClient(NAME, { is: 'test', path });
	await Promise.all([one.start(), two.start()]);
	assert.equal(one.id, two.id, 'the clients share the watcher of the path');

	const listener = two.listeners.create(path, {});
	const heard = record(listener);
	await listener.listen();

	await one.destroy();
	await one.destroy(); // ignored: it must not release the reference of the other client
	assert.equal(one.destroyed, true);
	await assert.rejects(one.start(), /destroyed/);

	await writeFile(join(path, 'still.txt'), 'x\n');
	await until(() => heard.add.length, 'the listener of the surviving client');

	await listener.destroy();
	await two.destroy();
	assert.equal(two.destroyed, true);
});

test('a listener destroyed while it starts is released in the service, and nothing stays registered', async t => {
	const path = await temporary(t);
	const client = new WatcherClient(NAME, { is: 'test', path });
	const listener = client.listeners.create(path, {});
	const listening = listener.listen();
	const destroying = listener.destroy();
	await assert.rejects(listening, /destroyed/);
	await destroying;
	assert.equal(listener.id, undefined);
	await client.destroy();

	// Every release above was awaited, so the service has already answered each of them
	const size = await ipc.exec(NAME, 'size');
	assert.deepEqual(size, { watchers: 0, clients: 0, listeners: 0 }, 'everything created by these tests was released');
});

test('a service that stopped is refused by name: a client cannot listen, and the failure is observable', async t => {
	const stopped = new WatchersService('watchers-stopped');
	await stopped.start();
	const path = await temporary(t);
	const client = new WatcherClient('watchers-stopped', { is: 'test', path });
	await client.start();
	await stopped.stop();
	assert.equal(stopped.started, false);

	const other = new WatcherClient('watchers-stopped', { is: 'test', path: await temporary(t) });
	await assert.rejects(other.start(), /not found|Error starting watcher/);
	await client.destroy();
	await other.destroy();
});
