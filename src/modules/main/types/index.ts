import { UUID } from 'crypto';

export /*bundle*/ interface WatcherSpec {
	path: string;
	excludes?: string[];
}

export /*bundle*/ interface IListenerFilter {
	includes?: string[];
	excludes?: string[];
	extname?: string[];
	filename?: string;
}

export /*bundle*/ interface IListenerCreate {
	watcher: UUID;
	path: string;
	filter?: IListenerFilter;
}

export /*bundle*/ interface IListenerDelete {
	watcher: UUID;
	id: UUID;
}
