const fs = require('fs');
const fsp = fs.promises;
const { join } = require('path');

// Directory used for watcher test files
const root = (exports.root = join(__dirname, 'files'));

// Ensure the test directory exists and is empty of previous test files
exports.setup = async function () {
	await fsp.mkdir(root, { recursive: true });
	for (const f of ['test-1.txt', 'test-2.js', 'notes.md']) {
		try {
			await fsp.unlink(join(root, f));
		} catch (_) {}
	}
};

// Steps that will trigger file changes to be detected by watchers
exports.steps = [
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

// Expected events per step and listener
exports.expectations = {
	'add txt file': {
		all: [{ type: 'add', file: 'test-1.txt' }],
		txt: [{ type: 'add', file: 'test-1.txt' }],
		nomd: [{ type: 'add', file: 'test-1.txt' }],
		notes: [
			/* no debe recibir nada */
		]
	},
	'add js file': {
		all: [{ type: 'add', file: 'test-2.js' }],
		txt: [
			/* vacío */
		],
		nomd: [{ type: 'add', file: 'test-2.js' }],
		notes: [
			/* vacío */
		]
	},
	'add md file': {
		all: [{ type: 'add', file: 'notes.md' }],
		txt: [
			/* vacío */
		],
		nomd: [
			/* excluye *.md, así que no debe recibir */
		],
		notes: [{ type: 'add', file: 'notes.md' }]
	},
	'modify txt file': {
		all: [{ type: 'change', file: 'test-1.txt' }],
		txt: [{ type: 'change', file: 'test-1.txt' }],
		nomd: [{ type: 'change', file: 'test-1.txt' }],
		notes: [
			/* vacío */
		]
	},
	'delete js file': {
		all: [{ type: 'unlink', file: 'test-2.js' }],
		txt: [
			/* vacío */
		],
		nomd: [{ type: 'unlink', file: 'test-2.js' }],
		notes: [
			/* vacío */
		]
	}
};
