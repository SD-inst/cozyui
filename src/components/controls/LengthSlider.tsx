import { SliderProps } from '@mui/material';
import { Mark } from '@mui/material/Slider/useSlider.types';
import { SliderInput } from './SliderInput';
import { useWatch } from 'react-hook-form';

export const LengthInput = ({
    min,
    max,
    step,
    fps,
    ...props
}: {
    min: number;
    max: number;
    step: number;
    label?: string;
    fps?: number;
} & SliderProps) => {
    const value = useWatch({
        name: props.name!,
        defaultValue: props.defaultValue,
    });
    return (
        <SliderInput
            min={5}
            max={257}
            marks={(() => {
                const result: Mark[] = [];
                for (let i = 1; i <= (max - min) / step + 1; i++) {
                    result.push({ value: i * step + 1 });
                }
                return result;
            })()}
            step={null}
            track={false}
            label={
                fps
                    ? `${props.label || props.name} [${(value / fps).toFixed(
                          1
                      )} s]`
                    : props.label
            }
            {...props}
        />
    );
};
