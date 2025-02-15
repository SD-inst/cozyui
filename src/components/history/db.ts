import Dexie, { EntityTable, Table } from 'dexie';

export interface TaskResult {
    id: number;
    timestamp: number;
    duration: number;
    url: string;
    data?: Blob;
    node_id: string;
    type: string;
    params?: string;
    words?: string[];
}

export interface Settings {
    name: string;
    value: string;
}

export interface Tags {
    name: string;
    color: string;
    weight: number;
    age: number;
}

export const db = new Dexie('task_results') as Dexie & {
    taskResults: EntityTable<TaskResult, 'id'>;
    settings: Table<Settings>;
};

db.version(2)
    .stores({
        taskResults: '++id, timestamp, type, node_id, *words',
        settings: '&name',
    })
    .upgrade((tx) => {
        const subtx = tx.table('taskResults');
        subtx.each((t) => {
            const indexed = indexPrompt(t);
            if (indexed) {
                subtx.put(indexed);
            }
        });
    });

const indexPrompt = (obj: TaskResult) => {
    if (!obj.params) {
        return;
    }
    const params = JSON.parse(obj.params);
    const prompt: string = params.values?.prompt;
    if (!prompt) {
        return;
    }
    const words = prompt
        .split(' ')
        .flatMap((w) => w.split('\n'))
        .filter((w) => !!w)
        .map((w) => w.replace(/[,.!?:;'"()-]/g, '').toLowerCase());
    const wordset = words.reduce((prev, cur) => {
        prev[cur] = true;
        return prev;
    }, {} as { [word: string]: boolean });
    obj.words = Object.keys(wordset);
    return obj;
};

db.taskResults.hook('creating', (_pk, obj) => {
    indexPrompt(obj);
});
