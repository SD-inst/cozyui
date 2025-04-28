import { Box, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import { makeOutputUrl } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useResult } from '../../hooks/useResult';
import { useSaveToHistory } from '../../hooks/useSaveToHistory';
import { useTranslate } from '../../i18n/I18nContext';
import { VerticalBox } from '../VerticalBox';

import 'yet-another-react-lightbox/styles.css';
import {
    DownloadImageButton,
    DownloadImageButtonLightbox,
} from './DownloadImageButton';
import { ImagePreview } from './ImagePreview';

export const ImageResult = ({ title }: { title?: string }) => {
    const results = useResult();
    const tr = useTranslate();
    const lbRef = useRef<HTMLVideoElement & HTMLImageElement>(null);
    const apiUrl = useApiURL();
    const [open, setOpen] = useState(false);
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        if (results.length && lbRef.current) {
            lbRef.current?.scrollIntoView();
        }
    }, [results]);
    useSaveToHistory();
    const urls = results?.map((r: any) => makeOutputUrl(apiUrl, r));
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>
                {title || tr('controls.image')}
            </Typography>
            <Box
                display='flex'
                flexDirection='row'
                justifyContent={urls.length === 1 ? 'center' : 'flex-start'}
                gap={1}
                overflow='auto'
                width='100%'
            >
                {urls.map((url: any, i: number) => (
                    <img
                        ref={lbRef}
                        style={{
                            maxHeight: 400,
                            maxWidth: 200,
                            cursor: 'pointer',
                        }}
                        src={url}
                        onClick={() => {
                            setOpen(true);
                            setIdx(i);
                        }}
                    />
                ))}
            </Box>
            {urls.length === 1 ? <DownloadImageButton url={urls[0]} /> : null}
            <Lightbox
                open={open}
                close={() => setOpen(false)}
                slides={urls.map((url) => ({ src: url }))}
                carousel={{ finite: true }}
                plugins={[Zoom, Fullscreen]}
                zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
                index={idx}
                toolbar={{
                    buttons: [<DownloadImageButtonLightbox />, 'close'],
                }}
            />
            <ImagePreview size={400} />
        </VerticalBox>
    );
};
