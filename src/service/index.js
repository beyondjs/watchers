const { fork } = require('child_process');
const ipc = require('@beyond-js/ipc/main');

module.exports = class {
	#process;

	constructor(name) {
		this.#process = fork('fork.js', [], { cwd: __dirname });
		ipc.register(name, this.#process);
	}
};
