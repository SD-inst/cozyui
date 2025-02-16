import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../components/history/db';
import { settings } from './settings';

export const useBooleanSetting = (name: settings) => {
    return (
        useLiveQuery(async () => {
            return (
                (await db.settings.where({ name }).first())?.value === 'true'
            );
        }) ?? false
    );
};
