import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const SchedulerSelectInput = ({ ...props }: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                { text: 'Simple', value: 'simple' },
                { text: 'Normal', value: 'normal' },
                { text: 'Beta', value: 'beta' },
                { text: 'Exponential', value: 'exponential' },
                { text: 'Karras', value: 'karras' },
                { text: 'SGM Uniform', value: 'sgm_uniform' },
                { text: 'DDIM Uniform', value: 'ddim_uniform' },
                { text: 'Linear Quadratic', value: 'linear_quadratic' },
                { text: 'KL Optimal', value: 'kl_optimal' },
                { text: 'Bong Tangent', value: 'bong_tangent' },
                { text: 'Beta57', value: 'beta57' },
            ]}
            defaultValue='normal'
            tooltip='scheduler'
            {...props}
        />
    );
};
