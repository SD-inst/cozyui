import { Box, FormControlLabel, Switch, SwitchProps } from '@mui/material';
import { useTranslate } from '../../i18n/I18nContext';
import { useController } from 'react-hook-form';
import { HelpButton } from './HelpButton';

export type ToggleInputProps = Omit<SwitchProps, 'defaultValue'> & {
    name: string;
    label?: string;
    tooltip?: string;
    defaultValue?: boolean;
};

export const ToggleInput = ({
    label,
    tooltip,
    defaultValue,
    ...props
}: ToggleInputProps) => {
    const tr = useTranslate();
    const {
        field: { value, ...field },
    } = useController({ name: props.name, defaultValue });
    return (
        <Box position='relative'>
            <FormControlLabel
                sx={{ mt: 1 }}
                label={label ? tr(label) : tr('controls.' + props.name)}
                control={<Switch checked={value} {...field} {...props} />}
            />
            {tooltip && <HelpButton title={tooltip} />}
        </Box>
    );
};
