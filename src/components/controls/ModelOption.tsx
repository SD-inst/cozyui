import { useState, ReactElement, useEffect } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { Box } from '@mui/material';

const preview_style = { maxWidth: '50px', maxHeight: '50px' };

export const ModelOption = ({
    value,
    id,
    ...props
}: {
    value: string;
    id: string;
}) => {
    const [preview, setPreview] = useState<ReactElement>();
    const preview_root = useAppSelector((s) => s.config.preview_root);
    useEffect(() => {
        if (!preview_root || !id.endsWith('.safetensors')) {
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
    }, [id, preview_root]);
    return (
        <Box {...props}>
            <Box display='flex' justifyContent='center' width={50}>
                {preview}
            </Box>
            <Box position='absolute' left={80}>
                {value}
            </Box>
        </Box>
    );
};
