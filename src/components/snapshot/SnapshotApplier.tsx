import { Box, Button, useEventCallback } from '@mui/material';
import { get } from 'lodash';
import { useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { actionEnum, setParams } from '../../redux/tab';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { useApiURL } from '../../hooks/useApiURL';
import { useRestoreValues } from '../../hooks/useRestoreValues';
import { useSetDefaults } from '../../hooks/useSetDefaults';
import { useTabName } from '../contexts/TabContext';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';
import { db } from '../history/db';
import { getReceiverFields } from '../../utils/mediaFields';
import { useTranslate } from '../../i18n/I18nContext';
import { filterFormValues } from '../../utils/filterFormValues';
import { useFormContext } from 'react-hook-form';
import {
    buildMerged,
    refreshUploadBackups,
    renameStoredRecord,
    resolveMedia,
    SnapshotStore,
    stripNulls,
} from '../../utils/applySnapshot';
import { deleteSession } from '../sessions/session';

// Applies a stored snapshot to the current tab form once the form is
// initialized. Handles both presets (merge on top of the current form, with an
// Undo toast) and sessions (reset the form first, which turns the merge into a
// plain replace; optionally deletes the session afterwards).
const SnapshotApplier = ({ formInitialized }: { formInitialized: boolean }) => {
    const { action, tab, presetId, sessionId, deleteAfter } = useAppSelector(
        (s) => s.tab.params,
    );
    const tab_name = useTabName();
    const api = useAppSelector((s) =>
        get(s, ['config', 'tabs', tab_name], null),
    );
    const dispatch = useAppDispatch();
    const apiUrl = useApiURL();
    const { receivers } = useContext(WorkflowTabsContext);
    const { getValues, reset } = useFormContext();
    const { setDefaults } = useSetDefaults();
    const restoreValues = useRestoreValues();
    const tr = useTranslate();

    const isPreset = action === actionEnum.APPLY_PRESET;
    const isSession = action === actionEnum.RESTORE_SESSION;
    const id = isPreset ? presetId : sessionId;

    // Stable so it can be a dependency without re-running the effect on render.
    const doReset = useEventCallback(() => {
        reset();
        setDefaults();
    });

    useEffect(() => {
        if (
            !formInitialized ||
            tab !== tab_name ||
            !apiUrl ||
            (!isPreset && !isSession) ||
            !id
        ) {
            return;
        }
        let cancelled = false;
        (async () => {
            const store: SnapshotStore = isPreset
                ? { record: db.presets, files: db.presetFiles, fk: 'preset' }
                : { record: db.sessions, files: db.sessionFiles, fk: 'session' };
            const record = await store.record.get(id);
            if (!record || cancelled) {
                dispatch(setParams({}));
                return;
            }
            const values = JSON.parse(record.values);
            const files = await store.files
                .where({ [store.fk]: id })
                .toArray();
            const filesMap = new Map(files.map((f) => [f.filename, f.file]));
            // Session: reset the form first so buildMerged degenerates to a
            // replace. Preset: snapshot the current form for the Undo toast.
            if (isSession) {
                doReset();
            }
            const snapshot = isPreset
                ? stripNulls(filterFormValues(getValues()))
                : undefined;
            const { resolved, lost, refs } = await resolveMedia(
                values,
                filesMap,
                apiUrl,
            );
            if (cancelled) {
                return;
            }
            if (lost.length) {
                toast.error(
                    tr(`${isSession ? 'sessions' : 'presets'}.file_lost`, {
                        files: lost.map((r) => r.filename).join(', '),
                    }),
                );
            }
            const mediaFields = new Set([
                ...refs.map((r) => r.field),
                ...getReceiverFields(receivers, tab_name),
            ]);
            const merged = buildMerged(
                values,
                refs,
                getValues,
                resolved,
                mediaFields,
                api,
                tr,
                isSession ? 'sessions' : 'presets',
            );
            await refreshUploadBackups(
                merged,
                refs,
                resolved,
                filesMap,
                mediaFields,
                tab_name,
            );
            restoreValues('', stripNulls(merged));
            // Skip the rename when we are deleting the record anyway.
            if (!deleteAfter) {
                await renameStoredRecord(store, id, values, resolved, !isSession);
            }
            if (cancelled) {
                return;
            }
            dispatch(setParams({}));
            if (isSession) {
                if (deleteAfter) {
                    await deleteSession(id);
                }
                toast.success(tr('sessions.restored'));
            } else {
                toast.success((t) => (
                    <Box display='flex' alignItems='center' gap={1}>
                        <span>{tr('presets.applied')}</span>
                        <Button
                            size='small'
                            onClick={() => {
                                restoreValues('', snapshot);
                                toast.dismiss(t.id);
                            }}
                        >
                            {tr('presets.undo')}
                        </Button>
                    </Box>
                ));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [
        formInitialized,
        action,
        tab,
        tab_name,
        presetId,
        sessionId,
        id,
        deleteAfter,
        apiUrl,
        api,
        dispatch,
        getValues,
        restoreValues,
        tr,
        receivers,
        doReset,
        isPreset,
        isSession,
    ]);

    return null;
};

export { SnapshotApplier };
