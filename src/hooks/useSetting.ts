import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../components/history/db';
import { settings } from './settings';

export const useBooleanSetting = (
    name: settings,
    undefinedAwait: boolean = false
) => {
    return (
        useLiveQuery(async () => {
            return (
                (await db.settings.where({ name }).first())?.value === 'true'
            );
        }, [name]) ?? (undefinedAwait ? undefined : false)
    );
};

/**
 * Query a setting from IndexedDB
 * @param name setting name
 * @param defaultValue value returned until the database promise resolves
 * @param defaultDBValue value returned if the value is absent from the database
 * @returns setting value
 */
export const useStringSetting = (
    name: settings,
    defaultValue: string = '',
    undefinedAwait: boolean = false
) => {
    return (
        useLiveQuery(async () => {
            return (
                (await db.settings.where({ name }).first())?.value ??
                defaultValue
            );
        }, [defaultValue, name]) ?? (undefinedAwait ? undefined : defaultValue)
    );
};

/**
 * Editable string setting — the value to bind to an input plus the writer.
 *
 * A stored setting only comes back from IndexedDB asynchronously, so binding a
 * controlled input straight to `useStringSetting` breaks editing in the middle
 * of the text: right after the keystroke React restores the DOM value to the
 * prop it still has — the previous one — and the typed text returns a tick
 * later from the database, which drops the caret at the end of the field. The
 * draft keeps the input bound to what the user just typed and is released as
 * soon as the stored value catches up, so external writes are picked up again.
 * @param name setting name
 * @param defaultValue value returned until the database promise resolves
 * @returns [current value, write a new one]
 */
export const useSettingEditor = (
    name: settings,
    defaultValue: string = ''
): [string, (value: string) => void] => {
    const stored = useStringSetting(name, defaultValue) ?? defaultValue;
    const [draft, setDraft] = useState<string | null>(null);

    useEffect(() => {
        if (draft !== null && draft === stored) {
            setDraft(null);
        }
    }, [draft, stored]);

    return [
        draft ?? stored,
        useCallback(
            (value: string) => {
                setDraft(value);
                db.settings.put({ name, value });
            },
            [name]
        ),
    ];
};

export const useNumberSetting = (
    name: settings,
    defaultValue: number = 0,
    undefinedAwait: boolean = false
) => {
    return (
        useLiveQuery(async () => {
            return await db.settings
                .where({ name })
                .first()
                .then((v) =>
                    v !== undefined ? parseInt(v.value) : defaultValue
                );
        }, [defaultValue, name]) ?? (undefinedAwait ? undefined : defaultValue)
    );
};

export const useMultiSetting = (
    name: settings,
    defaultValue: string[] = [],
    undefinedAwait: boolean = false
) => {
    return (
        useLiveQuery(async () => {
            return await db.settings
                .where({ name })
                .first()
                .then((v) =>
                    v !== undefined
                        ? (JSON.parse(v.value) as string[])
                        : defaultValue
                );
        }, [defaultValue, name]) ?? (undefinedAwait ? undefined : defaultValue)
    );
};
