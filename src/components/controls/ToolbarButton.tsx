import { IconButton, Tooltip, type IconButtonProps } from '@mui/material';

export interface ToolbarButtonProps {
    title: string;
    icon: React.ReactNode;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    size?: 'small' | 'medium';
    hoverColor?: string;
    iconButtonProps?: IconButtonProps;
}

/**
 * A styled tooltip button for toolbar use with dark theme.
 */
export function ToolbarButton({
    title,
    icon,
    onClick,
    disabled,
    size = 'small',
    hoverColor,
    iconButtonProps,
}: ToolbarButtonProps) {
    return (
        <Tooltip title={title}>
            <IconButton
                onClick={onClick}
                disabled={disabled}
                size={size}
                sx={{
                    color: 'white',
                    ...(hoverColor
                        ? {
                              '&:hover': { color: hoverColor },
                              '&:active': { color: hoverColor },
                          }
                        : {
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                              '&.Mui-disabled': {
                                  color: 'rgba(255,255,255,0.3)',
                              },
                          }),
                    '&:active': { bgcolor: 'transparent' },
                    ...iconButtonProps?.sx,
                }}
                {...iconButtonProps}
            >
                {icon}
            </IconButton>
        </Tooltip>
    );
}
