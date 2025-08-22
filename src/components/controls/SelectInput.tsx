import { SelectProps } from '@mui/material';
import { useController } from 'react-hook-form';
import { Optional } from './optional';
import { SelectInputBase } from './SelectInputBase';

export type SelectInputProps = {
    defaultValue?: any;
    choices: (
        | string
        | {
              text: string;
              value: string | number;
          }
    )[];
    tooltip?: string;
    name: string;
} & Omit<SelectProps, 'label'>;

export type CustomSelectInputProps = Optional<
    SelectInputProps,
    'choices' | 'defaultValue'
>;

export const SelectInput = ({
    defaultValue = '',
    tooltip,
    ...props
}: SelectInputProps) => {
    const ctl = useController({
        name: props.name!,
        defaultValue: defaultValue,
    });
    const { ref, ...field } = ctl.field;
    return (
        <SelectInputBase
            tooltip={tooltip}
            selectRef={ref}
            {...field}
            {...props}
        ></SelectInputBase>
    );
};
