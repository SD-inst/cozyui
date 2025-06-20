import { Box } from '@mui/material';
import { BoxOwnProps } from '@mui/system';
import { ReactElement, useEffect, useState } from 'react';
import { useAppSelector } from '../../redux/hooks';

const preview_style = { maxWidth: '50px', maxHeight: '50px' };

export const ModelOption = ({
    value,
    id,
    previews = true,
    ...props
}: {
    value: string;
    id: string;
    previews?: boolean;
} & BoxOwnProps) => {
    const [preview, setPreview] = useState<ReactElement>();
    const preview_root = useAppSelector((s) => s.config.preview_root);
    useEffect(() => {
        if (!previews || !preview_root || !id.endsWith('.safetensors')) {
            return;
        }
        const preview_img =
            preview_root + '/' + id.replace(/(\.safetensors)$/, '.preview.png');
        setPreview(
            <img
                style={preview_style}
                src={preview_img}
                onError={() => {
                    const preview_vid =
                        preview_root +
                        '/' +
                        id.replace(/(\.safetensors)$/, '.preview.mp4');
                    setPreview(
                        <video
                            style={preview_style}
                            autoPlay
                            loop
                            muted
                            src={preview_vid}
                        />
                    );
                }}
            />
        );
    }, [id, preview_root, previews]);
    return (
        <Box minHeight='60px !important' {...props}>
            {previews ? (
                <>
                    <Box display='flex' justifyContent='center' width={50}>
                        {preview}
                    </Box>
                    <Box position='absolute' left={80}>
                        {value}
                    </Box>
                </>
            ) : (
                <Box sx={{ wordBreak: 'break-word' }}>{value}</Box>
            )}
        </Box>
    );
};
