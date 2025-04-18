import { Optional } from './optional';
import { SliderInput, SliderInputProps } from './SliderInput';

export const CFGInput = ({ ...props }: Optional<SliderInputProps, 'name'>) => {
    return (
        <SliderInput
            name='cfg'
            min={1}
            max={20}
            step={0.1}
            defaultValue={7}
            {...props}
        />
    );
};
