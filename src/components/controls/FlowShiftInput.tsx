import { Optional } from './optional';
import { SliderInput } from './SliderInput';
import { SliderInputProps } from './SliderInputBase';

export const FlowShiftInput = ({
    ...props
}: Optional<SliderInputProps, 'name'>) => {
    return (
        <SliderInput
            name='flow_shift'
            min={1}
            max={30}
            defaultValue={8}
            tooltip='flow_shift'
            {...props}
        />
    );
};
