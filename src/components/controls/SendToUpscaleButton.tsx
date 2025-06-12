import { ZoomOutMap } from '@mui/icons-material';
import { Box, Button, ButtonProps } from '@mui/material';
import { useSendToUpscale } from '../../hooks/useSendToUpscale';
import { useTranslate } from '../../i18n/I18nContext';

export type SendToUpscaleButtonProps = ButtonProps & {
    targetTab?: string;
    fields?: string[];
    index?: number;
    icon?: boolean;
};

export const SendToUpscaleButton = ({
    targetTab,
    fields,
    index = 0,
    icon = false,
    onClick,
    ...props
}: SendToUpscaleButtonProps) => {
    const tr = useTranslate();
    const handleSend = useSendToUpscale({ targetTab, fields, index });
    if (!handleSend) {
        return null;
    }
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        handleSend();
        if (onClick) {
            onClick(e);
        }
    };
    if (icon) {
        return (
            <Box>
                <Button
                    variant='outlined'
                    color='secondary'
                    onClick={handleClick}
                    size='small'
                    {...props}
                >
                    <ZoomOutMap />
                </Button>
            </Box>
        );
    } else {
        return (
            <Button
                variant='contained'
                color='secondary'
                onClick={handleClick}
                {...props}
            >
                {tr('controls.send_to_upscale')}
            </Button>
        );
    }
};
