import { useWatch } from 'react-hook-form';
import { LengthInput, LengthInputProps } from './LengthSlider';
import { Optional } from './optional';

export const HYLengthInput = ({
    max = [201, 265],
    ...props
}: { max?: number | number[] } & Optional<
    Omit<LengthInputProps, 'max'>,
    'min' | 'name'
>) => {
    const riflex = useWatch({ name: 'riflex' });
    return (
        <LengthInput
            min={5}
            max={
                Array.isArray(max)
                    ? riflex && max.length > 1
                        ? max[1]
                        : max[0]
                    : max
            }
            step={4}
            fps={24}
            defaultValue={85}
            name='length'
            {...props}
        />
    );
};
