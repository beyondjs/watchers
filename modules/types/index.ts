import { UUID } from 'crypto';

/**
 * A change of the filesystem a listener reports
 */
export /*bundle*/ type ListenerEventType = 'add' | 'change' | 'unlink';

/**
 * A change of one file as a listener receives it
 */
export /*bundle*/ interface ListenerChangeEventType {
	file: string;
	event: ListenerEventType;
}

/**
 * A watched root: its path, what it is watched for (`is`, a label for diagnostics) and the paths excluded
 */
export /*bundle*/ interface WatcherSpec {
	path: string;
	is: string;
	excludes?: string[];
}

/**
 * The literal filter of a listener: includes and excludes relative to its path, extensions and a filename
 */
export /*bundle*/ interface IListenerFilter {
	includes?: string[];
	excludes?: string[];
	extname?: string | string[];
	filename?: string;
}

/**
 * The request that creates a listener under a watcher
 */
export /*bundle*/ interface IListenerCreate {
	watcher: UUID;
	path: string;
	filter?: IListenerFilter;
}

/**
 * The request that releases a listener of a watcher
 */
export /*bundle*/ interface IListenerDelete {
	watcher: UUID;
	id: UUID;
}
