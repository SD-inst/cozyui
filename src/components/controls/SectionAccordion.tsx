import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
} from '@mui/material';
import type { SyntheticEvent } from 'react';
import { ReactNode, RefObject, useCallback, useState } from 'react';
import { useTranslate } from '../../i18n/I18nContext';

export const SectionAccordion = ({
    label,
    children,
    defaultExpanded,
    lazyContent,
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
    /**
     * Defer mounting `children` until the accordion is first expanded
     * (MUI keeps details mounted when collapsed, so heavy subtrees —
     * dynamic-import chunks, IndexedDB queries — would otherwise run at
     * page load). Once expanded, content stays mounted.
     */
    lazyContent?: boolean;
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
    const [expanded, setExpanded] = useState(!!defaultExpanded);
    // Children mount on the first expansion and stay mounted afterwards.
    // Uses the Accordion's own expansion state (not the Collapse's
    // `TransitionProps.onEntered`, which callers already use via
    // `slotProps.transition` — e.g. `autoscrollSlotProps` — and which would
    // clobber our handler).
    const [contentMounted, setContentMounted] = useState(!lazyContent);
    const handleChange = useCallback(
        (_: SyntheticEvent, next: boolean) => {
            setExpanded(next);
            if (next) {
                setContentMounted(true);
            }
        },
        [],
    );
    return (
        <Accordion
            expanded={expanded}
            onChange={handleChange}
            sx={sx}
            slotProps={slotProps}
        >
            <AccordionSummary expandIcon={<ExpandMore />} sx={summarySx}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                    {icon && <>{icon} </>}
                    <Box component='span' sx={{ flexGrow: 1 }}>
                        {tr(label)}
                    </Box>
                    {summaryActions}
                </Box>
            </AccordionSummary>
            <AccordionDetails
                ref={detailsRef}
                // An unmounted lazy subtree leaves the details block empty and
                // zero-width; with `width: 100%` the accordion still stretches
                // across its container (e.g. centered flex columns) before
                // the content loads.
                sx={
                    lazyContent && !contentMounted
                        ? { width: '100%', ...detailsSx }
                        : detailsSx
                }
            >
                {contentMounted ? children : null}
            </AccordionDetails>
        </Accordion>
    );
};
