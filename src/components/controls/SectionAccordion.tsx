import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
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
    summaryActions,
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
    // Optional controls rendered in the summary row, right-aligned just before
    // the expand/collapse chevron (e.g. a compact export/import menu). Each such
    // control stops its own click propagation, so clicking it never toggles the
    // header.
    summaryActions?: ReactNode;
}) => {
    const tr = useTranslate();
    return (
        <Accordion defaultExpanded={defaultExpanded} sx={sx} slotProps={slotProps}>
            <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                    {icon && <>{icon} </>}
                    <Box component='span' sx={{ flexGrow: 1 }}>
                        {tr(label)}
                    </Box>
                    {summaryActions}
                </Box>
            </AccordionSummary>
            <AccordionDetails ref={detailsRef} sx={detailsSx}>
                {children}
            </AccordionDetails>
        </Accordion>
    );
};
