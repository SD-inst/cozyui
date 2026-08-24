import { describe, expect, it } from 'vitest';
import { buildBackupKeys } from './useUploadBackupGuard';

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
