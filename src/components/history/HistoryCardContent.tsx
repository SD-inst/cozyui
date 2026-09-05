import { Box, Typography } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useEffect, useMemo, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import { DownloadImageButtonLightbox } from '../controls/DownloadImageButton';
import { LightboxSendResultButton } from '../controls/LightboxSendResultButton';
import { ResultOverrideContextProvider } from '../contexts/ResultOverrideContextProvider';

export const HistoryCardContent = ({
    params,
    url,
    type,
    filename,
    data,
}: {
    params?: string;
    url: string | string[];
    type: string;
    filename: string;
    data?: Blob | Blob[];
}) => {
    const tr = useTranslate();
    const [open, setOpen] = useState(false);
    const p = params ? JSON.parse(params) : null;

    const dataUrls = useMemo(() => {
        const arr = Array.isArray(data) ? data : data ? [data] : [];
        return arr.map((d) => URL.createObjectURL(d));
    }, [data]);
    useEffect(() => () => dataUrls.forEach((u) => URL.revokeObjectURL(u)), [dataUrls]);
    const useData = dataUrls.length > 0;

    switch (type) {
        case 'gifs': {
            const gifUrl = Array.isArray(url) ? url[0] : url;
            const displayGifUrl = useData ? dataUrls[0] : gifUrl;
            return (
                <video
                    style={{
                        width: '100%',
                        maxHeight: 500,
                    }}
                    src={displayGifUrl}
                    controls
                    loop
                    playsInline
                />
            );
        }
        case 'audio': {
            const audioUrl = Array.isArray(url) ? url[0] : url;
            const displayAudioUrl = useData ? dataUrls[0] : audioUrl;
            return (
                <Box
                    sx={{
                        display: 'flex',
                        width: '100%',
                        flexDirection: 'column',
                    }}
                >
                    {p && p.values.prompt && (
                        <Typography variant='body1' sx={{ ml: 1 }}>
                            {p.values.prompt}
                        </Typography>
                    )}
                    {p && p.values.lyrics && (
                        <Typography variant='body2' sx={{ ml: 1, mt: 1 }}>
                            {(p.values.lyrics as string).slice(0, 100) +
                                (p.values.lyrics.length > 100 ? '...' : '')}
                        </Typography>
                    )}
                    <audio
                        style={{
                            width: '100%',
                            padding: 8,
                        }}
                        src={displayAudioUrl}
                        controls
                    />
                </Box>
            );
        }
        case 'images': {
            const urlArray = Array.isArray(url) ? url : [url];
            const firstUrl = useData ? dataUrls[0] : urlArray[0];
            const allSlides = useData
                ? dataUrls.map((u) => ({ src: u }))
                : urlArray.map((u) => ({ src: u }));
            const batch = useData
                ? dataUrls.map((u, i) => ({
                      url: u,
                      filename:
                          new URL(urlArray[i], location.href).searchParams.get(
                              'filename'
                          ) || '',
                      type,
                  }))
                : urlArray.map((u) => ({
                      url: u,
                      filename:
                          new URL(u, location.href).searchParams.get('filename') ||
                          '',
                      type,
                  }));
            return (
                <Box>
                    <img
                        style={{
                            width: '100%',
                            cursor: 'pointer',
                            maxHeight: 300,
                        }}
                        src={firstUrl}
                        onClick={() => setOpen(true)}
                    />
                    <ResultOverrideContextProvider
                        value={{
                            id: 'history',
                            type,
                            url: firstUrl,
                            filename,
                            batch,
                        }}
                    >
                        <Lightbox
                            open={open}
                            close={() => setOpen(false)}
                            slides={allSlides}
                            carousel={{ finite: allSlides.length === 1 }}
                            plugins={[Counter, Zoom, Fullscreen]}
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
        }

        default:
            return (
                <Typography variant='h6'>
                    {tr('controls.unknown_media')}
                </Typography>
            );
    }
};
