import { useEffect } from 'react';
import { useWatchForm } from '../../hooks/useWatchForm';
import { Optional } from './optional';
import { SelectInput } from './SelectInput';
import { SelectInputProps } from './SelectInputBase';
import { useFormContext } from 'react-hook-form';

export const OviVersionInput = ({
    ...props
}: Optional<SelectInputProps, 'name' | 'choices'>) => {
    const version = useWatchForm('version');
    const { setValue } = useFormContext();
    useEffect(() => {
        switch (version) {
            case '1.0':
                setValue(
                    'model_video',
                    'ovi/Wan2_2_Ovi_Video_fp8_e4m3fn_scaled_KJ.safetensors'
                );
                setValue(
                    'model_audio',
                    'ovi/Wan2_2_Ovi_Audio_fp8_e4m3fn_scaled_KJ.safetensors'
                );
                break;
            case '1.1':
                setValue(
                    'model_video',
                    'ovi/Wan2_2-5B-Ovi_960x960_10s_fp8_e4m3fn_scaled_KJ.safetensors'
                );
                setValue(
                    'model_audio',
                    'ovi/Wan2_2-5B-Ovi_960x960_10s_fp8_e4m3fn_scaled_KJ.safetensors'
                );
        }
    }, [setValue, version]);
    return (
        <SelectInput
            name='version'
            choices={['1.0', '1.1']}
            defaultValue='1.1'
            {...props}
        />
    );
};
