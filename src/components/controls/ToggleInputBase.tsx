import { Box, FormControlLabel, Switch } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { HelpButton } from './HelpButton';
import { ToggleInputProps } from './ToggleInput';
import { Optional } from './optional';

export const ToggleInputBase = ({
    label,
    tooltip,
    value,
    ...props
}: Omit<Optional<ToggleInputProps, 'name'>, 'defaultValue'> & {
    value?: boolean;
}) => {
    const tr = useTranslate();
    return (
        <Box position='relative'>
            <FormControlLabel
                sx={{ mt: 1 }}
                label={label ? tr(label) : tr('controls.' + props.name)}
                control={<Switch checked={value} {...props} />}
            />
            {tooltip && <HelpButton title={tooltip} />}
        </Box>
    );
};
