import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';

export const AdvancedSettings = ({ ...props }) => {
    const tr = useTranslate();
    return (
        <Accordion sx={{ mb: 2 }} {...props}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                {tr('controls.advanced_parameters')}
            </AccordionSummary>
            <AccordionDetails>{props.children}</AccordionDetails>
        </Accordion>
    );
};
