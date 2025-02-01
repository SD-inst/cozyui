import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const SchedulerSelectInput = ({ ...props }: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                { text: 'Simple', value: 'simple' },
                { text: 'Normal', value: 'normal' },
                { text: 'Beta', value: 'beta' },
                { text: 'Exponential', value: 'exponential' },
            ]}
            defaultValue='simple'
            {...props}
        />
    );
};
