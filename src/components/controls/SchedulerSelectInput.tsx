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
            defaultValue='normal'
            tooltip='Defines time step distribution. There are usually 1000 steps in these models, but we only sample 10-50 instead. Scheduler decides which exact steps out of 1000 to choose. May increase or decrease quality and artifacts.'
            {...props}
        />
    );
};
