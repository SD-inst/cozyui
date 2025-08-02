import { Box, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Counter from 'yet-another-react-lightbox/plugins/counter';
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
import { LightboxSendResultButton } from './LightboxSendResultButton';
import { SendResultButton } from './SendResultButton';

export const ImageResult = ({
    title,
    sendTargetTab,
    sendFields,
    sendLabel,
    sendOnClick,
}: {
    title?: string;
    sendTargetTab?: string;
    sendFields?: string[];
    sendLabel?: string;
    sendOnClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) => {
    const results = useResult();
    const tr = useTranslate();
    const boxRef = useRef<HTMLDivElement>(null);
    const apiUrl = useApiURL();
    const [open, setOpen] = useState(false);
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        setTimeout(() => {
            if (results.length && boxRef.current) {
                boxRef.current.scrollIntoView();
                boxRef.current.scrollLeft = 0;
            }
        });
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
                ref={boxRef}
            >
                {urls.map((url: any, i: number) => (
                    <img
                        key={url}
                        style={{
                            maxHeight: 500,
                            maxWidth: 300,
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
                plugins={[Zoom, Fullscreen, Counter]}
                zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
                index={idx}
                toolbar={{
                    buttons: [
                        <LightboxSendResultButton
                            targetTab={sendTargetTab}
                            fields={sendFields}
                            icon
                        />,
                        <DownloadImageButtonLightbox />,
                        'close',
                    ],
                }}
                controller={{
                    closeOnBackdropClick: true,
                }}
            />
            <ImagePreview size={400} />
            <SendResultButton
                targetTab={sendTargetTab}
                fields={sendFields}
                label={sendLabel}
                onClick={sendOnClick}
            />
        </VerticalBox>
    );
};
