// Recorder entity to store events
module.exports = {
	store: {},
	init(names) {
		for (const name of names) this.store[name] = [];
	},
	push(name, event) {
		this.store[name].push(event);
	},
	clear() {
		for (const k in this.store) this.store[k].length = 0;
	}
};
