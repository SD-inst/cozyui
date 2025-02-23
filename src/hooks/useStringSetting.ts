import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../components/history/db';
import { settings } from './settings';

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
        }) ?? (undefinedAwait ? undefined : defaultValue)
    );
};
