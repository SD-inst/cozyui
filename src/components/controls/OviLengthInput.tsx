import { useFormContext } from 'react-hook-form';
import { useWatchForm } from '../../hooks/useWatchForm';
import { LengthInput, LengthInputProps } from './LengthSlider';
import { Optional } from './optional';
import { useEffect } from 'react';

export const OviLengthInput = ({
    name = 'length',
    audio_name = 'audio_length',
    ...props
}: Optional<LengthInputProps, 'min' | 'max' | 'name'> & {
    audio_name?: string;
}) => {
    const length = useWatchForm(name);
    const { setValue } = useFormContext();
    useEffect(() => {
        setValue(audio_name, Math.round((length * 314) / 241));
    }, [audio_name, length, setValue]);
    return (
        <LengthInput
            min={1}
            max={257}
            name={name}
            fps={24}
            defaultValue={121}
            step={4}
            {...props}
        />
    );
};
