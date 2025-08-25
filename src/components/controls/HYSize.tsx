import { SliderInput } from './SliderInput';
import { SliderInputProps } from './SliderInputBase';

export const HYSize = ({ ...props }: SliderInputProps) => {
    return <SliderInput min={128} max={1280} step={16} {...props} />;
};
