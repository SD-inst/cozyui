import { ExpandMore, Settings } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { ClearHistoryButton } from './ClearHistoryButton';
import { SaveOutputs } from './SaveOutputs';

export const HistorySettings = () => {
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
                <SaveOutputs />
                <ClearHistoryButton sx={{mt: 5}} />
            </AccordionDetails>
        </Accordion>
    );
};
