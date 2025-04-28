import { Download } from '@mui/icons-material';
import { Box, Button, ButtonGroup, SxProps } from '@mui/material';
import { useLightboxState } from 'yet-another-react-lightbox';
import { useTranslate } from '../../i18n/I18nContext';

export const DownloadImageButton = ({
    url,
    lightbox = false,
    sx,
}: {
    url: string;
    lightbox?: boolean;
    sx?: SxProps;
}) => {
    const tr = useTranslate();
    const handleSaveJPG = () => {
        const canvas = document.createElement('canvas');
        const image = new Image();
        image.src = url;
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            alert(`Couldn't get canvas context`);
            return;
        }
        ctx.drawImage(image, 0, 0);
        canvas.toBlob((blob: Blob | null) => {
            if (!blob) {
                alert(`Couldn't convert png to jpg`);
                return;
            }
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (
                new URL(url, location.href).searchParams.get('filename') ||
                'image.png'
            ).replace(/\.png$/, '.jpg');
            a.click();
        }, 'image/jpeg');
    };
    if (lightbox) {
        return (
            <Box sx={{ mt: 1, ...sx }}>
                <ButtonGroup variant='outlined' color='success' size='small'>
                    <Button onClick={handleSaveJPG}>
                        <Download />
                    </Button>
                    <a download href={url}>
                        <Button>
                            PNG <Download />
                        </Button>
                    </a>
                </ButtonGroup>
            </Box>
        );
    } else {
        return (
            <ButtonGroup variant='contained' sx={sx}>
                <Button color='success' onClick={handleSaveJPG}>
                    {tr('controls.download')}
                </Button>
                <a download href={url}>
                    <Button color='success'>
                        {tr('controls.download_png')}
                    </Button>
                </a>
            </ButtonGroup>
        );
    }
};

export const DownloadImageButtonLightbox = () => {
    const { currentSlide } = useLightboxState();
    return (
        <DownloadImageButton
            lightbox
            url={currentSlide?.src || ''}
            sx={{ mr: 2 }}
        />
    );
};
