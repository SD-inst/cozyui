import { useEventCallback } from '@mui/material';
import { cloneDeep } from 'lodash';
import { useWatchForm } from './useWatchForm';
import { insertNode } from '../api/utils';
import { controlType } from '../redux/config';

const NUNCHAKU_KEYWORD = 'nunchaku';
const POSITIVE_FIELD = 'positive';
const NEGATIVE_FIELD = 'negative';

/**
 * Hook that returns a Qwen model change handler and `isNunchaku` boolean.
 * The handler replaces the model loader with `NunchakuQwenImageDiTLoader`
 * and inserts `FluxKontextMultiReferenceLatentMethod` nodes when a
 * Nunchaku model is selected.
 */
export const useQwenModelHandler = () => {
    const modelName = useWatchForm('model');
    const isNunchaku =
        typeof modelName === 'string' &&
        modelName?.toLowerCase().includes(NUNCHAKU_KEYWORD);

    const handler = useEventCallback(
        (api: any, value: string, control: controlType) => {
            if (!value) {
                return;
            }

            if (!isNunchaku) {
                api[control.node_id].inputs[control.field] = value;
                return;
            }
            // Nunchaku mode: replace loader + insert FluxKontext nodes
            const modelLoaderID = control.model_loader_id;
            const samplerID = control.sampler_id;

            // Replace model loader with NunchakuQwenImageDiTLoader
            api[modelLoaderID] = {
                inputs: {
                    model_name: value,
                    cpu_offload: 'auto',
                    num_blocks_on_gpu: 1,
                    use_pin_filters: 'enable',
                },
                class_type: 'NunchakuQwenImageDiTLoader',
                _meta: { title: 'Nunchaku Qwen-Image DiT Loader' },
            };

            // Insert FluxKontextMultiReferenceLatentMethod for positive
            const positiveRefNode = {
                inputs: {
                    reference_latents_method: 'index_timestep_zero',
                    conditioning: null,
                },
                class_type: 'FluxKontextMultiReferenceLatentMethod',
                _meta: { title: 'Edit Model Reference Method' },
            };
            insertNode(
                api,
                samplerID,
                POSITIVE_FIELD,
                positiveRefNode,
                0,
                'conditioning',
            );

            // Insert FluxKontextMultiReferenceLatentMethod for negative
            const negativeRefNode = cloneDeep(positiveRefNode);
            insertNode(
                api,
                samplerID,
                NEGATIVE_FIELD,
                negativeRefNode,
                0,
                'conditioning',
            );
        },
    );

    return { handler, isNunchaku };
};
