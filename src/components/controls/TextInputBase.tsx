import { Box, TextField } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useCtrlEnter } from '../contexts/TabContext';
import { HelpButton } from './HelpButton';
import { Optional } from './optional';
import { TextInputProps } from './TextInput';

export const TextInputBase = ({
    name,
    tooltip,
    fullWidth,
    ...props
}: Optional<TextInputProps, 'name'>) => {
    const tr = useTranslate();
    const ceHandler = useCtrlEnter();
    return (
        <Box
            sx={{ position: 'relative', width: fullWidth ? '100%' : undefined }}
        >
            <TextField
                label={name ? tr('controls.' + name) : undefined}
                fullWidth
                onKeyUp={(e) => {
                    if (props.onKeyUp) {
                        props.onKeyUp(e);
                    }
                    ceHandler(e);
                }}
                {...props}
            />
            {tooltip && <HelpButton title={tooltip} sx={{ mr: 4, mt: 2 }} />}
        </Box>
    );
};
