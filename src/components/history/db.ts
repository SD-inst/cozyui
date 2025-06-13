import Dexie, { EntityTable, Table } from 'dexie';

export enum markEnum {
    NONE,
    PINNED,
}
export interface TaskResult {
    id: number;
    timestamp: number;
    duration: number;
    url: string;
    data?: Blob;
    node_id: string;
    type: string;
    params?: string;
    mark: markEnum;
    words?: string[];
}

export interface Settings {
    name: string;
    value: string;
}

export interface Tags {
    name: string;
    color: number;
    score: number;
    alias: string[];
    index: string[];
}

export interface FormState {
    tab: string;
    state: string;
}

export const db = new Dexie('task_results') as Dexie & {
    taskResults: EntityTable<TaskResult, 'id'>;
    settings: Table<Settings, string>;
    formState: Table<FormState, string>;
    tags: Table<Tags, string>
};

db.version(2)
    .stores({
        taskResults: '++id, timestamp, type, node_id, mark, *words',
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

db.version(3)
    .stores({ formState: '&tab' })
    .upgrade((tx) => {
        const subtx = tx.table('taskResults');
        subtx.each((t) => {
            t.mark = markEnum.NONE;
            subtx.put(t);
        });
    });

db.version(4).stores({tags: '&name, color, *index'})

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
