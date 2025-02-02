import { ExpandMore, Settings } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { ClearHistoryButton } from './ClearHistoryButton';
import { SettingCheckbox } from './SettingCheckbox';
import { settings, useBooleanSetting } from '../../hooks/useSaveOutputsLocally';

export const HistorySettings = () => {
    const save_history = useBooleanSetting(settings.save_history);
    return (
        <Accordion>
            <AccordionSummary
                sx={{
                    '& .MuiAccordionSummary-content': { alignItems: 'center' },
                }}
                expandIcon={<ExpandMore />}
            >
                <Settings sx={{ mr: 1 }} /> History settings
            </AccordionSummary>
            <AccordionDetails>
                <SettingCheckbox
                    name={settings.save_history}
                    label='Save history locally'
                />
                <SettingCheckbox
                    name={settings.save_outputs_locally}
                    label='Save generation results locally'
                    disabled={!save_history}
                />
                <ClearHistoryButton sx={{ mt: 5 }} />
            </AccordionDetails>
        </Accordion>
    );
};
