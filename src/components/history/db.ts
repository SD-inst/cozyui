import Dexie, { EntityTable, Table } from 'dexie';
import { settings } from '../../hooks/settings';

export enum markEnum {
    NONE,
    PINNED,
}
export interface TaskResult {
    id: number;
    timestamp: number;
    duration: number;
    url: string | string[];
    data?: Blob | Blob[];
    timings?: string; // JSON.stringify(NodeTiming[])
    node_id: string;
    type: string;
    params?: string;
    mark: markEnum;
    words?: string[];
    model?: string;
    tab?: string;
    arena?: string; // serialized ArenaState (for records of type 'elo')
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

// Local copy of a file that lives in ComfyUI's `input` folder. `id` is the
// server filename the bytes were first registered under — the canonical name —
// and `hash` is the content identity that outlives it: every later upload of
// the same bytes is an alias, not a second copy. `filename` duplicates the id
// as an indexed property (Dexie cannot index a primary key) and is absent on
// legacy records, which were keyed by form position
// (`<tab>/<field>[.<i>.<key>]`); those are migrated once at startup by
// `migrateUploadBackups`.
export interface Uploads {
    id: string;
    file: File;
    filename?: string;
    lastUsedAt?: number;
    size?: number;
    // SHA-256 of the bytes, hex. Absent on records written before content
    // identity existed; they get one the first time they are looked up.
    hash?: string;
    // Which control the bytes came from — diagnostics only, nothing reads it
    // back for a lookup.
    tab?: string;
    field?: string;
}

// One server filename this client has uploaded, mapped to the content it
// stands for. A re-upload mints a new name and leaves the bytes where they
// are, so a name that has long gone from the server — the one a history entry
// holds — still resolves to bytes that did not move. Rows are a few dozen
// bytes and are not subject to the byte budget; they go only when the copy
// they point at does.
export interface UploadAlias {
    name: string;
    hash: string;
}

export interface ChatLog {
    tab: string;
    id: string;
    messages: string; // serialized JSON
}

export interface Preset {
    id: string;
    name: string;
    tab: string;
    values: string; // serialized form values (subset of tab controls)
    timestamp: number;
}

export interface PresetFile {
    id: string; // `${presetId}/${filename}`
    preset: string;
    filename: string;
    file: File;
}

export interface Session {
    id: string;
    name: string;
    tab: string;
    values: string; // serialized form values (subset of tab controls)
    chat?: string; // serialized chat messages (db.chatLogs content), optional
    timestamp: number;
}

export interface SessionFile {
    id: string; // `${sessionId}/${filename}`
    session: string;
    filename: string;
    file: File;
}

export interface RefMod {
    id: string;
    name: string;
    kind: 'image' | 'video' | 'audio';
    conceptType: string;
    description: string;
    tokens: number;
    shape: [number, number, number];
    mode: 'encode' | 'training';
    createdAt: number;
    updatedAt: number;
    serverFilename?: string; // name of the file in the ComfyUI input folder
    // Thumbnail crop offsets (percent, 0..100, default 50). Applied to every
    // rendered thumbnail via CSS `object-position`. Horizontal: 0 = left,
    // 100 = right. Vertical: 0 = top, 100 = bottom.
    thumbX?: number;
    thumbY?: number;
}

export interface RefModFile {
    id: string; // `${modId}/${filename}`
    mod: string;
    filename: string;
    file: File;
    fileType: 'safetensors' | 'thumbnail' | 'source';
}

export const db = new Dexie('task_results') as Dexie & {
    taskResults: EntityTable<TaskResult, 'id'>;
    settings: Table<Settings, string>;
    formState: Table<FormState, string>;
    tags: Table<Tags, string>;
    uploads: Table<Uploads, string>;
    uploadAliases: Table<UploadAlias, string>;
    chatLogs: Table<ChatLog, string>;
    presets: Table<Preset, string>;
    presetFiles: Table<PresetFile, string>;
    sessions: Table<Session, string>;
    sessionFiles: Table<SessionFile, string>;
    refMods: Table<RefMod, string>;
    refModFiles: Table<RefModFile, string>;
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

db.version(4).stores({ tags: '&name, color, *index' });
db.version(5).stores({ uploads: '&id' });
db.version(6).upgrade((tx) =>
    tx.table('settings').put({ name: settings.chat_stream, value: 'true' }),
);
db.version(7).stores({ chatLogs: '&[tab+id]' });
db.version(8).stores({
    presets: 'id, tab, timestamp',
    presetFiles: 'id, preset',
});

db.version(9)
    .stores({
        taskResults: '++id, timestamp, type, node_id, mark, *words, model',
    })
    .upgrade((tx) => {
        const subtx = tx.table('taskResults');
        subtx.each((t) => {
            const indexed = indexModel(t);
            if (indexed) {
                subtx.put(indexed);
            }
        });
    });

db.version(10)
    .stores({
        taskResults: '++id, timestamp, type, node_id, mark, *words, model, tab',
    })
    .upgrade((tx) => {
        const subtx = tx.table('taskResults');
        subtx.each((t) => {
            const indexed = indexTab(t);
            if (indexed) {
                subtx.put(indexed);
            }
        });
    });

db.version(11).stores({
    refMods: 'id, name, kind, conceptType, createdAt',
    refModFiles: 'id, mod, filename',
});

db.version(12).stores({
    sessions: 'id, tab, timestamp',
    sessionFiles: 'id, session',
});

// `filename` makes a stored backup findable by the name the server knows it
// under; `lastUsedAt` orders the LRU eviction that keeps the store inside its
// byte budget.
db.version(13).stores({ uploads: '&id, filename, lastUsedAt' });

// Content identity. `hash` lets the store notice that the bytes of a fresh
// upload are already here, and `uploadAliases` maps every name this client
// ever uploaded to the content it stood for — so a name that has long left the
// server still resolves to bytes that never moved.
db.version(14).stores({
    uploads: '&id, filename, lastUsedAt, hash',
    uploadAliases: '&name, hash',
});

// `size` in the index so the startup sweep for copies that hold no bytes can
// run on a key cursor. Without it the sweep has to read every record — every
// stored video — before the controls appear.
db.version(15).stores({ uploads: '&id, filename, lastUsedAt, hash, size' });

const indexPrompt = (obj: TaskResult) => {
    if (!obj.params) {
        return;
    }
    const params = JSON.parse(obj.params);
    const prompt: string =
        typeof params.values?.prompt === 'string'
            ? params.values?.prompt
            : params.values?.prompt?.text;
    if (!prompt) {
        return;
    }
    const words = prompt
        .split(' ')
        .flatMap((w) => w.split('\n'))
        .filter((w) => !!w)
        .map((w) => w.replace(/[,.!?:;'"()-]/g, '').toLowerCase());
    const wordset = words.reduce(
        (prev, cur) => {
            prev[cur] = true;
            return prev;
        },
        {} as { [word: string]: boolean },
    );
    obj.words = Object.keys(wordset);
    return obj;
};

const indexModel = (obj: TaskResult) => {
    if (!obj.params) {
        return;
    }
    try {
        const params = JSON.parse(obj.params);
        const model = params.values?.model;
        obj.model = typeof model === 'string' ? model : '';
        return obj;
    } catch {
        return;
    }
};

const indexTab = (obj: TaskResult) => {
    if (!obj.params) {
        return;
    }
    try {
        const params = JSON.parse(obj.params);
        const tab = params.tab;
        obj.tab = typeof tab === 'string' ? tab : '';
        return obj;
    } catch {
        return;
    }
};

db.taskResults.hook('creating', (_pk, obj) => {
    indexPrompt(obj);
    indexModel(obj);
    indexTab(obj);
});
