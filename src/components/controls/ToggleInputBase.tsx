import { Box, FormControlLabel, Switch } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { HelpButton } from './HelpButton';
import { ToggleInputProps } from './ToggleInput';
import { Optional } from './optional';
import { Ref } from 'react';

export const ToggleInputBase = ({
    label,
    tooltip,
    value,
    baseRef,
    ...props
}: Omit<Optional<ToggleInputProps, 'name'>, 'defaultValue'> & {
    value?: boolean;
    baseRef?: Ref<any>;
}) => {
    const tr = useTranslate();
    return (
        <Box position='relative'>
            <FormControlLabel
                sx={{ mt: 1 }}
                label={label ? tr(label) : tr('controls.' + props.name)}
                control={<Switch checked={value} ref={baseRef} {...props} />}
            />
            {tooltip && <HelpButton title={tooltip} />}
        </Box>
    );
};
