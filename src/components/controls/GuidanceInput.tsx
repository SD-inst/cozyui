import { SliderInput } from './SliderInput';

export const GuidanceInput = ({ ...props }) => {
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
