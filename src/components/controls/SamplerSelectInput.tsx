import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const SamplerSelectInput = ({ ...props }: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                { text: 'Euler', value: 'euler' },
                { text: 'Euler A', value: 'euler_ancestral' },
                { text: 'DPM++ 2M', value: 'dpmpp_2m' },
                { text: 'DPM++ 3M SDE', value: 'dpmpp_3m_sde' },
                { text: 'Gradient estimation', value: 'gradient_estimation' },
                { text: 'IPNDM', value: 'ipndm' },
            ]}
            defaultValue='dpmpp_2m'
            tooltip='sampler'
            {...props}
        />
    );
};
