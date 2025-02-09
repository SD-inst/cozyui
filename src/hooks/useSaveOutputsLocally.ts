import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../components/history/db';

export enum settings {
    save_outputs_locally = 'save_outputs_locally',
    save_history = 'save_history',
    disable_help = 'disable_help'
}

export const useBooleanSetting = (name: settings) => {
    return (
        useLiveQuery(async () => {
            return (
                (await db.settings.where({ name }).first())?.value === 'true'
            );
        }) ?? false
    );
};
