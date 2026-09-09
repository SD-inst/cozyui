import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the hooks used inside the component
vi.mock('../components/contexts/TabContext', () => ({
    useTabName: () => 'test_tab',
    useIsCurrentTab: () => true,
}));
vi.mock('./useApiURL', () => ({
    useApiURL: () => 'http://localhost:8188',
}));
vi.mock('../api/utils', () => ({
    makeOutputUrl: (apiUrl: string, params: any) =>
        `${apiUrl}/api/view?subfolder=${params.subfolder}&type=${params.type}&filename=${params.filename}`,
}));

import {
    backupEntry,
    buildBackupKeys,
    computeBackupMoves,
    useUploadBackupGuard,
} from './useUploadBackupGuard';
import { db } from '../components/history/db';

describe('buildBackupKeys', () => {
    it('maps occupied slots to <tab>/<field>.<i>.<keyField> keys', () => {
        const entries = [
            { image: 'a.png', keyframe: false },
            { image: '', keyframe: false },
            { image: 'c.png', keyframe: false },
        ];
        const keys = buildBackupKeys('r2v', 'ref_images', entries, 'image');
        expect(keys).toEqual([
            { key: 'r2v/ref_images.0.image', filename: 'a.png' },
            { key: 'r2v/ref_images.2.image', filename: 'c.png' },
        ]);
    });

    it('skips slots without a filename', () => {
        const entries = [
            { image: '' },
            { image: undefined },
            null,
            { image: 'x.png' },
        ];
        const keys = buildBackupKeys('r2v', 'ref_images', entries, 'image');
        expect(keys).toEqual([
            { key: 'r2v/ref_images.3.image', filename: 'x.png' },
        ]);
    });

    it('returns [] for empty / undefined entries', () => {
        expect(buildBackupKeys('t', 'f', [], 'image')).toEqual([]);
        expect(buildBackupKeys('t', 'f', undefined as any, 'image')).toEqual([]);
    });

    it('keys by the given subfield, not a fixed one', () => {
        const entries = [{ audio: 'a.mp3' }, { audio: 'b.mp3' }];
        const keys = buildBackupKeys('r2v', 'ref_audio', entries, 'audio');
        expect(keys.map((k) => k.key)).toEqual([
            'r2v/ref_audio.0.audio',
            'r2v/ref_audio.1.audio',
        ]);
    });
});

describe('computeBackupMoves', () => {
    const k = (i: number, f: string): backupEntry => ({
        key: `t/f.${i}.image`,
        filename: f,
    });

    it('returns [] when the ordering is unchanged', () => {
        const prev = [k(0, 'a'), k(1, 'b')];
        const live = [k(0, 'a'), k(1, 'b')];
        expect(computeBackupMoves(prev, live)).toEqual([]);
    });

    it('detects a swap of two slots', () => {
        const prev = [k(0, 'a'), k(1, 'b')];
        const live = [k(0, 'b'), k(1, 'a')];
        expect(computeBackupMoves(prev, live)).toEqual([
            { from: 't/f.1.image', to: 't/f.0.image' },
            { from: 't/f.0.image', to: 't/f.1.image' },
        ]);
    });

    it('detects a shift (file moved down by one)', () => {
        const prev = [k(0, 'a'), k(1, 'b')];
        const live = [k(1, 'a'), k(2, 'b')];
        expect(computeBackupMoves(prev, live)).toEqual([
            { from: 't/f.0.image', to: 't/f.1.image' },
            { from: 't/f.1.image', to: 't/f.2.image' },
        ]);
    });

    it('ignores new files (no prev entry to move from)', () => {
        const prev = [k(0, 'a')];
        const live = [k(0, 'a'), k(1, 'c')];
        expect(computeBackupMoves(prev, live)).toEqual([]);
    });

    it('ignores removed files (they are not in the live set)', () => {
        const prev = [k(0, 'a'), k(1, 'b')];
        const live = [k(0, 'a')];
        expect(computeBackupMoves(prev, live)).toEqual([]);
    });
});

describe('useUploadBackupGuard', () => {
    beforeEach(async () => {
        await db.open();
        await db.uploads.clear();
    });

    it('deletes stale backup when file is replaced (same key, different filename)', async () => {
        const key = 'test_tab/ref_images.0.image';

        // Mock fetch for populate phase
        globalThis.fetch = vi.fn().mockResolvedValue({
            blob: () => Promise.resolve(new Blob(['content'], { type: 'image/png' })),
        }) as any;

        // Spy on db.uploads.delete to verify GC deletes stale backup
        const deleteSpy = vi.spyOn(db.uploads, 'delete');

        // Use a result object that allows updating props
        const result = renderHook(
            ({ entries }) => useUploadBackupGuard('ref_images', entries, 'image'),
            { initialProps: { entries: [{ image: 'old.png' }] } },
        );

        // Wait for populate to complete
        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        // Verify backup was populated
        let stored = await db.uploads.get(key);
        expect(stored).toBeDefined();

        // Reset delete spy call count before the replacement
        deleteSpy.mockClear();

        // Simulate file replacement by updating the prop
        act(() => {
            result.rerender({ entries: [{ image: 'new.png' }] });
        });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        // Old backup should have been deleted (filename mismatch detected)
        expect(deleteSpy).toHaveBeenCalledWith(key);

        // New file should be fetched and stored
        stored = await db.uploads.get(key);
        expect(stored).toBeDefined();
        result.unmount();
    });

    it('keeps backup when filename unchanged', async () => {
        const key = 'test_tab/ref_images.0.image';

        // Mock fetch for populate phase
        globalThis.fetch = vi.fn().mockResolvedValue({
            blob: () => Promise.resolve(new Blob(['x'], { type: 'image/png' })),
        }) as any;

        // Spy on db.uploads.delete to verify GC does NOT delete existing backup
        const deleteSpy = vi.spyOn(db.uploads, 'delete');

        // First render populates backup
        const result = renderHook(
            ({ entries }) => useUploadBackupGuard('ref_images', entries, 'image'),
            { initialProps: { entries: [{ image: 'test.png' }] } },
        );
        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        // Reset delete spy call count
        deleteSpy.mockClear();

        // Re-render with same filename (should not delete backup)
        act(() => {
            result.rerender({ entries: [{ image: 'test.png' }] });
        });
        await act(async () => {
            await new Promise((r) => setTimeout(r, 100));
        });

        // Backup for the file should NOT have been deleted (filename matches)
        // Note: the hook does delete the stray top-level key <tab>/<field> on every run
        expect(deleteSpy).not.toHaveBeenCalledWith(key);

        // Backup should still exist
        const stored = await db.uploads.get(key);
        expect(stored).toBeDefined();
        result.unmount();
    });
});
