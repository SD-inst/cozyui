import { useCallback } from 'react';
import { useRegisterHandler } from '../contexts/TabContext';
import { controlType } from '../../redux/config';
import { useController, useFormContext } from 'react-hook-form';

export const WanFLF2V = ({ name }: { name: string }) => {
    const { getValues } = useFormContext();
    useController({ name, defaultValue: true });
    const handler = useCallback(
        (api: any, _: any, control?: controlType) => {
            const model = getValues('model');
            if (
                !control ||
                !control.i2v_encode_node_id ||
                !control.clip_vision_node_id ||
                !control.clip_vision_loader_node_id ||
                !model?.id?.includes('FLF2V')
            ) {
                return;
            }
            api[control.i2v_encode_node_id].inputs.fun_or_fl2v_model = true;
            api[control.clip_vision_loader_node_id].inputs.model_name =
                'open-clip-xlm-roberta-large-vit-huge-14_visual_fp16.safetensors';
            api[control.clip_vision_node_id].inputs.combine_embeds = 'concat';
        },
        [getValues]
    );
    useRegisterHandler({ name, handler });
    return null;
};
