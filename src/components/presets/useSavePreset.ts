import { useContext, useState } from 'react';
import { clone } from 'lodash';
import toast from 'react-hot-toast';
import { FileMissingError, getFileFromServer } from '../../api/files';
import { useApiURL } from '../../hooks/useApiURL';
import { useCurrentTab } from '../../hooks/useCurrentTab';
import { useTranslate } from '../../i18n/I18nContext';
import { genId } from '../../utils/id';
import { filterFormValues } from '../../utils/filterFormValues';
import { WorkflowTabsContext } from '../contexts/WorkflowTabsContext';
import {
    DEFAULT_OFF_FIELDS,
    EXCLUDE_FIELDS,
    getReceiverFields,
    walkMediaFields,
} from '../../utils/mediaFields';
import {
    defaultPresetName,
    MediaRow,
    PresetDraft,
    savePresetDraft,
} from './draft';
import { getCurrentFormValues } from './formRegistry';

export const useSavePreset = () => {
    const currentTab = useCurrentTab();
    const apiUrl = useApiURL();
    const tr = useTranslate();
    const { receivers } = useContext(WorkflowTabsContext);
    const [open, setOpen] = useState(false);
    const [collecting, setCollecting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState<PresetDraft | null>(null);

    const startCapture = async () => {
        if (!apiUrl || !currentTab) {
            return;
        }
        const rawValues = getCurrentFormValues(currentTab);
        if (!rawValues) {
            return;
        }
        setCollecting(true);
        try {
            const all: any = filterFormValues(rawValues);
            for (const f of EXCLUDE_FIELDS) {
                delete all[f];
            }
            const refs = walkMediaFields(all);
            // structurally known media fields (WFTab receivers) count as
            // media even when empty, so they do not leak into params
            const mediaFields = new Set([
                ...refs.map((r) => r.field),
                ...getReceiverFields(receivers, currentTab),
            ]);
            const media = await Promise.all(
                refs.map(async (ref): Promise<MediaRow> => {
                    const row: MediaRow = {
                        id: genId(),
                        field: ref.field,
                        index: ref.index,
                        key: ref.key,
                        filename: ref.filename,
                        kind: ref.kind,
                        entry:
                            ref.index !== undefined
                                ? clone(all[ref.field][ref.index])
                                : undefined,
                        included: true,
                    };
                    try {
                        row.file = await getFileFromServer(ref.filename, apiUrl);
                    } catch (e) {
                        row.error =
                            e instanceof FileMissingError
                                ? 'missing_server'
                                : 'collect_failed';
                    }
                    return row;
                }),
            );
            const params = Object.keys(all)
                .filter((f) => !mediaFields.has(f))
                // empty arrays carry nothing and would wipe the field on apply
                .filter((f) => !Array.isArray(all[f]) || all[f].length > 0)
                .map((f) => ({
                    field: f,
                    value: all[f],
                    included: !DEFAULT_OFF_FIELDS.includes(f),
                }));
            setDraft({
                name: defaultPresetName(media, tr('presets.new_preset')),
                tab: currentTab,
                media,
                params,
            });
            setOpen(true);
        } finally {
            setCollecting(false);
        }
    };

    const save = async (): Promise<boolean> => {
        if (!draft) {
            return false;
        }
        setSaving(true);
        try {
            await savePresetDraft(draft);
            toast.success(tr('presets.saved'));
            return true;
        } catch (e) {
            toast.error(tr('toasts.error_saving_preset', { err: e }));
            console.error(e);
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        open,
        collecting,
        saving,
        draft,
        setDraft,
        startCapture,
        close: () => {
            setOpen(false);
            setDraft(null);
        },
        save,
    };
};
