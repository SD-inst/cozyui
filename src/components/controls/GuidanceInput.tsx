import { SliderInput, SliderInputProps } from './SliderInput';

export const GuidanceInput = ({ ...props }: SliderInputProps) => {
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
