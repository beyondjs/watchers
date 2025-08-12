const Recorders = require('./recorders'); // Import the recorder utility
const { expectations } = require('./steps'); // Import the expectations utility
require('colors'); // For colored console output

// Simple delay helper for sequential test steps
const wait = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
	async step(name, timeout = 1200) {
		const want = expectations[name] || {};
		const start = Date.now();

		// Wait until all expected events are present or timeout
		while (Date.now() - start < timeout) {
			let allGood = true;
			for (const [label, expected] of Object.entries(want)) {
				allGood &&= expected.every(e =>
					Recorders.store[label].some(r => r.type === e.type && r.file === e.file)
				);
			}
			if (allGood) break;
			await wait(50);
		}

		// Positive checks
		for (const [label, expected] of Object.entries(want)) {
			for (const e of expected) {
				const ok = Recorders.store[label].some(r => r.type === e.type && r.file === e.file);
				if (!ok) {
					console.error(
						`[assert] step "${name}" -> listener "${label}" `.red.bold +
							`expected ${e.type} for ${e.file} but did not receive it.\n` +
							`Got: ${JSON.stringify(Recorders.store[label], null, 2)}`
					);
				}
			}
		}

		// Negative checks
		for (const label of Object.keys(Recorders.store)) {
			if (!(label in want) || !want[label].length) {
				if (Recorders.store[label].length) {
					throw new Error(
						`[assert] step "${name}" -> listener "${label}" ` +
							`should not receive events but got: ${JSON.stringify(Recorders.store[label], null, 2)}`
					);
				}
			}
		}

		console.log(`[assert] OK: "${name}"`.green);
	}
};
