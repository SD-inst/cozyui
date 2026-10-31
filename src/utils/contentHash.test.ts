import { describe, expect, it } from 'vitest';
import { sha256Hex, sha256HexJs } from './contentHash';

// Vectors from the standard, checked against `sha256sum`. The 56-byte one is
// the interesting padding case: the terminator and the length do not fit in the
// block the message ends in, so a second block is written.
const VECTORS: Array<[string, string]> = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    [
        'abc',
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ],
    [
        'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
        '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    ],
];

describe('contentHash', () => {
    it.each(VECTORS)('hashes %s', async (input, expected) => {
        // The JS path is the one that runs over plain http, and it is the one
        // being verified here; the platform path must agree on the same input.
        expect(await sha256HexJs(new Blob([input]))).toBe(expected);
        expect(await sha256Hex(new Blob([input]))).toBe(expected);
    });

    it('hashes a blob spanning several read chunks', async () => {
        // 2 MB of non-repeating bytes: a chunk boundary in the middle of the
        // message and a partial block at the end.
        const bytes = new Uint8Array(2_000_003);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = (i * 7 + 3) % 256;
        }
        const blob = new Blob([bytes]);
        expect(await sha256HexJs(blob)).toBe(
            '350cad732836c4c671c2cac6b201b5596d6666767d3fd35eabe60273f8a05754',
        );
        expect(await sha256Hex(blob)).toBe(
            '350cad732836c4c671c2cac6b201b5596d6666767d3fd35eabe60273f8a05754',
        );
    });
});
