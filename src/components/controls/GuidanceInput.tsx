import { SliderInput } from './SliderInput';

export const GuidanceInput = ({ ...props }) => {
    return (
        <SliderInput
            name='guidance'
            label='guidance scale'
            min={1}
            max={20}
            defaultValue={7}
            tooltip={`Prompt weight, if the result doesn't follow the prompt well, or if you see disappearing limbs and objects, increase this.`}
            {...props}
        />
    );
};
