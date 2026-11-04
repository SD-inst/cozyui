import { ExpandMore } from '@mui/icons-material';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Typography,
} from '@mui/material';
import { ReactNode } from 'react';
import { useTextResult } from '../../hooks/useTextResult';
import { useTranslate } from '../../i18n/I18nContext';

/**
 * Collapsible panel under the main result showing a text result of the current
 * tab (`index` picks which entry of the tab's `result` array). `renderAction`
 * gets the loaded text and may return a control acting on it (a "send to
 * field" button); `emptyText` replaces the generic placeholder. Renders nothing
 * while the tab has no such result yet.
 */
export const TextResultPanel = ({
    index = 1,
    title,
    emptyText,
    renderAction,
}: {
    index?: number;
    title: string;
    emptyText?: string;
    renderAction?: (text: string) => ReactNode;
}) => {
    const tr = useTranslate();
    const { results, text, loading } = useTextResult(index);

    if (!results.length) {
        return null;
    }

    return (
        <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />} aria-label={title}>
                <Typography>{title}</Typography>
            </AccordionSummary>
            <AccordionDetails>
                {loading ? (
                    <Typography variant='body2' color='textSecondary'>
                        {tr('controls.please_wait')}
                    </Typography>
                ) : text ? (
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
                            {text}
                        </Typography>
                        {renderAction?.(text)}
                    </Box>
                ) : (
                    <Typography variant='body2' color='textSecondary'>
                        {emptyText ?? tr('controls.text_result_empty')}
                    </Typography>
                )}
            </AccordionDetails>
        </Accordion>
    );
};
