import { Button, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useResult } from '../../hooks/useResult';
import { VerticalBox } from '../VerticalBox';

export const VideoResult = () => {
    let results = useResult();
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (results.length && videoRef.current) {
            videoRef.current?.scrollIntoView();
        }
    }, [results]);
    return (
        <VerticalBox width='100%'>
            <Typography variant='body1'>Video</Typography>
            {results?.map((r: any) => {
                const url = `/cui/api/view?filename=${r.filename}&subfolder=${r.subfolder}&type=${r.type}`;
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
