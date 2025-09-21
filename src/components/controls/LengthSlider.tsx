import { SliderProps } from '@mui/material';
import { Mark } from '@mui/material/Slider/useSlider.types';
import { SliderInput } from './SliderInput';
import { useWatch } from 'react-hook-form';
import { useTranslate } from '../../i18n/I18nContext';
import { useMemo } from 'react';

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
    const duration = fps
        ? value / fps < 60
            ? (value / fps).toFixed(1)
            : Math.floor(value / fps / 60)
                  .toString()
                  .padStart(2, '0') +
              ':' +
              ((value / fps) % 60)
                  .toFixed(1)
                  .replace(/^([0-9])\./, '0$1.')
                  .replace(/\.0$/, '')
        : '';
    const marks = useMemo(() => {
        const result: Mark[] = [];
        for (let i = (min - 1) / step; i <= (max - min) / step + 1; i++) {
            result.push({
                value: parseFloat((i * step + 1).toFixed(2)),
            });
        }
        return result;
    }, [max, min, step]);
    return (
        <SliderInput
            min={min}
            max={max}
            marks={marks}
            step={null}
            track={false}
            suffix={fps ? tr('controls.duration', { sec: duration }) : ''}
            {...props}
        />
    );
};
