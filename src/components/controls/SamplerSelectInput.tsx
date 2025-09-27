import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const SamplerSelectInput = ({ ...props }: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                { text: 'Euler', value: 'euler' },
                { text: 'Euler A', value: 'euler_ancestral' },
                { text: 'DPM++ 2M', value: 'dpmpp_2m' },
                { text: 'DPM++ 2M SDE', value: 'dpmpp_2m_sde' },
                { text: 'DPM++ 3M SDE', value: 'dpmpp_3m_sde' },
                { text: 'Res multistep', value: 'res_multistep' },
                { text: 'Gradient estimation', value: 'gradient_estimation' },
                { text: 'IPNDM', value: 'ipndm' },
                { text: 'LCM', value: 'lcm' },
                { text: 'UniPC', value: 'uni_pc' },
                { text: 'UniPC BH2', value: 'uni_pc_bh2' },
                { text: 'DEIS', value: 'deis' },
                { text: 'DEIS 2M', value: 'deis_2m' },
                { text: 'DEIS 3M', value: 'deis_3m' },
                { text: 'Res 2S', value: 'res_2s' },
                { text: 'Res 3S', value: 'res_3s' },
                { text: 'Res 2M', value: 'res_2m' },
                { text: 'Res 3M', value: 'res_3m' },
            ]}
            defaultValue='res_multistep'
            tooltip='sampler'
            {...props}
        />
    );
};
