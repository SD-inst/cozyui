import { Box, TextField } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useCtrlEnter } from '../contexts/TabContext';
import { HelpButton } from './HelpButton';
import { Optional } from './optional';
import { TextInputProps } from './TextInput';
import { Ref } from 'react';

export const TextInputBase = ({
    name,
    tooltip,
    fullWidth,
    baseRef,
    ...props
}: Optional<TextInputProps, 'name'> & { baseRef?: Ref<any> }) => {
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
                ref={baseRef}
                {...props}
            />
            {tooltip && <HelpButton title={tooltip} sx={{ mr: 4, mt: 2 }} />}
        </Box>
    );
};
