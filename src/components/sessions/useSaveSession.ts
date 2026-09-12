import { useState } from 'react';
import toast from 'react-hot-toast';
import { useFormContext } from 'react-hook-form';
import { FileMissingError, getFileFromServer } from '../../api/files';
import { useApiURL } from '../../hooks/useApiURL';
import { useSetDefaults } from '../../hooks/useSetDefaults';
import { useTabName } from '../contexts/TabContext';
import { db } from '../history/db';
import { useTranslate } from '../../i18n/I18nContext';
import { useAppDispatch } from '../../redux/hooks';
import { reloadChat } from '../../redux/chat';
import { filterFormValues } from '../../utils/filterFormValues';
import { EXCLUDE_FIELDS, walkMediaFields } from '../../utils/mediaFields';
import { defaultSessionName, saveSession } from './session';

// Creates a session: snapshots the current form values, its chat, and backs up
// its media files (fetched from the server), then resets the form and chat so
// the user can experiment with a different set of settings.
export const useSaveSession = () => {
    const apiUrl = useApiURL();
    const tr = useTranslate();
    const dispatch = useAppDispatch();
    const tab_name = useTabName();
    const { getValues, reset } = useFormContext();
    const { setDefaults, isLoaded } = useSetDefaults();
    const [collecting, setCollecting] = useState(false);

    const save = async (): Promise<void> => {
        if (!apiUrl || !tab_name || collecting) {
            return;
        }
        setCollecting(true);
        try {
            const values = filterFormValues(getValues());
            for (const f of EXCLUDE_FIELDS) {
                delete values[f];
            }
            const chat = await db.chatLogs
                .where({ tab: tab_name, id: 'main' })
                .first()
                .then((r) => r?.messages);
            const refs = walkMediaFields(values);
            const files: { filename: string; file: File }[] = [];
            const failed: string[] = [];
            await Promise.all(
                refs.map(async (ref) => {
                    try {
                        const file = await getFileFromServer(
                            ref.filename,
                            apiUrl,
                        );
                        files.push({ filename: ref.filename, file });
                    } catch (e) {
                        failed.push(
                            e instanceof FileMissingError
                                ? ref.filename
                                : `${ref.filename} (${e})`,
                        );
                    }
                }),
            );
            await saveSession({
                name: defaultSessionName(values, Date.now()),
                tab: tab_name,
                values,
                files,
                chat,
            });
            // Reset the form and chat so the user can experiment (like RESET).
            await db.formState.delete(tab_name);
            await db.chatLogs.where({ tab: tab_name, id: 'main' }).delete();
            reset();
            setDefaults();
            dispatch(reloadChat(tab_name));
            toast.success(tr('sessions.saved_reset'));
            if (failed.length) {
                toast.error(
                    tr('sessions.file_collect_failed', {
                        file: failed.join(', '),
                    }),
                );
            }
        } catch (e) {
            toast.error(tr('toasts.error_saving_preset', { err: e }));
            console.error(e);
        } finally {
            setCollecting(false);
        }
    };

    return {
        collecting,
        disabled: !isLoaded || !apiUrl || collecting,
        save,
    };
};
