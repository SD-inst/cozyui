import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { settings } from './settings';
import { useSettingEditor, useStringSetting } from './useSetting';
import { db } from '../components/history/db';

const name = settings.llm_url;

/** The fixed binding: a local draft plus the asynchronous database write. */
const Editor = () => {
    const [value, setValue] = useSettingEditor(name);
    return <input value={value} onChange={(e) => setValue(e.target.value)} />;
};

/** The binding that used to be used: the input is fed straight from IndexedDB. */
const LiveQueryOnly = () => {
    const value = useStringSetting(name);
    return (
        <input
            value={value}
            onChange={(e) => db.settings.put({ name, value: e.target.value })}
        />
    );
};

/**
 * Type `X` between 'ab' and 'cdef' the way a browser does it: the value changes
 * through the prototype setter — the path real typing takes, so React's value
 * tracker notices the change — the caret lands right behind the typed
 * character, and only then does the change event reach React.
 */
const typeInMiddle = (input: HTMLInputElement) => {
    const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
    )?.set as (this: HTMLInputElement, value: string) => void;
    input.focus();
    input.setSelectionRange(2, 2);
    setValue.call(input, 'abXcdef');
    input.setSelectionRange(3, 3);
    fireEvent.change(input);
};

describe('useSettingEditor', () => {
    beforeEach(async () => {
        await db.settings.clear();
    });

    it('reverts the field and drops the caret at its end when bound straight to the live query', async () => {
        // The premise of the fix: a stored setting only comes back from
        // IndexedDB later, so React restores the DOM value to the prop it still
        // has — the previous one.
        await db.settings.put({ name, value: 'abcdef' });
        render(<LiveQueryOnly />);
        const input = (await screen.findByDisplayValue(
            'abcdef',
        )) as HTMLInputElement;

        typeInMiddle(input);

        expect(input).toHaveValue('abcdef');
        expect(input.selectionStart).toBe(6);
        // The typed text does come back from the database — with the caret at
        // its end, which is the reported symptom.
        await waitFor(() => expect(input).toHaveValue('abXcdef'));
        expect(input.selectionStart).toBe(7);
    });

    it('keeps the field value and the caret where the user typed', async () => {
        await db.settings.put({ name, value: 'abcdef' });
        render(<Editor />);
        const input = (await screen.findByDisplayValue(
            'abcdef',
        )) as HTMLInputElement;

        typeInMiddle(input);

        expect(input).toHaveValue('abXcdef');
        expect(input.selectionStart).toBe(3);
        // The draft is released once the write lands, without touching the
        // field again.
        await waitFor(() =>
            db.settings
                .where({ name })
                .first()
                .then((v) => expect(v?.value).toBe('abXcdef')),
        );
        expect(input).toHaveValue('abXcdef');
        expect(input.selectionStart).toBe(3);
    });

    it('picks up database writes that did not come from the field', async () => {
        await db.settings.put({ name, value: 'first' });
        render(<Editor />);
        const input = (await screen.findByDisplayValue(
            'first',
        )) as HTMLInputElement;

        await act(async () => {
            await db.settings.put({ name, value: 'second' });
        });

        await waitFor(() => expect(input).toHaveValue('second'));
    });
});
