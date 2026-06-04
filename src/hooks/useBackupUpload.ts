import { useCallback } from 'react';
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
