import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useResult } from '../../hooks/useResult';
import { VerticalBox } from '../VerticalBox';
import { useApiURL } from '../../hooks/useApiURL';

export const VideoResult = () => {
    const results = useResult();
    const videoRef = useRef<HTMLVideoElement>(null);
    const apiUrl = useApiURL();
    useEffect(() => {
        if (results.length && videoRef.current) {
            videoRef.current?.scrollIntoView();
        }
    }, [results]);
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>Video</Typography>
            {results?.map((r: any) => {
                const url = `${apiUrl}/api/view?filename=${r.filename}&subfolder=${r.subfolder}&type=${r.type}`;
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
                                Download
                            </Button>
                        </a>
                    </VerticalBox>
                );
            })}
        </VerticalBox>
    );
};
