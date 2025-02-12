import { SliderInput, SliderInputProps } from './SliderInput';

export const CFGInput = ({ ...props }: SliderInputProps) => {
    return (
        <SliderInput
            name='cfg'
            label='CFG'
            min={1}
            max={20}
            step={0.1}
            defaultValue={7}
            {...props}
        />
    );
};
