const fs = require('fs');
const { join } = require('path');

const PORT = 1110;

async function local() {
	const BEE = require('@beyond-js/bee');
	BEE(`http://localhost:${PORT}`, {});

	// It is only necessary to import the service
	await bimport('@beyond-js/watchers/service/process');
}

(async () => {
	const devmode = fs.existsSync(join(__dirname, 'dev-mode.md'));
	devmode && console.log('Running watchers service in dev mode at port', PORT);

	if (devmode) {
		await local();
	} else {
		// It is only necessary to import the service
		require('@beyond-js/watchers/service/process');
	}
})();
