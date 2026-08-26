import { useEventCallback } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { Workflow } from '../api/graph';
import { getFreeNodeId } from '../api/utils';

/**
 * Hook that returns a handler for the MiniMax H3 PDD acceleration toggle.
 *
 * When enabled, inserts a `MiniMaxH3PDDAccApply` node into the model chain,
 * right after the sigma-shift node (`sigma_shift_node_id`). Its two outputs
 * feed the sampler:
 *   - output 0 (model)  → the guider's `model` input (how the sampler gets a model)
 *   - output 1 (sigmas) → the sampler's `sigmas` input (replaces the scheduler)
 *
 * The PDD LoRAs are trained strictly on euler and on 4/6/8 steps, so the
 * sampler is forced to euler and the step count is written to the `nfe` field.
 * Spectrum is disabled so it has no effect (PDD replaces the turbo/sparse/spectrum
 * acceleration path).
 */
export const useMiniMaxH3PDDHandler = () => {
    const { getValues } = useFormContext();

    const handler = useEventCallback(
        (api: Workflow, value: boolean, control: any) => {
            if (!value) {
                return;
            }

            const {
                sigma_shift_node_id,
                guider_node_id,
                sampler_node_id,
                sampler_select_node_id,
                spectrum_node_id,
                pdd_file,
            } = control;

            if (
                !sigma_shift_node_id ||
                !guider_node_id ||
                !sampler_node_id ||
                !pdd_file
            ) {
                return;
            }

            const nfe = getValues('steps') as number;

            const pddNodeId = getFreeNodeId(api) + '';
            api[pddNodeId] = {
                inputs: {
                    pdd_file,
                    nfe: String(nfe),
                    lora_strength: 1,
                    head_strength: 1,
                    on_off_grid: 'error',
                    partition: '',
                    model: [sigma_shift_node_id, 0],
                },
                class_type: 'MiniMaxH3PDDAccApply',
                _meta: { title: 'MiniMax H3 PDD Acc LoRA (Apply)' },
            };

            // The PDD model reaches the sampler through the guider; the PDD
            // sigmas replace the scheduler's sigmas on the sampler.
            api[guider_node_id].inputs.model = [pddNodeId, 0];
            api[sampler_node_id].inputs.sigmas = [pddNodeId, 1];

            // The PDD LoRAs are trained on euler — force the sampler to euler.
            if (sampler_select_node_id) {
                api[sampler_select_node_id].inputs.sampler_name = 'euler';
            }

            // PDD replaces the turbo/sparse/spectrum acceleration — disable spectrum.
            if (spectrum_node_id) {
                api[spectrum_node_id].inputs.enabled = false;
            }
        },
    );

    return handler;
};
