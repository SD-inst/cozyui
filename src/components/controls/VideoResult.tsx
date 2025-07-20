import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { makeOutputUrl } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useResult } from '../../hooks/useResult';
import { useSaveToHistory } from '../../hooks/useSaveToHistory';
import { useTranslate } from '../../i18n/I18nContext';
import { VerticalBox } from '../VerticalBox';
import { VideoPreview } from './VideoPreview';

export type VideoResultProps = {
    title?: string;
    rate_override?: number;
    fps?: number;
};

export const VideoResult = ({
    title,
    rate_override,
    fps,
}: VideoResultProps) => {
    const results = useResult();
    const tr = useTranslate();
    const videoRef = useRef<HTMLVideoElement & HTMLImageElement>(null);
    const apiUrl = useApiURL();
    useEffect(() => {
        setTimeout(() => {
            if (results.length && videoRef.current) {
                videoRef.current?.scrollIntoView();
            }
        });
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
                        {r.filename.endsWith('.webp') ? (
                            <img
                                ref={videoRef}
                                style={{ width: '100%' }}
                                src={url}
                            />
                        ) : (
                            <video
                                ref={videoRef}
                                style={{ width: '100%' }}
                                src={url}
                                controls
                                autoPlay
                                loop
                            />
                        )}
                        <a download href={url}>
                            <Button variant='contained' color='success'>
                                {tr('controls.download')}
                            </Button>
                        </a>
                    </VerticalBox>
                );
            })}
            <VideoPreview size={300} rate_override={rate_override} fps={fps} />
        </VerticalBox>
    );
};
