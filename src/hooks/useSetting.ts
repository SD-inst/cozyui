import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../components/history/db';
import { settings } from './settings';

export const useBooleanSetting = (name: settings) => {
    return (
        useLiveQuery(async () => {
            return (
                (await db.settings.where({ name }).first())?.value === 'true'
            );
        }, [name]) ?? false
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
