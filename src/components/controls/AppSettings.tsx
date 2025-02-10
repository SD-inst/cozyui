import { ExpandMore, Settings } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { useRef } from 'react';
import { settings, useBooleanSetting } from '../../hooks/useSaveOutputsLocally';
import { ClearHistoryButton } from '../history/ClearHistoryButton';
import { SettingCheckbox } from './SettingCheckbox';
import { autoscrollSlotProps } from './utils';

export const AppSettings = () => {
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
                Settings
            </AccordionSummary>
            <AccordionDetails ref={ref}>
                <SettingCheckbox
                    name={settings.save_history}
                    label='Save history locally'
                />
                <SettingCheckbox
                    name={settings.save_outputs_locally}
                    label='Save generation results locally'
                    disabled={!save_history}
                />
                <SettingCheckbox
                    name={settings.disable_help}
                    label='Disable tooltips'
                />
                <ClearHistoryButton sx={{ mt: 5 }} />
            </AccordionDetails>
        </Accordion>
    );
};
