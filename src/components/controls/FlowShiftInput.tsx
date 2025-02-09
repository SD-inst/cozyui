import { SliderInput } from './SliderInput';

export const FlowShiftInput = ({ ...props }) => {
    return (
        <SliderInput
            name='flow_shift'
            label='flow shift'
            min={1}
            max={20}
            defaultValue={7}
            tooltip={`Increase to stabilize motion at low number of steps (<20)`}
            {...props}
        />
    );
};
