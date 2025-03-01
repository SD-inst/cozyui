import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { useHyvModelChoices } from '../tabs/hyv_models';
import { CustomSelectInputProps, SelectInput } from './SelectInput';

export const HYModelSelectInput = ({ ...props }: CustomSelectInputProps) => {
    const hyv_models = useHyvModelChoices();
    const { getValues } = useFormContext();
    const handler = useCallback(
        (api: any, val: string, control?: controlType) => {
            if (!control || !control['node_id']) {
                throw 'control undefined';
            }
            const loader_node_id = control['node_id'];
            const quantization = getValues('quantization');
            if (quantization !== 'gguf') {
                api[loader_node_id].inputs['unet_name'] = val;
                api[loader_node_id].inputs['weight_dtype'] = quantization;
                return;
            }
            // replace loader node with GGUF loader
            api[loader_node_id] = {
                inputs: {
                    unet_name: val,
                },
                class_type: 'UnetLoaderGGUF',
                _meta: {
                    title: 'Unet Loader (GGUF)',
                },
            };
        },
        [getValues]
    );
    useRegisterHandler({ name: 'model', handler });
    return (
        <SelectInput
            defaultValue='hyvid/hunyuan_video_720_fp8_e4m3fn.safetensors'
            choices={hyv_models}
            {...props}
        />
    );
};
