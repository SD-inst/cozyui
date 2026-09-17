import { describe, it, expect } from 'vitest';
import {
    hoistBlobs,
    unhoistBlobs,
    archiveFilename,
    RawRecord,
} from './format';

const u8 = (s: string): Uint8Array =>
    Uint8Array.from(s, (c) => c.charCodeAt(0));

const fileEquals = (a: File, name: string, type: string, bytes: Uint8Array) => {
    expect(a.name).toBe(name);
    expect(a.type).toBe(type);
    expect(a.size).toBe(bytes.length);
};

describe('hoistBlobs / unhoistBlobs round-trip', () => {
    it('hoists a single File and unhoists it back', async () => {
        const original = new File(['hello'], 'x.txt', { type: 'text/plain' });
        const records: RawRecord[] = [
            {
                table: 'presetFiles',
                key: 'p/x.txt',
                value: { filename: 'x.txt', file: original },
            },
        ];

        const { records: hoisted, files } = await hoistBlobs(records);

        // The blob is replaced by a token, and the bytes are collected.
        const token = hoisted[0].value.file as { $file: string };
        expect(typeof token.$file).toBe('string');
        expect(files.size).toBe(1);

        const back = unhoistBlobs(hoisted, files as any);
        const file = back[0].value.file as File;
        fileEquals(file, 'x.txt', 'text/plain', u8('hello'));
        expect(new Uint8Array(await file.arrayBuffer())).toStrictEqual(
            u8('hello'),
        );
    });

    it('hoists a Blob[] (history data) and unhoists it back in order', async () => {
        const a = new Blob([u8('one')], { type: 'image/png' });
        const b = new Blob([u8('two')], { type: 'image/jpeg' });
        const records: RawRecord[] = [
            {
                table: 'taskResults',
                key: 1,
                value: { url: ['a.png', 'b.jpg'], data: [a, b] },
            },
        ];

        const { records: hoisted, files } = await hoistBlobs(records);

        const toks = hoisted[0].value.data as Array<{ $file: string }>;
        expect(toks).toHaveLength(2);
        expect(typeof toks[0].$file).toBe('string');
        expect(typeof toks[1].$file).toBe('string');
        // The two blobs must not share a file id.
        expect(toks[0].$file).not.toBe(toks[1].$file);

        const back = unhoistBlobs(hoisted, files as any);
        const data = back[0].value.data as File[];
        expect(data).toHaveLength(2);
        fileEquals(data[0], 'a.png', 'image/png', u8('one'));
        fileEquals(data[1], 'b.jpg', 'image/jpeg', u8('two'));
        expect(new Uint8Array(await data[0].arrayBuffer())).toStrictEqual(
            u8('one'),
        );
        expect(new Uint8Array(await data[1].arrayBuffer())).toStrictEqual(
            u8('two'),
        );
    });

    it('leaves non-blob fields untouched', async () => {
        const records: RawRecord[] = [
            { table: 'presets', key: 'p1', value: { name: 'n', values: '{}' } },
        ];
        const { records: hoisted, files } = await hoistBlobs(records);
        expect(files.size).toBe(0);
        expect(hoisted[0].value).toEqual({ name: 'n', values: '{}' });
    });
});

describe('archiveFilename', () => {
    it('uses the asset name, sanitized, with a .zip suffix', () => {
        expect(archiveFilename('My Cool Mod')).toBe('My-Cool-Mod.zip');
    });

    it('replaces invalid filename characters with a dash', () => {
        expect(archiveFilename('a/b\\c:d')).toBe('a-b-c-d.zip');
    });

    it('trims surrounding whitespace', () => {
        expect(archiveFilename('  spaced  ')).toBe('spaced.zip');
    });

    it('falls back when no name is available', () => {
        expect(archiveFilename(undefined, 'refmods')).toBe('refmods.zip');
        expect(archiveFilename('')).toBe('archive.zip');
    });
});
