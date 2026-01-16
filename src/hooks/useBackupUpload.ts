import { useCallback } from 'react';
import { useTabName } from '../components/contexts/TabContext';
import { settings } from './settings';
import { useBooleanSetting } from './useSetting';
import { db } from '../components/history/db';

export const useBackupUpload = (
    fieldName: string,
    uploadKeyOverride?: string
): [(file: File) => void, boolean] => {
    const backupUploads = useBooleanSetting(settings.backup_uploads);
    const tabName = useTabName();
    const uploadKey = uploadKeyOverride ?? tabName + '/' + fieldName;
    return [
        useCallback(
            (file: File) => {
                if (backupUploads) {
                    db.uploads.put({
                        id: uploadKey,
                        file,
                    });
                }
            },
            [backupUploads, uploadKey]
        ),
        backupUploads || false,
    ];
};
