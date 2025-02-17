import { Help } from '@mui/icons-material';
import { Tooltip, TooltipProps } from '@mui/material';
import { useBooleanSetting } from '../../hooks/useBooleanSetting';
import { settings } from '../../hooks/settings';
import { useTranslate } from '../../i18n/I18nContext';

export const HelpButton = ({
    ...props
}: { title: string } & Omit<TooltipProps, 'children'>) => {
    const disable_help = useBooleanSetting(settings.disable_help);
    const tr = useTranslate();
    return (
        <Tooltip arrow {...props} title={tr(`help.${props.title}`)}>
            <Help
                sx={{
                    cursor: 'pointer',
                    ml: 1,
                    right: 0,
                    position: 'absolute',
                    zIndex: 1000,
                    ...props.sx,
                    display: disable_help ? 'none' : undefined,
                }}
                color='info'
            />
        </Tooltip>
    );
};
