import { Box } from '@mui/material';
import { BoxOwnProps } from '@mui/system';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { useElementVisibility } from '../../hooks/useElementVisibility';

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
    const preview_root = useAppSelector((s) => s.config.preview_root);
    const { visible, ref } = useElementVisibility();
    const [model, setModel] = useState('');
    const [video, setVideo] = useState(false);
    useEffect(() => {
        setVideo(false);
        if (
            previews &&
            visible &&
            preview_root &&
            id.endsWith('.safetensors')
        ) {
            setModel(id);
        } else {
            setModel('');
        }
    }, [id, preview_root, previews, visible]);
    return (
        <Box minHeight='60px !important' {...props}>
            {previews ? (
                <>
                    <Box ref={ref} display='flex' justifyContent='center' width={50}>
                        {model ? (
                            video ? (
                                <video
                                    key={model}
                                    style={preview_style}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    preload='none'
                                    src={
                                        preview_root +
                                        '/' +
                                        model.replace(
                                            /(\.safetensors)$/,
                                            '.preview.mp4',
                                        )
                                    }
                                />
                            ) : (
                                <img
                                    key={model}
                                    style={preview_style}
                                    loading='lazy'
                                    src={
                                        preview_root +
                                        '/' +
                                        model.replace(
                                            /(\.safetensors)$/,
                                            '.preview.png',
                                        )
                                    }
                                    onError={() => setVideo(true)}
                                />
                            )
                        ) : null}
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
