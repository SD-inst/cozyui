import { SliderInput, SliderInputProps } from './SliderInput';

export const HYSize = ({ ...props }: SliderInputProps) => {
    return <SliderInput min={128} max={1280} step={16} {...props} />;
};
