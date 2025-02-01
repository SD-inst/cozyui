import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../components/history/db';

export const save_outputs_locally = 'save_outputs_locally';

export const useSaveOutputsLocally = () => {
    return (
        useLiveQuery(async () => {
            return (
                (
                    await db.settings
                        .where({ name: save_outputs_locally })
                        .first()
                )?.value === 'true'
            );
        }) ?? false
    );
};
