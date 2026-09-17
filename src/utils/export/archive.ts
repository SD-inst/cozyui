import { Manifest, SerializedFile } from './format';

// Per-entry compression policy. A ZIP stores the compression method in each
// entry's local header, so we pick it per file via the fflate `Zip` class:
// `ZipPassThrough` (stored) vs `ZipDeflate`/`AsyncZipDeflate` (deflate).
type Level = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Policy = { deflate?: boolean; level?: Level };

// Already-compressed media: deflate gives ~0 benefit and costs CPU/memory.
const MEDIA_EXTS = new Set([
    'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif',
    'mp4', 'webm', 'mov', 'mkv', 'avi', 'gif',
    'mp3', 'aif', 'aifc', 'aiff', 'aac', 'ogg', 'wav', 'm4a', 'flac',
]);

const policyFor = (name: string): Policy => {
    if (name === 'export.json') {
        return { deflate: true, level: 6 };
    }
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    // safetensors: default stored. Flip to { deflate: true, level } here if the
    // measurement (see tests) shows a typical refmod compresses usefully.
    if (ext === 'safetensors') {
        return { deflate: false };
    }
    if (MEDIA_EXTS.has(ext)) {
        return { deflate: false };
    }
    // Unknown type: stored (fail-safe — never inflates, never costs CPU).
    return { deflate: false };
};

// Builds the archive Blob: `export.json` (deflate) + `files/<uuid>` (per-entry
// policy). Streams chunks out of the `Zip` instance and concatenates them.
export const buildArchive = async (
    manifest: Manifest,
    files: Map<string, SerializedFile>,
    onProgress?: (done: number, total: number) => void,
): Promise<Blob> => {
    const fflate = await import('fflate');
    const { Zip, ZipPassThrough, ZipDeflate, AsyncZipDeflate, strToU8 } = fflate;

    const zip = new Zip();
    const chunks: Uint8Array[] = [];
    const done = new Promise<Blob>((resolve, reject) => {
        zip.ondata = (err, chunk, final) => {
            if (err) {
                reject(err);
                return;
            }
            chunks.push(chunk);
            if (final) {
                const total = chunks.reduce((s, c) => s + c.length, 0);
                const out = new Uint8Array(total);
                let off = 0;
                for (const c of chunks) {
                    out.set(c, off);
                    off += c.length;
                }
                resolve(new Blob([out], { type: 'application/zip' }));
            }
        };
    });

    const entries = [...files.values()];
    const total = entries.length + 1;
    let i = 0;

    const jsonStream = new ZipDeflate('export.json');
    zip.add(jsonStream);
    jsonStream.push(strToU8(JSON.stringify(manifest)), true);
    i += 1;
    onProgress?.(i, total);

    for (const f of entries) {
        // Entry name is the uuid (privacy: the archive does not expose the
        // original filename in the zip's entry listing). Compression is chosen
        // by the *original* file type/extension, not the uuid entry name.
        const name = `files/${f.id}`;
        const p = policyFor(f.filename);
        const stream = p.deflate
            ? new AsyncZipDeflate(name, { level: p.level ?? 6 })
            : new ZipPassThrough(name);
        zip.add(stream);
        stream.push(f.bytes, true);
        i += 1;
        onProgress?.(i, total);
    }

    zip.end();
    return done;
};

// Reads an archive: unzips, parses `export.json`, and gathers the `files/*`
// entries into a Map keyed by uuid.
export const readArchive = async (
    file: File,
    onProgress?: (done: number, total: number) => void,
): Promise<{
    manifest: Manifest;
    files: Map<string, { bytes: Uint8Array; filename: string; type: string }>;
}> => {
    const fflate = await import('fflate');
    const { unzip, strFromU8 } = fflate;
    const buf = new Uint8Array(await file.arrayBuffer());
    const unzipped = await new Promise<any>((resolve, reject) => {
        unzip(buf, (err: any, data: any) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    onProgress?.(1, 1);

    if (!unzipped['export.json']) {
        throw new Error('Not a cozyui export: export.json missing');
    }
    const manifest: Manifest = JSON.parse(strFromU8(unzipped['export.json']));
    if (manifest.format !== 'cozyui-export') {
        throw new Error('Not a cozyui export');
    }
    const files = new Map<string, { bytes: Uint8Array; filename: string; type: string }>();
    for (const meta of manifest.files) {
        const entry = unzipped[`files/${meta.id}`];
        if (!entry) {
            throw new Error(`Missing file entry in archive: ${meta.id}`);
        }
        files.set(meta.id, { bytes: entry, filename: meta.filename, type: meta.type });
    }
    return { manifest, files };
};
