import { UUID } from 'crypto';

export /*bundle*/ type ListenerEventType = 'add' | 'change' | 'unlink';

export /*bundle*/ interface ListenerChangeEventType {
	file: string;
	event: ListenerEventType;
}

export /*bundle*/ interface WatcherSpec {
	path: string;
	is: string;
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
