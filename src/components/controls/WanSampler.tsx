import { Optional } from './optional';
import { SelectInput, SelectInputProps } from './SelectInput';

export const WanSampler = ({
    ...props
}: Optional<SelectInputProps, 'choices'>) => {
    return (
        <SelectInput
            choices={[
                { text: 'UniPC', value: 'unipc' },
                { text: 'UniPC/Beta', value: 'unipc/beta' },
                { text: 'DPM++', value: 'dpm++' },
                { text: 'DPM++/Beta', value: 'dpm++/beta' },
                { text: 'DPM++ SDE', value: 'dpm++_sde' },
                { text: 'DPM++ SDE/Beta', value: 'dpm++_sde/beta' },
                { text: 'Euler', value: 'euler' },
                { text: 'Euler/Beta', value: 'euler/beta' },
                { text: 'DEIS', value: 'deis' },
                { text: 'LCM', value: 'lcm' },
                { text: 'LCM/Beta', value: 'lcm/beta' },
                { text: 'Res Multistep', value: 'res_multistep' },
                { text: 'Flowmatch Causvid', value: 'flowmatch_causvid' },
                { text: 'Flowmatch Distill', value: 'flowmatch_distill' },
                { text: 'Flowmatch Pusa', value: 'flowmatch_pusa' },
                { text: 'Multitalk', value: 'multitalk' },
            ]}
            defaultValue='res_multistep'
            sx={{ mt: 1 }}
            fullWidth
            {...props}
        />
    );
};
