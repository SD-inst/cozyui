import { useWatch } from 'react-hook-form';
import { LengthInput, LengthInputProps } from './LengthSlider';
import { Optional } from './optional';

export const HYLengthInput = ({
    ...props
}: Optional<LengthInputProps, 'max' | 'min' | 'name'>) => {
    const riflex = useWatch({ name: 'riflex' });
    return (
        <LengthInput
            min={5}
            max={riflex ? 265 : 201}
            step={4}
            fps={24}
            defaultValue={85}
            name='length'
            {...props}
        />
    );
};
