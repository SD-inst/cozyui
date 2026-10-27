import { describe, expect, it } from 'vitest';
import {
    describeError,
    formatCrashReport,
    fromPreloadError,
    fromRejection,
    fromWindowError,
    isSameCrash,
} from './crashReport';

describe('describeError', () => {
    it('describes a thrown Error with its name and stack', () => {
        const described = describeError(new TypeError('no such thing'));
        expect(described.name).toBe('TypeError');
        expect(described.message).toBe('no such thing');
        expect(described.stack).toContain('no such thing');
    });

    it('describes things that are not Errors', () => {
        expect(describeError('just a string').message).toBe('just a string');
        expect(describeError(null).message).toBe('null');
        expect(describeError(undefined).message).toBe('undefined');
        expect(describeError({ code: 7 }).message).toBe('{"code":7}');
        expect(describeError(new Map()).message).toBe('[object Map]');
    });

    it('falls back to the name when an Error has no message', () => {
        const error = new Error();
        error.name = 'AbortError';
        expect(describeError(error).message).toBe('AbortError');
    });
});

describe('event descriptions', () => {
    it('keeps the file and position of a window error', () => {
        const report = fromWindowError({
            error: new SyntaxError('bad token'),
            message: 'bad token',
            filename: 'http://192.168.1.5:5173/assets/index.js',
            lineno: 12,
            colno: 4,
        } as unknown as ErrorEvent);
        expect(report.kind).toBe('window');
        expect(report.message).toBe('bad token');
        expect(report.location).toBe(
            'http://192.168.1.5:5173/assets/index.js:12:4',
        );
    });

    it('keeps the bare message of a parse failure, which has no Error object', () => {
        const report = fromWindowError({
            message: 'SyntaxError: Invalid token',
            target: window,
        } as unknown as ErrorEvent);
        expect(report.message).toBe('SyntaxError: Invalid token');
        expect(report.name).toBeUndefined();
    });

    it('marks a rejected promise as dismissible', () => {
        const report = fromRejection({
            reason: new Error('upload failed'),
        } as PromiseRejectionEvent);
        expect(report.dismissible).toBe(true);
        expect(report.message).toBe('upload failed');
    });

    it('pulls the failing chunk out of a preload error', () => {
        const report = fromPreloadError(
            new Error(
                'Failed to fetch dynamically imported module: ' +
                    'http://192.168.1.5:5173/src/components/controls/MaskEditor.tsx',
            ),
        );
        expect(report.kind).toBe('chunk');
        expect(report.chunk).toBe(
            'http://192.168.1.5:5173/src/components/controls/MaskEditor.tsx',
        );
    });
});

describe('isSameCrash', () => {
    it('merges a failed chunk with the rejection that follows it', () => {
        const preload = fromPreloadError(
            new Error(
                'Failed to fetch dynamically imported module: http://host/mask.js',
            ),
        );
        const rejection = fromRejection({
            reason: new Error(
                'Failed to fetch dynamically imported module: http://host/mask.js',
            ),
        } as PromiseRejectionEvent);
        expect(isSameCrash(preload, rejection)).toBe(true);
    });

    it('keeps two different problems apart', () => {
        expect(
            isSameCrash(
                { kind: 'window', message: 'first failure' },
                { kind: 'rejection', message: 'second failure' },
            ),
        ).toBe(false);
    });
});

describe('formatCrashReport', () => {
    const env = {
        version: 'v1.2.3',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
        language: 'ru-RU',
        viewport: '393x852@3x',
        url: 'http://192.168.1.5:5173/',
        time: '2026-10-27T10:00:00.000Z',
    };

    it('writes everything a remote reader needs into one block of text', () => {
        const text = formatCrashReport(
            [
                {
                    kind: 'render',
                    name: 'TypeError',
                    message: 'x is not a function',
                    stack: 'TypeError: x is not a function\n    at App.tsx:10',
                },
            ],
            env,
        );
        expect(text).toContain('version: v1.2.3');
        expect(text).toContain('iPhone OS 17_4');
        expect(text).toContain('viewport: 393x852@3x');
        expect(text).toContain('page: http://192.168.1.5:5173/');
        expect(text).toContain('TypeError: x is not a function');
        expect(text).toContain('at App.tsx:10');
    });

    it('numbers several problems', () => {
        const text = formatCrashReport(
            [
                { kind: 'window', message: 'first' },
                { kind: 'rejection', message: 'second', chunk: 'a.js' },
            ],
            env,
        );
        expect(text).toContain('problem 1 (window)');
        expect(text).toContain('problem 2 (rejection)');
        expect(text).toContain('chunk: a.js');
    });
});
