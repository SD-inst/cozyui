import { SelectInput } from './SelectInput';
import { SliderInput } from './SliderInput';

export const TeaCacheInput = () => {
    return (
        <>
            <SliderInput
                min={0}
                max={1}
                step={0.01}
                defaultValue={0.1}
                name='rel_l1_thresh'
                tooltip='tea_cache'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.3}
                name='start_percent'
                tooltip='tea_cache_start'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.8}
                name='end_percent'
                tooltip='tea_cache_end'
            />
            <SelectInput
                name='cache_device'
                defaultValue='cuda'
                choices={[
                    { text: 'GPU', value: 'cuda' },
                    { text: 'RAM', value: 'cpu' },
                ]}
            />
        </>
    );
};
