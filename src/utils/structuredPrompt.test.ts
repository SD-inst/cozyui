import { describe, expect, it } from 'vitest';
import {
    buildStructuredPrompt,
    parseStructuredPrompt,
} from './structuredPrompt';

describe('parseStructuredPrompt', () => {
    it('splits sections by // header', () => {
        const text = [
            '// style',
            'pop, piano, guitars',
            '// lyrics',
            '[Intro]',
            '',
            '[Verse]',
            'hello',
        ].join('\n');
        const out = parseStructuredPrompt(text);
        expect(out.style).toBe('pop, piano, guitars');
        expect(out.lyrics).toBe('[Intro]\n\n[Verse]\nhello');
    });

    it('keeps multi-line ABC content verbatim', () => {
        const text = [
            '// ABC',
            'X:1',
            'M:4/4',
            'L:1/16',
            'Q:1/4=120',
        ].join('\n');
        const out = parseStructuredPrompt(text);
        expect(out.ABC).toBe('X:1\nM:4/4\nL:1/16\nQ:1/4=120');
    });

    it('trims leading/trailing whitespace of a section', () => {
        const text = '// style\n\n  pop, piano  \n// lyrics\nx';
        const out = parseStructuredPrompt(text);
        expect(out.style).toBe('pop, piano');
        expect(out.lyrics).toBe('x');
    });

    it('returns empty for text without headers', () => {
        expect(parseStructuredPrompt('just some text')).toEqual({});
    });

    it('ignores content before the first header', () => {
        const out = parseStructuredPrompt('preamble\n// style\npop');
        expect(out).toEqual({ style: 'pop' });
    });
});

describe('buildStructuredPrompt', () => {
    it('joins present sections in order', () => {
        const out = buildStructuredPrompt([
            ['style', 'pop'],
            ['lyrics', '[Verse]\nx'],
            ['ABC', 'X:1'],
        ]);
        expect(out).toBe('// style\npop\n// lyrics\n[Verse]\nx\n// ABC\nX:1');
    });

    it('skips empty and absent sections', () => {
        const out = buildStructuredPrompt([
            ['style', 'pop'],
            ['lyrics', ''],
            ['ABC', undefined],
        ]);
        expect(out).toBe('// style\npop');
    });
});
