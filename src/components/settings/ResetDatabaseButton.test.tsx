import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { I18nContext } from '../../i18n/I18nContext';
import { polyglot } from '../../testUtils';
import { ResetDatabaseButton } from './ResetDatabaseButton';

// The point of this dialog is that one tap is not enough: the destructive
// action has to stay unreachable until the phrase the dialog itself shows has
// been typed. Both the phrase and the button label are read from the locale —
// the same strings the component uses — so the test cannot drift from the
// product.
const label = polyglot.t('settings.reset_database');
const phrase = polyglot.t('settings.reset_database_phrase');

const renderButton = () =>
    render(
        <I18nContext.Provider value={{ locale: 'en', polyglot }}>
            <ResetDatabaseButton />
        </I18nContext.Provider>,
    );

const openDialog = async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
    return await screen.findByRole('dialog');
};

const confirmButton = (dialog: HTMLElement) =>
    within(dialog).getByRole('button', { name: label });

let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
    sessionStorage.clear();
    // jsdom's `location.reload` is a non-configurable own property, so it is
    // replaced through the global rather than spied on in place.
    reload = vi.fn();
    vi.stubGlobal('location', { reload });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
});

describe('ResetDatabaseButton', () => {
    it('keeps the delete dead until the confirmation phrase is typed', async () => {
        renderButton();
        const dialog = await openDialog();
        const confirm = confirmButton(dialog);
        const input = within(dialog).getByRole('textbox');

        expect(confirm).toBeDisabled();

        fireEvent.change(input, { target: { value: 'DELETE' } });
        expect(confirm).toBeDisabled();

        fireEvent.change(input, { target: { value: phrase } });
        expect(confirm).toBeEnabled();
    });

    it('deletes the database and reloads once the phrase is typed', async () => {
        vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
            const request: Record<string, unknown> = {};
            setTimeout(() => (request.onsuccess as () => void)(), 0);
            return request as unknown as IDBOpenDBRequest;
        });
        renderButton();
        const dialog = await openDialog();
        fireEvent.change(within(dialog).getByRole('textbox'), {
            target: { value: phrase },
        });

        fireEvent.click(confirmButton(dialog));

        await waitFor(() => expect(reload).toHaveBeenCalled());
    });

    it('asks the next page load to delete when this page is blocked', async () => {
        vi.spyOn(indexedDB, 'deleteDatabase').mockImplementation(() => {
            const request: Record<string, unknown> = {};
            setTimeout(() => (request.onblocked as () => void)(), 0);
            return request as unknown as IDBOpenDBRequest;
        });
        renderButton();
        const dialog = await openDialog();
        fireEvent.change(within(dialog).getByRole('textbox'), {
            target: { value: phrase },
        });

        fireEvent.click(confirmButton(dialog));

        // The flag `runPendingDatabaseReset` consumes on the next load.
        await waitFor(() =>
            expect(sessionStorage.getItem('cozyui:reset-database')).toBe('1'),
        );
        expect(reload).toHaveBeenCalled();
    });
});
