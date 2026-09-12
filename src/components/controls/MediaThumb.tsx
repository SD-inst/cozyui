import { AudioFile } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { kindOf } from '../../utils/mediaFields';

// Small media thumbnail (64x64) for images/videos/audio, with a fallback icon.
export const MediaThumb = ({ file }: { file: File }) => {
    const [url, setUrl] = useState('');
    useEffect(() => {
        const u = URL.createObjectURL(file);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [file]);
    const kind = kindOf(file.name);
    if (kind === 'image') {
        return (
            <img
                src={url}
                alt=''
                style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 4,
                }}
            />
        );
    }
    if (kind === 'video') {
        return (
            <video
                src={url}
                preload='metadata'
                muted
                style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 4,
                }}
            />
        );
    }
    return (
        <div
            style={{
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                background: 'rgba(0,0,0,0.05)',
            }}
        >
            <AudioFile />
        </div>
    );
};
