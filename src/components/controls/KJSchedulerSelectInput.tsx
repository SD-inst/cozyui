import { SelectInput, SelectInputProps } from './SelectInput';

export const KJSchedulerSelectInput = ({
    ...props
}: Omit<SelectInputProps, 'choices'>) => {
    return (
        <SelectInput
            {...props}
            choices={[
                {
                    text: 'Flow Match Discrete Scheduler',
                    value: 'FlowMatchDiscreteScheduler',
                },
                {
                    text: 'DPM SDE',
                    value: 'SDE-DPMSolverMultistepScheduler',
                },
                {
                    text: 'DPM',
                    value: 'DPMSolverMultistepScheduler',
                },
                {
                    text: 'UniPC',
                    value: 'UniPCMultistepScheduler',
                },
            ]}
            defaultValue='DPMSolverMultistepScheduler'
        />
    );
};
