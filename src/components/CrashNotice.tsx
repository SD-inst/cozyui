// The inline half of crash reporting: what a broken part of the page says about
// itself so that everything else keeps working. Crashes that leave nothing
// standing are handled by the DOM overlay in `utils/crashOverlay.ts`, which is
// the surface that still works when React itself is the thing that broke.
import { Box, Button, Typography } from '@mui/material';
import { PropsWithChildren } from 'react';
import { useTranslate } from '../i18n/I18nContext';
import { describeError } from '../utils/crashReport';
import { ErrorBoundary } from './ErrorBoundary';

export const CrashNotice = ({
    section,
    error,
    retry,
}: {
    section: string;
    error: unknown;
    retry: () => void;
}) => {
    const tr = useTranslate();
    const described = describeError(error);
    return (
        <Box
            sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'error.light',
                borderRadius: 1,
            }}
        >
            <Typography color='error.main'>
                {tr('errors.crash_section', { section })}
            </Typography>
            {/* The message is the only part of a trace that means anything to
                someone reading it on a phone. */}
            <Typography variant='body2' sx={{ mt: 1, wordBreak: 'break-word' }}>
                {described.message}
            </Typography>
            <Button sx={{ mt: 1 }} onClick={retry}>
                {tr('errors.crash_retry')}
            </Button>
        </Box>
    );
};

export const CrashBoundary = ({
    section,
    children,
}: PropsWithChildren & { section: string }) => (
    <ErrorBoundary
        fallback={(error, retry) => (
            <CrashNotice section={section} error={error} retry={retry} />
        )}
    >
        {children}
    </ErrorBoundary>
);
