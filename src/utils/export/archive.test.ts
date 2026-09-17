import { describe, it, expect } from 'vitest';
import { buildArchive, readArchive } from './archive';
import { Manifest, SerializedFile, EXPORT_FORMAT, EXPORT_VERSION } from './format';

const u8 = (s: string): Uint8Array =>
    Uint8Array.from(s, (c) => c.charCodeAt(0));

// A small pseudo-safetensors payload (large + somewhat incompressible).
const fakeSafetensors = (): Uint8Array => {
    const buf = new Uint8Array(64 * 1024);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = (i * 7 + 3) & 0xff;
    }
    return buf;
};

describe('buildArchive / readArchive round-trip', () => {
    it('round-trips the manifest and file bytes (stored + deflate entries)', async () => {
        const png = u8('fake-png-bytes');
        const st = fakeSafetensors();
        const files = new Map<string, SerializedFile>();
        const id1 = 'aaaa1111-1111-1111-1111-111111111111';
        const id2 = 'bbbb2222-2222-2222-2222-222222222222';
        files.set(id1, {
            id: id1,
            filename: 'thumb.png',
            type: 'image/png',
            size: png.length,
            bytes: png,
        });
        files.set(id2, {
            id: id2,
            filename: 'model.safetensors',
            type: 'application/octet-stream',
            size: st.length,
            bytes: st,
        });

        const manifest: Manifest = {
            format: EXPORT_FORMAT,
            version: EXPORT_VERSION,
            created: 123,
            domain: 'refmods',
            count: 1,
            records: [
                {
                    table: 'refMods',
                    key: 'm1',
                    value: { name: 'mod' },
                },
                {
                    table: 'refModFiles',
                    key: 'm1/thumb.png',
                    value: { filename: 'thumb.png', fileType: 'thumbnail', file: { $file: id1 } },
                },
                {
                    table: 'refModFiles',
                    key: 'm1/model.safetensors',
                    value: {
                        filename: 'model.safetensors',
                        fileType: 'safetensors',
                        file: { $file: id2 },
                    },
                },
            ],
            files: [
                { id: id1, filename: 'thumb.png', type: 'image/png', size: png.length },
                {
                    id: id2,
                    filename: 'model.safetensors',
                    type: 'application/octet-stream',
                    size: st.length,
                },
            ],
        };

        const blob = await buildArchive(manifest, files);
        expect(blob.type).toBe('application/zip');

        const { manifest: back, files: backFiles } = await readArchive(
            new File([blob], 'archive.zip'),
        );
        expect(back.format).toBe('cozyui-export');
        expect(back.domain).toBe('refmods');
        expect(back.count).toBe(1);
        expect(back.records).toEqual(manifest.records);

        // Bytes round-trip exactly.
        expect(backFiles.get(id1)?.bytes).toStrictEqual(png);
        expect(backFiles.get(id1)?.filename).toBe('thumb.png');
        expect(backFiles.get(id2)?.bytes).toStrictEqual(st);
        expect(backFiles.get(id2)?.filename).toBe('model.safetensors');
    });

    it('rejects an archive without export.json', async () => {
        const blob = new Blob([new Uint8Array([0, 1, 2])], {
            type: 'application/zip',
        });
        await expect(readArchive(new File([blob], 'bad.zip'))).rejects.toThrow();
    });
});

// One-off measurement to justify COMPRESSION_POLICY for `.safetensors`.
// Real safetensors are raw tensor weights (effectively random floats), so we
// model that with incompressible data and expect deflate to give little
// benefit → policy keeps them `stored` (never inflates, costs no CPU).
describe('safetensors compression measurement (policy justification)', () => {
    it('incompressible weights do not shrink usefully under deflate', async () => {
        const { deflateSync, inflateSync } = await import('fflate');
        // Model real safetensors as high-entropy (random) tensor weights —
        // a low-entropy synthetic pattern would deflate to nothing and mislead.
        // Keep the buffer under crypto.getRandomValues' 64 KiB per-call cap.
        const buf = new Uint8Array(32 * 1024);
        crypto.getRandomValues(buf);
        const start = performance.now();
        const compressed = deflateSync(buf, { level: 6 });
        const ms = performance.now() - start;
        const ratio = compressed.length / buf.length;
        console.log(
            `[safetensors measurement] ratio=${ratio.toFixed(3)} ` +
                `(${compressed.length} / ${buf.length} bytes) in ${ms.toFixed(1)}ms`,
        );
        // High-entropy weights barely shrink under deflate; `stored` (the
        // current policy) is the right default when the ratio is not clearly
        // below ~0.8.
        expect(ratio).toBeGreaterThan(0.8);
        // Correctness: inflate round-trips.
        expect(inflateSync(compressed)).toStrictEqual(buf);
    });
});
