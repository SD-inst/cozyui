import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { polyglot } from '../testUtils';
import {
    dismissCrashReports,
    installCrashReporting,
} from '../utils/crashOverlay';
import { ErrorBoundary } from './ErrorBoundary';

installCrashReporting((key, options) => polyglot.t(key, options));

const Broken = ({ message }: { message: string }) => {
    if (message) {
        throw new Error(message);
    }
    return <span>fine</span>;
};

// React logs whatever a boundary catches; the tests are about the UI it leaves
// behind, not about that log.
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    consoleError.mockRestore();
    dismissCrashReports();
});

describe('ErrorBoundary', () => {
    it('replaces only the crashed subtree and keeps the page working', () => {
        render(
            <>
                <span>the rest of the page</span>
                <ErrorBoundary
                    fallback={(error, retry) => (
                        <>
                            <span>
                                this tab broke:{' '}
                                {(error as Error).message}
                            </span>
                            <button onClick={retry}>retry</button>
                        </>
                    )}
                >
                    <Broken message='kaboom' />
                </ErrorBoundary>
            </>,
        );
        expect(screen.getByText('the rest of the page')).toBeInTheDocument();
        expect(screen.getByText('this tab broke: kaboom')).toBeInTheDocument();
    });

    it('lets the fallback remount the crashed subtree', () => {
        // React re-renders a component that threw a few times before it gives up
        // on it, so the failure has to be a switch rather than a counter.
        let broken = true;
        const Flaky = () => {
            if (broken) {
                throw new Error('once');
            }
            return <span>fine now</span>;
        };
        render(
            <ErrorBoundary
                fallback={(_error, retry) => (
                    <button
                        onClick={() => {
                            broken = false;
                            retry();
                        }}
                    >
                        retry
                    </button>
                )}
            >
                <Flaky />
            </ErrorBoundary>,
        );
        fireEvent.click(screen.getByText('retry'));
        expect(screen.getByText('fine now')).toBeInTheDocument();
    });

    it('hands a crash with no fallback to the on-page report', () => {
        render(
            <ErrorBoundary>
                <Broken message='fatal and unrecoverable' />
            </ErrorBoundary>,
        );
        const report = document.getElementById('crash-report');
        expect(report?.textContent).toContain('fatal and unrecoverable');
        expect(report?.textContent).toContain('The page stopped working');
    });
});
