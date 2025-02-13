import { SliderProps } from '@mui/material';
import { SliderInput } from './SliderInput';

export const HYSize = ({ ...props }: { label?: string } & SliderProps) => {
    return <SliderInput min={128} max={1280} step={16} {...props} />;
};
