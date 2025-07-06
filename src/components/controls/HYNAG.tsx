import { Box } from '@mui/material';
import { useCallback } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { insertNode, replaceNodeConnection } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { PromptInput } from './PromptInput';
import { TextInputBase } from './TextInputBase';
import { ToggleInputBase } from './ToggleInputBase';

type valueType = {
    enabled: boolean;
    nag_scale: number;
    nag_tau: number;
    nag_alpha: number;
    nag_sigma_end: number;
};

export const HYNAG = ({
    name,
    neg_prompt_field = 'neg_prompt',
    ...props
}: {
    name: string;
    neg_prompt_field?: string;
}) => {
    const {
        field: { value, onChange },
    } = useController({
        name: name,
        defaultValue: {
            enabled: false,
            nag_scale: 11,
            nag_tau: 2.5,
            nag_alpha: 0.25,
            nag_sigma_end: 0.9,
        },
    });
    const { getValues } = useFormContext();
    const handler = useCallback(
        (api: any, value: valueType, control?: controlType) => {
            if (
                !value.enabled ||
                !control ||
                !control.sampler_node_id ||
                !control.prompt_node_id ||
                !control.guidance_node_id ||
                !control.latent_node_id ||
                !control.model_node_id
            ) {
                return;
            }
            const clip = api[control.prompt_node_id].inputs.clip;
            const prompt = getValues(neg_prompt_field);
            const negativePromptNode = {
                inputs: {
                    text: prompt,
                    clip,
                },
                class_type: 'CLIPTextEncode',
                _meta: {
                    title: 'CLIP Text Encode (NAG Negative Prompt)',
                },
            };
            const npnID = insertNode(api, [], '', negativePromptNode);
            const zeroOutNode = {
                inputs: {
                    conditioning: [npnID, 0],
                },
                class_type: 'ConditioningZeroOut',
                _meta: {
                    title: 'ConditioningZeroOut',
                },
            };
            const zeroOutID = insertNode(api, [], '', zeroOutNode);
            const NEGNode = {
                inputs: {
                    cfg: 1,
                    nag_scale: value.nag_scale,
                    nag_tau: value.nag_tau,
                    nag_alpha: value.nag_alpha,
                    nag_sigma_end: value.nag_sigma_end,
                    model: [control.model_node_id, 0],
                    positive: [control.guidance_node_id, 0],
                    negative: [zeroOutID, 0],
                    nag_negative: [npnID, 0],
                    latent_image: [control.latent_node_id, 0],
                },
                class_type: 'NAGCFGGuider',
                _meta: {
                    title: 'NAGCFGGuider',
                },
            };
            replaceNodeConnection(
                api,
                control.sampler_node_id,
                'guider',
                NEGNode
            );
        },
        [getValues, neg_prompt_field]
    );
    useRegisterHandler({ name, handler });
    return (
        <Box
            display='flex'
            flexDirection='column'
            gap={2}
            border='1px gray solid'
            borderRadius={3}
            p={2}
            mb={2}
            {...props}
        >
            <ToggleInputBase
                name={name}
                value={value.enabled}
                onChange={(_, enabled) => onChange({ ...value, enabled })}
                tooltip='nag'
            />
            <Box
                display={value.enabled ? 'flex' : 'none'}
                flexDirection='column'
                gap={2}
            >
                <PromptInput name='neg_prompt' />
                <TextInputBase
                    name='nag_scale'
                    type='number'
                    tooltip='nag_scale'
                    slotProps={{
                        htmlInput: { min: 0, max: 20, step: 0.1 },
                    }}
                    value={value.nag_scale}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            nag_scale: parseFloat(e.target.value),
                        })
                    }
                />
                <TextInputBase
                    type='number'
                    name='nag_tau'
                    tooltip='nag_tau'
                    slotProps={{
                        htmlInput: { min: 0, max: 10, step: 0.1 },
                    }}
                    value={value.nag_tau}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            nag_tau: parseFloat(e.target.value),
                        })
                    }
                />
                <TextInputBase
                    type='number'
                    name='nag_alpha'
                    tooltip='nag_alpha'
                    slotProps={{
                        htmlInput: { min: 0, max: 1, step: 0.01 },
                    }}
                    value={value.nag_alpha}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            nag_alpha: parseFloat(e.target.value),
                        })
                    }
                />
                <TextInputBase
                    type='number'
                    name='nag_sigma_end'
                    tooltip='nag_sigma_end'
                    slotProps={{
                        htmlInput: { min: 0, max: 1, step: 0.01 },
                    }}
                    value={value.nag_sigma_end}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            nag_sigma_end: parseFloat(e.target.value),
                        })
                    }
                />
            </Box>
        </Box>
    );
};
