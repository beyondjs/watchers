export default class ChainedException extends Error {
	constructor(exc: Error, chained: Error) {
		super();

		const message = `Chained exception: ${exc.message} | ${chained.message}`;
		this.message = message;
		this.stack = `${message}\n${chained.stack}\n${exc.stack}`;
	}
}
