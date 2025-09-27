import { useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { SelectInput, SelectInputProps } from './SelectInput';

export const ModelSelectInput = ({ ...props }: SelectInputProps) => {
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: any, val: string, control?: controlType) => {
            if (!control || !control['node_id']) {
                throw 'control undefined';
            }
            const loader_node_id = control['node_id'];
            const virtual_vram = getValues('virtual_vram');
            if (!val.endsWith('.gguf')) {
                const weight_dtype =
                    val.indexOf('fp8_e5m2') > 0 ? 'fp8_e5m2' : 'fp8_e4m3fn';
                if (virtual_vram > 0) {
                    api[loader_node_id] = {
                        inputs: {
                            unet_name: val,
                            weight_dtype,
                            compute_device: 'cuda:0',
                            virtual_vram_gb: virtual_vram,
                            donor_device: 'cpu',
                            expert_mode_allocations: '',
                        },
                        class_type: 'UNETLoaderDisTorch2MultiGPU',
                        _meta: {
                            title: 'UNETLoaderDisTorch2MultiGPU',
                        },
                    };
                } else {
                    api[loader_node_id].inputs['unet_name'] = val;
                    api[loader_node_id].inputs['weight_dtype'] = weight_dtype;
                }
            } else {
                // replace loader node with GGUF loader
                api[loader_node_id] = {
                    inputs: {
                        unet_name: val,
                        compute_device: 'cuda:0',
                        virtual_vram_gb: virtual_vram,
                        donor_device: 'cpu',
                        expert_mode_allocations: '',
                    },
                    class_type: 'UnetLoaderGGUFDisTorch2MultiGPU',
                    _meta: {
                        title: 'UnetLoaderGGUFDisTorch2MultiGPU',
                    },
                };
            }
        },
    );
    useRegisterHandler({ name: props.name, handler });
    return <SelectInput {...props} />;
};
