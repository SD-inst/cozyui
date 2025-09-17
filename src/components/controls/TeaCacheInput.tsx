import { SliderInput } from './SliderInput';

export const TeaCacheInput = () => {
    return (
        <>
            <SliderInput
                min={0}
                max={1}
                step={0.01}
                defaultValue={0.1}
                name='reuse_threshold'
                tooltip='tea_cache'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.15}
                name='start_percent'
                tooltip='tea_cache_start'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.95}
                name='end_percent'
                tooltip='tea_cache_end'
            />
        </>
    );
};
