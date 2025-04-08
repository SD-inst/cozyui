import { SliderInput, SliderInputProps } from './SliderInput';

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
