import { Reply } from '@mui/icons-material';
import { Box, Button, ButtonProps } from '@mui/material';
import { useSendResult } from '../../hooks/useSendToUpscale';
import { useTranslate } from '../../i18n/I18nContext';

export type SendToUpscaleButtonProps = ButtonProps & {
    targetTab?: string;
    fields?: string[];
    index?: number;
    icon?: boolean;
    label?: string;
};

export const SendResultButton = ({
    targetTab,
    fields,
    index = 0,
    icon = false,
    onClick,
    label = 'send_to_upscale',
    ...props
}: SendToUpscaleButtonProps) => {
    const tr = useTranslate();
    const handleSend = useSendResult({ targetTab, fields, index });
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
                    <Reply transform='scale(-1, 1)' />
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
                {tr('controls.' + label)}
            </Button>
        );
    }
};
