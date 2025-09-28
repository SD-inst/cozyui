import { useWatch } from 'react-hook-form';
import { LengthInput } from './LengthSlider';

export const WanLengthInput = ({ ...props }) => {
    const longVideo = useWatch({ name: ['riflex', 'loop'] });
    return (
        <LengthInput
            min={1}
            max={longVideo[0] || longVideo[1]?.enabled ? 257 : 129}
            step={4}
            fps={16}
            defaultValue={81}
            name='length'
            {...props}
        />
    );
};
