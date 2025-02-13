import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { makeOutputUrl } from '../../api/utils';
import { useApiURL } from '../../hooks/useApiURL';
import { useResult } from '../../hooks/useResult';
import { useSaveToHistory } from '../../hooks/useSaveToHistory';
import { VerticalBox } from '../VerticalBox';

export const AudioResult = ({ title }: { title?: string }) => {
    const results = useResult();
    const audioRef = useRef<HTMLAudioElement>(null);
    const apiUrl = useApiURL();
    useEffect(() => {
        if (results.length && audioRef.current) {
            audioRef.current?.scrollIntoView();
        }
    }, [results]);
    useSaveToHistory();
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>{title || 'Audio'}</Typography>
            {results?.map((r: any) => {
                const url = makeOutputUrl(apiUrl, r);
                return (
                    <VerticalBox key={r.filename} width='100%'>
                        <audio
                            ref={audioRef}
                            style={{ width: '100%' }}
                            src={url}
                            controls
                            autoPlay
                            loop
                        />
                        <a download href={url}>
                            <Button variant='contained' color='success'>
                                Download
                            </Button>
                        </a>
                    </VerticalBox>
                );
            })}
        </VerticalBox>
    );
};
