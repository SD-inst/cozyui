import Dexie, { EntityTable } from 'dexie';

export interface TaskResult {
    id: number;
    timestamp: number;
    duration: number;
    url: string;
    data?: Blob;
    node_id: string;
    type: string;
    params?: string;
}

export interface Settings {
    name: string;
    value: string;
}

export const db = new Dexie('task_results') as Dexie & {
    taskResults: EntityTable<TaskResult, 'id'>;
    settings: EntityTable<Settings, 'name'>;
};

db.version(1).stores({
    taskResults: '++id, timestamp, type, node_id',
    settings: '&name',
});
