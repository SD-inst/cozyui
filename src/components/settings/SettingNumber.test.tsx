import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { settings } from '../../hooks/settings';
import { db } from '../history/db';
import { SettingNumber } from './SettingNumber';

const name = settings.upload_retention_days;

const stored = async (): Promise<string | undefined> =>
    (await db.settings.where({ name }).first())?.value;

// The path real typing takes: the prototype setter, so React's value tracker
// sees the change, then the change event.
const type = (input: HTMLInputElement, text: string) => {
    const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
    )?.set as (this: HTMLInputElement, value: string) => void;
    input.focus();
    setValue.call(input, text);
    fireEvent.change(input);
};

describe('SettingNumber', () => {
    beforeEach(async () => {
        await db.settings.clear();
    });

    it('is a number field that carries its range to the input', async () => {
        render(<SettingNumber name={name} defaultValue={7} min={0} step={1} />);
        const input = (await screen.findByDisplayValue('7')) as HTMLInputElement;

        expect(input.type).toBe('number');
        expect(input.min).toBe('0');
        expect(input.step).toBe('1');
    });

    it('leaves a value the user is still writing alone', async () => {
        render(<SettingNumber name={name} defaultValue={7} min={0} />);
        const input = (await screen.findByDisplayValue('7')) as HTMLInputElement;

        type(input, '-1');

        // Clamping mid-keystroke would fight the field: the minus has to be
        // typeable on its way to whatever the user means.
        expect(input).toHaveValue(-1);
        expect(await stored()).toBe('-1');
    });

    it('settles on the minimum once the field is left below it', async () => {
        render(<SettingNumber name={name} defaultValue={7} min={0} />);
        const input = (await screen.findByDisplayValue('7')) as HTMLInputElement;

        type(input, '-1');
        fireEvent.blur(input);

        await waitFor(() => expect(input).toHaveValue(0));
        expect(await stored()).toBe('0');
    });

    it('falls back to the default when the field is left empty', async () => {
        render(<SettingNumber name={name} defaultValue={7} min={0} />);
        const input = (await screen.findByDisplayValue('7')) as HTMLInputElement;

        type(input, '');
        fireEvent.blur(input);

        await waitFor(() => expect(input).toHaveValue(7));
        expect(await stored()).toBe('7');
    });
});
