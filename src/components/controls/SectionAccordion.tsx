import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
} from '@mui/material';
import { ReactNode } from 'react';
import { useTranslate } from '../../i18n/I18nContext';

export const SectionAccordion = ({
    label,
    children,
    defaultExpanded,
    sx,
}: {
    label: string;
    children: ReactNode;
    defaultExpanded?: boolean;
    sx?: any;
}) => {
    const tr = useTranslate();
    return (
        <Accordion defaultExpanded={defaultExpanded} sx={sx}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                {tr(label)}
            </AccordionSummary>
            <AccordionDetails>{children}</AccordionDetails>
        </Accordion>
    );
};
