import { Box, Typography } from '@mui/material';
import { useIsPhone } from '../../hooks/useIsPhone';

export const HistoryCardContent = ({
    url,
    type,
}: {
    url: string;
    type: string;
}) => {
    const phone = useIsPhone();
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
            return <Typography variant='h6'>Unknown media</Typography>;
    }
};
