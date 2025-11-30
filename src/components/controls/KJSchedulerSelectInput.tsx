import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const KJSchedulerSelectInput = ({
    ...props
}: CustomSelectInputProps) => {
    return (
        <SelectInput
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
                    text: 'SA Solver',
                    value: 'SASolverScheduler',
                },
                {
                    text: 'UniPC',
                    value: 'UniPCMultistepScheduler',
                },
            ]}
            defaultValue='DPMSolverMultistepScheduler'
            tooltip='sampler'
            {...props}
        />
    );
};
