import { Box, useEventCallback } from '@mui/material';
import { useController, useFormContext } from 'react-hook-form';
import { insertNode, replaceNodeConnection } from '../../api/utils';
import { controlType } from '../../redux/config';
import { useRegisterHandler } from '../contexts/TabContext';
import { TextInputBase } from './TextInputBase';
import { ToggleInputBase } from './ToggleInputBase';

type valueType = {
    enabled: boolean;
    nag_scale: number;
    nag_tau: number;
    nag_alpha: number;
};

export const WanNAG = ({
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
        },
    });
    const { getValues } = useFormContext();
    const handler = useEventCallback(
        (api: any, value: valueType, control: controlType) => {
            if (
                !value.enabled ||
                !control.sampler_node_id ||
                !control.prompt_node_id
            ) {
                return;
            }
            const t5 = api[control.prompt_node_id].inputs.t5;
            const prompt = getValues(neg_prompt_field);
            const negativePromptNode = {
                inputs: {
                    prompt,
                    force_offload: true,
                    t5,
                },
                class_type: 'WanVideoTextEncodeSingle',
                _meta: {
                    title: 'WanVideo TextEncodeSingle',
                },
            };
            const npnID = insertNode(api, [], '', negativePromptNode);
            const NEGNode = {
                inputs: {
                    nag_scale: value.nag_scale,
                    nag_tau: value.nag_tau,
                    nag_alpha: value.nag_alpha,
                    original_text_embeds: [control.prompt_node_id, 0],
                    nag_text_embeds: [npnID, 0],
                },
                class_type: 'WanVideoApplyNAG',
                _meta: {
                    title: 'WanVideo Apply NAG',
                },
            };
            replaceNodeConnection(
                api,
                control.sampler_node_id,
                'text_embeds',
                NEGNode
            );
        }
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
            {value.enabled && (
                <Box display='flex' flexDirection='column' gap={2}>
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
                </Box>
            )}
        </Box>
    );
};
