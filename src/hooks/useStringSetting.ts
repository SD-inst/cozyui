import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../components/history/db';
import { settings } from './settings';

export const useStringSetting = (name: settings, defaultValue: string = '') => {
    return (
        useLiveQuery(async () => {
            return (await db.settings.where({ name }).first())?.value;
        }) || defaultValue
    );
};
