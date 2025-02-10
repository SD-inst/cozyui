import { ExpandMore, Settings } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
} from '@mui/material';
import { useRef } from 'react';
import { settings } from '../../hooks/settings';
import { useBooleanSetting } from '../../hooks/useBooleanSetting';
import { useTranslate } from '../../i18n/I18nContext';
import { autoscrollSlotProps } from '../controls/utils';
import { ClearHistoryButton } from '../history/ClearHistoryButton';
import { LanguageSelect } from './LanguageSelect';
import { NotificationSetting } from './NotificationSetting';
import { SettingCheckbox } from './SettingCheckbox';
import { ImportExport } from '../history/ImportExport';

export const AppSettings = () => {
    const tr = useTranslate();
    const save_history = useBooleanSetting(settings.save_history);
    const ref = useRef<HTMLElement>(null);
    return (
        <Accordion slotProps={autoscrollSlotProps(ref)}>
            <AccordionSummary
                sx={{
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                }}
                expandIcon={<ExpandMore />}
            >
                <Settings sx={{ mr: 1 }} />
                {tr('controls.settings')}
            </AccordionSummary>
            <AccordionDetails
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                ref={ref}
            >
                <Box display='flex' flexWrap='wrap' gap={1}>
                    <SettingCheckbox name={settings.save_history} />
                    <SettingCheckbox
                        name={settings.save_outputs_locally}
                        disabled={!save_history}
                    />
                    <SettingCheckbox name={settings.disable_help} />
                </Box>
                <NotificationSetting />
                <LanguageSelect />
                <ClearHistoryButton sx={{ mt: 5 }} />
                <ImportExport />
            </AccordionDetails>
        </Accordion>
    );
};
