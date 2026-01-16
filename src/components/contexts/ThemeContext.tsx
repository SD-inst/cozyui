import {
    autocompleteClasses,
    Box,
    createTheme,
    ThemeProvider,
} from '@mui/material';
import { useBooleanSetting } from '../../hooks/useSetting';
import { settings } from '../../hooks/settings';

export const ThemeContext = ({ ...props }) => {
    const disable_help = useBooleanSetting(settings.disable_help);
    const theme = createTheme({
        colorSchemes: { dark: true },
        cssVariables: true,
        components: {
            MuiAutocomplete: {
                defaultProps: {
                    renderOption(props, option, _, ownerState) {
                        const { key, ...optionProps } = props;
                        return (
                            <Box
                                key={key}
                                sx={{
                                    borderRadius: '8px',
                                    wordBreak: 'break-all',
                                    margin: '5px',
                                    [`&.${autocompleteClasses.option}`]: {
                                        padding: '8px',
                                    },
                                }}
                                component='li'
                                {...optionProps}
                            >
                                {ownerState.getOptionLabel(option)}
                            </Box>
                        );
                    },
                },
            },
            MuiTooltip: {
                defaultProps: {
                    disableTouchListener: disable_help,
                    disableHoverListener: disable_help,
                },
            },
        },
    });
    return (
        <ThemeProvider theme={theme} noSsr>
            {props.children}
        </ThemeProvider>
    );
};
