import { SwitchProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { ToggleInputBase } from './ToggleInputBase';

export type ToggleInputProps = Omit<SwitchProps, 'defaultValue'> & {
    name: string;
    label?: string;
    tooltip?: string;
    defaultValue?: boolean;
};

export const ToggleInput = ({
    defaultValue = false,
    ...props
}: ToggleInputProps) => {
    const { field } = useController({ name: props.name, defaultValue });
    return <ToggleInputBase {...field} {...props} />;
};
