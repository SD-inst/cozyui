import { describe, expect, it } from 'vitest';
import {
    backupEntry,
    buildBackupKeys,
    computeBackupMoves,
} from './useUploadBackupGuard';

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
