import { genId } from '../id';

export type Domain = 'history' | 'presets' | 'sessions' | 'refmods';

// A de-serialized table row: which table it belongs to, its primary key, and
// its value. While collecting, blob fields in `value` are live Blob/File
// objects; after hoisting they are `{ $file: uuid }` tokens.
export interface RawRecord {
    table: string;
    key: string | number;
    value: any;
}

// A binary payload hoisted into the archive's `files/` folder (one per blob).
export interface SerializedFile {
    id: string; // uuid
    filename: string; // original filename (rebuilds File.name on import)
    type: string; // mime type
    size: number;
    bytes: Uint8Array;
}

// The single JSON control file inside the archive.
export interface Manifest {
    format: 'cozyui-export';
    version: number;
    created: number;
    domain: Domain;
    count: number; // number of top-level records exported
    records: Array<{ table: string; key: string | number; value: any }>;
    files: Array<{ id: string; filename: string; type: string; size: number }>;
}

export const EXPORT_FORMAT = 'cozyui-export';
export const EXPORT_VERSION = 1;

// Build a safe, informative archive filename. Uses the asset's own name when
// one is available (so you can tell what's inside), otherwise a fallback
// (e.g. the domain). Strips characters that are invalid in filenames and
// collapses whitespace so the result is a clean single token.
export const archiveFilename = (assetName?: string, fallback = 'archive'): string => {
    const clean = (assetName ?? '')
        .replace(/[\\/:*?"<>|]/g, ' ') // filename-invalid chars → space
        .replace(/\s+/g, '-') // whitespace runs → single dash
        .replace(/^-+|-+$/g, '') // no leading/trailing dashes
        .trim();
    return `${clean || fallback}.zip`;
};

// Which field(s) on each table hold binary payloads that must be hoisted.
export const BLOB_FIELDS: Record<string, string[]> = {
    taskResults: ['data'], // Blob | Blob[]
    presetFiles: ['file'], // File
    sessionFiles: ['file'], // File
    refModFiles: ['file'], // File
};

// The label to attach to a hoisted blob, per table. Used to rebuild
// File.name on import (history has no per-blob filename; use its server url).
const filenameFor = (table: string, record: any, index: number): string => {
    if (table === 'taskResults') {
        const urls = record.url;
        if (typeof urls === 'string') {
            return urls;
        }
        if (Array.isArray(urls)) {
            return urls[index] ?? '';
        }
        return '';
    }
    return typeof record.filename === 'string' ? record.filename : '';
};

const isFileToken = (v: any): v is { $file: string } =>
    typeof v === 'object' && v !== null && typeof v['$file'] === 'string';

const isBlobish = (v: any): v is Blob =>
    typeof Blob !== 'undefined' && v instanceof Blob;

// Replace every blob-bearing field with a `{ $file: uuid }` token, collecting
// the raw bytes into `files` (keyed by uuid). Reads blob bytes, so it is async.
export const hoistBlobs = async (
    records: RawRecord[],
    onCheckpoint?: (done: number, total: number) => void,
): Promise<{ records: RawRecord[]; files: Map<string, SerializedFile> }> => {
    const files = new Map<string, SerializedFile>();
    const out: RawRecord[] = [];
    for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        out.push({ ...rec, value: await hoistValue(rec.table, rec.value, files) });
        onCheckpoint?.(i + 1, records.length);
    }
    return { records: out, files };
};

const hoistBlob = async (
    blob: Blob,
    filename: string,
    files: Map<string, SerializedFile>,
): Promise<{ $file: string }> => {
    const id = genId();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    files.set(id, { id, filename, type: blob.type, size: bytes.length, bytes });
    return { $file: id };
};

const hoistValue = async (
    table: string,
    value: any,
    files: Map<string, SerializedFile>,
): Promise<any> => {
    const fields = BLOB_FIELDS[table];
    if (!fields || typeof value !== 'object' || value === null) {
        return value;
    }
    const result = { ...value };
    for (const f of fields) {
        const v = result[f];
        if (v === undefined || v === null) {
            continue;
        }
        if (Array.isArray(v)) {
            const next: any[] = [];
            for (let i = 0; i < v.length; i++) {
                if (isBlobish(v[i])) {
                    next.push(await hoistBlob(v[i], filenameFor(table, value, i), files));
                } else {
                    next.push(v[i]);
                }
            }
            result[f] = next;
        } else if (isBlobish(v)) {
            result[f] = await hoistBlob(v, filenameFor(table, value, 0), files);
        }
    }
    return result;
};

// The inverse of `hoistBlobs`: turn `{ $file: uuid }` tokens back into File
// objects, reading bytes from `files`.
export const unhoistBlobs = (
    records: RawRecord[],
    files: Map<string, { bytes: Uint8Array; filename: string; type: string }>,
): RawRecord[] => {
    return records.map((rec) => ({
        ...rec,
        value: unhoistValue(rec.table, rec.value, files),
    }));
};

const unhoistValue = (
    table: string,
    value: any,
    files: Map<string, { bytes: Uint8Array; filename: string; type: string }>,
): any => {
    const fields = BLOB_FIELDS[table];
    if (!fields || typeof value !== 'object' || value === null) {
        return value;
    }
    const result = { ...value };
    const makeFile = (token: { $file: string }): File => {
        const entry = files.get(token.$file);
        if (!entry) {
            throw new Error(`Missing file entry: ${token.$file}`);
        }
        return new File([entry.bytes], entry.filename, { type: entry.type });
    };
    for (const f of fields) {
        const v = result[f];
        if (v === undefined || v === null) {
            continue;
        }
        if (Array.isArray(v)) {
            result[f] = v.map((item) => (isFileToken(item) ? makeFile(item) : item));
        } else if (isFileToken(v)) {
            result[f] = makeFile(v);
        }
    }
    return result;
};
