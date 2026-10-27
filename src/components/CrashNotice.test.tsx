import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { polyglot } from '../testUtils';
import { I18nContext } from '../i18n/I18nContext';
import { CrashBoundary } from './CrashNotice';

const Broken = () => {
    throw new Error('the history query failed');
};

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe('CrashBoundary', () => {
    it('names the section that broke, shows why, and offers a retry', () => {
        render(
            <I18nContext.Provider value={{ locale: 'en', polyglot }}>
                <span>the rest of the page</span>
                <CrashBoundary section='History'>
                    <Broken />
                </CrashBoundary>
            </I18nContext.Provider>,
        );
        expect(screen.getByText('the rest of the page')).toBeInTheDocument();
        expect(
            screen.getByText(
                'This part of the page failed to load: History',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('the history query failed')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
    });
});
