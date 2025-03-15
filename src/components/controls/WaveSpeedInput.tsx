import { SliderInput } from './SliderInput';

export const WaveSpeedInput = () => {
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
