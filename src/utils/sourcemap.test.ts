import { describe, expect, it } from 'vitest';
import {
    decodeMappings,
    decodeVlq,
    describeOriginal,
    indexMappings,
    originalPositionFor,
    parseStack,
    rawSourceMapType,
    sourceLineOf,
} from './sourcemap';

// Hand-built map, the two segments of generated line 1 and one of generated
// line 2. `AAAAA` is all zeros; `UCIGC` adds +10 to the generated column, +1 to
// the source index, +4 to the original line, +3 to the original column and +1
// to the name index; `IAAO` starts generated line 2 at column 4 and moves only
// the original column.
const map: rawSourceMapType = {
    version: 3,
    sources: ['src/App.tsx', 'src/utils/thing.ts'],
    names: ['App', 'handler'],
    mappings: 'AAAAA,UCIGC;IAAO',
    sourcesContent: [
        'export const App = () => <b>hi</b>;\nsecond line',
        'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\nconst handler = () => a + b + c + d;',
    ],
};

const index = indexMappings(decodeMappings(map));

describe('decodeVlq', () => {
    it('reads single digit values', () => {
        expect(decodeVlq('AAAAA')).toEqual([0, 0, 0, 0, 0]);
        expect(decodeVlq('UCIGC')).toEqual([10, 1, 4, 3, 1]);
    });

    it('reads a value that spans two digits', () => {
        expect(decodeVlq('gC')).toEqual([32]);
    });

    it('reads negative deltas', () => {
        expect(decodeVlq('DA')).toEqual([-1, 0]);
    });

    it('refuses anything that is not base64', () => {
        expect(() => decodeVlq('!')).toThrow(/base64/);
    });
});

describe('originalPositionFor', () => {
    it('answers the exact segment', () => {
        const found = originalPositionFor(index, 1, 10);
        expect(found).toMatchObject({
            source: 'src/utils/thing.ts',
            originalLine: 5,
            originalColumn: 3,
            name: 'handler',
        });
    });

    it('falls back to the last segment that starts at or before the column', () => {
        const found = originalPositionFor(index, 1, 5);
        expect(found).toMatchObject({
            source: 'src/App.tsx',
            originalLine: 1,
            name: 'App',
        });
    });

    it('carries the delta state across generated lines', () => {
        const found = originalPositionFor(index, 2, 999);
        expect(found).toMatchObject({
            source: 'src/utils/thing.ts',
            originalLine: 5,
            originalColumn: 10,
        });
        expect(found?.name).toBeUndefined();
    });

    it('answers nothing for a line or a map it does not have', () => {
        expect(originalPositionFor(index, 3, 0)).toBeNull();
        expect(originalPositionFor(undefined, 1, 0)).toBeNull();
    });
});

describe('parseStack', () => {
    const report = [
        'uP@https://stabled.top/cozyui/assets/index-CJRcUQi3.js:208:80139',
        '    at dD (https://stabled.top/cozyui/assets/index-CJRcUQi3.js:194:7463)',
        'at: http://192.168.1.30:5173/src/components/WorkflowTabs.tsx:146:32',
        'not a frame at all',
    ].join('\n');

    it('reads the Safari and the Chrome frame shapes', () => {
        const frames = parseStack(report);
        expect(frames.length).toBe(3);
        expect(frames[0]).toMatchObject({
            basename: 'index-CJRcUQi3.js',
            file: 'https://stabled.top/cozyui/assets/index-CJRcUQi3.js',
            line: 208,
            column: 80139,
        });
        expect(frames[2]).toMatchObject({
            basename: 'WorkflowTabs.tsx',
            line: 146,
            column: 32,
        });
    });

    it('ignores the lines that carry no position', () => {
        expect(parseStack('--- problem 1 (render) ---')).toEqual([]);
    });
});

describe('report helpers', () => {
    it('describes an original position with its name', () => {
        expect(describeOriginal(originalPositionFor(index, 1, 10)!)).toBe(
            'src/utils/thing.ts:5:4 handler',
        );
    });

    it('drops the ../ prefix that a relative base adds to every source', () => {
        expect(
            describeOriginal({
                generatedLine: 1,
                generatedColumn: 0,
                source: '../../src/App.tsx',
                originalLine: 7,
                originalColumn: 4,
                name: 'App',
            }),
        ).toBe('src/App.tsx:7:5 App');
    });

    it('shows the original line when the map carries the source', () => {
        expect(sourceLineOf(map, 'src/utils/thing.ts', 5)).toBe(
            'const handler = () => a + b + c + d;',
        );
        expect(sourceLineOf(map, 'src/App.tsx', 99)).toBeNull();
    });
});
