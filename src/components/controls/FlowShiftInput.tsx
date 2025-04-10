import { SliderInput } from './SliderInput';

export const FlowShiftInput = ({ ...props }) => {
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
