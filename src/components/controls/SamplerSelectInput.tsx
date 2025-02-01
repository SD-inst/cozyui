import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const SamplerSelectInput = ({ ...props }: CustomSelectInputProps) => {
    return (
        <SelectInput
            choices={[
                { text: 'Euler', value: 'euler' },
                { text: 'Euler A', value: 'euler_ancestral' },
                { text: 'DPM++ 2M', value: 'dpmpp_2m' },
            ]}
            defaultValue='euler'
            {...props}
        />
    );
};
