import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SelectInput, SelectInputProps } from './SelectInput';

export const ModelSelectInput = ({ ...props }: SelectInputProps) => {
    const { getValues } = useFormContext();
    const handler = useCallback(
        (api: any, val: string, control?: controlType) => {
            if (!control || !control['node_id']) {
                throw 'control undefined';
            }
            const loader_node_id = control['node_id'];
            if (!val.endsWith('.gguf')) {
                api[loader_node_id].inputs['unet_name'] = val;
                if (val.indexOf('fp8_e5m2') > 0) {
                    api[loader_node_id].inputs['weight_dtype'] = 'fp8_e5m2';
                } else {
                    api[loader_node_id].inputs['weight_dtype'] = 'fp8_e4m3fn';
                }
                return;
            }
            // replace loader node with GGUF loader
            api[loader_node_id] = {
                inputs: {
                    unet_name: val,
                    device: 'cuda:0',
                    virtual_vram_gb: getValues('virtual_vram'),
                    use_other_vram: true,
                    expert_mode_allocations: '',
                },
                class_type: 'UnetLoaderGGUFDisTorchMultiGPU',
                _meta: {
                    title: 'UnetLoaderGGUFDisTorchMultiGPU',
                },
            };
        },
        [getValues]
    );
    useRegisterHandler({ name: props.name, handler });
    return <SelectInput {...props} />;
};
