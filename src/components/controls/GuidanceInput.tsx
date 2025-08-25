import { SliderInput } from './SliderInput';
import { SliderInputProps } from './SliderInputBase';

export const GuidanceInput = ({ ...props }: Omit<SliderInputProps, 'name'>) => {
    return (
        <SliderInput
            name='guidance'
            min={1}
            max={20}
            defaultValue={7}
            tooltip='guidance'
            {...props}
        />
    );
};
