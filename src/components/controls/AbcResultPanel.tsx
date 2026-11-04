import { Button, useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { useTranslate } from '../../i18n/I18nContext';
import { useAppDispatch } from '../../redux/hooks';
import { actionEnum, setParams, setTab } from '../../redux/tab';
import { TextResultPanel } from './TextResultPanel';

/**
 * The ABC notation produced by a YuE2 generation (its text result, index 1),
 * shown in the shared text panel with a button that pushes it into the `abc`
 * field.
 *
 * Two modes, selected by `targetTab`:
 *  - omitted: fills the local `field` (e.g. the T2M tab's own `abc` field).
 *  - set: sends `field` to another tab's form (the T2M tab) and switches there.
 */
export const AbcResultPanel = ({
    targetTab,
    field = 'abc',
}: {
    targetTab?: string;
    field?: string;
}) => {
    const tr = useTranslate();
    const dispatch = useAppDispatch();
    const { setValue } = useFormContext();

    const sendToField = useEventCallback((abcText: string) => {
        if (targetTab) {
            dispatch(
                setParams({
                    action: actionEnum.RESTORE,
                    tab: targetTab,
                    values: { [field]: abcText },
                }),
            );
            dispatch(setTab(targetTab));
        } else {
            setValue(field, abcText);
        }
    });

    return (
        <TextResultPanel
            index={1}
            title={tr('controls.abc_notation')}
            emptyText={tr('controls.abc_empty')}
            renderAction={(abcText) => (
                <Button
                    variant='contained'
                    color='primary'
                    onClick={() => sendToField(abcText)}
                >
                    {targetTab
                        ? tr('controls.abc_send_to_tab')
                        : tr('controls.abc_send_to_field')}
                </Button>
            )}
        />
    );
};
