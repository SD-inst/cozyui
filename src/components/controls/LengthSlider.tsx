import { SliderProps } from '@mui/material';
import { Mark } from '@mui/material/Slider/useSlider.types';
import { SliderInput } from './SliderInput';
import { useWatch } from 'react-hook-form';
import { useTranslate } from '../../i18n/I18nContext';

export type LengthInputProps = {
    name: string;
    min: number;
    max: number;
    step?: number;
    fps?: number;
} & SliderProps;

export const LengthInput = ({
    min,
    max,
    step = 1,
    fps,
    ...props
}: LengthInputProps) => {
    const tr = useTranslate();
    const value = useWatch({
        name: props.name!,
        defaultValue: props.defaultValue,
    });
    return (
        <SliderInput
            min={min}
            max={max}
            marks={(() => {
                const result: Mark[] = [];
                for (let i = 1; i <= (max - min) / step + 1; i++) {
                    result.push({ value: i * step + 1 });
                }
                return result;
            })()}
            step={null}
            track={false}
            suffix={
                fps
                    ? tr('controls.duration', { sec: (value / fps).toFixed(1) })
                    : ''
            }
            {...props}
        />
    );
};
