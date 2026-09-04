import { useCallback, useRef } from 'react';
import { useTabName } from '../components/contexts/TabContext';
import { db } from '../components/history/db';
import { settings } from './settings';

export const saveUploadBackup = async (
    file: File,
    fieldName: string,
    tabName: string,
): Promise<void> => {
    const record = await db.settings.where({ name: settings.backup_uploads }).first();
    if (record?.value !== 'true') return;
    const uploadKey = tabName + '/' + fieldName;
    await db.uploads.put({ id: uploadKey, file });
};

export const useBackupUpload = (
    fieldName: string,
): [(file: File) => void] => {
    const tabName = useTabName();
    return [
        useCallback(
            (file: File) => {
                saveUploadBackup(file, fieldName, tabName);
            },
            [fieldName, tabName]
        ),
    ];
};

export const useReuploadLost = <T>(
    getKey: (arg: T) => string,
    onLost: (key: string) => void,
    onReupload: (file: File, key: string, arg: T) => Promise<void>,
) => {
    const attempts = useRef<Record<string, number>>({});
    return useCallback(
        async (arg: T) => {
            const key = getKey(arg);
            const entry = await db.uploads.get(key);
            if (!entry) {
                onLost(key);
                return;
            }
            if ((attempts.current[key] || 0) > 2) {
                return;
            }
            try {
                await onReupload(entry.file, key, arg);
            } catch {
                attempts.current[key] = (attempts.current[key] || 0) + 1;
            }
        },
        [getKey, onLost, onReupload],
    );
};
