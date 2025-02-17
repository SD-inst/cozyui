import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { makeOutputUrl } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useResult } from '../../hooks/useResult';
import { useSaveToHistory } from '../../hooks/useSaveToHistory';
import { VerticalBox } from '../VerticalBox';
import { useTranslate } from '../../i18n/I18nContext';

export const VideoResult = ({ title }: { title?: string }) => {
    const results = useResult();
    const tr = useTranslate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const apiUrl = useApiURL();
    useEffect(() => {
        if (results.length && videoRef.current) {
            videoRef.current?.scrollIntoView();
        }
    }, [results]);
    useSaveToHistory();
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>
                {title || tr('controls.video')}
            </Typography>
            {results?.map((r: any) => {
                const url = makeOutputUrl(apiUrl, r);
                return (
                    <VerticalBox key={r.filename}>
                        <video
                            ref={videoRef}
                            style={{ width: '100%' }}
                            src={url}
                            controls
                            autoPlay
                            loop
                        />
                        <a download href={url}>
                            <Button variant='contained' color='success'>
                                {tr('controls.download')}
                            </Button>
                        </a>
                    </VerticalBox>
                );
            })}
        </VerticalBox>
    );
};
