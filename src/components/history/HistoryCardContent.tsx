import { Box, Typography } from '@mui/material';
import { useIsPhone } from '../../hooks/useIsPhone';
import { useTranslate } from '../../i18n/I18nContext';

export const HistoryCardContent = ({
    url,
    type,
}: {
    url: string;
    type: string;
}) => {
    const phone = useIsPhone();
    const tr = useTranslate();
    switch (type) {
        case 'gifs':
            return (
                <video
                    style={{
                        width: phone ? '100%' : undefined,
                    }}
                    src={url}
                    controls
                    loop
                />
            );
        case 'audio':
            return (
                <Box sx={{ display: 'flex', width: '100%' }}>
                    <audio
                        style={{
                            width: '100%',
                            padding: 8,
                        }}
                        src={url}
                        controls
                        loop
                    />
                </Box>
            );
        default:
            return (
                <Typography variant='h6'>
                    {tr('controls.unknown_media')}
                </Typography>
            );
    }
};
