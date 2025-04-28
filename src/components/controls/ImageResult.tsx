import { Typography } from '@mui/material';
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
import { DownloadImageButton } from './DownloadImageButton';
import { ImagePreview } from './ImagePreview';

export const ImageResult = ({ title }: { title?: string }) => {
    const results = useResult();
    const tr = useTranslate();
    const lbRef = useRef<HTMLVideoElement & HTMLImageElement>(null);
    const apiUrl = useApiURL();
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (results.length && lbRef.current) {
            lbRef.current?.scrollIntoView();
        }
    }, [results]);
    useSaveToHistory();
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>
                {title || tr('controls.image')}
            </Typography>
            {results?.map((r: any) => {
                const url = makeOutputUrl(apiUrl, r);
                return (
                    <VerticalBox key={r.filename}>
                        <img
                            ref={lbRef}
                            style={{ width: '100%', cursor: 'pointer' }}
                            src={url}
                            onClick={() => setOpen(true)}
                        />
                        <Lightbox
                            open={open}
                            close={() => setOpen(false)}
                            slides={[{ src: url }]}
                            carousel={{ finite: true }}
                            plugins={[Zoom, Fullscreen]}
                            zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
                        />
                        <DownloadImageButton url={url} />
                    </VerticalBox>
                );
            })}
            <ImagePreview size={400} />
        </VerticalBox>
    );
};
