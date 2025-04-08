import { Box, FormControlLabel, Switch, SwitchProps } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useController } from 'react-hook-form';
import { HelpButton } from './HelpButton';

export type ToggleInputProps = SwitchProps & {
    name: string;
    label?: string;
    tooltip?: string;
};

export const ToggleInput = ({ label, tooltip, ...props }: ToggleInputProps) => {
    const tr = useTranslate();
    const {
        field: { value, ...field },
    } = useController({ name: props.name, defaultValue: false });
    return (
        <Box position='relative'>
            <FormControlLabel
                sx={{ mt: 1 }}
                label={label ? tr(label) : tr('controls.' + props.name)}
                control={<Switch checked={value} {...field} {...props} />}
            />
        {tooltip && <HelpButton title={tooltip}  />}
        </Box>
    );
};
