import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../components/history/db';
import {
    collectPresets,
    collectHistory,
    restore,
} from './domain';
import { hoistBlobs } from './format';
import { buildArchive, readArchive } from './archive';
import {
    EXPORT_FORMAT,
    EXPORT_VERSION,
    Domain,
    Manifest,
    RawRecord,
} from './format';

const makeArchive = async (
    domain: Domain,
    records: RawRecord[],
): Promise<File> => {
    const { records: hoisted, files } = await hoistBlobs(records);
    const manifest: Manifest = {
        format: EXPORT_FORMAT,
        version: EXPORT_VERSION,
        created: 0,
        domain,
        count: records.length,
        records: hoisted,
        files: [...files.values()].map(
            ({ id, filename, type, size }) => ({ id, filename, type, size }),
        ),
    };
    const blob = await buildArchive(manifest, files);
    return new File([blob], `${domain}.zip`);
};

// These tests exercise the collect → serialize → deserialize → restore
// pipeline and the domain routing (parent + file children, history
// additivity, preset idempotency). They assert on *record metadata*; the
// binary *bytes* round-trip is covered by the pure `archive.test.ts` (and
// `format.test.ts`) because fake-indexeddb degrades stored File/Blob objects
// to plain objects on read-back (a test-env limitation, not a product issue —
// real IndexedDB preserves Blobs).
describe('domain collect → archive → restore round-trip', () => {
    beforeEach(async () => {
        await db.open();
    });
    afterEach(async () => {
        await Promise.all([
            db.taskResults.clear(),
            db.presets.clear(),
            db.presetFiles.clear(),
        ]);
    });

    it('presets: parent + file children restore and re-import is idempotent', async () => {
        const presetId = 'p1';
        await db.presets.add({
            id: presetId,
            name: 'My preset',
            tab: 't2i',
            values: '{}',
            timestamp: 1,
        });
        await db.presetFiles.add({
            id: `${presetId}/lora.safetensors`,
            preset: presetId,
            filename: 'lora.safetensors',
            file: new File(['x'], 'lora.safetensors'),
        });

        const records = await collectPresets([presetId]);
        expect(records).toHaveLength(2); // parent + its file
        const zip = await makeArchive('presets', records);

        // Wipe, then import the archive back.
        await db.presetFiles.where('preset').equals(presetId).delete();
        await db.presets.delete(presetId);

        const { manifest, files } = await readArchive(zip);
        const n = await restore({
            manifest,
            records: manifest.records,
            files,
        });
        expect(n).toBe(2);

        expect((await db.presets.get(presetId))?.name).toBe('My preset');
        const rf = await db.presetFiles.get(`${presetId}/lora.safetensors`);
        expect(rf?.filename).toBe('lora.safetensors');
        expect(rf?.preset).toBe(presetId);

        // Re-import the same archive: idempotent (same ids, no duplicates).
        const again = await readArchive(zip);
        await restore({
            manifest: again.manifest,
            records: again.manifest.records,
            files: again.files,
        });
        expect(await db.presets.count()).toBe(1);
        expect(
            await db.presetFiles.where('preset').equals(presetId).count(),
        ).toBe(1);
    });

    it('history: import is additive (new auto-id, no clobber)', async () => {
        await db.taskResults.add({
            timestamp: 1,
            duration: 1,
            url: 'a',
            node_id: '1',
            type: 'images',
            mark: 0,
            params: JSON.stringify({ tab: 't2i', values: { model: 'm' } }),
        });
        const before = await db.taskResults.count();
        expect(before).toBe(1);

        const records = await collectHistory();
        const zip = await makeArchive('history', records);

        // Import into the same db (no wipe): the record is appended.
        const { manifest, files } = await readArchive(zip);
        await restore({ manifest, records: manifest.records, files });

        expect(await db.taskResults.count()).toBe(before + 1);
    });
});
