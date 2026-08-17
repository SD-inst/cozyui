import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
} from '@mui/material';
import { ReactNode, RefObject } from 'react';
import { useTranslate } from '../../i18n/I18nContext';

export const SectionAccordion = ({
    label,
    children,
    defaultExpanded,
    sx,
    slotProps,
    detailsRef,
    icon,
    detailsSx,
    summarySx,
}: {
    label: string;
    children: ReactNode;
    defaultExpanded?: boolean;
    sx?: any;
    slotProps?: any;
    detailsRef?: RefObject<HTMLElement | null>;
    icon?: ReactNode;
    detailsSx?: any;
    summarySx?: any;
}) => {
    const tr = useTranslate();
    return (
        <Accordion defaultExpanded={defaultExpanded} sx={sx} slotProps={slotProps}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
                {icon && <>{icon} </>}
                {tr(label)}
            </AccordionSummary>
            <AccordionDetails ref={detailsRef} sx={detailsSx}>
                {children}
            </AccordionDetails>
        </Accordion>
    );
};
