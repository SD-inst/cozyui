import { Box, Typography } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import { DownloadImageButtonLightbox } from '../controls/DownloadImageButton';
import { LightboxSendResultButton } from '../controls/LightboxSendResultButton';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';

export const HistoryCardContent = ({
    url,
    type,
    filename,
}: {
    url: string;
    type: string;
    filename: string;
}) => {
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    switch (type) {
        case 'gifs':
            return (
                <video
                    style={{
                        width: '100%',
                        maxHeight: 500,
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
        case 'images':
            return (
                <Box>
                    <img
                        style={{
                            width: '100%',
                            cursor: 'pointer',
                            maxHeight: 300,
                        }}
                        src={url}
                        onClick={() => setOpen(true)}
                    />
                    <ResultOverrideContextProvider
                        value={{
                            id: 'history',
                            type,
                            url,
                            filename,
                        }}
                    >
                        <Lightbox
                            open={open}
                            close={() => setOpen(false)}
                            slides={[{ src: url }]}
                            carousel={{ finite: true }}
                            plugins={[Zoom, Fullscreen]}
                            zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
                            toolbar={{
                                buttons: [
                                    <LightboxSendResultButton icon />,
                                    <DownloadImageButtonLightbox />,
                                    'close',
                                ],
                            }}
                            controller={{
                                closeOnBackdropClick: true,
                            }}
                        />
                    </ResultOverrideContextProvider>
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
