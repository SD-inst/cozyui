import { SliderInput } from './SliderInput';

export const FlowShiftInput = ({ ...props }) => {
    return (
        <SliderInput
            name='flow_shift'
            min={1}
            max={20}
            defaultValue={7}
            tooltip='flow_shift'
            {...props}
        />
    );
};
