import { Help } from '@mui/icons-material';
import { Tooltip, TooltipProps } from '@mui/material';
import { useBooleanSetting, settings } from '../../hooks/useSaveOutputsLocally';

export const HelpButton = ({ ...props }: Omit<TooltipProps, 'children'>) => {
    const disable_help = useBooleanSetting(settings.disable_help);
    return (
        <Tooltip arrow {...props}>
            <Help
                sx={{
                    cursor: 'pointer',
                    ml: 1,
                    right: 0,
                    position: 'absolute',
                    ...props.sx,
                    display: disable_help ? 'none' : undefined,
                }}
                color='info'
            />
        </Tooltip>
    );
};
