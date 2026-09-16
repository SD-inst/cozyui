import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Typography,
    useEventCallback,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { makeOutputUrl } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useResult } from '../../hooks/useResult';
import { useTranslate } from '../../i18n/I18nContext';
import { useAppDispatch } from '../../redux/hooks';
import { actionEnum, setParams, setTab } from '../../redux/tab';

/**
 * Displays the ABC notation produced by the YuE2 generation (the text result,
 * index 1) in a collapsed accordion under the audio result, with a button that
 * pushes it into the editable `abc` field.
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
    const apiUrl = useApiURL();
    const results = useResult({ index: 1 });
    const { setValue } = useFormContext();
    const dispatch = useAppDispatch();
    const [abcText, setAbcText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!results.length) {
                setAbcText('');
                return;
            }
            setLoading(true);
            try {
                const r: any = results[0];
                if (typeof r === 'string') {
                    setAbcText(r);
                } else if (r?.text != null) {
                    setAbcText(
                        typeof r.text === 'string'
                            ? r.text
                            : JSON.stringify(r.text),
                    );
                } else if (r?.filename) {
                    const resp = await fetch(makeOutputUrl(apiUrl, r));
                    setAbcText(await resp.text());
                } else {
                    setAbcText('');
                }
            } catch (e) {
                console.log(e);
                setAbcText('');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [results, apiUrl]);

    const sendToField = useEventCallback(() => {
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

    if (!results.length) {
        return null;
    }

    return (
        <Accordion sx={{ mt: 2 }}>
            <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-label={tr('controls.abc_notation')}
            >
                <Typography>{tr('controls.abc_notation')}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                {loading ? (
                    <Typography variant='body2' color='textSecondary'>
                        {tr('controls.please_wait')}
                    </Typography>
                ) : abcText ? (
                    <Box display='flex' flexDirection='column' gap={1}>
                        <Typography
                            variant='body2'
                            sx={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 320,
                                overflowY: 'auto',
                            }}
                        >
                            {abcText}
                        </Typography>
                        <Button
                            variant='contained'
                            color='primary'
                            onClick={sendToField}
                        >
                            {targetTab
                                ? tr('controls.abc_send_to_tab')
                                : tr('controls.abc_send_to_field')}
                        </Button>
                    </Box>
                ) : (
                    <Typography variant='body2' color='textSecondary'>
                        {tr('controls.abc_empty')}
                    </Typography>
                )}
            </AccordionDetails>
        </Accordion>
    );
};
