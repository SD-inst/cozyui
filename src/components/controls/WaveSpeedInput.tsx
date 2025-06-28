import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { SliderInput } from './SliderInput';

export const WaveSpeedInput = () => {
    const { setValue, watch } = useFormContext();
    const nag = watch('nag');
    useEffect(() => {
        if (nag && nag.enabled) {
            setValue('wave_speed_maxhit', 0);
        }
    }, [nag, setValue]);
    return (
        <>
            <SliderInput
                min={0}
                max={1}
                step={0.01}
                defaultValue={0.1}
                name='wave_speed'
                tooltip='wave_speed'
            />
            <SliderInput
                min={-1}
                max={10}
                step={1}
                defaultValue={2}
                disabled={nag && nag.enabled}
                name='wave_speed_maxhit'
                tooltip='wave_speed_maxhit'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.2}
                name='wave_speed_start'
                tooltip='wave_speed_start'
            />
            <SliderInput
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.9}
                name='wave_speed_end'
                tooltip='wave_speed_end'
            />
        </>
    );
};
