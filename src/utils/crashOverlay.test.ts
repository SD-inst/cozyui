import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { polyglot } from '../testUtils';
import {
    dismissCrashReports,
    installCrashReporting,
} from './crashOverlay';

installCrashReporting((key, options) => polyglot.t(key, options));

const panel = (): HTMLElement | null =>
    document.getElementById('crash-report');

const button = (label: string): HTMLButtonElement | undefined =>
    Array.from(panel()?.querySelectorAll('button') ?? []).find((b) =>
        (b.textContent || '').includes(label),
    );

const fireWindowError = (error: Error): void => {
    window.dispatchEvent(
        new ErrorEvent('error', {
            error,
            message: error.message,
            filename: 'http://192.168.1.5:5173/assets/index.js',
            lineno: 3,
            colno: 1,
        }),
    );
};

afterEach(dismissCrashReports);

describe('crash overlay', () => {
    it('shows a translated report when the page throws', () => {
        fireWindowError(new TypeError('nothing here is a function'));
        const shown = panel();
        expect(shown).not.toBeNull();
        expect(shown?.textContent).toContain('The page stopped working');
        expect(shown?.textContent).toContain(
            'TypeError: nothing here is a function',
        );
        expect(shown?.textContent).toContain('index.js:3:1');
    });

    it('reports one problem once, however many events it produces', () => {
        fireWindowError(new Error('chunk failed'));
        window.dispatchEvent(
            new PromiseRejectionEvent('unhandledrejection', {
                reason: new Error('chunk failed'),
                promise: Promise.resolve(),
            }),
        );
        expect(panel()?.textContent).toContain('chunk failed');
        expect(panel()?.textContent).not.toContain('Problem 2');
    });

    it('lets a rejection be dismissed but keeps a real crash on screen', () => {
        window.dispatchEvent(
            new PromiseRejectionEvent('unhandledrejection', {
                reason: new Error('an upload failed'),
                promise: Promise.resolve(),
            }),
        );
        expect(panel()?.textContent).toContain('still working');
        const dismiss = button('Dismiss');
        expect(dismiss).toBeDefined();
        fireEvent.click(dismiss as HTMLButtonElement);
        expect(panel()).toBeNull();

        fireWindowError(new Error('the page is gone'));
        expect(panel()).not.toBeNull();
        expect(button('Dismiss')).toBeUndefined();
    });

    it('ignores a failed image or script, which leaves the page working', () => {
        window.dispatchEvent(
            new ErrorEvent('error', { message: '', error: null }),
        );
        expect(panel()).toBeNull();
    });

    it('hands the report to a selected textarea when there is no clipboard', () => {
        fireWindowError(new Error('copy me'));
        const copy = button('Copy report');
        expect(copy).toBeDefined();
        fireEvent.click(copy as HTMLButtonElement);
        const area = panel()?.querySelector('textarea');
        expect(area?.value).toContain('copy me');
        expect(area?.value).toContain('CozyUI crash report');
    });

    it('redraws the panel when something has taken it out of the page', () => {
        fireWindowError(new Error('the first problem'));
        panel()?.remove();
        window.dispatchEvent(
            new PromiseRejectionEvent('unhandledrejection', {
                reason: new Error('and then this'),
                promise: Promise.resolve(),
            }),
        );
        expect(panel()?.textContent).toContain('and then this');
    });

    it('reports what broke before the module was even loaded', () => {
        window.__earlyCrashes = [
            { message: 'SyntaxError: unexpected token' },
            { reason: new Error('a fetch was rejected') },
        ];
        installCrashReporting();
        expect(panel()?.textContent).toContain('SyntaxError: unexpected token');
        expect(panel()?.textContent).toContain('a fetch was rejected');
        expect(window.__earlyCrashes).toBeNull();
    });
});
